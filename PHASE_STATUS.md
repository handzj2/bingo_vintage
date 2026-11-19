# Bingo Vintage — Phase Delivery Package

## Phases A–4 ✅
## Phase 5 — Frontend & Operational Visibility ✅ CORE COMPLETE

### Sidebar
- Fin Ops → /dashboard/financial-ops
- Reservations → /dashboard/reservations
- Recovery → /dashboard/recovery
- Notifications → /dashboard/notifications
- Permission-aware (financial_operations.view, reservations.view, motorcycle_recovery.view, notification.view)
- Admin/superadmin still see all

### New pages (real API, loading/empty/error, mobile-friendly)
1. **Financial Operations** — transactions list, deposits list, receive-money form (idempotent)
2. **Reservations** — create, attach financing, allocate bike, handover, cancel
3. **Recovery** — open case, authorise, custody, inspect, settlement (report-only), close + detail panel
4. **Notifications** — list, unread count, mark read / mark all read, links

### Standards applied
- Uses existing Bingo visual tokens (bv-*)
- No fake counts or decorative controls
- Sensitive actions call real backend endpoints
- Loan repayments still only on Payments page

### Not in this slice
- Full polish of every form field (e.g. client search pickers) — functional by ID
- Deep notification generation from every backend event (table + API ready; producers can be extended)
