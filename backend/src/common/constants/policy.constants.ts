/**
 * Policy constants — single source of truth.
 * Update this file when policy identifiers change.
 * Never hardcode policy strings in business logic.
 */

/** Loan and payment policy identifier effective from 10 January 2026. */
export const POLICY_REF = '2026-01-10' as const;

/** Placeholder written to policyReference while a reversal is pending approval. */
export const REVERSAL_PENDING_REF = 'REVERSAL_PENDING' as const;

/** Policy reference applied after a reversal request is rejected. */
export const REVERSAL_REJECTED_REF = POLICY_REF;
