import { randomBytes } from 'crypto';

/**
 * Classification of a failed work-queue query.
 *
 * The raw database error is NEVER returned to ordinary users (it can name tables/columns).
 * Ordinary users get a stable code + reference id; the reference id appears in the structured
 * server log next to the full diagnostic, so support can find the failure in one search.
 * Administrators additionally receive the classified diagnostic (no SQL text, no connection data).
 */
export type QueueErrorCategory =
  | 'missing_column'
  | 'missing_table'
  | 'invalid_sql'
  | 'permission_denied'
  | 'connection'
  | 'query_error';

export interface QueueErrorDiagnostic {
  category: QueueErrorCategory;
  pgCode?: string;
  /** Database's own message, e.g. `column l.created_by_id does not exist`. Admin-only. */
  detail?: string;
  table?: string;
  column?: string;
  remedy: string;
}

export interface QueueError {
  code: 'QUEUE_SCHEMA_MISMATCH' | 'QUEUE_QUERY_FAILED' | 'QUEUE_DB_UNAVAILABLE';
  message: string;
  /** Correlates this response with the structured server log entry. */
  reference: string;
  diagnostic?: QueueErrorDiagnostic;
}

const MIGRATION_REMEDY =
  'The database schema is behind (or different from) the code. Check the TypeORM `migrations` table ' +
  'and confirm migrations 1700000000031–1700000000035 have run (npm run migration:run:prod); ' +
  'then compare the named column/table with the entity.';

export function classifyDbError(err: any): QueueErrorDiagnostic {
  const pgCode: string | undefined = err?.code ?? err?.driverError?.code;
  const detail: string | undefined = err?.driverError?.message ?? err?.message;
  const table: string | undefined = err?.driverError?.table ?? err?.table;
  const column: string | undefined = err?.driverError?.column ?? err?.column;
  const base = { pgCode, detail: detail ? String(detail).slice(0, 300) : undefined, table, column };

  if (pgCode === '42703') return { category: 'missing_column', ...base, remedy: MIGRATION_REMEDY };
  if (pgCode === '42P01') return { category: 'missing_table', ...base, remedy: MIGRATION_REMEDY };
  if (pgCode && ['42601', '42883', '42804', '42P02', '42702', '42725', '22P02'].includes(pgCode)) {
    return {
      category: 'invalid_sql', ...base,
      remedy: 'The query is invalid for the current schema (syntax, ambiguous column, type or parameter mismatch). Fix the SQL in the service.',
    };
  }
  if (pgCode === '42501') {
    return { category: 'permission_denied', ...base, remedy: 'The database role lacks privileges on a referenced table.' };
  }
  if (pgCode && (pgCode.startsWith('08') || pgCode.startsWith('57P') || pgCode === '53300')) {
    return { category: 'connection', ...base, remedy: 'The database is unreachable, restarting or out of connections.' };
  }
  if (!pgCode && /ECONNREFUSED|ETIMEDOUT|ECONNRESET|Connection terminated/i.test(String(detail))) {
    return { category: 'connection', ...base, remedy: 'The database is unreachable, restarting or out of connections.' };
  }
  return { category: 'query_error', ...base, remedy: 'Unexpected database error; see the server log entry with this reference.' };
}

export function newQueueErrorReference(): string {
  return `PW-${randomBytes(4).toString('hex').toUpperCase()}`;
}

export function toQueueError(
  queueLabel: string,
  diagnostic: QueueErrorDiagnostic,
  reference: string,
  includeDiagnostic: boolean,
): QueueError {
  const schema = diagnostic.category === 'missing_column' || diagnostic.category === 'missing_table';
  const code: QueueError['code'] = schema
    ? 'QUEUE_SCHEMA_MISMATCH'
    : diagnostic.category === 'connection' ? 'QUEUE_DB_UNAVAILABLE' : 'QUEUE_QUERY_FAILED';
  const message =
    `The ${queueLabel} queue could not be loaded, so its count is unknown (this is NOT an empty queue). ` +
    `Please contact an administrator and quote reference ${reference}.`;
  return { code, message, reference, ...(includeDiagnostic ? { diagnostic } : {}) };
}
