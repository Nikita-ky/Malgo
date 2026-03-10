"""
FRED data fetching service.
All ~60 macro indicators defined here with category, color, update frequency.
"""
import httpx
from datetime import datetime, date
from typing import Optional
from app.config import get_settings

FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"
FRED_META  = "https://api.stlouisfed.org/fred/series"

# ──────────────────────────────────────────────────────────────────────────────
# INDICATOR REGISTRY
# freq: D=daily, W=weekly, M=monthly, Q=quarterly
# ──────────────────────────────────────────────────────────────────────────────
INDICATORS: dict[str, dict] = {
    # GDP & Growth
    "GDPC1":          {"label": "Real GDP",                        "cat": "GDP",        "unit": "Bil $",  "color": "#22D3EE", "freq": "Q"},
    "GDP":            {"label": "Nominal GDP",                     "cat": "GDP",        "unit": "Bil $",  "color": "#06B6D4", "freq": "Q"},
    "PCEPI":          {"label": "PCE Price Index",                 "cat": "GDP",        "unit": "Index",  "color": "#0EA5E9", "freq": "M"},
    "NETEXP":         {"label": "Net Exports",                     "cat": "GDP",        "unit": "Bil $",  "color": "#38BDF8", "freq": "Q"},
    "DPCERE1Q156NBEA":{"label": "Real Final Sales Dom. Purchasers","cat": "GDP",        "unit": "Bil $",  "color": "#7DD3FC", "freq": "Q"},

    # Production
    "INDPRO":         {"label": "Industrial Production",           "cat": "Production", "unit": "Index",  "color": "#34D399", "freq": "M"},
    "TCU":            {"label": "Capacity Utilization",            "cat": "Production", "unit": "%",      "color": "#10B981", "freq": "M"},
    "AMTMNO":         {"label": "Factory Orders",                  "cat": "Production", "unit": "Mil $",  "color": "#059669", "freq": "M"},
    "PERMIT":         {"label": "Building Permits",                "cat": "Production", "unit": "K",      "color": "#6EE7B7", "freq": "M"},
    "HOUST":          {"label": "Housing Starts",                  "cat": "Production", "unit": "K",      "color": "#A7F3D0", "freq": "M"},
    "DGORDER":        {"label": "Durable Goods Orders",            "cat": "Production", "unit": "Mil $",  "color": "#4ADE80", "freq": "M"},
    "ISMNMDI":        {"label": "ISM Mfg New Orders",              "cat": "Production", "unit": "Index",  "color": "#86EFAC", "freq": "M"},

    # Services
    "NMFBAI":         {"label": "ISM Services PMI",                "cat": "Services",   "unit": "Index",  "color": "#A78BFA", "freq": "M"},
    "NMFNOI":         {"label": "Services New Orders",             "cat": "Services",   "unit": "Index",  "color": "#8B5CF6", "freq": "M"},

    # Consumer
    "RSAFS":          {"label": "Retail Sales",                    "cat": "Consumer",   "unit": "Mil $",  "color": "#F59E0B", "freq": "M"},
    "UMCSENT":        {"label": "Consumer Sentiment (UoM)",        "cat": "Consumer",   "unit": "Index",  "color": "#FBBF24", "freq": "M"},
    "DSPIC96":        {"label": "Real Disposable Income",          "cat": "Consumer",   "unit": "Bil $",  "color": "#FCD34D", "freq": "M"},
    "TOTALSL":        {"label": "Consumer Credit",                 "cat": "Consumer",   "unit": "Bil $",  "color": "#FDE68A", "freq": "M"},
    "PCE":            {"label": "Personal Consumption (PCE)",      "cat": "Consumer",   "unit": "Bil $",  "color": "#FEF3C7", "freq": "M"},

    # Labour Market
    "UNRATE":         {"label": "Unemployment Rate",               "cat": "Labour",     "unit": "%",      "color": "#F87171", "freq": "M"},
    "ICSA":           {"label": "Initial Jobless Claims",          "cat": "Labour",     "unit": "K",      "color": "#EF4444", "freq": "W"},
    "AHETPI":         {"label": "Avg Hourly Earnings",             "cat": "Labour",     "unit": "$",      "color": "#FCA5A5", "freq": "M"},
    "ECIWAG":         {"label": "Employment Cost Index",           "cat": "Labour",     "unit": "Index",  "color": "#FEE2E2", "freq": "Q"},
    "JTSJOL":         {"label": "JOLTS Job Openings",              "cat": "Labour",     "unit": "K",      "color": "#FB923C", "freq": "M"},
    "JTSQUR":         {"label": "Quits Rate",                      "cat": "Labour",     "unit": "%",      "color": "#FDBA74", "freq": "M"},
    "PAYEMS":         {"label": "Nonfarm Payrolls (NFP)",          "cat": "Labour",     "unit": "K",      "color": "#FED7AA", "freq": "M"},
    "CIVPART":        {"label": "Labor Force Participation",       "cat": "Labour",     "unit": "%",      "color": "#FFEDD5", "freq": "M"},
    "EMRATIO":        {"label": "Employment-Population Ratio",     "cat": "Labour",     "unit": "%",      "color": "#F97316", "freq": "M"},
    "LNS11300060":    {"label": "Prime-Age Participation",         "cat": "Labour",     "unit": "%",      "color": "#EA580C", "freq": "M"},

    # Inflation
    "CPIAUCSL":       {"label": "CPI Headline",                    "cat": "Inflation",  "unit": "Index",  "color": "#FB923C", "freq": "M"},
    "CPILFESL":       {"label": "CPI Core",                        "cat": "Inflation",  "unit": "Index",  "color": "#F97316", "freq": "M"},
    "CUSR0000SAH1":   {"label": "Shelter CPI",                     "cat": "Inflation",  "unit": "Index",  "color": "#EA580C", "freq": "M"},
    "PPIACO":         {"label": "PPI Headline",                    "cat": "Inflation",  "unit": "Index",  "color": "#C2410C", "freq": "M"},
    "PPIFID":         {"label": "PPI Core",                        "cat": "Inflation",  "unit": "Index",  "color": "#9A3412", "freq": "M"},
    "MICH":           {"label": "Inflation Expectations (UoM)",    "cat": "Inflation",  "unit": "%",      "color": "#7C2D12", "freq": "M"},
    "T5YIE":          {"label": "5Y Breakeven Inflation",          "cat": "Inflation",  "unit": "%",      "color": "#FED7AA", "freq": "D"},
    "PCEPILFE":       {"label": "PCE Core Price Index",            "cat": "Inflation",  "unit": "Index",  "color": "#FDBA74", "freq": "M"},

    # Monetary
    "FEDFUNDS":       {"label": "Fed Funds Rate",                  "cat": "Monetary",   "unit": "%",      "color": "#60A5FA", "freq": "M"},
    "WALCL":          {"label": "Fed Balance Sheet",               "cat": "Monetary",   "unit": "Mil $",  "color": "#3B82F6", "freq": "W"},
    "M2SL":           {"label": "M2 Money Supply",                 "cat": "Monetary",   "unit": "Bil $",  "color": "#2563EB", "freq": "M"},
    "RRPONTSYD":      {"label": "Reverse Repo (RRP)",              "cat": "Monetary",   "unit": "Bil $",  "color": "#93C5FD", "freq": "D"},
    "WRESBAL":        {"label": "Bank Reserves",                   "cat": "Monetary",   "unit": "Mil $",  "color": "#BFDBFE", "freq": "W"},
    "T10Y2Y":         {"label": "Yield Curve 10Y-2Y",              "cat": "Monetary",   "unit": "%",      "color": "#DBEAFE", "freq": "D"},
    "NFCI":           {"label": "Nat. Financial Conditions Index", "cat": "Monetary",   "unit": "Index",  "color": "#A5B4FC", "freq": "W"},

    # Fiscal
    "MTSDS133FMS":    {"label": "Federal Budget Surplus/Deficit",  "cat": "Fiscal",     "unit": "Mil $",  "color": "#E879F9", "freq": "M"},
    "GFDEGDQ188S":    {"label": "Debt-to-GDP",                     "cat": "Fiscal",     "unit": "%",      "color": "#D946EF", "freq": "Q"},
    "FGEXPND":        {"label": "Gov't Expenditures",              "cat": "Fiscal",     "unit": "Bil $",  "color": "#A21CAF", "freq": "Q"},
    "A091RC1Q027SBEA":{"label": "Transfer Payments",               "cat": "Fiscal",     "unit": "Bil $",  "color": "#F0ABFC", "freq": "Q"},
    "W068RCQ027SBEA": {"label": "Gov't Interest Payments",         "cat": "Fiscal",     "unit": "Bil $",  "color": "#E9D5FF", "freq": "Q"},

    # Financial Conditions
    "STLFSI4":        {"label": "St. Louis FSI",                   "cat": "FinCond",    "unit": "Index",  "color": "#FDE047", "freq": "W"},
}

