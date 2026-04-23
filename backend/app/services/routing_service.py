# app/services/routing_service.py
"""
Algorithme de routing optimal pour le picker.
Stratégie : S-Shape (serpentin) + Nearest Neighbor heuristic.
Simple, rapide, donne ~90% de l'optimal en quelques millisecondes.
"""
import math
from sqlalchemy.orm import Session
from app.models.pick import Pick


def compute_route(db: Session, warehouse_id: int, prep_number: str, col_width_m: float = 3.3) -> dict:
    """
    Calcule le trajet optimal pour une préparation donnée.
    
    Paramètres :
        prep_number  : identifiant de la préparation
        col_width_m  : largeur d'une colonne en mètres (défaut 3.3 m)
    
    Retourne :
        - route_optimized  : liste d'emplacements dans l'ordre optimal
        - route_naive      : ordre naturel (tel que reçu)
        - distance_naive   : distance totale sans optimisation (m)
        - distance_optimized : distance totale avec optimisation (m)
        - gain_pct         : pourcentage de gain
        - steps            : détail de chaque étape
    """

    # ── 1. Récupérer les picks de cette préparation ───────────
    picks = (
        db.query(Pick)
        .filter(Pick.warehouse_id == warehouse_id, Pick.prep_number == prep_number)
        .all()
    )

    if not picks:
        return {"error": f"Préparation '{prep_number}' introuvable."}

    # Construire les points à visiter (rack, colonne) → coordonnées XY
    # On suppose que les racks sont numérotés de gauche à droite
    # et les colonnes de 1 (réception) à N (fond)
    locations = []
    for p in picks:
        x, y = _rack_to_coords(p.rack, p.column, col_width_m)
        locations.append({
            "pick_id":      p.id,
            "article":      p.article_name or p.article_id,
            "rack":         p.rack,
            "column":       p.column,
            "level":        p.level,
            "location":     p.location,
            "quantity":     p.quantity,
            "x":            round(x, 2),
            "y":            round(y, 2),
        })

    # Point de départ / arrivée = réception (0, 0)
    start = {"x": 0.0, "y": 0.0, "rack": "RECEPTION", "column": 0}

    # ── 2. Trajet naïf (ordre original) ──────────────────────
    naive_route    = locations[:]
    dist_naive     = _total_distance(start, naive_route)

    # ── 3. Trajet S-Shape (serpentin par allée) ───────────────
    sshape_route   = _s_shape(locations, col_width_m)
    dist_sshape    = _total_distance(start, sshape_route)

    # ── 4. Nearest Neighbor depuis S-Shape ───────────────────
    nn_route       = _nearest_neighbor(locations, start)
    dist_nn        = _total_distance(start, nn_route)

    # Choisir le meilleur
    if dist_sshape <= dist_nn:
        best_route, best_dist, algo = sshape_route, dist_sshape, "S-Shape"
    else:
        best_route, best_dist, algo = nn_route, dist_nn, "Nearest Neighbor"

    gain_pct = round((dist_naive - best_dist) / dist_naive * 100, 1) if dist_naive > 0 else 0

    # ── 5. Construire les étapes avec distances partielles ────
    steps = _build_steps(start, best_route)

    return {
        "prep_number":         prep_number,
        "nb_locations":        len(locations),
        "algorithm":           algo,
        "route_optimized":     best_route,
        "route_naive":         naive_route,
        "distance_naive_m":    round(dist_naive, 1),
        "distance_optimized_m": round(best_dist, 1),
        "gain_m":              round(dist_naive - best_dist, 1),
        "gain_pct":            gain_pct,
        "steps":               steps,
    }


def _rack_to_coords(rack: str, column: int, col_width: float) -> tuple[float, float]:
    """
    Convertit un rack + colonne en coordonnées XY dans l'entrepôt.
    X = position horizontale (allée), Y = profondeur (colonne).
    Hypothèse simple : racks séparés de col_width mètres.
    """
    # Extraire la lettre du rack (ex: "D14" → "D", "R14" → "R")
    rack_letter = ''.join(c for c in rack if c.isalpha()).upper()
    rack_index  = 0
    for i, c in enumerate(rack_letter):
        rack_index = rack_index * 26 + (ord(c) - ord('A') + 1)

    x = rack_index * col_width          # position horizontale
    y = column     * col_width          # profondeur depuis la réception
    return x, y


def _distance(a: dict, b: dict) -> float:
    return math.sqrt((a["x"] - b["x"]) ** 2 + (a["y"] - b["y"]) ** 2)


def _total_distance(start: dict, route: list[dict]) -> float:
    if not route:
        return 0.0
    total = _distance(start, route[0])
    for i in range(len(route) - 1):
        total += _distance(route[i], route[i + 1])
    total += _distance(route[-1], start)  # retour réception
    return total


def _s_shape(locations: list[dict], col_width: float) -> list[dict]:
    """
    Algorithme S-Shape : parcourt les allées en serpentin.
    Allées paires → colonne croissante, allées impaires → colonne décroissante.
    """
    # Grouper par allée (rack_index)
    allees: dict[int, list] = {}
    for loc in locations:
        rack_letter = ''.join(c for c in loc["rack"] if c.isalpha()).upper()
        rack_idx    = sum(ord(c) - ord('A') + 1 for c in rack_letter)
        allees.setdefault(rack_idx, []).append(loc)

    route = []
    for i, (allée_idx, locs) in enumerate(sorted(allees.items())):
        # Allée paire : aller vers le fond, impaire : revenir
        if i % 2 == 0:
            sorted_locs = sorted(locs, key=lambda x: x["column"])
        else:
            sorted_locs = sorted(locs, key=lambda x: -x["column"])
        route.extend(sorted_locs)

    return route


def _nearest_neighbor(locations: list[dict], start: dict) -> list[dict]:
    """
    Heuristique du plus proche voisin.
    À chaque étape, aller à l'emplacement non-visité le plus proche.
    """
    remaining = locations[:]
    route      = []
    current    = start

    while remaining:
        nearest = min(remaining, key=lambda loc: _distance(current, loc))
        route.append(nearest)
        current = nearest
        remaining.remove(nearest)

    return route


def _build_steps(start: dict, route: list[dict]) -> list[dict]:
    """Construit le détail de chaque étape avec la distance partielle."""
    steps   = []
    current = start
    cumul   = 0.0

    for i, loc in enumerate(route):
        dist   = _distance(current, loc)
        cumul += dist
        steps.append({
            "step":        i + 1,
            "rack":        loc["rack"],
            "column":      loc["column"],
            "article":     loc["article"],
            "quantity":    loc["quantity"],
            "dist_from_prev_m": round(dist, 1),
            "cumul_dist_m":     round(cumul, 1),
        })
        current = loc

    # Retour réception
    dist_back = _distance(current, start)
    cumul    += dist_back
    steps.append({
        "step":        len(route) + 1,
        "rack":        "RECEPTION",
        "column":      0,
        "article":     "— retour réception —",
        "quantity":    0,
        "dist_from_prev_m": round(dist_back, 1),
        "cumul_dist_m":     round(cumul, 1),
    })

    return steps


def list_preparations(db: Session, warehouse_id: int) -> list[str]:
    """Retourne la liste des numéros de préparation disponibles."""
    from sqlalchemy import distinct
    rows = (
        db.query(distinct(Pick.prep_number))
        .filter(Pick.warehouse_id == warehouse_id, Pick.prep_number != "")
        .order_by(Pick.prep_number)
        .all()
    )
    return [r[0] for r in rows]
