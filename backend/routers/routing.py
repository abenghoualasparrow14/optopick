from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Warehouse, Pick, ArticleCatalogue
from services.routing import optimize_route
from dependencies import get_current_company
from pydantic import BaseModel
import pandas as pd
from io import BytesIO
from schemas import CatalogUploadResult

router = APIRouter(prefix="/routing", tags=["Routing"])


class ArticleOrder(BaseModel):
    article_id: str
    quantity: float = 1.0


class CustomOrderRequest(BaseModel):
    articles: list[ArticleOrder]


@router.post("/{warehouse_id}/catalog/upload", response_model=CatalogUploadResult)
async def upload_catalog(
    warehouse_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    """
    Importe un fichier Excel/CSV pour mettre à jour le catalogue
    d'articles et leurs limites par palette.
    """
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.company_id == company.id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Entrepôt introuvable.")
    
    file_bytes = await file.read()
    if file.filename.endswith(".csv"):
        df = pd.read_csv(BytesIO(file_bytes), sep=None, engine="python")
    else:
        df = pd.read_excel(BytesIO(file_bytes))
        
    df.columns = df.columns.str.lower().str.strip()
    
    # Trouver la colonne d'article
    col_article = next((c for c in df.columns if c in ["article", "article_id", "code article", "ref"]), None)
    # Trouver la colonne de limite
    col_limit = next((c for c in df.columns if "limit" in c or "max" in c or "palette" in c or "qte" in c), None)

    # Fallback to column index if names don't match
    if not col_article or not col_limit:
        if len(df.columns) >= 2:
            col_article = df.columns[0]
            col_limit = df.columns[1]
        else:
            raise HTTPException(status_code=422, detail="Le fichier doit contenir au moins 2 colonnes (Article, Limite).")
            
    df = df.dropna(subset=[col_article, col_limit])
    
    articles_created = 0
    articles_updated = 0
    ignored_rows = 0
    
    for _, row in df.iterrows():
        aid = str(row[col_article]).strip()
        if not aid:
            ignored_rows += 1
            continue
            
        try:
            limit = float(row[col_limit])
            if limit <= 0: raise ValueError
        except (ValueError, TypeError):
            ignored_rows += 1
            continue
            
        existing = db.query(ArticleCatalogue).filter(
            ArticleCatalogue.company_id == company.id,
            ArticleCatalogue.article_id == aid
        ).first()
        
        if existing:
            if existing.max_per_palette != limit:
                existing.max_per_palette = limit
                articles_updated += 1
        else:
            new_cat = ArticleCatalogue(
                company_id=company.id,
                article_id=aid,
                max_per_palette=limit
            )
            db.add(new_cat)
            articles_created += 1
            
    db.commit()
    return CatalogUploadResult(
        articles_created=articles_created,
        articles_updated=articles_updated,
        ignored_rows=ignored_rows
    )


@router.get("/{warehouse_id}/catalog/status")
def catalog_status(
    warehouse_id: int,
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    """Retourne le statut du catalogue d'articles pour cette entreprise."""
    count = db.query(func.count(ArticleCatalogue.id)).filter(
        ArticleCatalogue.company_id == company.id
    ).scalar()
    return {"articles_count": count, "has_catalog": count > 0}


@router.get("/{warehouse_id}/preps")
def list_preps(
    warehouse_id: int,
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.company_id == company.id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Entrepôt introuvable.")
    preps = db.query(Pick.prep_number).filter(
        Pick.warehouse_id == warehouse_id,
        Pick.prep_number != ""
    ).distinct().all()
    return {"preps": [p[0] for p in preps if p[0]]}


@router.get("/{warehouse_id}/articles")
def list_articles(
    warehouse_id: int,
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    """Retourne la liste de tous les articles disponibles dans l'entrepôt."""
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.company_id == company.id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Entrepôt introuvable.")

    articles = db.query(
        Pick.article_id,
        Pick.article_name,
        Pick.rack,
        func.min(Pick.column).label("col_min"),
        func.count(Pick.id).label("picks"),
    ).filter(
        Pick.warehouse_id == warehouse_id
    ).group_by(Pick.article_id, Pick.article_name, Pick.rack).all()

    # Regrouper par article_id — prendre le rack avec le plus de picks
    article_map = {}
    for a in articles:
        aid = a.article_id
        if aid not in article_map or a.picks > article_map[aid]["picks"]:
            article_map[aid] = {
                "article_id":   aid,
                "article_name": a.article_name or aid,
                "rack":         a.rack,
                "column":       a.col_min,
                "picks":        a.picks,
            }

    result = sorted(article_map.values(), key=lambda x: -x["picks"])
    return {"articles": result}


@router.post("/{warehouse_id}/optimize")
def optimize_custom_order(
    warehouse_id: int,
    order: CustomOrderRequest,
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    """
    Reçoit une liste d'articles commandés et retourne le trajet optimal.
    Pour chaque article, on trouve l'emplacement le plus fréquemment utilisé.
    """
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.company_id == company.id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Entrepôt introuvable.")

    if not order.articles:
        raise HTTPException(status_code=400, detail="La commande est vide.")

    # Pour chaque article, trouver l'emplacement le plus fréquent
    locations = []
    not_found = []

    for item in order.articles:
        # Chercher l'emplacement le plus souvent utilisé pour cet article
        best = db.query(
            Pick.rack,
            Pick.column,
            func.count(Pick.id).label("freq")
        ).filter(
            Pick.warehouse_id == warehouse_id,
            Pick.article_id == item.article_id
        ).group_by(Pick.rack, Pick.column)         .order_by(func.count(Pick.id).desc())         .first()

        if best:
            locations.append({
                "rack":       best.rack,
                "column":     best.column,
                "article_id": item.article_id,
                "quantity":   item.quantity,
            })
        else:
            not_found.append(item.article_id)

    if not locations:
        raise HTTPException(
            status_code=404,
            detail=f"Aucun article trouvé : {not_found}"
        )

    # Ordre physique des racks
    all_racks = db.query(Pick.rack).filter(
        Pick.warehouse_id == warehouse_id
    ).distinct().all()
    rack_order = sorted([r[0] for r in all_racks])

    geometry = None
    if warehouse.routing_json:
        import json
        try:
            geometry = json.loads(warehouse.routing_json) if isinstance(warehouse.routing_json, str) else warehouse.routing_json
        except:
            pass

    catalog = db.query(ArticleCatalogue).filter(ArticleCatalogue.company_id == company.id).all()
    limits_map = {c.article_id: c.max_per_palette for c in catalog}

    result = optimize_route(locations, rack_order, geometry, limits_map)
    result["not_found"] = not_found
    return result


@router.get("/{warehouse_id}/prep/{prep_number:path}")
def get_routing(
    warehouse_id: int,
    prep_number: str,
    db: Session = Depends(get_db),
    company=Depends(get_current_company),
):
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.company_id == company.id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=404, detail="Entrepôt introuvable.")

    picks = db.query(Pick).filter(
        Pick.warehouse_id == warehouse_id,
        Pick.prep_number == prep_number
    ).all()
    if not picks:
        raise HTTPException(
            status_code=404,
            detail=f"Préparation '{prep_number}' introuvable."
        )

    all_racks = db.query(Pick.rack).filter(
        Pick.warehouse_id == warehouse_id
    ).distinct().all()
    rack_order = sorted([r[0] for r in all_racks])

    locations = [{
        "rack":       p.rack,
        "column":     p.column,
        "article_id": p.article_id,
        "quantity":   p.quantity,
    } for p in picks]

    geometry = None
    if warehouse.routing_json:
        import json
        try:
            geometry = json.loads(warehouse.routing_json) if isinstance(warehouse.routing_json, str) else warehouse.routing_json
        except:
            pass
            
    catalog = db.query(ArticleCatalogue).filter(ArticleCatalogue.company_id == company.id).all()
    limits_map = {c.article_id: c.max_per_palette for c in catalog}

    result = optimize_route(locations, rack_order, geometry, limits_map)
    result["prep_number"] = prep_number
    return result