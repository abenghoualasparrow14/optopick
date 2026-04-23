# app/models/company.py
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class Company(Base):
    """
    Représente une entreprise cliente (ex: Numilog, Aramex, Yalidine…).
    Chaque entreprise peut avoir plusieurs entrepôts.
    """
    __tablename__ = "companies"

    id:         Mapped[int]      = mapped_column(primary_key=True, index=True)
    name:       Mapped[str]      = mapped_column(String(200), unique=True, index=True)
    email:      Mapped[str]      = mapped_column(String(200), unique=True, index=True)
    password:   Mapped[str]      = mapped_column(String(200))
    plan:       Mapped[str]      = mapped_column(String(50), default="free")   # free | pro | enterprise
    is_active:  Mapped[bool]     = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relations
    warehouses: Mapped[list["Warehouse"]] = relationship(back_populates="company", cascade="all, delete")  # noqa: F821
