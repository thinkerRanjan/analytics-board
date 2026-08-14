# Analytics Board (multi-tenant monorepo)

Config-driven GA4 analytics dashboards powered by BigQuery. One deployable Next.js app; shared packages for backend logic and UI; per-client configs under `tenants/`.

## Monorepo layout

```
apps/web                 Next.js UI + thin API routes (deployable)
packages/backend         Tenant resolution, BigQuery, metrics
packages/ui              Shared widgets + DashboardRenderer
packages/shared          Zod schemas + shared types
tenants/<slug>/tenant.json   Per-client auth, BQ dataset, dashboard widgets
sql/marts.sql            Per-dataset mart templates
```

## Quick start (mock data)

```bash
cp .env.example apps/web/.env.local
# USE_MOCK_DATA=true and AUTH_SECRET are enough for local demo
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Continue with demo data**.

Demo user `demo@analytics.local` can access both `demo` and `acme` tenants (use the client switcher).

## Adding a client

1. Create `tenants/<slug>/tenant.json` (see `tenants/demo` / `tenants/acme`).
2. Set `auth.allowedEmails` / `auth.allowedDomains`.
3. Set `bigquery.projectId` + `bigquery.dataset` for that client’s GA4 export.
4. Configure `dashboard.widgets` (`kpi` | `trend` | `sources` | `pages`).
5. Redeploy the single web app.

## Environment variables

See [`.env.example`](.env.example).

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | Auth.js session secret |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client |
| `AUTH_URL` | Canonical app URL (production) |
| `TENANTS_DIR` | Optional absolute path to `tenants/` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to shared service account JSON |
| `BIGQUERY_CREDENTIALS_JSON` | Inline SA JSON (Cloud Run) |
| `USE_MOCK_DATA` | `true` to skip BigQuery and use sample metrics |

Per-tenant project/dataset come from JSON — not global env vars.

## Auth model

- Shared Google OAuth app-wide.
- Access is gated by each tenant’s allowlist.
- Session stores `tenantIds`; active tenant is selected via cookie (`analytics_tenant`) and the UI switcher.
- Metrics APIs never accept project/dataset from the client.

## BigQuery

1. Link each client’s GA4 property → its own BigQuery dataset.
2. Grant one (or per-tenant) service account `bigquery.dataViewer` on that dataset + `bigquery.jobUser` on the project.
3. Create marts per dataset using [`sql/marts.sql`](sql/marts.sql).
4. Set `USE_MOCK_DATA=false`.

Health check (authenticated): `GET /api/health/bigquery`

## Deploy

Single artifact from the monorepo root.

### Docker Compose (recommended local / simple deploy)

```bash
cp .env.example .env
# edit AUTH_SECRET at minimum; USE_MOCK_DATA=true works out of the box

docker compose up --build -d
```

App: [http://localhost:8081](http://localhost:8081) → **Continue with demo data**.

Useful commands:

```bash
docker compose logs -f web    # follow logs
docker compose down           # stop
docker compose up --build -d  # rebuild after tenant/config changes
```

For real BigQuery + Google OAuth, set in `.env`:

```env
USE_MOCK_DATA=false
AUTH_GOOGLE_ID=...
AUTH_GOOGLE_SECRET=...
AUTH_URL=http://localhost:8081
BIGQUERY_CREDENTIALS_JSON={"type":"service_account",...}
```

Then add OAuth redirect URI `http://localhost:8081/api/auth/callback/google` and run `docker compose up --build -d` again.

Tenant JSON is baked into the image at build time (`TENANTS_DIR=/app/tenants`). After editing `tenants/`, rebuild.

### Vercel

Import the repo; build uses root `npm run build` (`apps/web`). Set env vars from `.env.example`. Ensure `TENANTS_DIR` points at the bundled `tenants` folder if needed.

### Cloud Run

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/analytics-board
gcloud run deploy analytics-board \
  --image gcr.io/PROJECT_ID/analytics-board \
  --platform managed \
  --set-env-vars "AUTH_SECRET=...,AUTH_URL=https://...,USE_MOCK_DATA=false,TENANTS_DIR=/app/tenants" \
  --set-secrets "BIGQUERY_CREDENTIALS_JSON=bq-sa:latest"
```

Tenant JSON is copied into the image. Adding a client requires a redeploy.
