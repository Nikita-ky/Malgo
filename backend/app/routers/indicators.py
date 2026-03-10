"""
API routes:
  GET  /api/indicators              → list all indicators with metadata
  GET  /api/series/{series_id}      → observations for one series (from DB)
  POST /api/sync                    → manual refresh (all or specific IDs)
  GET  /api/sync/status             → last-fetched timestamps
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
import logging

from app.models.db import get_db, Observation, SeriesMeta
from app.services.fred import (
    INDICATORS, CATEGORIES,
    fetch_series_from_fred, fetch_series_meta,
)

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


class SyncRequest(BaseModel):
    series_ids: Optional[list[str]] = None


# ── GET /api/indicators ───────────────────────────────────────────────────────
@router.get("/indicators")
def list_indicators():
    return {"indicators": INDICATORS, "categories": CATEGORIES}


# ── GET /api/series/{series_id} ───────────────────────────────────────────────
@router.get("/series/{series_id}")
def get_series(
    series_id: str,
    start: Optional[str] = Query("2000-01-01"),
    db: Session = Depends(get_db),
):
    rows = (
        db.execute(
            select(Observation)
            .where(Observation.series_id == series_id)
            .where(Observation.date >= start)
            .order_by(Observation.date)
        )
        .scalars()
        .all()
    )
    if not rows:
        raise HTTPException(404, f"No data for {series_id}. Try POST /api/sync first.")

    meta = db.get(SeriesMeta, series_id)
    return {
        "series_id": series_id,
        "meta": {
            "label": INDICATORS.get(series_id, {}).get("label", series_id),
            "unit": meta.units if meta else "",
            "last_fetched": meta.last_fetched.isoformat() if meta else None,
            **INDICATORS.get(series_id, {}),
        },
        "observations": [{"date": str(r.date), "value": r.value} for r in rows],
    }


# ── GET /api/series (bulk) ────────────────────────────────────────────────────
@router.get("/series")
def get_multiple_series(
    ids: str = Query(..., description="Comma-separated series IDs"),
    start: Optional[str] = Query("2000-01-01"),
    db: Session = Depends(get_db),
):
    series_ids = [s.strip() for s in ids.split(",") if s.strip()]
    result = {}
    for sid in series_ids:
        rows = (
            db.execute(
                select(Observation)
                .where(Observation.series_id == sid)
                .where(Observation.date >= start)
                .order_by(Observation.date)
            )
            .scalars()
            .all()
        )
        if rows:
            result[sid] = {
                "meta": INDICATORS.get(sid, {}),
                "observations": [{"date": str(r.date), "value": r.value} for r in rows],
            }
    return result


# ── POST /api/sync ────────────────────────────────────────────────────────────
@router.post("/sync")
async def sync_data(
    background_tasks: BackgroundTasks,
    body: SyncRequest = None,
):
    """
    Trigger a data refresh.
    Body (optional): {"series_ids": ["UNRATE","FEDFUNDS"]}
    If omitted or empty, syncs all indicators.
    """
    ids_to_sync = (body.series_ids if body and body.series_ids else None) or list(INDICATORS.keys())
    background_tasks.add_task(_do_sync, ids_to_sync)
    return {"status": "sync_started", "count": len(ids_to_sync), "series": ids_to_sync}


async def _do_sync(series_ids: list[str]):
    from app.models.db import SessionLocal
    db = SessionLocal()
    try:
        for sid in series_ids:
            try:
                logger.info(f"Syncing {sid}...")
                observations = await fetch_series_from_fred(sid)
                meta_data = await fetch_series_meta(sid)

                for obs in observations:
                    pk = f"{obs['series_id']}_{obs['date']}"
                    existing = db.get(Observation, pk)
                    if existing:
                        existing.value = obs["value"]
                    else:
                        db.add(Observation(id=pk, series_id=obs["series_id"],
                                           date=obs["date"], value=obs["value"]))

                meta = db.get(SeriesMeta, sid)
                if meta:
                    meta.last_fetched = datetime.utcnow()
                    meta.title = meta_data["title"]
                    meta.units = meta_data["units"]
                    meta.frequency = meta_data["frequency"]
                else:
                    db.add(SeriesMeta(
                        series_id=sid,
                        title=meta_data["title"],
                        units=meta_data["units"],
                        frequency=meta_data["frequency"],
                        last_fetched=datetime.utcnow(),
                    ))
                db.commit()
                logger.info(f"  OK {sid}: {len(observations)} observations saved")
            except Exception as e:
                logger.error(f"  FAIL {sid}: {e}")
                db.rollback()
    finally:
        db.close()


# ── GET /api/sync/status ──────────────────────────────────────────────────────
@router.get("/sync/status")
def sync_status(db: Session = Depends(get_db)):
    rows = db.execute(select(SeriesMeta)).scalars().all()
    return {
        r.series_id: {
            "last_fetched": r.last_fetched.isoformat() if r.last_fetched else None,
            "title": r.title,
            "frequency": r.frequency,
        }
        for r in rows
    }
