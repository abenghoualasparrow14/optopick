from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from collections import defaultdict
from database import get_db
from models import Warehouse, Pick
from schemas import HeatmapResponse, HeatmapCell
from dependencies import get_current_company

router = APIRouter(prefix="/heatmap", tags=["Heatmap"])

@router.get("/{warehouse_id}", response_model=HeatmapResponse)
def get_heatmap(
    warehouse_id: int,
    db: Session = Depends(get_db),
    company = Depends(get_current_company),
):
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.company_id == company.id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Entrepôt introuvable.")

    picks = db.query(Pick).filter(Pick.warehouse_id == warehouse_id).all()
    if not picks:
        raise HTTPException(status_code=404, detail="Aucune donnée importée pour cet entrepôt.")

    # Agréger picks par (rack, colonne)
    cell_counts  = defaultdict(int)
    rack_totals  = defaultdict(int)
    date_picks   = defaultdict(int)

    for p in picks:
        cell_counts[(p.rack, p.column)] += 1
        rack_totals[p.rack] += 1
        if p.pick_date:
            day = str(p.pick_date)[:10]
            date_picks[day] += 1

    cells = [
        HeatmapCell(rack=rack, column=col, picks=count)
        for (rack, col), count in cell_counts.items()
    ]

    return HeatmapResponse(
        warehouse_id=warehouse_id,
        total_picks=len(picks),
        cells=cells,
        rack_totals=dict(rack_totals),
        date_picks=dict(sorted(date_picks.items())),
    )
