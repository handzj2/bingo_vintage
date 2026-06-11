/**
 * PHASE 1 — Dual Entity Resolution
 * Re-export the canonical User from users module.
 * auth/entities/user.entity.ts is kept for backward-compat imports only.
 */
export { User, SyncStatus } from '../../users/entities/user.entity';
// Legacy enum kept so any remaining `UserRole` imports don't break at compile time
export enum UserRole {
  ADMIN   = 'admin',
  MANAGER = 'manager',
  AGENT   = 'agent',
  CASHIER = 'cashier',
}
