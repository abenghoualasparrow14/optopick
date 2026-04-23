"""Dépendances partagées FastAPI (injection du user authentifié)."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import Company
from services.auth import decode_token
from jose import JWTError

bearer = HTTPBearer()

def get_current_company(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    try:
        payload = decode_token(creds.credentials)
        company_id = payload.get("company_id")
    except JWTError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré.")
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=401, detail="Entreprise introuvable.")
    return company
