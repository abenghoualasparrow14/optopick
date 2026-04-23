# app/schemas/warehouse.py
from pydantic import BaseModel
from datetime import datetime


class WarehouseCreate(BaseModel):
    name:        str
    nb_cols:     int   = 18
    col_width_m: float = 3.3


class WarehouseOut(BaseModel):
    id:          int
    name:        str
    nb_racks:    int
    nb_cols:     int
    col_width_m: float
    created_at:  datetime

    model_config = {"from_attributes": True}


class ColumnMapping(BaseModel):
    """
    Mapping des colonnes du fichier client vers les champs OptoPick.
    Le client dit : 'dans mon fichier, la colonne rack s'appelle Emplacement_rack'.
    """
    article_id:   str = "Article"
    article_name: str = "Article"
    rack:         str = "rack"
    column:       str = "colonne"
    level:        str = "niveau"
    location:     str = "emplacement"
    prep_number:  str = "N° prépa"
    quantity:     str = "Qté VLG prl"
    pick_date:    str = "Date chargement"


class UploadResult(BaseModel):
    warehouse_id: int
    rows_imported: int
    rows_skipped:  int
    racks_found:   list[str]
    date_range:    dict[str, str]
    message:       str
