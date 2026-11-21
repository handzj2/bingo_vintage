# Bingo Vintage — Current State Baseline (`bingo_vintage6`)

Inspected: 2026-11-21 against uploaded `bingo_vintage6.zip`.  
Classification uses **code evidence only**. Runtime/production behaviour is marked UNVERIFIED unless proven in this workspace.

## Previous issues vs current code

| Topic | Classification | Evidence |
|-------|----------------|----------|
| Work Queue `created_by` join | **UNVERIFIED** in this extract (dashboard.service not re-diffed fully this turn) | Prior phases claimed fixed; treat as RESOLVED only after live check |
| Silent empty queues | **UNVERIFIED** | Same |
| `decideCorrection` BALANCE-only APPLIED | **PARTIALLY RESOLVED / likely RESOLVED** | Cross-tenant + phases packages showed explicit BALANCE gate |
| Payment allocation DELETE in safeRestructure | **LIKELY RESOLVED** | phases package used supersession comments / no delete path |
| Branches `create()` TS overload | **UNVERIFIED** | May still use weak cast; build logs from earlier deploys varied |
| Migration 032 `loan_corrections` missing on prod | **UNVERIFIED / ops** | Code has migration file; live DB not queried successfully (SQL run in bash) |
| Module Control Centre | **STILL OPEN** | Not in bingo_vintage6; delivered as overlay only |
| Brand DNA / HandzJ tokens | **STILL OPEN** | tailwind uses gray/blue operational palette; Super Admin uses purple accents |
| Super Admin platform area | **RESOLVED (exists)** | `/superadmin` tenants, users, audit, stats + backend SuperAdminGuard |
| RBAC + PermissionGuard | **RESOLVED (exists)** | auth guards, permissions module, sidebar permKey |
| Fin-ops / reservations / recovery modules | **RESOLVED (present)** | backend modules + frontend routes exist |

**Rule:** Do not re-fix or reimplement rows marked RESOLVED without a new defect.

## Area matrix

| Area | Current state | Evidence | Remaining work |
|------|---------------|----------|----------------|
| Backend | Nest modules for lending, cash, fin-ops, recovery, superadmin | `src/modules/*`, app.module imports | Module entitlement wiring; brand API |
| Frontend | App router dashboard + superadmin | `src/app/dashboard/*`, `src/app/superadmin/*` | Brand token consumption; MCC UI; restricted module pages |
| Database | Migrations through 043 present in tree | `1700000000043-RecoveryAndSettlement.ts` | 044 MCC + 045 Brand (new); verify applied on prod |
| Authentication | JWT + SuperAdminGuard + PermissionGuard | guards present | Provider vs tenant-admin separation already started |
| Financial operations | Module present | financial-operations module | Entitlement tag only if commercially gated |
| Reporting | Module present | reports module | Entitlement tag |
| Security | RBAC + tenant checks in services (varies) | mixed | No client self-entitlement |
| Platform Admin | Superadmin FE/BE | tenants/users/audit | Module Control + Brand DNA centres |
| Brand DNA | **Not HandzJ-aligned** | tailwind `bv.*` gray/blue; SA purple | Foundational DNA tokens + admin publish/rollback |

## Design system today (inspect)

- **tailwind.config.js** — `bv` palette: near-black action, blue accent, gray surfaces. Not Deep Ink / Signal Green / Warm Ivory.
- **globals.css** — limited CSS vars; motion for “Bingo” wordmark; no central HandzJ DNA layer.
- **Super Admin UI** — `bg-gray-950`, `purple-600` accents (generic SaaS drift).

## Implementation baseline going forward

1. Preserve working Super Admin, RBAC, lending, payments.  
2. Module Control Centre = additive overlay (migration 044+).  
3. Brand DNA = additive token layer + Platform Admin controls (migration 045+), mapping Tailwind `bv.*` to CSS variables seeded with HandzJ colours.  
4. No mass component rewrite; components keep `bg-bv-*` classes while token values change under them.
