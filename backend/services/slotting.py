"""
Service d'analyse slotting ABC.
Entrée  : liste de picks (rows de la DB)
Sortie  : classification ABC + diagnostics + plan d'échanges
"""
from collections import defaultdict


def compute_slotting(picks: list[dict]) -> dict:
    # ── 1. Agréger par article ────────────────────────────────
    article_picks  = defaultdict(int)
    article_names  = {}
    article_cols   = defaultdict(list)
    article_racks  = defaultdict(lambda: defaultdict(int))

    for p in picks:
        aid = str(p["article_id"])
        article_picks[aid] += 1
        article_names[aid]  = p.get("article_name", aid)
        article_cols[aid].append(int(p["column"]))
        article_racks[aid][p["rack"]] += 1

    total = sum(article_picks.values())

    # ── 2. Trier par picks décroissants ───────────────────────
    sorted_articles = sorted(article_picks.items(), key=lambda x: -x[1])

    # ── 3. Classification ABC (Pareto 80/15/5) ────────────────
    cumul, articles = 0, []
    for aid, picks_count in sorted_articles:
        cumul += picks_count
        pct    = picks_count / total * 100
        cumul_pct = cumul / total * 100
        abc   = "A" if cumul_pct <= 80 else ("B" if cumul_pct <= 95 else "C")
        cols  = article_cols[aid]
        col_avg = round(sum(cols) / len(cols), 1)
        pct_hot = round(sum(1 for c in cols if c <= 4) / len(cols) * 100, 1)
        top_rack = max(article_racks[aid], key=article_racks[aid].get)

        target = "col.1-4" if abc == "A" else ("col.5-10" if abc == "B" else "col.11-18")
        lo, hi = (1,4) if abc=="A" else ((5,10) if abc=="B" else (11,18))
        if col_avg < lo:
            status = "TROP EN AVANT"
        elif col_avg > hi:
            status = "TROP EN ARRIÈRE"
        else:
            status = "BIEN PLACÉ"

        # Distribution par colonne
        dist = defaultdict(int)
        for c in cols:
            dist[c] += 1

        articles.append({
            "article_id":   aid,
            "article_name": article_names[aid],
            "picks":        picks_count,
            "pct":          round(pct, 1),
            "abc_class":    abc,
            "col_avg":      col_avg,
            "pct_hot":      pct_hot,
            "target_zone":  target,
            "status":       status,
            "top_rack":     top_rack,
            "col_dist":     dict(dist),
        })

    # ── 4. Plan d'échanges ────────────────────────────────────
    a_too_far  = sorted([a for a in articles if a["abc_class"]=="A" and a["col_avg"] > 4],
                        key=lambda x: -x["col_avg"])
    bc_too_near = sorted([a for a in articles if a["abc_class"] in ("B","C") and a["col_avg"] < 5],
                         key=lambda x: x["col_avg"])

    exchanges, used = [], set()
    ex_id = 1
    for a_art in a_too_far:
        for bc_art in bc_too_near:
            if bc_art["article_id"] in used:
                continue
            gain = round(abs(a_art["col_avg"] - bc_art["col_avg"])
                         * (a_art["picks"] + bc_art["picks"]) * 0.5)
            exchanges.append({
                "exchange_id":    ex_id,
                "article_a":      a_art,
                "article_b":      bc_art,
                "gain_meters":    gain,
            })
            used.add(bc_art["article_id"])
            used.add(a_art["article_id"])
            ex_id += 1
            break

    # Articles A restants sans échange
    exchanged_ids = {e["article_a"]["article_id"] for e in exchanges}
    simple_moves  = [a for a in a_too_far if a["article_id"] not in exchanged_ids]

    total_gain = sum(e["gain_meters"] for e in exchanges)

    return {
        "articles":          articles,
        "exchanges":         exchanges,
        "simple_moves":      simple_moves,
        "total_gain_meters": total_gain,
    }
