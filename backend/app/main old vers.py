from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import get_settings
from app.models.db import create_tables
from app.routers.indicators import router, _do_sync
from app.services.fred import INDICATORS
from app.services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

settings = get_settings()

DAILY_SERIES  = [k for k, v in INDICATORS.items() if v["freq"] == "D"]
ALL_SERIES    = list(INDICATORS.keys())

async def _daily_sync():
    await _do_sync(DAILY_SERIES)

async def _full_sync():
    await _do_sync(ALL_SERIES)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting mAlgo macro service...")
    create_tables()
    start_scheduler(_daily_sync, _full_sync)
    yield
    stop_scheduler()


app = FastAPI(
    title="mAlgo Macro API",
    description="US macro indicators from FRED, BLS, Treasury",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "mAlgo Macro API"}
