# app/services/import_service.py
"""
Service d'import de fichiers Excel/CSV.
Gère le parsing, la validation, et l'insertion en base.
"""
import pandas as pd
from io import BytesIO
from datetime import date
from sqlalchemy.orm import Session
from app.models.pick import Pick
from app.models.warehouse import Warehouse
from app.schemas.warehouse import ColumnMapping


SUPPORTED_EXTENSIONS = {".xlsx", ".xls", ".csv"}


def parse_file(content: bytes, filename: str) -> pd.DataFrame:
    """Lit le fichier et retourne un DataFrame brut."""
    ext = "." + filename.rsplit(".", 1)[-1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(f"Format non supporté : {ext}. Acceptés : xlsx, xls, csv")

    if ext in {".xlsx", ".xls"}:
        return pd.read_excel(BytesIO(content))
    else:
        # Essayer plusieurs séparateurs
        for sep in [";", ",", "\t"]:
            try:
                df = pd.read_csv(BytesIO(content), sep=sep)
                if len(df.columns) > 1:
                    return df
            except Exception:
                continue
        raise ValueError("Impossible de lire le fichier CSV. Vérifiez le séparateur (;, ,, tabulation).")


def validate_columns(df: pd.DataFrame, mapping: ColumnMapping) -> list[str]:
    """
    Vérifie que les colonnes mappées existent dans le fichier.
    Retourne la liste des colonnes manquantes.
    """
    required = {
        mapping.rack,
        mapping.column,
        mapping.pick_date,
        mapping.article_id,
    }
    return [col for col in required if col not in df.columns]


def import_picks(
    db: Session,
    warehouse: Warehouse,
    df: pd.DataFrame,
    mapping: ColumnMapping,
) -> dict:
    """
    Nettoie le DataFrame et insère les lignes en base.
    Retourne les statistiques d'import.
    """
    rows_imported = 0
    rows_skipped  = 0
    racks_found   = set()

    for _, row in df.iterrows():
        try:
            # Extraction des valeurs avec le mapping du client
            rack_val   = str(row[mapping.rack]).strip()
            col_val    = int(row[mapping.column])
            date_val   = pd.to_datetime(row[mapping.pick_date]).date()
            art_id     = str(row[mapping.article_id]).strip()
            art_name   = str(row.get(mapping.article_name, art_id)).strip()
            level      = str(row.get(mapping.level, "")).strip()
            location   = str(row.get(mapping.location, "")).strip()
            prep_num   = str(row.get(mapping.prep_number, "")).strip()
            qty        = float(row.get(mapping.quantity, 1.0))

            # Validation minimale
            if not rack_val or col_val < 1 or pd.isna(date_val):
                rows_skipped += 1
                continue

            pick = Pick(
                warehouse_id  = warehouse.id,
                article_id    = art_id,
                article_name  = art_name,
                rack          = rack_val,
                column        = col_val,
                level         = level,
                location      = location,
                prep_number   = prep_num,
                quantity      = qty,
                pick_date     = date_val,
            )
            db.add(pick)
            racks_found.add(rack_val)
            rows_imported += 1

        except (ValueError, KeyError, TypeError):
            rows_skipped += 1
            continue

    # Mettre à jour le nombre de racks de l'entrepôt
    warehouse.nb_racks = len(racks_found)
    db.commit()

    # Période couverte
    dates = df[mapping.pick_date].dropna()
    date_range = {
        "from": str(pd.to_datetime(dates.min()).date()),
        "to":   str(pd.to_datetime(dates.max()).date()),
    }

    return {
        "rows_imported": rows_imported,
        "rows_skipped":  rows_skipped,
        "racks_found":   sorted(list(racks_found)),
        "date_range":    date_range,
    }
