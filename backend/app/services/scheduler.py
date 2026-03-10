"""
APScheduler jobs:
  - Daily   07:00 UTC  → refresh daily & weekly series
  - Weekly  Sat 09:00  → refresh all series (full sync)
  - Monthly 2nd 08:00  → refresh monthly & quarterly
"""
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


def start_scheduler(sync_fn_daily, sync_fn_all):
    # Daily series: every day at 07:00 UTC
    scheduler.add_job(
        sync_fn_daily,
        CronTrigger(hour=7, minute=0),
        id="daily_sync",
        replace_existing=True,
    )
    # Full sync: every Saturday at 09:00 UTC (catches weekly CFTC / FRED updates)
    scheduler.add_job(
        sync_fn_all,
        CronTrigger(day_of_week="sat", hour=9, minute=0),
        id="weekly_full_sync",
        replace_existing=True,
    )
    # Monthly heavy sync: 2nd of each month at 08:00
    scheduler.add_job(
        sync_fn_all,
        CronTrigger(day=2, hour=8, minute=0),
        id="monthly_sync",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started")


def stop_scheduler():
    scheduler.shutdown(wait=False)
