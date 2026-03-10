from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import get_settings
from app.models.db import create_tables
from app.routers.indicators import router as fred_router, _do_sync
from app.routers.cot import router as cot_router
from app.services.fred import INDICATORS
from app.services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()

DAILY_SERIES = [k for k, v in INDICATORS.items() if v["freq"] == "D"]
ALL_SERIES   = list(INDICATORS.keys())

async def _daily_sync():
    await _do_sync(DAILY_SERIES)

async def _full_sync():
    await _do_sync(ALL_SERIES)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting mAlgo macro service...")
    try:
        create_tables()
        logger.info("Database tables ready.")
    except Exception as e:
        logger.error(f"DB unavailable on startup: {e}")
        logger.warning("Server will start anyway — DB will reconnect on first request.")
    try:
        start_scheduler(_daily_sync, _full_sync)
    except Exception as e:
        logger.error(f"Scheduler error: {e}")
    yield
    stop_scheduler()


app = FastAPI(
    title="mAlgo Macro API",
    description="US macro indicators from FRED + CFTC COT positioning",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fred_router)
app.include_router(cot_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "mAlgo Macro API v2"}
