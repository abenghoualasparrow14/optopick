# app/api/routes/warehouse.py
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.api.deps import get_current_company
from app.models.company import Company
from app.models.warehouse import Warehouse
from app.schemas.warehouse import WarehouseCreate, WarehouseOut, ColumnMapping, UploadResult
from app.services import import_service

router = APIRouter(prefix="/warehouses", tags=["Entrepôts"])


@router.get("/", response_model=list[WarehouseOut])
def list_warehouses(
    company: Company = Depends(get_current_company),
    db: Session      = Depends(get_db),
):
    """Liste tous les entrepôts de l'entreprise connectée."""
    return db.query(Warehouse).filter(Warehouse.company_id == company.id).all()


@router.post("/", response_model=WarehouseOut, status_code=201)
def create_warehouse(
    data:    WarehouseCreate,
    company: Company          = Depends(get_current_company),
    db:      Session          = Depends(get_db),
):
    """Crée un nouvel entrepôt / cellule."""
    wh = Warehouse(company_id=company.id, **data.model_dump())
    db.add(wh)
    db.commit()
    db.refresh(wh)
    return wh


@router.post("/{warehouse_id}/upload", response_model=UploadResult)
async def upload_picks(
    warehouse_id: int,
    file:         UploadFile = File(...),
    mapping_json: str        = Form(default="{}"),   # JSON du ColumnMapping
    company:      Company    = Depends(get_current_company),
    db:           Session    = Depends(get_db),
):
    """
    Upload un fichier Excel/CSV de picking.
    Le client peut personnaliser le mapping des colonnes via mapping_json.
    """
    # Vérifier que l'entrepôt appartient bien à l'entreprise
    wh = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.company_id == company.id,
    ).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Entrepôt introuvable.")

    # Parser le mapping (peut être personnalisé par le client)
    try:
        mapping_data = json.loads(mapping_json)
        mapping = ColumnMapping(**mapping_data)
    except Exception:
        mapping = ColumnMapping()  # mapping par défaut (format Numilog)

    # Lire le fichier
    content = await file.read()
    try:
        df = import_service.parse_file(content, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Valider les colonnes
    missing = import_service.validate_columns(df, mapping)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Colonnes manquantes dans le fichier : {missing}. "
                   f"Colonnes disponibles : {list(df.columns)}"
        )

    # Importer
    result = import_service.import_picks(db, wh, df, mapping)

    return UploadResult(
        warehouse_id  = warehouse_id,
        message       = f"Import réussi : {result['rows_imported']} lignes importées.",
        **result,
    )
