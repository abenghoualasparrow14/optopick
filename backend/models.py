from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Company(Base):
    """Une entreprise cliente."""
    __tablename__ = "companies"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(100), unique=True, nullable=False)
    email      = Column(String(150), unique=True, nullable=False)
    phone      = Column(String(30),  nullable=True)
    password   = Column(String(200), nullable=False)
    is_admin   = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    warehouses = relationship("Warehouse", back_populates="company")
    catalogue  = relationship("ArticleCatalogue", back_populates="company")

class ArticleCatalogue(Base):
    """Référentiel articles (catalogue) pour une entreprise."""
    __tablename__ = "article_catalogue"

    id              = Column(Integer, primary_key=True, index=True)
    company_id      = Column(Integer, ForeignKey("companies.id"))
    article_id      = Column(String(50), nullable=False, index=True)
    article_name    = Column(String(200), nullable=True)
    max_per_palette = Column(Float, default=100.0)

    company = relationship("Company", back_populates="catalogue")

class Warehouse(Base):
    """Un entrepôt appartenant à une entreprise."""
    __tablename__ = "warehouses"

    id             = Column(Integer, primary_key=True, index=True)
    name           = Column(String(100), nullable=False)
    company_id     = Column(Integer, ForeignKey("companies.id"))
    geometry_json  = Column(Text, nullable=True)   # {"nb_cols": 18, "pairs": [["D14","E14"], ...]}
    routing_json   = Column(Text, nullable=True)   # Graphe de routing CAO {"nodes": [...], "edges": [...]}
    created_at     = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company", back_populates="warehouses")
    picks   = relationship("Pick", back_populates="warehouse")


class Pick(Base):
    """Un événement de picking (une ligne du fichier Excel importé)."""
    __tablename__ = "picks"

    id           = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"))
    article_id   = Column(String(50),  nullable=False)
    article_name = Column(String(200))
    rack         = Column(String(20),  nullable=False)
    column       = Column(Integer,     nullable=False)
    level        = Column(String(10))
    pick_date    = Column(DateTime)
    prep_number  = Column(String(50))
    quantity     = Column(Float, default=1)

    warehouse = relationship("Warehouse", back_populates="picks")


class SlottingResult(Base):
    """Résultat d'une analyse slotting stocké pour historique."""
    __tablename__ = "slotting_results"

    id           = Column(Integer, primary_key=True, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"))
    created_at   = Column(DateTime, default=datetime.utcnow)
    result_json  = Column(Text)
    gain_meters  = Column(Float)


class AccessRequest(Base):
    """Demande d'accès d'un prospect."""
    __tablename__ = "access_requests"

    id            = Column(Integer, primary_key=True, index=True)
    company_name  = Column(String(100), nullable=False)
    email         = Column(String(150), nullable=False, unique=True)
    phone         = Column(String(30),  nullable=False)
    company_phone = Column(String(30),  nullable=True)
    website       = Column(String(200), nullable=True)
    message       = Column(String(500), nullable=True)
    status        = Column(String(20),  default="pending")
    admin_notes   = Column(String(500), nullable=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)