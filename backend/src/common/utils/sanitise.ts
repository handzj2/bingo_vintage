/**
 * Input sanitisation utilities.
 *
 * Problem: `notes`, `description`, `reason`, `collectedBy` fields are
 * stored verbatim from user input and rendered in the frontend without
 * escaping. An XSS payload in a notes field is stored in DB, returned
 * in API responses, and rendered in React (which prevents most XSS
 * unless dangerouslySetInnerHTML is used — but SMS messages and PDF
 * receipts do not have this protection).
 *
 * Pattern: Stripe strips all HTML from customer-facing text fields
 * before storage. We do the same for any free-text field.
 */

const HTML_TAG_RE    = /<[^>]*>/g;
const SCRIPT_EVENT_RE = /\bon\w+\s*=/gi;
const NULL_BYTE_RE   = /\0/g;

/**
 * Strip HTML tags, event handlers, and null bytes from a string.
 * Keeps all printable Unicode so Luganda/Swahili names are preserved.
 */
export function sanitiseText(value: string | undefined | null): string | undefined {
  if (value === undefined || value === null) return undefined;
  return value
    .replace(HTML_TAG_RE, '')
    .replace(SCRIPT_EVENT_RE, '')
    .replace(NULL_BYTE_RE, '')
    .trim()
    .slice(0, 2000);   // hard cap — no field needs more than 2000 chars
}

/**
 * Apply sanitiseText to all string fields of an object.
 * Use in service methods before persisting free-text inputs.
 */
export function sanitiseDto<T extends Record<string, unknown>>(dto: T): T {
  const out: Record<string, unknown> = { ...dto };
  for (const [key, val] of Object.entries(out)) {
    if (typeof val === 'string') out[key] = sanitiseText(val);
  }
  return out as T;
}
