from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Warehouse
from schemas import WarehouseCreate, WarehouseOut
from dependencies import get_current_company
import json

router = APIRouter(prefix="/warehouses", tags=["Warehouses"])

@router.post("/", response_model=WarehouseOut)
def create_warehouse(
    data: WarehouseCreate,
    db: Session = Depends(get_db),
    company = Depends(get_current_company),
):
    wh = Warehouse(
        name=data.name,
        company_id=company.id,
        geometry_json=json.dumps(data.geometry_json) if data.geometry_json else None,
        routing_json=json.dumps(data.routing_json) if data.routing_json else None,
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return _serialize(wh)

@router.get("/", response_model=list[WarehouseOut])
def list_warehouses(
    db: Session = Depends(get_db),
    company = Depends(get_current_company),
):
    warehouses = db.query(Warehouse).filter(Warehouse.company_id == company.id).all()
    return [_serialize(w) for w in warehouses]

def _serialize(wh):
    """Parse geometry_json string back to dict for the response."""
    return WarehouseOut(
        id=wh.id,
        name=wh.name,
        geometry_json=json.loads(wh.geometry_json) if wh.geometry_json else None,
        routing_json=json.loads(wh.routing_json) if wh.routing_json else None,
        created_at=wh.created_at,
    )
