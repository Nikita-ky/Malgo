from sqlalchemy import create_engine, Column, String, Float, Date, DateTime, Text, Index
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from datetime import datetime
from app.config import get_settings

settings = get_settings()
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

class Observation(Base):
    """One data point for a FRED series."""
    __tablename__ = "observations"

    id        = Column(String, primary_key=True)  # e.g. "UNRATE_2024-01-01"
    series_id = Column(String, nullable=False, index=True)
    date      = Column(Date,   nullable=False)
    value     = Column(Float,  nullable=False)

    __table_args__ = (
        Index("ix_obs_series_date", "series_id", "date"),
    )

class SeriesMeta(Base):
    """Metadata + last-fetched timestamp per series."""
    __tablename__ = "series_meta"

    series_id    = Column(String, primary_key=True)
    title        = Column(Text)
    units        = Column(String)
    frequency    = Column(String)
    last_fetched = Column(DateTime)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)
