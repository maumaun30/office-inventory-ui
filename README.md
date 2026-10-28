# Stockroom: Office Inventory UI

React + Vite + shadcn/ui front end for [office-inventory-api](https://github.com/maumaun30/office-inventory-api) (FastAPI) and [office-users-api](https://github.com/maumaun30/office-users-api) (Laravel, auth).

- Dashboard: stock, value, low-stock alerts, status and category charts
- Items: search and filters (kept in the URL), create/edit, stock adjustments with reasons, assign/return, stock history, CSV import (with preview) and export
- Assignments, categories, locations, and the user directory with each person's items
- Staff see a read-only catalog and their own items; admin-only pages and actions are hidden
- Light/dark/system theme, ⌘K search, responsive from phone to desktop

## Develop

```bash
cp .env.example .env.local     # API URLs
npm install
npm run dev                    # http://localhost:5173
```

Run the APIs with `docker compose up` in `office-inventory-api`; its compose file already allows `http://localhost:5173` for CORS. Demo logins: `admin@example.com` / `staff@example.com`, password `password`.

```bash
npm run lint && npm run build  # what CI runs
```

## Deploy to Vercel

1. Import this repo in Vercel (framework: Vite; `vercel.json` adds the SPA rewrite).
2. Set env vars for Production (and Preview):
   - `VITE_INVENTORY_API_URL`, e.g. `https://office-inventory-api.onrender.com`
   - `VITE_USERS_API_URL`, e.g. `https://office-users-api.onrender.com`
3. Allow the Vercel origin on both APIs (Render env):
   - inventory API: `CORS_ORIGINS=https://<project>.vercel.app`
   - users API: `CORS_ALLOWED_ORIGINS=https://<project>.vercel.app`
   - for preview deployments too: `CORS_ORIGIN_REGEX` / `CORS_ALLOWED_ORIGIN_PATTERN` = `https://<project>-.*\.vercel\.app`

`VITE_*` values are baked in at build time, so redeploy after changing them.

## Notes

- Sign-in calls the users API (`/api/login`); the returned Sanctum token is kept in `localStorage` and sent to both APIs. A 401 signs you out.
- The inventory API's free Render instance sleeps when idle; the first request can take up to a minute, and failed requests retry automatically.
