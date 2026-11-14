/** Run: npx jest test/payment-date-guard.spec.ts */
import { BadRequestException } from '@nestjs/common';
import { assertPaymentDateNotFuture } from '../src/common/utils/payment-date';
import { getEffectiveRole, isAdmin } from '../src/common/helpers/role-helper';

describe('assertPaymentDateNotFuture', () => {
  const day = 24 * 3600 * 1000;
  it('accepts now, the past and undefined', () => {
    expect(() => assertPaymentDateNotFuture(new Date())).not.toThrow();
    expect(() => assertPaymentDateNotFuture(new Date(Date.now() - 30 * day))).not.toThrow();
    expect(() => assertPaymentDateNotFuture(undefined)).not.toThrow();
  });
  it('rejects tomorrow and two weeks ahead', () => {
    expect(() => assertPaymentDateNotFuture(new Date(Date.now() + day + 3600e3))).toThrow(BadRequestException);
    expect(() => assertPaymentDateNotFuture(new Date(Date.now() + 14 * day).toISOString())).toThrow(BadRequestException);
  });
  it('treats a date-only string by Kampala day', () => {
    const k = (offsetDays: number) => new Date(Date.now() + 3 * 3600e3 + offsetDays * day).toISOString().slice(0, 10);
    expect(() => assertPaymentDateNotFuture(k(0))).not.toThrow();
    expect(() => assertPaymentDateNotFuture(k(1))).toThrow(BadRequestException);
  });
});

describe('role normalisation', () => {
  it('treats super_admin as an admin', () => {
    expect(getEffectiveRole({ roleName: 'Super_Admin' } as any)).toBe('superadmin');
    expect(isAdmin({ roleName: 'super_admin' } as any)).toBe(true);
  });
});
