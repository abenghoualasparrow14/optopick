from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from dependencies import get_current_company
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

router = APIRouter(prefix="/requests", tags=["Access Requests"])

# Import inline pour éviter les imports circulaires
def get_models():
    from models import AccessRequest
    return AccessRequest

def get_schemas():
    import importlib
    return importlib.import_module("schemas")

@router.post("/")
def create_request(data: dict, db: Session = Depends(get_db)):
    """Route publique — aucune auth requise."""
    AccessRequest = get_models()
    
    # Vérifier si email déjà soumis
    existing = db.query(AccessRequest).filter(
        AccessRequest.email == data.get("email")
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Une demande avec cet email existe déjà. Nous vous contacterons bientôt."
        )
    
    req = AccessRequest(
        company_name  = data.get("company_name", "").strip(),
        email         = data.get("email", "").strip(),
        phone         = data.get("phone", "").strip(),
        company_phone = data.get("company_phone", "").strip() or None,
        website       = data.get("website", "").strip() or None,
        message       = data.get("message", "").strip() or None,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return {"message": "Demande envoyée avec succès.", "id": req.id}


@router.get("/admin/all")
def list_requests(
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    """Route admin — auth requise."""
    if not company.is_admin:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")
    AccessRequest = get_models()
    requests = db.query(AccessRequest).order_by(
        AccessRequest.created_at.desc()
    ).all()
    return requests


@router.patch("/admin/{request_id}")
def update_request(
    request_id: int,
    data: dict,
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    """Mettre à jour le statut + notes admin."""
    if not company.is_admin:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")
    AccessRequest = get_models()
    req = db.query(AccessRequest).filter(AccessRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Demande introuvable.")
    if "status"      in data: req.status      = data["status"]
    if "admin_notes" in data: req.admin_notes = data["admin_notes"]
    db.commit()
    db.refresh(req)
    return req