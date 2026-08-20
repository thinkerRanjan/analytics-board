# Skoda — live GA4 + BigQuery setup

This guide connects the **Skoda** tenant in Analytics Board to live Google Analytics 4 data exported to BigQuery.

## What you already have in this repo

| Item | Value |
|------|--------|
| Tenant config | [`tenants/skoda/tenant.json`](../tenants/skoda/tenant.json) |
| GCP project | `skoda-analytics-448506` |
| BigQuery dataset | `analytics_470547739` |
| Allowed login | `rohit@pragorlabs.com` + any `@pragorlabs.com` Google account |

Login is **Google OAuth** (not a separate username/password). Users sign in with Google; access is granted only if their email matches the Skoda allowlist.

---

## Checklist overview

1. [ ] GA4 property linked to BigQuery (daily export)
2. [ ] `events_*` tables visible in BigQuery
3. [ ] Service account with read access to Skoda dataset
4. [ ] Google OAuth client configured for Analytics Board
5. [ ] App env vars set (`USE_MOCK_DATA=false`, credentials, OAuth)
6. [ ] (Recommended) Daily mart tables in BigQuery
7. [ ] Rebuild/restart app and sign in

---

## Step 1 — Link GA4 to BigQuery

In **Google Analytics 4**:

1. Open the **Skoda** GA4 property.
2. Go to **Admin** → **Product links** → **BigQuery links**.
3. Click **Link** and choose GCP project **`skoda-analytics-448506`**.
4. Enable **Daily** export (Streaming optional).
5. Confirm export location matches tenant config: **`US`**.

In **Google Cloud Console** → BigQuery, you should see:

```
skoda-analytics-448506.analytics_470547739.events_YYYYMMDD
```

Note the dataset ID (`analytics_470547739`) must match `tenants/skoda/tenant.json`. If GA created a different dataset, update the JSON.

---

## Step 2 — Service account for BigQuery

The dashboard queries BigQuery server-side using a **service account key** (never exposed to the browser).

### Option A — Service account in the Skoda GCP project (recommended)

1. GCP Console → **skoda-analytics-448506** → **IAM & Admin** → **Service Accounts**.
2. Create e.g. `analytics-board-reader`.
3. Grant roles:
   - **BigQuery Job User** (project level)
   - **BigQuery Data Viewer** on dataset `analytics_470547739`
4. Create a **JSON key** and download it.

### Option B — Cross-project access (your current setup)

Your app uses a service account from **`tensile-oarlock-473410-u8`**, but Skoda data lives in **`skoda-analytics-448506`**. You must grant that service account access **in the Skoda project**:

**Service account email** (from your `BIGQUERY_CREDENTIALS_JSON`):

```
analytics-dashboard@tensile-oarlock-473410-u8.iam.gserviceaccount.com
```

#### Via Google Cloud Console

