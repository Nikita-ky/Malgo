"""
COT API routes:
  GET  /api/cot/contracts         → list all tracked contracts
  GET  /api/cot/{contract_id}     → COT observations for one contract
  GET  /api/cot                   → bulk fetch multiple contracts
  POST /api/cot/sync              → fetch from CFTC and save to DB
  GET  /api/cot/sync/status       → last-fetched timestamps
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
import logging

from app.models.db import get_db
from app.models.cot_db import CotObservation, CotMeta, create_cot_tables
from app.services.cftc import COT_CONTRACTS, COT_CATEGORIES, fetch_cot_contract

router = APIRouter(prefix="/api/cot")
logger = logging.getLogger(__name__)


class CotSyncRequest(BaseModel):
    contract_ids: Optional[list[str]] = None


# ── GET /api/cot/contracts ────────────────────────────────────────────────────
@router.get("/contracts")
def list_contracts():
    return {"contracts": COT_CONTRACTS, "categories": COT_CATEGORIES}


# ── GET /api/cot/sync/status ──────────────────────────────────────────────────
@router.get("/sync/status")
def cot_sync_status(db: Session = Depends(get_db)):
    rows = db.execute(select(CotMeta)).scalars().all()
    return {
        r.contract_id: {
            "last_fetched": r.last_fetched.isoformat() if r.last_fetched else None,
            **COT_CONTRACTS.get(r.contract_id, {}),
        }
        for r in rows
    }


# ── GET /api/cot/{contract_id} ────────────────────────────────────────────────
@router.get("/{contract_id}")
def get_cot(
    contract_id: str,
    start: Optional[str] = Query("2000-01-01"),
    db: Session = Depends(get_db),
):
    contract_id = contract_id.upper()
    rows = (
        db.execute(
            select(CotObservation)
            .where(CotObservation.contract_id == contract_id)
            .where(CotObservation.date >= start)
            .order_by(CotObservation.date)
        )
        .scalars()
        .all()
    )
    if not rows:
        raise HTTPException(404, f"No COT data for {contract_id}. Try POST /api/cot/sync first.")

    return {
        "contract_id": contract_id,
        "meta": COT_CONTRACTS.get(contract_id, {}),
        "observations": [
            {
                "date":          str(r.date),
                "net_spec":      r.net_spec,
                "net_comm":      r.net_comm,
                "spec_long":     r.spec_long,
                "spec_short":    r.spec_short,
                "comm_long":     r.comm_long,
                "comm_short":    r.comm_short,
                "open_interest": r.open_interest,
            }
            for r in rows
        ],
    }


# ── GET /api/cot (bulk) ───────────────────────────────────────────────────────
@router.get("")
def get_multiple_cot(
    ids: str = Query(..., description="Comma-separated contract IDs e.g. EUR,GBP,GOLD"),
    start: Optional[str] = Query("2000-01-01"),
    db: Session = Depends(get_db),
):
    contract_ids = [s.strip().upper() for s in ids.split(",") if s.strip()]
    result = {}
    for cid in contract_ids:
        rows = (
            db.execute(
                select(CotObservation)
                .where(CotObservation.contract_id == cid)
                .where(CotObservation.date >= start)
                .order_by(CotObservation.date)
            )
            .scalars()
            .all()
        )
        if rows:
            result[cid] = {
                "meta": COT_CONTRACTS.get(cid, {}),
                "observations": [
                    {
                        "date":      str(r.date),
                        "net_spec":  r.net_spec,
                        "net_comm":  r.net_comm,
                        "spec_long": r.spec_long,
                        "spec_short":r.spec_short,
                        "open_interest": r.open_interest,
                    }
                    for r in rows
                ],
            }
    return result


# ── POST /api/cot/sync ────────────────────────────────────────────────────────
@router.post("/sync")
async def sync_cot(
    background_tasks: BackgroundTasks,
    body: CotSyncRequest = None,
):
    ids = (body.contract_ids if body and body.contract_ids else None) or list(COT_CONTRACTS.keys())
    background_tasks.add_task(_do_cot_sync, ids)
    return {"status": "cot_sync_started", "count": len(ids), "contracts": ids}


async def _do_cot_sync(contract_ids: list[str]):
    from app.models.db import SessionLocal
    create_cot_tables()
    db = SessionLocal()
    try:
        for cid in contract_ids:
            try:
                logger.info(f"COT syncing {cid}...")
                observations = await fetch_cot_contract(cid)

                for obs in observations:
                    pk = f"{cid}_{obs['date']}"
                    existing = db.get(CotObservation, pk)
                    if existing:
                        existing.net_spec      = obs["net_spec"]
                        existing.net_comm      = obs["net_comm"]
                        existing.spec_long     = obs["spec_long"]
                        existing.spec_short    = obs["spec_short"]
                        existing.comm_long     = obs["comm_long"]
                        existing.comm_short    = obs["comm_short"]
                        existing.open_interest = obs["open_interest"]
                    else:
                        db.add(CotObservation(
                            id=pk,
                            contract_id=cid,
                            date=obs["date"],
                            net_spec=obs["net_spec"],
                            net_comm=obs["net_comm"],
                            spec_long=obs["spec_long"],
                            spec_short=obs["spec_short"],
                            comm_long=obs["comm_long"],
                            comm_short=obs["comm_short"],
                            open_interest=obs["open_interest"],
                        ))

                meta = db.get(CotMeta, cid)
                if meta:
                    meta.last_fetched = datetime.utcnow()
                else:
                    db.add(CotMeta(contract_id=cid, last_fetched=datetime.utcnow()))

                db.commit()
                logger.info(f"  OK COT {cid}: {len(observations)} weeks saved")
            except Exception as e:
                logger.error(f"  FAIL COT {cid}: {e}")
                db.rollback()
    finally:
        db.close()
