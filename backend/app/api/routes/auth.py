# app/api/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.company import Company
from app.schemas.company import CompanyRegister, CompanyLogin, CompanyOut, TokenOut
from app.core.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/register", response_model=CompanyOut, status_code=201)
def register(data: CompanyRegister, db: Session = Depends(get_db)):
    """Inscription d'une nouvelle entreprise."""
    if db.query(Company).filter(Company.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé.")
    company = Company(
        name     = data.name,
        email    = data.email,
        password = hash_password(data.password),
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@router.post("/login", response_model=TokenOut)
def login(data: CompanyLogin, db: Session = Depends(get_db)):
    """Connexion et récupération du token JWT."""
    company = db.query(Company).filter(Company.email == data.email).first()
    if not company or not verify_password(data.password, company.password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")
    if not company.is_active:
        raise HTTPException(status_code=403, detail="Compte désactivé.")

    token = create_access_token({"sub": str(company.id), "email": company.email})
    return {"access_token": token, "token_type": "bearer", "company": company}
