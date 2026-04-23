from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Warehouse, Pick
from schemas import UploadResult
from services.parser import parse_upload
from dependencies import get_current_company

router = APIRouter(prefix="/upload", tags=["Upload"])

@router.post("/{warehouse_id}", response_model=UploadResult)
async def upload_file(
    warehouse_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    company = Depends(get_current_company),
):
    # Vérifier que l'entrepôt appartient à cette entreprise
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.company_id == company.id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Entrepôt introuvable.")

    # Parser le fichier
    file_bytes = await file.read()
    try:
        result = parse_upload(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Supprimer les anciens picks de cet entrepôt (re-import)
    db.query(Pick).filter(Pick.warehouse_id == warehouse_id).delete()

    # Insérer les nouveaux picks
    rows = result["rows"]
    for row in rows:
        pick = Pick(
            warehouse_id=warehouse_id,
            article_id=str(row.get("article_id", "")),
            article_name=str(row.get("article_name", "")),
            rack=str(row.get("rack", "")),
            column=int(row.get("column", 0)),
            level=str(row.get("level", "")),
            pick_date=row.get("pick_date"),
            prep_number=str(row.get("prep_number", "")),
            quantity=float(row.get("quantity", 1)),
        )
        db.add(pick)
    db.commit()

    # Calculer les stats retournées
    racks    = list({r["rack"] for r in rows})
    articles = len({r["article_id"] for r in rows})
    dates    = [r["pick_date"] for r in rows if r.get("pick_date")]
    date_range = {}
    if dates:
        date_range = {"from": str(min(dates))[:10], "to": str(max(dates))[:10]}

    return UploadResult(
        warehouse_id=warehouse_id,
        rows_imported=len(rows),
        racks_found=sorted(racks),
        articles_found=articles,
        date_range=date_range,
        warnings=result["warnings"],
    )
