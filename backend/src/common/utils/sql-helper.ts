/**
 * sql-helper.ts
 *
 * Utility functions for building tenant-aware raw SQL fragments.
 * Use these wherever you write raw parameterised queries so that
 * tenant filtering is consistent across the codebase.
 *
 * Usage example (PaymentsService):
 *
 *   import { tenantWhere, tenantInsertFragment } from '../../common/utils/sql-helper';
 *
 *   // SELECT with tenant filter
 *   const { clause, params } = tenantWhere(tenantId, branchId, 1);
 *   const rows = await repo.manager.query(
 *     `SELECT * FROM payments WHERE loan_id = $1 ${clause}`,
 *     [loanId, ...params],
 *   );
 *
 *   // INSERT with tenant columns
 *   const frag = tenantInsertFragment(tenantId, branchId);
 *   await repo.manager.query(
 *     `INSERT INTO payments (loan_id, amount, ${frag.columns})
 *      VALUES ($1, $2, ${frag.placeholders(3)})`,
 *     [loanId, amount, ...frag.values],
 *   );
 */

/**
 * tenantWhere()
 *
 * Builds a SQL AND clause for tenant + branch filtering.
 *
 * @param tenantId        - Current tenant ID
 * @param branchId        - Current branch ID (pass null to skip branch filter)
 * @param startParamIndex - The $N index of the first parameter we add (default: 1)
 *
 * @returns { clause: string, params: any[] }
 *   clause  → e.g. "AND tenant_id = $2 AND branch_id = $3"
 *   params  → [tenantId, branchId]  (values to spread into the query params array)
 */
export function tenantWhere(
  tenantId: number,
  branchId: number | null,
  startParamIndex = 1,
): { clause: string; params: any[] } {
  const params: any[] = [tenantId];
  let clause = `AND tenant_id = $${startParamIndex}`;

  if (branchId !== null && branchId !== undefined) {
    params.push(branchId);
    clause += ` AND branch_id = $${startParamIndex + 1}`;
  }

  return { clause, params };
}

/**
 * tenantInsertFragment()
 *
 * Builds column names, placeholders, and values for INSERT statements.
 *
 * @param tenantId  - Current tenant ID
 * @param branchId  - Current branch ID
 *
 * @returns { columns, placeholders(startIdx), values }
 *   columns         → "tenant_id, branch_id"
 *   placeholders(n) → "$n, $n+1"   (call with the next available param index)
 *   values          → [tenantId, branchId]
 */
export function tenantInsertFragment(
  tenantId: number,
  branchId: number,
): {
  columns: string;
  placeholders: (startIdx: number) => string;
  values: any[];
} {
  return {
    columns: 'tenant_id, branch_id',
    placeholders: (startIdx: number) => `$${startIdx}, $${startIdx + 1}`,
    values: [tenantId, branchId],
  };
}
