# app/models/pick.py
from datetime import date, datetime
from sqlalchemy import String, Date, DateTime, Integer, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.database import Base


class Pick(Base):
    """
    Représente une ligne d'historique de picking.
    Importée depuis le fichier Excel/CSV du client.
    """
    __tablename__ = "picks"

    id:             Mapped[int]   = mapped_column(primary_key=True, index=True)
    warehouse_id:   Mapped[int]   = mapped_column(ForeignKey("warehouses.id"), index=True)

    # Champs métier (mappés depuis le fichier du client)
    article_id:     Mapped[str]   = mapped_column(String(100), index=True)
    article_name:   Mapped[str]   = mapped_column(String(300), default="")
    rack:           Mapped[str]   = mapped_column(String(50),  index=True)
    column:         Mapped[int]   = mapped_column(Integer)
    level:          Mapped[str]   = mapped_column(String(20),  default="")
    location:       Mapped[str]   = mapped_column(String(100), default="")
    prep_number:    Mapped[str]   = mapped_column(String(100), default="", index=True)
    quantity:       Mapped[float] = mapped_column(Float, default=1.0)
    pick_date:      Mapped[date]  = mapped_column(Date, index=True)

    created_at:     Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relations
    warehouse: Mapped["Warehouse"] = relationship(back_populates="picks")  # noqa: F821
