from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Company, Warehouse
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Company, Warehouse
import schemas
from services.auth import hash_password, verify_password, create_token
from dependencies import get_current_company
import json

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=schemas.Token)
def login(data: schemas.CompanyLogin, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.email == data.email).first()
    if not company or not verify_password(data.password, company.password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")
    token = create_token({"company_id": company.id, "name": company.name, "is_admin": bool(company.is_admin)})
    return {"access_token": token}


@router.post("/admin/create-account")
def admin_create_account(
    data: schemas.AdminCreateAccount,
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    """Admin-only: create a Company + its first Warehouse in one call."""
    if not company.is_admin:
        raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs.")
    # Check email uniqueness
    if db.query(Company).filter(Company.email == data.email).first():
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")

    # Create company
    new_company = Company(
        name=data.company_name,
        email=data.email,
        password=hash_password(data.password),
    )
    db.add(new_company)
    db.commit()
    db.refresh(new_company)

    # Create warehouse
    wh = Warehouse(
        name=data.warehouse_name,
        company_id=new_company.id,
        geometry_json=json.dumps(data.geometry_json) if data.geometry_json else None,
        routing_json=json.dumps(data.routing_json) if data.routing_json else None,
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)

    return {
        "message": "Compte créé avec succès.",
        "company_id": new_company.id,
        "company_name": new_company.name,
        "email": new_company.email,
        "warehouse_id": wh.id,
        "warehouse_name": wh.name,
    }

@router.post("/change-password")
def change_password(
    data: schemas.ChangePassword,
    db: Session = Depends(get_db),
    company=Depends(get_current_company)
):
    if not verify_password(data.old_password, company.password):
        raise HTTPException(status_code=400, detail="L'ancien mot de passe est incorrect.")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit faire au moins 6 caractères.")
    
    company.password = hash_password(data.new_password)
    db.commit()
    return {"message": "Mot de passe mis à jour avec succès."}

@router.get("/me", response_model=schemas.CompanyOut)
def get_me(company=Depends(get_current_company)):
    return company

@router.put("/me", response_model=schemas.CompanyOut)
def update_me(
    data: schemas.CompanyUpdate,
    db: Session = Depends(get_db),
    company=Depends(get_current_company)
):
    if data.email != company.email:
        existing = db.query(Company).filter(Company.email == data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Cet email est déjà utilisé.")
            
    company.name = data.name
    company.email = data.email
    company.phone = data.phone
    db.commit()
    db.refresh(company)
    return company
