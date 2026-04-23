"""
Service de routing TSP.
Ce module contient deux modes :
- MODE GRAPHE EXPLICITE : Utilise un algorithme combiné Dijkstra + TSP Nearest Neighbor
  basé sur le `geometry_json` fourni par l'outil de cartographie, qui contient des noeuds
  et des arêtes réelles. Les distances sont exactes (en mètres).
- MODE FALLBACK (Ancien) : Modèle de distance simplifié (entrepôt rectangulaire) avec 
  une constante d'espacement. Utilisé si le `geometry_json` n'a pas de noeuds/arêtes.
"""
import math
import heapq

# === Constantes de fallback ===
COL_WIDTH   = 3.3
AISLE_WIDTH = 3.3


# ══════════════════════════════════════════════════════════════════════
#     MODE FALLBACK (Ancienne méthode naïve)
# ══════════════════════════════════════════════════════════════════════
def _rack_to_index(rack: str, rack_order: list[str]) -> int:
    name = rack.upper().replace(" ", "")
    for i, r in enumerate(rack_order):
        if name == r.upper().replace(" ", ""):
            return i
    return 0

def _distance_naive(loc_a: dict, loc_b: dict, rack_order: list[str]) -> float:
    ri_a = _rack_to_index(loc_a["rack"], rack_order)
    ri_b = _rack_to_index(loc_b["rack"], rack_order)
    d_col  = abs(loc_a["column"] - loc_b["column"]) * COL_WIDTH
    d_rack = abs(ri_a - ri_b) * AISLE_WIDTH
    return math.sqrt(d_col**2 + d_rack**2)

def _total_route_distance_naive(path: list[dict], rack_order: list[str]) -> float:
    if not path: return 0.0
    depot = {"rack": rack_order[0] if rack_order else "", "column": 1}
    points = [depot] + path + [depot]
    return sum(_distance_naive(points[i], points[i+1], rack_order) for i in range(len(points)-1))

def _nearest_neighbor_tsp_naive(locations: list[dict], rack_order: list[str]) -> list[dict]:
    if not locations: return []
    depot = {"rack": rack_order[0] if rack_order else "", "column": 1}
    unvisited = locations.copy()
    path = []
    current = depot
    while unvisited:
        nearest = min(unvisited, key=lambda loc: _distance_naive(current, loc, rack_order))
        path.append(nearest)
        unvisited.remove(nearest)
        current = nearest
    return path


# ══════════════════════════════════════════════════════════════════════
#     MODE GRAPHE EXPLICITE (API Cartographique / Dijkstra)
# ══════════════════════════════════════════════════════════════════════
def _parse_graph(geometry_json: dict) -> dict:
    """Parse le JSON du graphe et crée la structure d'adjacence."""
    if not geometry_json or "nodes" not in geometry_json or "edges" not in geometry_json:
        return None
        
    graph = {}
    node_mapping = {}  # (rack, col) -> id du noeud "pick"
    departure_nodes = []
    
    for node in geometry_json["nodes"]:
        nid = node["id"]
        graph[nid] = {}
        if node["type"] == "departure":
            departure_nodes.append(nid)
        elif node["type"] == "pick" and "serves_locations" in node:
            for loc in node["serves_locations"]:
                key = (str(loc["rack"]).upper().strip(), int(loc["column"]))
                node_mapping[key] = nid
                
    for edge in geometry_json["edges"]:
        u, v = edge["from"], edge["to"]
        # Récupère la distance réelle depuis l'outil de CAD
        dist = edge.get("dist_real", 1.0)
        
        # On sécurise la création du nœud si l'outil de mapping avait un défaut
        if u not in graph: graph[u] = {}
        if v not in graph: graph[v] = {}
        
        graph[u][v] = dist
        graph[v][u] = dist  # Le trajet est bidirectionnel par défaut
        
    return {
        "adj": graph,
        "mapping": node_mapping,
        "departures": departure_nodes
    }

def _dijkstra(graph: dict, start_node: str) -> dict:
    """Algorithme de plus court chemin classique depuis un nœud."""
    distances = {n: float('inf') for n in graph}
    distances[start_node] = 0
    pq = [(0, start_node)]
    
    while pq:
        current_dist, current_node = heapq.heappop(pq)
        
        if current_dist > distances[current_node]:
            continue
            
        for neighbor, weight in graph[current_node].items():
            dist = current_dist + weight
            if dist < distances[neighbor]:
                distances[neighbor] = dist
                heapq.heappush(pq, (dist, neighbor))
                
    return distances


