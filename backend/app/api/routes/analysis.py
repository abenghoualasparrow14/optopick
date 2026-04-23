# app/api/routes/analysis.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.deps import get_current_company
from app.models.company import Company
from app.models.warehouse import Warehouse
from app.services import heatmap_service, slotting_service, routing_service

router = APIRouter(prefix="/warehouses", tags=["Analyse"])


def _get_warehouse(warehouse_id: int, company: Company, db: Session) -> Warehouse:
    """Vérifie que l'entrepôt appartient à l'entreprise."""
    wh = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.company_id == company.id,
    ).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Entrepôt introuvable.")
    return wh


@router.get("/{warehouse_id}/heatmap")
def get_heatmap(
    warehouse_id: int,
    company: Company = Depends(get_current_company),
    db: Session      = Depends(get_db),
):
    """Retourne les données de heatmap pour le frontend."""
    wh = _get_warehouse(warehouse_id, company, db)
    return heatmap_service.compute_heatmap(db, wh.id)


@router.get("/{warehouse_id}/slotting")
def get_slotting(
    warehouse_id: int,
    company: Company = Depends(get_current_company),
    db: Session      = Depends(get_db),
):
    """Retourne la classification ABC et les recommandations de reslotting."""
    wh = _get_warehouse(warehouse_id, company, db)
    return slotting_service.compute_abc(db, wh.id)


@router.get("/{warehouse_id}/routing/preparations")
def get_preparations(
    warehouse_id: int,
    company: Company = Depends(get_current_company),
    db: Session      = Depends(get_db),
):
    """Retourne la liste des numéros de préparation disponibles."""
    wh = _get_warehouse(warehouse_id, company, db)
    preps = routing_service.list_preparations(db, wh.id)
    return {"preparations": preps, "count": len(preps)}


@router.get("/{warehouse_id}/routing/{prep_number}")
def get_route(
    warehouse_id: int,
    prep_number:  str,
    company: Company = Depends(get_current_company),
    db: Session      = Depends(get_db),
):
    """Calcule le trajet optimal pour une préparation donnée."""
    wh     = _get_warehouse(warehouse_id, company, db)
    result = routing_service.compute_route(db, wh.id, prep_number, wh.col_width_m)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
