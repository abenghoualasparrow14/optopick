# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.database import init_db
from app.api.routes import auth, warehouse, analysis

app = FastAPI(
    title       = settings.APP_NAME,
    description = "API OptoPick — Warehouse Intelligence Platform",
    version     = settings.APP_VERSION,
    docs_url    = "/docs",   # Swagger UI accessible ici
)

# ── CORS : autoriser le frontend React à appeler l'API ────────
app.add_middleware(
    CORSMiddleware,
    allow_origins  = ["http://localhost:5173", "http://localhost:3000"],
    allow_methods  = ["*"],
    allow_headers  = ["*"],
)

# ── Création des tables au démarrage ─────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()

# ── Routes ────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/v1")
app.include_router(warehouse.router, prefix="/api/v1")
app.include_router(analysis.router,  prefix="/api/v1")

@app.get("/")
def root():
    return {"app": settings.APP_NAME, "version": settings.APP_VERSION, "status": "running"}
