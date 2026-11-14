import { BadRequestException } from '@nestjs/common';
import { endOfKampalaDay, startOfKampalaDay } from './kampala-time';

// Allow a few minutes of clock drift between the phone/browser and the server.
const SKEW_MS = 10 * 60 * 1000;

/**
 * A payment is money already received, so it can never be dated in the future.
 * `raw` may be a Date, an ISO instant, or a date-only string (YYYY-MM-DD, taken as a Kampala day).
 * Throws BadRequestException when the date is after "now" (or after today, for date-only values).
 */
export function assertPaymentDateNotFuture(raw: Date | string | undefined | null, label = 'Payment date'): void {
  if (raw === undefined || raw === null || raw === '') return;
  const msg = `${label} cannot be in the future. Payments are recorded on or after the day the money was received.`;

  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    const [y, m, d] = raw.trim().split('-').map(Number);
    const dayStartKampala = new Date(Date.UTC(y, m - 1, d) - 3 * 60 * 60 * 1000);
    if (dayStartKampala.getTime() > endOfKampalaDay().getTime()) throw new BadRequestException(msg);
    return;
  }
  const t = raw instanceof Date ? raw : new Date(raw);
  if (isNaN(t.getTime())) return; // format errors are reported by the caller's own validation
  if (t.getTime() > Date.now() + SKEW_MS) throw new BadRequestException(msg);
}

export { startOfKampalaDay };
