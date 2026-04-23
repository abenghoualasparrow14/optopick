# app/models/warehouse.py
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class Warehouse(Base):
    """
    Représente un entrepôt ou une cellule d'entrepôt.
    Ex : Numilog — Cellule 14.
    """
    __tablename__ = "warehouses"

    id:           Mapped[int]   = mapped_column(primary_key=True, index=True)
    company_id:   Mapped[int]   = mapped_column(ForeignKey("companies.id"))
    name:         Mapped[str]   = mapped_column(String(200))          # "Cellule 14"
    nb_racks:     Mapped[int]   = mapped_column(Integer, default=0)
    nb_cols:      Mapped[int]   = mapped_column(Integer, default=18)  # colonnes par rack
    col_width_m:  Mapped[float] = mapped_column(Float, default=3.3)   # largeur colonne en mètres
    created_at:   Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relations
    company:  Mapped["Company"] = relationship(back_populates="warehouses")  # noqa: F821
    picks:    Mapped[list["Pick"]] = relationship(back_populates="warehouse", cascade="all, delete")  # noqa: F821