1. Open [IAM for skoda-analytics-448506](https://console.cloud.google.com/iam-admin/iam?project=skoda-analytics-448506)
2. Click **Grant access**
3. Principal: `analytics-dashboard@tensile-oarlock-473410-u8.iam.gserviceaccount.com`
4. Role: **BigQuery Job User** → Save
5. Go to **BigQuery** → dataset `analytics_470547739` → **Sharing** → **Permissions**
6. **Add principal** → same service account → role **BigQuery Data Viewer**

#### Via gcloud

```bash
gcloud projects add-iam-policy-binding skoda-analytics-448506 \
  --member="serviceAccount:analytics-dashboard@tensile-oarlock-473410-u8.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

bq add-iam-policy-binding \
  --project_id=skoda-analytics-448506 \
  analytics_470547739 \
  --member="serviceAccount:analytics-dashboard@tensile-oarlock-473410-u8.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"
```

Changes can take 1–2 minutes to propagate. No app restart required.

---

## Step 3 — Google OAuth (Skoda login)

1. GCP Console → **APIs & Services** → **Credentials**.
2. Create **OAuth 2.0 Client ID** → **Web application**.
3. Add **Authorized redirect URIs** (must match exactly — no trailing slash):

   | How you run the app | Redirect URI to add |
   |---------------------|---------------------|
   | `npm run dev` | `http://localhost:3000/api/auth/callback/google` |
   | Docker Compose | `http://localhost:8081/api/auth/callback/google` |
   | Production | `https://YOUR_DOMAIN/api/auth/callback/google` |

   **Error 400: redirect_uri_mismatch** means this URI is missing or wrong in Google Cloud Console. The port must match `AUTH_URL` in your env file.
4. Copy **Client ID** and **Client secret**.

### Add more Skoda users

Edit [`tenants/skoda/tenant.json`](../tenants/skoda/tenant.json):

```json
"auth": {
  "allowedEmails": ["rohit@pragorlabs.com", "colleague@skoda.com"],
  "allowedDomains": ["pragorlabs.com", "skoda.com"]
}
```

Rebuild/restart after changes (Docker bakes tenant JSON into the image).

---

## Step 4 — Environment variables

### Docker Compose (uses root `.env`)

```env
AUTH_SECRET=<long-random-string>
AUTH_URL=http://localhost:8081
PORT=8081

USE_MOCK_DATA=false

AUTH_GOOGLE_ID=<your-client-id>.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=<your-client-secret>

# Paste full service account JSON on one line, OR mount a file (see below)
BIGQUERY_CREDENTIALS_JSON={"type":"service_account",...}
```

Then:

```bash
docker compose up --build -d
```

### Local `npm run dev` (uses `apps/web/.env.local`)

Next.js reads env from **`apps/web/.env.local`**, not the root `.env`.

```bash
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local — same variables as above, but:
# AUTH_URL=http://localhost:3000
```

```bash
npm run dev
```

Open http://localhost:3000 (dev) or http://localhost:8081 (Docker) → **Continue with Google** using an allowed email.

---

## Step 5 — (Recommended) Mart tables

Raw `events_*` queries work but are slower/costlier. Run [`sql/marts.sql`](../sql/marts.sql) in BigQuery with:

- `PROJECT` → `skoda-analytics-448506`
- `DATASET` → `analytics_470547739`

Schedule daily refreshes in BigQuery **Scheduled queries**.

---

## Step 6 — Verify

1. Sign in with Google (`rohit@pragorlabs.com` or `@pragorlabs.com`).
2. Dashboard title should show **Skoda Analytics Overview**.
3. If you only have Skoda access, no tenant switcher appears.
4. Authenticated health check: `GET /api/health/bigquery` should return `"ok": true`.
5. Dashboard KPIs/charts should load without the **Mock data** badge.

### Common errors

| Symptom | Fix |
|---------|-----|
| No login button | Set `AUTH_GOOGLE_ID` + `AUTH_GOOGLE_SECRET`; for dev also check `apps/web/.env.local` |
| Access denied after Google login | Add email/domain to `tenants/skoda/tenant.json` |
| BigQuery `bigquery.jobs.create` / Job User denied | Grant **BigQuery Job User** on project `skoda-analytics-448506` to your service account (see Step 2) |
| `does not have permission to query table ... events_*` or table does not exist | See **Step 2b** below — usually missing **Data Viewer** on the dataset, or GA4 export not linked yet |
| BigQuery permission denied (tables) | Grant **BigQuery Data Viewer** on dataset `analytics_470547739` |
| Empty charts | Confirm GA export ran; check date range; verify dataset name |
| Still shows mock data | Set `USE_MOCK_DATA=false` and restart |

### Step 2b — Fix `events_*` permission / missing table

If you see:

`User does not have permission to query table skoda-analytics-448506:analytics_470547739.events_*`

**Cause A — Missing read permission (most common after fixing Job User)**

Job User lets the service account *run* queries; **Data Viewer** lets it *read* tables.

Grant **both**:

1. **Project** `skoda-analytics-448506` → IAM → service account → **BigQuery Job User** (you likely have this)
2. **Dataset** `analytics_470547739` → **Sharing** → **Permissions** → add the same service account → **BigQuery Data Viewer**

Or grant **BigQuery Data Viewer** at **project** level on `skoda-analytics-448506` (simpler, slightly broader access).

```bash
# Dataset-level (recommended)
bq add-iam-policy-binding \
  --project_id=skoda-analytics-448506 \
  analytics_470547739 \
  --member="serviceAccount:analytics-dashboard@tensile-oarlock-473410-u8.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"

# Or project-level (alternative)
gcloud projects add-iam-policy-binding skoda-analytics-448506 \
  --member="serviceAccount:analytics-dashboard@tensile-oarlock-473410-u8.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataViewer"
```

**Cause B — Tables do not exist yet**

GA4 may not be linked to BigQuery, or the daily export has not run.

In [BigQuery Console](https://console.cloud.google.com/bigquery?project=skoda-analytics-448506), confirm you see tables like:

```
skoda-analytics-448506.analytics_470547739.events_20250819
```

If the dataset is empty or missing:

1. GA4 → **Admin** → **BigQuery links** → link property to `skoda-analytics-448506`
2. Wait 24–48 hours for the first daily export (or use intraday if enabled)
3. If the dataset name differs (e.g. `analytics_XXXXX`), update `tenants/skoda/tenant.json` → `bigquery.dataset`

**Verify in BigQuery** (run as a user with access):

```sql
SELECT table_name, creation_time
FROM `skoda-analytics-448506.analytics_470547739.INFORMATION_SCHEMA.TABLES`
WHERE STARTS_WITH(table_name, 'events_')
ORDER BY creation_time DESC
LIMIT 10;
```

If this returns 0 rows, the problem is GA4 export setup — not the dashboard code.

---

## Security notes

- Never commit `.env` or service account JSON to git.
- Rotate keys if they were exposed.
- Skoda data is isolated by dataset; the app never accepts project/dataset from the browser.
