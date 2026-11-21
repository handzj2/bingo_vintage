/**
 * Pure, deterministic entitlement resolution.
 * No I/O — unit-testable without Nest or a database.
 *
 * Precedence for ACCESS:
 *  1. Non-controllable modules → always ENABLED (shared infrastructure).
 *  2. Product-wide DISABLED → DISABLED (tenant cannot widen).
 *  3. Commercial status not in {ACTIVE, TRIAL} → DISABLED
 *     (PAYMENT_PENDING, NOT_ENTITLED, EXPIRED, SUSPENDED, DEVELOPMENT).
 *  4. Tenant access_state when present; else product; else registry default.
 *
 * Precedence for VISIBILITY:
 *  1. Tenant visibility when present.
 *  2. Else product visibility.
 *  3. Else registry default.
 *
 * RESTORED is a history event only. Stored commercial status after a
 * successful restore is ACTIVE (or TRIAL if a trial window is set).
 */

export type AccessState = 'ENABLED' | 'DISABLED';
export type VisibilityState = 'VISIBLE' | 'HIDDEN';
export type CommercialStatus =
  | 'DEVELOPMENT'
  | 'NOT_ENTITLED'
  | 'PAYMENT_PENDING'
  | 'TRIAL'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'SUSPENDED'
  | 'RESTORED';

export interface ResolutionInput {
  isIndependentlyControllable: boolean;
  registryDefaultAccess: AccessState;
  registryDefaultVisibility: VisibilityState;
  productAccess?: AccessState | null;
  productVisibility?: VisibilityState | null;
  tenantAccess?: AccessState | null;
  tenantVisibility?: VisibilityState | null;
  /** Stored commercial status on tenant entitlement row (if any). */
  commercialStatus?: CommercialStatus | null;
  /** If set and in the past, TRIAL/ACTIVE windows are treated as EXPIRED. */
  expiresAt?: Date | null;
  trialEndsAt?: Date | null;
  now?: Date;
}

export interface ResolutionResult {
  accessState: AccessState;
  visibilityState: VisibilityState;
  /** Effective commercial status after expiry checks (RESTORED never appears here). */
  commercialStatus: CommercialStatus;
  source: 'tenant' | 'product' | 'registry_default';
  /** Why access was forced off, if applicable. */
  accessDeniedReason?: string;
}

const COMMERCIAL_ALLOWS_ACCESS = new Set<CommercialStatus>(['ACTIVE', 'TRIAL']);

export function resolveEffectiveAccess(input: ResolutionInput): ResolutionResult {
  const now = input.now ?? new Date();

  let commercial: CommercialStatus = input.commercialStatus ?? 'ACTIVE';
  // Normalize legacy RESTORED storage to ACTIVE for effective evaluation
  if (commercial === 'RESTORED') commercial = 'ACTIVE';

  if (input.expiresAt && input.expiresAt < now) {
    commercial = 'EXPIRED';
  }
  if (commercial === 'TRIAL' && input.trialEndsAt && input.trialEndsAt < now) {
    commercial = 'EXPIRED';
  }

  // Visibility: tenant > product > registry
  let visibility: VisibilityState = input.registryDefaultVisibility;
  let source: ResolutionResult['source'] = 'registry_default';
  if (input.productVisibility) {
    visibility = input.productVisibility;
    source = 'product';
  }
  if (input.tenantVisibility) {
    visibility = input.tenantVisibility;
    source = 'tenant';
  }

  // Shared infrastructure: never commercially gated
  if (!input.isIndependentlyControllable) {
    return {
      accessState: 'ENABLED',
      visibilityState: visibility,
      commercialStatus: commercial,
      source,
    };
  }

  // Access base: tenant > product > registry
  let access: AccessState = input.registryDefaultAccess;
  source = 'registry_default';
  if (input.productAccess) {
    access = input.productAccess;
    source = 'product';
  }
  if (input.tenantAccess) {
    // Tenant may restrict further but cannot widen product DISABLED
    if (input.productAccess === 'DISABLED') {
      access = 'DISABLED';
      source = 'product';
    } else {
      access = input.tenantAccess;
      source = 'tenant';
    }
  }

  // Product-wide DISABLED always wins (even without tenant row handled above)
  if (input.productAccess === 'DISABLED') {
    access = 'DISABLED';
    source = 'product';
  }

  let accessDeniedReason: string | undefined;
  if (!COMMERCIAL_ALLOWS_ACCESS.has(commercial)) {
    access = 'DISABLED';
    accessDeniedReason = `commercial_status=${commercial}`;
  }

  return {
    accessState: access,
    visibilityState: visibility,
    commercialStatus: commercial,
    source,
    accessDeniedReason,
  };
}

/**
 * When provider requests commercialStatus RESTORED, persist ACTIVE (or TRIAL)
 * and let history record the restoration event separately.
 */
export function normalizeCommercialForStorage(
  requested: CommercialStatus | undefined,
  opts?: { trialEndsAt?: Date | null },
): CommercialStatus | undefined {
  if (requested === undefined) return undefined;
  if (requested === 'RESTORED') {
    return opts?.trialEndsAt && opts.trialEndsAt > new Date() ? 'TRIAL' : 'ACTIVE';
  }
  return requested;
}
