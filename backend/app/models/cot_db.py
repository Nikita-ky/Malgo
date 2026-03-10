"""
SQLAlchemy models for CFTC COT data.
"""
from sqlalchemy import Column, String, Float, Date, DateTime, Index
from app.models.db import Base, engine


class CotObservation(Base):
    """One weekly COT data point for a contract."""
    __tablename__ = "cot_observations"

    id             = Column(String, primary_key=True)  # e.g. "EUR_2024-01-02"
    contract_id    = Column(String, nullable=False, index=True)
    date           = Column(Date,   nullable=False)
    net_spec       = Column(Float)   # Non-commercial net (speculators)
    net_comm       = Column(Float)   # Commercial net (hedgers)
    spec_long      = Column(Float)
    spec_short     = Column(Float)
    comm_long      = Column(Float)
    comm_short     = Column(Float)
    open_interest  = Column(Float)

    __table_args__ = (
        Index("ix_cot_contract_date", "contract_id", "date"),
    )


class CotMeta(Base):
    """Last-fetched timestamp per COT contract."""
    __tablename__ = "cot_meta"

    contract_id  = Column(String, primary_key=True)
    last_fetched = Column(DateTime)


def create_cot_tables():
    Base.metadata.create_all(bind=engine)