CATEGORIES = {
    "GDP":        {"label": "GDP & Growth",          "icon": "◈", "color": "#22D3EE"},
    "Production": {"label": "Production",            "icon": "⬡", "color": "#34D399"},
    "Services":   {"label": "Services",              "icon": "◇", "color": "#A78BFA"},
    "Consumer":   {"label": "Consumer",              "icon": "◉", "color": "#F59E0B"},
    "Labour":     {"label": "Labour Market",         "icon": "◐", "color": "#F87171"},
    "Inflation":  {"label": "Inflation",             "icon": "△", "color": "#FB923C"},
    "Monetary":   {"label": "Monetary",              "icon": "◎", "color": "#60A5FA"},
    "Fiscal":     {"label": "Fiscal",                "icon": "▣", "color": "#E879F9"},
    "FinCond":    {"label": "Financial Conditions",  "icon": "◆", "color": "#FDE047"},
}


async def fetch_series_from_fred(series_id: str, start_date: str = "2000-01-01") -> list[dict]:
    """Fetch observations from FRED REST API."""
    settings = get_settings()
    params = {
        "series_id": series_id,
        "api_key": settings.fred_api_key,
        "file_type": "json",
        "observation_start": start_date,
        "sort_order": "asc",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(FRED_BASE, params=params)
        resp.raise_for_status()
        data = resp.json()

    observations = []
    for obs in data.get("observations", []):
        if obs["value"] in (".", ""):
            continue
        observations.append({
            "series_id": series_id,
            "date": obs["date"],
            "value": float(obs["value"]),
        })
    return observations


async def fetch_series_meta(series_id: str) -> dict:
    """Fetch series metadata from FRED."""
    settings = get_settings()
    params = {"series_id": series_id, "api_key": settings.fred_api_key, "file_type": "json"}
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(FRED_META, params=params)
        resp.raise_for_status()
        data = resp.json()
    s = data["seriess"][0]
    return {"title": s["title"], "units": s["units_short"], "frequency": s["frequency_short"]}
