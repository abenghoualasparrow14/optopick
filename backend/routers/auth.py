from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from database import get_db
from models import Company, Warehouse
import schemas
from services.auth import hash_password, verify_password, create_token, create_refresh_token, decode_token
from dependencies import get_current_company
import json
import time
from collections import defaultdict

router = APIRouter(prefix="/auth", tags=["Auth"])

# ── Rate limiting (in-memory) ──────────────────────────────────────────────────
_login_attempts: dict = defaultdict(list)   # ip -> [timestamp, ...]
MAX_ATTEMPTS   = 5     # tentatives max
WINDOW_SECONDS = 300   # fenêtre de 5 minutes
LOCKOUT_SECONDS = 600  # blocage de 10 minutes

def _check_rate_limit(ip: str):
    now = time.time()
    attempts = _login_attempts[ip]
    # Nettoyer les anciennes tentatives hors de la fenêtre
    _login_attempts[ip] = [t for t in attempts if now - t < LOCKOUT_SECONDS]
    recent = [t for t in _login_attempts[ip] if now - t < WINDOW_SECONDS]
    if len(recent) >= MAX_ATTEMPTS:
        wait = int(LOCKOUT_SECONDS - (now - _login_attempts[ip][0]))
        raise HTTPException(
            status_code=429,
            detail=f"Trop de tentatives échouées. Réessayez dans {wait} secondes."
        )

def _record_attempt(ip: str):
    _login_attempts[ip].append(time.time())

def _clear_attempts(ip: str):
    _login_attempts[ip] = []
# ──────────────────────────────────────────────────────────────────────────────


@router.post("/login", response_model=schemas.Token)
def login(data: schemas.CompanyLogin, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host
    _check_rate_limit(ip)

    company = db.query(Company).filter(Company.email == data.email).first()
    if not company or not verify_password(data.password, company.password):
        _record_attempt(ip)
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")

    _clear_attempts(ip)  # Connexion réussie → reset du compteur
    payload = {"company_id": company.id, "name": company.name, "is_admin": bool(company.is_admin)}
    access_token   = create_token(payload)
    refresh_token  = create_refresh_token(payload)
    return {"access_token": access_token, "refresh_token": refresh_token}


@router.post("/refresh", response_model=schemas.Token)
def refresh_token(data: schemas.RefreshTokenRequest):
    """Renouvelle le access_token à partir d'un refresh_token valide."""
    try:
        payload = decode_token(data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token invalide.")
    except Exception:
        raise HTTPException(status_code=401, detail="Refresh token expiré ou invalide.")

    new_payload = {
        "company_id": payload["company_id"],
        "name":       payload["name"],
        "is_admin":   payload["is_admin"],
    }
    return {
        "access_token":  create_token(new_payload),
        "refresh_token": create_refresh_token(new_payload),
    }


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
