# Maintenance Mode — Bingo Vintage

**Added:** 2026-09-19  
**Purpose:** Put the production site offline without deleting anything.

## Toggle

| Env var | Result |
|---------|--------|
| `SITE_STATUS=ON` (or unset) | Normal website |
| `SITE_STATUS=OFF` | Offline page for every visitor |

**Vercel:** Project → Settings → Environment Variables → set `SITE_STATUS` → Redeploy.

## Files added / changed

| File | Status |
|------|--------|
| `src/app/layout.tsx` | **Modified** — SITE_STATUS switch |
| `src/components/MaintenanceScreen.tsx` | **New** — offline UI |
| `src/app/not-found.tsx` | **New** — explicit 404 |
| `MAINTENANCE_MODE.md` | **New** — this file |

## Offline page shows

- **Bingo Vintage**
- Website temporarily unavailable
- Contact hosting administrator: **Handzj Tech**
  - Call / WhatsApp: 0781909507
  - Email: handzj2@gmail.com

No client CTAs. Dark-mode safe (inline styles).

## Restore

Set `SITE_STATUS=ON` → Redeploy.