# ══════════════════════════════════════════════════════════════════════
#     POINT D'ENTREE EXPORTÉ
# ══════════════════════════════════════════════════════════════════════
def _cluster_picks(picks: list[dict], rack_order: list[str], article_limits: dict) -> list[dict]:
    """Sépare une liste de picks en plusieurs 'palettes' selon les limites de chaque article.
    
    Règle : on ne coupe JAMAIS la quantité d'un article en deux.
    Si un article ne rentre pas dans la palette courante, on ferme cette palette
    et on place l'article en entier dans la suivante.
    """
    normalized_racks = [r.upper().replace(" ", "") for r in rack_order]
    def pick_sort_key(p):
        r = str(p["rack"]).upper().replace(" ", "")
        try: ri = normalized_racks.index(r)
        except ValueError: ri = 999
        return (ri, int(p.get("column", 0)))
        
    sorted_picks = sorted(picks, key=pick_sort_key)
    
    palettes = []
    current_palette = []
    current_capacity = 0.0
    
    for rp in sorted_picks:
        p = dict(rp)
        # S'assurer que la quantité est un entier
        p["quantity"] = int(p["quantity"]) if p["quantity"] == int(p["quantity"]) else p["quantity"]

        limit = article_limits.get(p["article_id"], 100.0)
        if limit <= 0: limit = 100.0

        qty_pct = p["quantity"] / limit

        # Si l'article ne rentre pas dans la palette courante (et qu'elle n'est pas vide),
        # on ferme la palette et on commence une nouvelle. Pas de découpage.
        if qty_pct > (1.0 - current_capacity) + 1e-6 and current_palette:
            palettes.append({
                "picks": current_palette,
                "fill_pct": round(current_capacity * 100.0, 1)
            })
            current_palette = []
            current_capacity = 0.0

        # Si l'article seul dépasse 100% (cas extrême), il occupe sa propre tournée quand même
        current_palette.append(p)
        current_capacity += qty_pct

        # Si on a atteint exactement 100%, on ferme immédiatement
        if current_capacity >= 1.0 - 1e-6:
            palettes.append({
                "picks": current_palette,
                "fill_pct": round(min(current_capacity * 100.0, 100.0), 1)
            })
            current_palette = []
            current_capacity = 0.0

    if current_palette:
        palettes.append({"picks": current_palette, "fill_pct": round(current_capacity * 100.0, 1)})
        
    return palettes


def optimize_route(picks: list[dict], rack_order: list[str], geometry_json=None, article_limits=None) -> dict:
    """
    Point d'entrée principal pour router. 
    Divise la commande en tournées selon les capacités, et pour chaque tournée calcule le TSP.
    """
    if article_limits is None: article_limits = {}
    if not picks:
        return {"optimized_path": None, "tours": [], "total_distance_m": 0, "naive_distance_m": 0, "gain_pct": 0, "not_found": []}

    parsed = _parse_graph(geometry_json)
    
    # On isole les introuvables du graphe global
    not_found = []
    
    # 1. Clustering : Découper en palettes (CVRP)
    palettes = _cluster_picks(picks, rack_order, article_limits)
    
    tours = []
    total_opt = 0.0
    total_naive = 0.0
    
    # 2. Résoudre le parcours palette par palette
    for idx, pal in enumerate(palettes):
        pal_picks = pal["picks"]
        
        # === MODE FALLBACK ===
        if not parsed or not parsed["departures"]:
            opt = _nearest_neighbor_tsp_naive(pal_picks, rack_order)
            d_opt = _total_route_distance_naive(opt, rack_order)
            d_naive = _total_route_distance_naive(pal_picks, rack_order)
            tours.append({
                "tour_index": idx + 1,
                "fill_pct": pal["fill_pct"],
                "distance_m": round(d_opt, 1),
                "path": opt
            })
            total_opt += d_opt
            total_naive += d_naive
            continue

        # === MODE GRAPHE COMPLET ===
        adj = parsed["adj"]
        mapping = parsed["mapping"]
        depot = parsed["departures"][0] 
        
        nodes_to_visit = set()
        node_to_picks = {}
        for p in pal_picks:
            rack = str(p["rack"]).upper().strip()
            col = int(p["column"])
            nid = mapping.get((rack, col))
            if nid and nid in adj:
                nodes_to_visit.add(nid)
                if nid not in node_to_picks: node_to_picks[nid] = []
                node_to_picks[nid].append(p)
            else:
                # Article non mappé, on l'ajoute à not_found mais on le laisse dans le chemin à la fin
                if p["article_id"] not in not_found:
                    not_found.append(p["article_id"])
                    
        nodes_to_visit = list(nodes_to_visit)
        
        # Précalcul Dijkstra pour ces nœuds
        all_nodes = [depot] + nodes_to_visit
        distances = {}
        for start_n in all_nodes:
            distances[start_n] = _dijkstra(adj, start_n)
            
        # Distance Naive
        d_naive = 0.0
        curr = depot
        for p in pal_picks:
            rack = str(p["rack"]).upper().strip()
            col = int(p["column"])
            nid = mapping.get((rack, col))
            if nid and nid in adj:
                if distances[curr][nid] != float('inf'):
                    d_naive += distances[curr][nid]
                    curr = nid
        if distances[curr][depot] != float('inf'):
            d_naive += distances[curr][depot]

        # TSP NN
        current = depot
        unvisited = set(nodes_to_visit)
        d_opt = 0.0
        tour_nodes = []
        
        while unvisited:
            valid_neighbors = [n for n in unvisited if distances[current][n] != float('inf')]
            if not valid_neighbors: break
            nearest = min(valid_neighbors, key=lambda n: distances[current][n])
            d_opt += distances[current][nearest]
            tour_nodes.append(nearest)
            unvisited.remove(nearest)
            current = nearest
            
        if distances[current][depot] != float('inf'):
            d_opt += distances[current][depot]
            
        # Reconstruction
        optimized_path = []
        for nid in tour_nodes:
            for p in node_to_picks[nid]:
                optimized_path.append(p)
                
        # Ajouter les non-mappés de cette palette à la fin
        mapped_ids = {p["article_id"] for p in optimized_path}
        for p in pal_picks:
            if p["article_id"] not in mapped_ids:
                optimized_path.append(p)

        tours.append({
            "tour_index": idx + 1,
            "fill_pct": pal["fill_pct"],
            "distance_m": round(d_opt, 1),
            "path": optimized_path
        })
        
        total_opt += d_opt
        total_naive += d_naive

    gain_pct = round((total_naive - total_opt) / total_naive * 100, 1) if total_naive > 0 else 0

    return {
        "optimized_path": None,
        "tours": tours,
        "total_distance_m": round(total_opt, 1),
        "naive_distance_m": round(total_naive, 1),
        "gain_pct": gain_pct,
        "not_found": list(set(not_found))
    }
