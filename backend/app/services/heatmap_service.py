# app/services/heatmap_service.py
"""
Génère les données de heatmap pour le frontend.
Agrège les picks par rack, par colonne, et par jour.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.pick import Pick


def compute_heatmap(db: Session, warehouse_id: int) -> dict:
    """
    Retourne toutes les données nécessaires pour afficher la heatmap :
    - picks par rack et par colonne
    - picks totaux par rack
    - picks par jour
    - top 10 emplacements
    """

    # ── Picks par rack × colonne ──────────────────────────────
    rack_col = (
        db.query(Pick.rack, Pick.column, func.count(Pick.id).label("picks"))
        .filter(Pick.warehouse_id == warehouse_id)
        .group_by(Pick.rack, Pick.column)
        .all()
    )

    rack_col_dict: dict[str, dict[str, int]] = {}
    for r in rack_col:
        rack_col_dict.setdefault(r.rack, {})[str(r.column)] = r.picks

    # ── Picks totaux par rack ─────────────────────────────────
    rack_totals = (
        db.query(Pick.rack, func.count(Pick.id).label("picks"))
        .filter(Pick.warehouse_id == warehouse_id)
        .group_by(Pick.rack)
        .order_by(func.count(Pick.id).desc())
        .all()
    )
    rack_picks = {r.rack: r.picks for r in rack_totals}

    # ── Picks par jour ────────────────────────────────────────
    daily = (
        db.query(Pick.pick_date, func.count(Pick.id).label("picks"))
        .filter(Pick.warehouse_id == warehouse_id)
        .group_by(Pick.pick_date)
        .order_by(Pick.pick_date)
        .all()
    )
    date_picks = {str(r.pick_date): r.picks for r in daily}

    # ── Top 10 emplacements ───────────────────────────────────
    top10 = (
        db.query(Pick.rack, Pick.column, func.count(Pick.id).label("picks"))
        .filter(Pick.warehouse_id == warehouse_id)
        .group_by(Pick.rack, Pick.column)
        .order_by(func.count(Pick.id).desc())
        .limit(10)
        .all()
    )
    top10_list = [
        {"rack": r.rack, "column": r.column, "picks": r.picks}
        for r in top10
    ]

    # ── Stats globales ────────────────────────────────────────
    total = sum(rack_picks.values())
    max_col_picks = max(
        (v for rack in rack_col_dict.values() for v in rack.values()),
        default=1
    )

    return {
        "rack_col_picks":  rack_col_dict,
        "rack_picks":      rack_picks,
        "date_picks":      date_picks,
        "top10":           top10_list,
        "total_picks":     total,
        "max_col_picks":   max_col_picks,
        "racks":           sorted(rack_picks.keys()),
    }
