"""
CFTC COT (Commitments of Traders) — Legacy Futures Only
Source: https://publicreporting.cftc.gov/resource/jun7-fc8e.json
No API key required. Updated every Friday.

IMPORTANT: Filter by cftc_contract_market_code (not cftc_commodity_code!)
"""
import httpx

CFTC_BASE = "https://publicreporting.cftc.gov/resource/jun7-fc8e.json"

# cftc_contract_market_code is the correct filter field
COT_CONTRACTS = {
    # CURRENCY — CME
    "EUR":    {"label": "Euro FX",          "code": "099741", "cat": "CURRENCY",      "color": "#22D3EE"},
    "JPY":    {"label": "Japanese Yen",      "code": "097741", "cat": "CURRENCY",      "color": "#06B6D4"},
    "GBP":    {"label": "British Pound",     "code": "096742", "cat": "CURRENCY",      "color": "#0EA5E9"},
    "CAD":    {"label": "Canadian Dollar",   "code": "090741", "cat": "CURRENCY",      "color": "#38BDF8"},
    "CHF":    {"label": "Swiss Franc",       "code": "092741", "cat": "CURRENCY",      "color": "#7DD3FC"},
    "AUD":    {"label": "Australian Dollar", "code": "232741", "cat": "CURRENCY",      "color": "#BAE6FD"},
    "MXN":    {"label": "Mexican Peso",      "code": "095741", "cat": "CURRENCY",      "color": "#E0F2FE"},
    # INTEREST RATES — CBOT
    "10Y":    {"label": "10Y T-Note",        "code": "043602", "cat": "INTEREST_RATE", "color": "#60A5FA"},
    "5Y":     {"label": "5Y T-Note",         "code": "044601", "cat": "INTEREST_RATE", "color": "#3B82F6"},
    "2Y":     {"label": "2Y T-Note",         "code": "042601", "cat": "INTEREST_RATE", "color": "#2563EB"},
    "30Y":    {"label": "30Y T-Bond",        "code": "020601", "cat": "INTEREST_RATE", "color": "#1D4ED8"},
    # STOCK INDICES — CME
    "SP500":  {"label": "S&P 500",           "code": "13874A", "cat": "STOCK_INDEX",   "color": "#34D399"},
    "NQ":     {"label": "Nasdaq 100",        "code": "209742", "cat": "STOCK_INDEX",   "color": "#10B981"},
    "RUT":    {"label": "Russell 2000",      "code": "239742", "cat": "STOCK_INDEX",   "color": "#6EE7B7"},
    # BASE METALS — COMEX
    "GOLD":   {"label": "Gold",              "code": "088691", "cat": "BASE_METALS",   "color": "#F59E0B"},
    "SILVER": {"label": "Silver",            "code": "084691", "cat": "BASE_METALS",   "color": "#D1D5DB"},
    "COPPER": {"label": "Copper",            "code": "085692", "cat": "BASE_METALS",   "color": "#F97316"},
}

COT_CATEGORIES = {
    "CURRENCY":      {"label": "Currency",       "color": "#22D3EE"},
    "INTEREST_RATE": {"label": "Interest Rates", "color": "#60A5FA"},
    "STOCK_INDEX":   {"label": "Stock Indices",  "color": "#34D399"},
    "BASE_METALS":   {"label": "Base Metals",    "color": "#F59E0B"},
}


async def fetch_cot_contract(contract_id: str, start_date: str = "2000-01-01") -> list[dict]:
    """Fetch COT data for one contract from CFTC Socrata API."""
    info = COT_CONTRACTS.get(contract_id)
    if not info:
        raise ValueError(f"Unknown contract: {contract_id}")

    # Use cftc_contract_market_code (not cftc_commodity_code!)
    params = {
        "$where": f"cftc_contract_market_code='{info['code']}' AND report_date_as_yyyy_mm_dd >= '{start_date}'",
        "$select": (
            "report_date_as_yyyy_mm_dd,"
            "noncomm_positions_long_all,"
            "noncomm_positions_short_all,"
            "comm_positions_long_all,"
            "comm_positions_short_all,"
            "open_interest_all"
        ),
        "$order": "report_date_as_yyyy_mm_dd ASC",
        "$limit": "2000",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(CFTC_BASE, params=params)
        resp.raise_for_status()
        rows = resp.json()

    result = []
    for row in rows:
        try:
            nc_long  = float(row.get("noncomm_positions_long_all",  0) or 0)
            nc_short = float(row.get("noncomm_positions_short_all", 0) or 0)
            c_long   = float(row.get("comm_positions_long_all",     0) or 0)
            c_short  = float(row.get("comm_positions_short_all",    0) or 0)
            oi       = float(row.get("open_interest_all",           0) or 0)

            if nc_long == 0 and nc_short == 0:
                continue

            result.append({
                "date":          row["report_date_as_yyyy_mm_dd"][:10],
                "net_spec":      round(nc_long - nc_short),
                "net_comm":      round(c_long  - c_short),
                "spec_long":     round(nc_long),
                "spec_short":    round(nc_short),
                "comm_long":     round(c_long),
                "comm_short":    round(c_short),
                "open_interest": round(oi),
            })
        except (KeyError, ValueError):
            continue

    return result
