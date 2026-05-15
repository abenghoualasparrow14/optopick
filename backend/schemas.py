from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, Any


# ── Auth ──────────────────────────────────────────────────────
class CompanyCreate(BaseModel):
    name: str
    email: EmailStr      # ← valide le format email automatiquement
    password: str

class CompanyLogin(BaseModel):
    email: EmailStr      # ← idem
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangePassword(BaseModel):
    old_password: str
    new_password: str

class CompanyUpdate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None

class CompanyOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    is_admin: bool
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Warehouse ─────────────────────────────────────────────────
class WarehouseCreate(BaseModel):
    name: str
    geometry_json: Optional[dict] = None
    routing_json: Optional[dict] = None

class WarehouseOut(BaseModel):
    id: int
    name: str
    geometry_json: Optional[Any] = None
    routing_json: Optional[Any] = None
    created_at: datetime
    model_config = {"from_attributes": True}


# ── Admin ─────────────────────────────────────────────────────
class AdminCreateAccount(BaseModel):
    company_name: str
    email: EmailStr
    password: str
    warehouse_name: str
    geometry_json: Optional[dict] = None
    routing_json: Optional[dict] = None


# ── Admin — Gestion des comptes clients ───────────────────────────────────────
class CompanyAdminOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    is_admin: bool
    created_at: datetime
    model_config = {"from_attributes": True}

class WarehouseAdminOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    geometry_json: Optional[Any] = None
    routing_json: Optional[Any] = None
    model_config = {"from_attributes": True}

class CompanyAdminDetail(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    is_admin: bool
    created_at: datetime
    warehouses: list[WarehouseAdminOut] = []
    model_config = {"from_attributes": True}

class CompanyAdminUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None

class WarehouseAdminUpdate(BaseModel):
    name: Optional[str] = None
    geometry_json: Optional[dict] = None
    routing_json: Optional[dict] = None


# ── Upload ────────────────────────────────────────────────────
class UploadResult(BaseModel):
    warehouse_id: int
    rows_imported: int
    racks_found: list[str]
    articles_found: int
    date_range: dict          # {"from": "2026-01-01", "to": "2026-01-31"}
    warnings: list[str]       # colonnes manquantes, lignes ignorées...


# ── Heatmap ───────────────────────────────────────────────────
class HeatmapCell(BaseModel):
    rack: str
    column: int
    picks: int

class HeatmapResponse(BaseModel):
    warehouse_id: int
    total_picks: int
    cells: list[HeatmapCell]
    rack_totals: dict         # {"S14": 264, "Q14": 260, ...}
    date_picks: dict          # {"2026-01-05": 96, ...}


# ── Slotting ──────────────────────────────────────────────────
class ArticleSlotting(BaseModel):
    article_id: str
    article_name: str
    picks: int
    pct: float
    abc_class: str            # "A", "B", "C"
    col_avg: float            # colonne moyenne actuelle
    pct_hot: float            # % picks en zone chaude (col 1–4)
    target_zone: str          # "col.1-4", "col.5-10", "col.11-18"
    status: str               # "BIEN PLACÉ", "TROP EN AVANT", "TROP EN ARRIÈRE"
    top_rack: str

class Exchange(BaseModel):
    exchange_id: int
    article_a: ArticleSlotting
    article_b: ArticleSlotting
    gain_meters: int

class SlottingResponse(BaseModel):
    warehouse_id: int
    articles: list[ArticleSlotting]
    exchanges: list[Exchange]
    simple_moves: list[ArticleSlotting]
    total_gain_meters: int


# ── Routing TSP ───────────────────────────────────────────────
class PickLocation(BaseModel):
    rack: str
    column: int
    article_id: str
    quantity: float

class RoutingRequest(BaseModel):
    warehouse_id: int
    prep_number: str          # N° préparation à optimiser

class TourResult(BaseModel):
    tour_index: int
    fill_pct: float
    distance_m: float
    path: list[PickLocation]

class RoutingResponse(BaseModel):
    prep_number: str
    optimized_path: Optional[list[PickLocation]] = None
    tours: list[TourResult]
    total_distance_m: float
    naive_distance_m: float
    gain_pct: float

class CatalogUploadResult(BaseModel):
    articles_created: int
    articles_updated: int
    ignored_rows: int

