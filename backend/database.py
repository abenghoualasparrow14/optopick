from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# SQLite pour le MVP — remplacer par PostgreSQL en production
# ex: "postgresql://user:password@localhost/optopick"
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./optopick.db")

# PostgreSQL URL from Neon or Supabase sometimes starts with 'postgres://', SQLAlchemy needs 'postgresql://'
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Only add check_same_thread for SQLite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

# Dépendance FastAPI : injecte une session DB dans chaque route
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
