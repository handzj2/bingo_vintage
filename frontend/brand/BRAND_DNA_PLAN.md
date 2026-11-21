# HandzJ Brand DNA — Implementation Plan (Bingo Vintage)

## Inspect findings
- Current `tailwind.config.js` uses gray/near-black + blue accent — **not** HandzJ DNA.
- Super Admin UI uses purple accents (`purple-600`) — generic SaaS drift.
- `globals.css` has motion utilities but no central identity tokens.
- Components already use `bv-*` Tailwind tokens → **keep class names**, change token values.

## Architecture
1. **Foundational DNA** (protected): Deep Ink, Graphite, Warm Ivory, Signal Green, Deep Green, Amber.
2. **Application appearance** (publishable): maps to `--bv-*` CSS variables.
3. **Persistence**: `brand_theme_versions` + `brand_theme_history` (migration 045).
4. **Publish flow**: draft → validate → publish → sets `status=published`, archives previous published, audit row.
5. **Rollback**: re-publish prior version by id (new history event; no data loss).
6. **Tenant**: no ability to alter protected identity keys; optional later scoped appearance only if product policy allows.

## Integration steps
1. Import `handzj-dna.css` from root `layout.tsx` / `globals.css`.
2. Replace hard-coded hex in `tailwind.config.js` `bv` map with CSS variable references (snippet provided).
3. Replace Super Admin purple with `bv-action` / `bv-accent` (Signal/Deep Green).
4. Backend: Brand service under SuperAdmin (list versions, save draft, publish, rollback, history).
5. Frontend Platform Admin page: token editors bound to non-protected keys + live preview iframe/panel.

## Acceptance
- Published theme changes visible app-wide via CSS variables.
- Rollback restores previous published tokens.
- Protected DNA keys rejected on tenant/public APIs.
- Invalid publish does not leave unreadable UI (validation + keep last good published).
