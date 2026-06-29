// Kampala (East Africa Time, UTC+3, no DST) day-boundary helpers.
//
// ROOT CAUSE this exists to fix: Railway runs Node in UTC by default. Code
// using `new Date(); .setHours(0,0,0,0)` or date-fns's startOfDay()/endOfDay()
// computes midnight in the SERVER's local timezone, not Kampala's — silently
// shifting which payments count as "today" by up to 3 hours depending on what
// time of day the query runs. This was confirmed live: the dashboard's
// "Collected Today" figure showed UGX 0 despite same-day payments being
// visible in the payment history table at the same moment.
//
// This is the one canonical implementation — every "what counts as today"
// calculation in this codebase should call these functions rather than
// reimplementing the offset math inline.

const KAMPALA_OFFSET_MS = 3 * 60 * 60 * 1000;

/**
 * Returns the UTC instant corresponding to 00:00:00 Kampala local time,
 * for the Kampala calendar day containing `reference` (defaults to now).
 */
export function startOfKampalaDay(reference: Date = new Date()): Date {
  const kampalaWallClock = new Date(reference.getTime() + KAMPALA_OFFSET_MS);
  const kampalaMidnightUtcFields = Date.UTC(
    kampalaWallClock.getUTCFullYear(),
    kampalaWallClock.getUTCMonth(),
    kampalaWallClock.getUTCDate(),
  );
  return new Date(kampalaMidnightUtcFields - KAMPALA_OFFSET_MS);
}

/**
 * Returns the UTC instant corresponding to 23:59:59.999 Kampala local time,
 * for the same Kampala calendar day as startOfKampalaDay(reference).
 */
export function endOfKampalaDay(reference: Date = new Date()): Date {
  const start = startOfKampalaDay(reference);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}
