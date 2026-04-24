from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth, warehouses, upload, heatmap, slotting, routing, access_requests

# Créer toutes les tables au démarrage
Base.metadata.create_all(bind=engine)

def init_db():
    from database import SessionLocal
    from models import Company
    from services.auth import hash_password
    db = SessionLocal()
    # Si la base de données est complètement vide (1er démarrage)
    if not db.query(Company).first():
        admin = Company(
            name="OptoPick Admin",
            email="admin@optopick.dz",
            password=hash_password("admin123"),
            is_admin=True
        )
        db.add(admin)
        db.commit()
    db.close()

init_db()



app = FastAPI(
    title="OptoPick API",
    description="Warehouse Intelligence Platform — Optimisation de picking",
    version="1.0.0",
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(warehouses.router)
app.include_router(upload.router)
app.include_router(heatmap.router)
app.include_router(slotting.router)
app.include_router(routing.router)
app.include_router(access_requests.router)

@app.get("/")
def root():
    return {"message": "OptoPick API v1.0 — OK", "docs": "/docs"}