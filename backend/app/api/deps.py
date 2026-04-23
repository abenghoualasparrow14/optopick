# app/api/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.security import decode_token
from app.models.company import Company

bearer = HTTPBearer()


def get_current_company(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> Company:
    """Dépendance FastAPI : vérifie le JWT et retourne l'entreprise connectée."""
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré.")

    company = db.get(Company, int(payload["sub"]))
    if not company or not company.is_active:
        raise HTTPException(status_code=401, detail="Compte introuvable ou désactivé.")
    return company
