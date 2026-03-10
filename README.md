# mAlgo — Macro Dashboard

US macro indicator dashboard. ~55 FRED series across GDP, Labour, Inflation, Monetary, Fiscal & Financial Conditions.  
**Stack:** Python FastAPI (Render) + PostgreSQL (Supabase) + React/Vite (Netlify)

---

## Project structure

```
malgo/
├── backend/
│   ├── app/
│   │   ├── main.py                 ← FastAPI entry point + scheduler
│   │   ├── config.py               ← Settings from env vars
│   │   ├── models/db.py            ← SQLAlchemy models + DB engine
│   │   ├── routers/indicators.py   ← All API routes
│   │   └── services/
│   │       ├── fred.py             ← FRED fetch + indicator registry
│   │       └── scheduler.py        ← APScheduler auto-refresh jobs
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 ← Main layout + state
│   │   ├── api.js                  ← Axios client
│   │   ├── hooks/useMacroData.js   ← Data fetching hook
│   │   └── components/
│   │       ├── MacroChart.jsx      ← Recharts time-series card
│   │       └── Sidebar.jsx         ← Category + indicator selector
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   ├── netlify.toml
│   └── .env.example
├── render.yaml
└── .gitignore
```

---

## 1. Supabase (PostgreSQL)

1. Go to https://supabase.com → New project
2. Settings → Database → **Connection string** (Transaction mode, port 6543)
3. Copy URI — looks like:  
   `postgresql://postgres.xxxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
4. Save as `DATABASE_URL`

Tables are created automatically on first backend start (`create_tables()`).

---

## 2. FRED API Key

1. Register at https://fred.stlouisfed.org/docs/api/api_key.html (free, instant)
2. Save key as `FRED_API_KEY`

> ⚠️ Never commit `.env` or hardcode the key in source code.

---

## 3. Backend → Render.com

1. Push this repo to GitHub
2. https://render.com → **New Web Service** → connect your repo
3. Settings:
   - **Root directory:** `backend`
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Environment variables (Render dashboard → Environment):
   ```
   FRED_API_KEY   = your_key
   DATABASE_URL   = postgresql://...supabase...
   ALLOWED_ORIGINS = https://your-app.netlify.app
   ```
5. Deploy → note your URL: `https://malgo-macro-api.onrender.com`
6. Test: `GET https://malgo-macro-api.onrender.com/health`

---

## 4. Initial data load

After deploying the backend, trigger first sync:
```bash
curl -X POST https://malgo-macro-api.onrender.com/api/sync
```
This fetches all ~55 series from FRED (2000–today) and saves to Supabase.  
Takes ~2–3 minutes. Check status:
```bash
curl https://malgo-macro-api.onrender.com/api/sync/status
```

---

## 5. Frontend → Netlify

1. Create `frontend/.env.local`:
   ```
   VITE_API_URL=https://malgo-macro-api.onrender.com
   ```
2. Push to GitHub
3. https://app.netlify.com → **Add new site** → Import from Git
4. Settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`
5. Site settings → Environment variables:
   ```
   VITE_API_URL = https://malgo-macro-api.onrender.com
   ```
6. Deploy

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/api/indicators` | GET | Full indicator registry |
| `/api/series/{id}` | GET | Single series observations |
| `/api/series?ids=A,B,C` | GET | Bulk fetch (comma-separated) |
| `/api/sync` | POST | Trigger refresh (body: `{"series_ids":["UNRATE"]}` or empty for all) |
| `/api/sync/status` | GET | Last-fetched timestamps per series |

---

## Auto-refresh schedule

| Job | Trigger | Series |
|---|---|---|
| Daily sync | Every day 07:00 UTC | Daily (D) series only |
| Weekly sync | Saturday 09:00 UTC | All series |
| Monthly sync | 2nd of month 08:00 UTC | All series |

Manual refresh: click **↓ Sync FRED** in the dashboard UI.

---

## Adding CFTC COT (future)

The CFTC public API at `publicreporting.cftc.gov` returns JSON.  
Add a new service `backend/app/services/cftc.py` using the same pattern as `fred.py`.  
The endpoint for Legacy Futures is:  
`https://publicreporting.cftc.gov/resource/jun7-fc8e.json`  
Filter by `cftc_commodity_code` for CURRENCY, INTEREST RATE, STOCK INDEX, BASE METALS.

---

## Adding TGA (Treasury General Account)

TGA from `fiscaldata.treasury.gov`:  
`https://api.fiscaldata.treasury.gov/services/api/v1/accounting/dts/dts_table_1`  
No API key required. Add as a second service `backend/app/services/treasury.py`.
