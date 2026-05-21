# GoalPressure AI — Cloud Deploy Guide

Production deployment targets: **Railway** (recommended 24/7) or **Vercel** (UI + API) with **Supabase** for hybrid persistence. Local JSON fallback remains active if cloud writes fail.

---

## Prerequisites

- Node.js **20+**
- Sportmonks API token (in-play livescores)
- Supabase project (optional but recommended)
- Telegram bot token + chat ID (sandbox until go-live)

---

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the full script:

   `supabase/schema.sql`

3. Copy from **Project Settings → API**:
   - Project URL → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only, never expose to browser)

4. Hybrid writes use `lib/storage/cloudPersistence.ts` — failures fall back to JSON under `data/`.

---

## 2. Environment variables

Use `.env.production.example` as the checklist.

| Variable | Required | Notes |
|----------|----------|-------|
| `SPORTMONKS_API_TOKEN` | Yes | Live match feed |
| `SUPABASE_URL` | Recommended | Cloud persistence |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Server-side only |
| `TELEGRAM_SANDBOX_MODE` | Yes | Keep `true` until approved |
| `TELEGRAM_BOT_TOKEN` | Optional | Required when sandbox off |
| `TELEGRAM_CHAT_ID` | Optional | Target channel/chat |
| `GP_LOG_VERBOSE` | No | `false` in production |
| `PORT` | Railway | Auto-set on Railway |

---

## 3. Railway deploy (recommended 24/7)

Best for: persistent `data/` volume, background polling, Docker healthchecks.

1. Connect repository; set **root directory** to `frontend/`.
2. Railway detects `Dockerfile` + `railway.json`.
3. Add all env vars from section 2.
4. Optional: attach a **volume** mounted at `/app/data` for durable JSON history.
5. Deploy. Health check: `GET /api/health`.

```bash
# Local Docker smoke test
cd frontend
docker build -t goalpressure-ai .
docker run -p 3000:3000 \
  -e SPORTMONKS_API_TOKEN=xxx \
  -e TELEGRAM_SANDBOX_MODE=true \
  goalpressure-ai
curl http://localhost:3000/api/health
```

---

## 4. Vercel deploy

Best for: global edge UI, serverless API routes.

1. Import project; **Root Directory** = `frontend`.
2. Framework preset: **Next.js** (`vercel.json` included).
3. Add environment variables (Production + Preview).
4. Note: serverless filesystem is **ephemeral** — JSON under `data/` may not persist between invocations. Use Supabase for durable storage on Vercel.

```bash
cd frontend
npm run build
```

---

## 5. Health check

`GET /api/health`

```json
{
  "status": "healthy | degraded | unhealthy",
  "uptime": 1234,
  "database": { "configured", "connected", "mode" },
  "telegram": { "sandbox", "configured", "status" },
  "liveFeed": { "sportmonksTokenSet", "status" },
  "storage": { "jsonFallback", "writable", "dataDir" },
  "environment": "production",
  "timestamp": "..."
}
```

- `503` when `status` is `unhealthy`
- Excluded from strict API rate limits

---

## 6. API rate limiting

Middleware applies **120 requests / minute / IP** to `/api/*` (except `/api/health`). Responses include `X-RateLimit-*` headers; `429` when exceeded.

---

## 7. Production logging

- `logInfo` suppressed in production unless `GP_LOG_VERBOSE=true`
- `logWarn` / `logError` always on
- `logOps` for minimal operational lines (health, critical paths)

---

## 8. Production checklist

- [ ] `supabase/schema.sql` applied
- [ ] `SPORTMONKS_API_TOKEN` set and validated
- [ ] `TELEGRAM_SANDBOX_MODE=true` (until go-live approval)
- [ ] `GP_LOG_VERBOSE=false`
- [ ] `GET /api/health` returns `healthy` or acceptable `degraded`
- [ ] `GET /api/live-matches` returns data or empty list (not 503)
- [ ] JSON dirs writable (Railway volume or local Docker)
- [ ] Supabase inserts succeeding (check logs: `supabase insert success`)
- [ ] Dashboards load: `/`, `/analytics`, `/research`, `/ops`
- [ ] No real Telegram messages until sandbox disabled

---

## 9. Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start` | Production server (`PORT`, `0.0.0.0`) |
| `npm run typecheck` | TypeScript validation |

---

## 10. Architecture notes

- **Runtime**: active model from `config/models/active-model.json` (unchanged)
- **Persistence**: JSON first, Supabase dual-write when configured
- **Telegram**: infrastructure ready; sandbox logs only
- **Experimental / analytics**: unchanged; not required for minimal live ops

For issues, inspect Railway/Vercel logs and `/api/health` first.
