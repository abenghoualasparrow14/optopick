# app/services/slotting_service.py
"""
Algorithme de classification ABC et recommandations de reslotting.
Fonctionne sur n'importe quel entrepôt, pas seulement Numilog.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.pick import Pick


def compute_abc(db: Session, warehouse_id: int) -> dict:
    """
    Calcule la classification ABC des articles d'un entrepôt.
    Retourne articles classés + recommandations de reslotting.
    """

    # ── 1. Agrégation des picks par article ───────────────────
    rows = (
        db.query(
            Pick.article_id,
            Pick.article_name,
            func.count(Pick.id).label("total_picks"),
            func.avg(Pick.column).label("avg_column"),
            func.min(Pick.column).label("min_col"),
            func.max(Pick.column).label("max_col"),
        )
        .filter(Pick.warehouse_id == warehouse_id)
        .group_by(Pick.article_id, Pick.article_name)
        .order_by(func.count(Pick.id).desc())
        .all()
    )

    if not rows:
        return {"articles": [], "exchanges": [], "stats": {}}

    total_picks = sum(r.total_picks for r in rows)

    # ── 2. Classification ABC (Pareto 80/15/5) ────────────────
    articles   = []
    cumulative = 0

    for r in rows:
        cumulative += r.total_picks
        pct      = r.total_picks / total_picks * 100
        cum_pct  = cumulative / total_picks * 100
        abc_class = "A" if cum_pct <= 80 else "B" if cum_pct <= 95 else "C"

        # Picks par colonne (pour la distribution)
        col_dist = (
            db.query(Pick.column, func.count(Pick.id).label("cnt"))
            .filter(Pick.warehouse_id == warehouse_id, Pick.article_id == r.article_id)
            .group_by(Pick.column)
            .all()
        )
        dist = {str(c.column): c.cnt for c in col_dist}

        # % en zone chaude (col 1–4)
        hot_picks = sum(v for k, v in dist.items() if int(k) <= 4)
        pct_hot   = round(hot_picks / r.total_picks * 100, 1) if r.total_picks else 0

        articles.append({
            "id":         r.article_id,
            "name":       r.article_name,
            "picks":      r.total_picks,
            "pct":        round(pct, 1),
            "abc":        abc_class,
            "avg_col":    round(r.avg_column, 1),
            "min_col":    r.min_col,
            "max_col":    r.max_col,
            "pct_hot":    pct_hot,
            "nb_cols":    len(dist),
            "dist":       dist,
            "status":     _placement_status(abc_class, r.avg_column),
        })

    # ── 3. Recommandations de reslotting par échange ──────────
    exchanges = _compute_exchanges(articles)

    # ── 4. Stats globales ─────────────────────────────────────
    a_articles = [a for a in articles if a["abc"] == "A"]
    stats = {
        "total_picks":   total_picks,
        "total_articles": len(articles),
        "class_a":       len(a_articles),
        "class_b":       len([a for a in articles if a["abc"] == "B"]),
        "class_c":       len([a for a in articles if a["abc"] == "C"]),
        "avg_col_a":     round(sum(a["avg_col"] for a in a_articles) / len(a_articles), 1) if a_articles else 0,
        "mal_places":    len([a for a in articles if a["status"] != "BIEN PLACÉ"]),
    }

    return {"articles": articles, "exchanges": exchanges, "stats": stats}


def _placement_status(abc: str, avg_col: float) -> str:
    """Détermine si l'article est bien placé selon sa classe."""
    zones = {"A": (1, 4), "B": (5, 10), "C": (11, 18)}
    lo, hi = zones[abc]
    if avg_col < lo:
        return "TROP EN AVANT"
    if avg_col > hi:
        return "TROP EN ARRIÈRE"
    return "BIEN PLACÉ"


def _compute_exchanges(articles: list[dict]) -> list[dict]:
    """
    Algorithme de reslotting par échange.
    Associe chaque article A trop loin avec le meilleur article B/C trop près.
    """
    # Articles A trop loin (avg_col > 4), triés par urgence décroissante
    a_far  = sorted(
        [a for a in articles if a["abc"] == "A" and a["avg_col"] > 4],
        key=lambda x: -x["avg_col"]
    )
    # Articles B/C trop près (avg_col < zone cible basse), triés du plus mal placé
    bc_near = sorted(
        [a for a in articles if a["abc"] in ("B", "C") and a["avg_col"] < 5],
        key=lambda x: x["avg_col"]
    )

    exchanges = []
    used_bc   = set()

    for art_a in a_far:
        # Trouver le meilleur candidat BC disponible
        partner = next((b for b in bc_near if b["id"] not in used_bc), None)
        if not partner:
            break

        used_bc.add(partner["id"])
        gain = round(abs(art_a["avg_col"] - partner["avg_col"]) * (art_a["picks"] + partner["picks"]) * 0.5)

        exchanges.append({
            "rank":     len(exchanges) + 1,
            "article_a": art_a,
            "article_b": partner,
            "gain_m":    gain,
            "target_a":  "col. 1–4",
            "target_b":  f"col. 5–10" if partner["abc"] == "B" else "col. 11–18",
        })

    return exchanges
