from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Company, Warehouse
from dependencies import get_current_company
from services.auth import hash_password
import schemas
import json
import secrets
import string

router = APIRouter(prefix="/admin/companies", tags=["Admin — Companies"])


def _require_admin(company):
    if not company.is_admin:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")


# ── Liste de tous les clients ────────────────────────────────────────────────
@router.get("/", response_model=list[schemas.CompanyAdminOut])
def list_companies(
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    _require_admin(company)
    companies = db.query(Company).filter(Company.is_admin == False).order_by(Company.created_at.desc()).all()
    return companies


# ── Détail d'un client + ses entrepôts ─────────────────────────────────────
@router.get("/{company_id}", response_model=schemas.CompanyAdminDetail)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    _require_admin(company)
    client = db.query(Company).filter(Company.id == company_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable.")
    warehouses = db.query(Warehouse).filter(Warehouse.company_id == company_id).all()
    return schemas.CompanyAdminDetail(
        id=client.id,
        name=client.name,
        email=client.email,
        phone=client.phone,
        is_admin=client.is_admin,
        created_at=client.created_at,
        warehouses=[
            schemas.WarehouseAdminOut(
                id=w.id,
                name=w.name,
                created_at=w.created_at,
                geometry_json=json.loads(w.geometry_json) if w.geometry_json else None,
                routing_json=json.loads(w.routing_json) if w.routing_json else None,
            )
            for w in warehouses
        ]
    )


# ── Modifier les infos d'un client ──────────────────────────────────────────
@router.patch("/{company_id}", response_model=schemas.CompanyAdminOut)
def update_company(
    company_id: int,
    data: schemas.CompanyAdminUpdate,
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    _require_admin(company)
    client = db.query(Company).filter(Company.id == company_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable.")

    if data.name  is not None: client.name  = data.name
    if data.email is not None:
        existing = db.query(Company).filter(Company.email == data.email, Company.id != company_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")
        client.email = data.email
    if data.phone is not None: client.phone = data.phone

    db.commit()
    db.refresh(client)
    return client


# ── Réinitialiser le mot de passe d'un client ──────────────────────────────
@router.post("/{company_id}/reset-password")
def reset_password(
    company_id: int,
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    _require_admin(company)
    client = db.query(Company).filter(Company.id == company_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client introuvable.")

    alphabet = string.ascii_letters + string.digits
    new_pwd = ''.join(secrets.choice(alphabet) for _ in range(12))
    client.password = hash_password(new_pwd)
    db.commit()
    return {"new_password": new_pwd, "message": "Mot de passe réinitialisé. Communiquez-le au client."}


# ── Modifier un entrepôt (géométrie, nom) ──────────────────────────────────
@router.patch("/{company_id}/warehouses/{warehouse_id}", response_model=schemas.WarehouseAdminOut)
def update_warehouse(
    company_id: int,
    warehouse_id: int,
    data: schemas.WarehouseAdminUpdate,
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    _require_admin(company)
    wh = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.company_id == company_id
    ).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Entrepôt introuvable.")

    if data.name          is not None: wh.name          = data.name
    if data.geometry_json is not None: wh.geometry_json = json.dumps(data.geometry_json)
    if data.routing_json  is not None: wh.routing_json  = json.dumps(data.routing_json)

    db.commit()
    db.refresh(wh)
    return schemas.WarehouseAdminOut(
        id=wh.id,
        name=wh.name,
        created_at=wh.created_at,
        geometry_json=json.loads(wh.geometry_json) if wh.geometry_json else None,
        routing_json=json.loads(wh.routing_json) if wh.routing_json else None,
    )
