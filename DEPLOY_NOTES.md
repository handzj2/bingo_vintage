# Deploy notes — bingo_vintage_deploy

## Included
- Full bingo_vintage6 application source (excluding .git, node_modules, .next, dist)
- Module Control Centre (Nest module + Super Admin UI at /superadmin/modules)
- Migrations 044 (module registry/entitlements) and 045 (brand DNA tables)
- HandzJ DNA CSS (frontend/src/styles/handzj-dna.css)
- Super Admin nav: Modules + Brand DNA
- backend app.module.ts registers ModuleControlModule

## Deploy
1. Use this archive as the application source for Railway (or split backend/frontend per your existing setup).
2. Backend start should remain: npm run migration:run:prod && node dist/src/main
3. Migrations 044–045 are additive and non-destructive; they only run if pending.
4. After deploy, sign in as superadmin:
   - https://<host>/superadmin/modules
   - https://<host>/superadmin/brand

## Optional same-release polish
- Ensure globals.css (or root layout) includes: @import "./handzj-dna.css";
- Optionally map Tailwind bv.* colours to CSS variables via frontend/brand/tailwind.bv-tokens.snippet.js

## Follow-up (not blocking boot)
- Tag feature controllers with @RequireModule + ModuleEntitlementGuard
- Tenant sidebar consumer for GET /module-entitlements/me
- Brand publish/rollback API + full editor
