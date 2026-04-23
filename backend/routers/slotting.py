from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Warehouse, Pick
from services.slotting import compute_slotting
from dependencies import get_current_company

router = APIRouter(prefix="/slotting", tags=["Slotting"])

@router.get("/{warehouse_id}")
def get_slotting(
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
        raise HTTPException(status_code=404, detail="Aucune donnée importée.")

    picks_data = [{"article_id": p.article_id, "article_name": p.article_name,
                   "rack": p.rack, "column": p.column} for p in picks]

    result = compute_slotting(picks_data)
    result["warehouse_id"] = warehouse_id
    return result
