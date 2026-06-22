/**
 * ColumnNumericTransformer
 *
 * PostgreSQL's `numeric`/`decimal` type is returned by the `pg` driver as a
 * STRING, not a number — this is intentional upstream behaviour (avoids
 * floating-point precision loss on large/precise values), but it means
 * every `@Column({ type: 'decimal', ... })` field in a TypeORM entity is
 * actually a string at runtime, despite being typed `number` in TypeScript.
 *
 * This silently breaks any arithmetic done on these fields after they cross
 * the API boundary — e.g. `loans.reduce((s, l) => s + l.balance, 0)` does
 * STRING CONCATENATION for the first add (0 + "50000.00" → "050000.00"),
 * then garbage arithmetic after that, eventually producing NaN once the
 * accumulated string can't be coerced to a number at all. This is exactly
 * what caused "Outstanding: UGX NaNM" on the loans page.
 *
 * Usage — add `transformer: new ColumnNumericTransformer()` to every
 * `@Column({ type: 'decimal', ... })` decorator:
 *
 *   @Column({ type: 'decimal', precision: 12, scale: 2, transformer: new ColumnNumericTransformer() })
 *   balance: number;
 */
export class ColumnNumericTransformer {
  to(data: number | null | undefined): number | null | undefined {
    return data; // writes are unaffected — pg accepts numbers fine on insert/update
  }

  from(data: string | null): number | null {
    if (data === null || data === undefined) return null;
    const parsed = parseFloat(data);
    return isNaN(parsed) ? null : parsed;
  }
}
