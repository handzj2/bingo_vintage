/**
 * Unit tests for balance correction + dual-control approval (no database needed).
 * Run: npx jest test/loan-balance-correction.spec.ts
 */
import { BadRequestException, ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { LoansService, statusAfterBalanceCorrection } from '../src/modules/loans/loans.service';

const admin = { id: 1, userId: 1, tenantId: 7, roleName: 'admin', permissions: new Set<string>() };
const clerk = { id: 2, userId: 2, tenantId: 7, roleName: 'cashier', permissions: new Set<string>(['loan.correct_balance']) };
const approver = { id: 3, userId: 3, tenantId: 7, roleName: 'manager', permissions: new Set<string>(['loan.approve_correction']) };

function makeLoan(over: any = {}) {
  return { id: 5, tenantId: 7, branchId: 1, status: 'ACTIVE', balance: 100000, totalAmount: 120000, loanNumber: 'L-5',
           addAuditNote: jest.fn(), ...over };
}

function build(loan: any, corrRow?: any, loanRow?: any) {
  const queries: { sql: string; params: any[] }[] = [];
  const em: any = {
    findOne: jest.fn(async () => loan),
    save: jest.fn(async (_e: any, l: any) => l),
    query: jest.fn(async (sql: string, params: any[] = []) => {
      queries.push({ sql, params });
      if (/FROM loan_corrections WHERE id/.test(sql)) return [corrRow];
      if (/FROM loans WHERE id/.test(sql)) return [loanRow];
      if (/INSERT INTO loan_corrections/.test(sql)) return [{ id: 99 }];
      if (/^\s*UPDATE/.test(sql) && /RETURNING id/.test(sql)) return [{ id: 1 }];   // conditional UPDATEs confirm the row changed
      return [];
    }),
  };
  const svc: any = Object.create(LoansService.prototype);
  svc.loansRepo = { manager: { transaction: async (cb: any) => cb(em) } };
  return { svc: svc as LoansService, em, queries };
}

describe('statusAfterBalanceCorrection', () => {
  it('completes a loan corrected to 0 and re-opens a completed loan that owes money', () => {
    expect(statusAfterBalanceCorrection('ACTIVE', 0)).toBe('COMPLETED');
    expect(statusAfterBalanceCorrection('DEFAULTED', 0)).toBe('COMPLETED');
    expect(statusAfterBalanceCorrection('COMPLETED', 500)).toBe('ACTIVE');
    expect(statusAfterBalanceCorrection('ACTIVE', 500)).toBe('ACTIVE');
    expect(statusAfterBalanceCorrection('CANCELLED', 0)).toBe('CANCELLED');
  });
});

describe('correctBalance', () => {
  it('needs a reason, a valid number and a different balance', async () => {
    const { svc } = build(makeLoan());
    await expect(svc.correctBalance(5, 1000, 'bad', admin as any)).rejects.toThrow(BadRequestException);
    await expect(svc.correctBalance(5, NaN, 'valid reason', admin as any)).rejects.toThrow(BadRequestException);
    await expect(svc.correctBalance(5, -1, 'valid reason', admin as any)).rejects.toThrow(BadRequestException);
    await expect(svc.correctBalance(5, 100000, 'valid reason', admin as any)).rejects.toThrow(/same as the current/);
  });

  it('refuses PENDING / CANCELLED loans', async () => {
    const { svc } = build(makeLoan({ status: 'PENDING' }));
    await expect(svc.correctBalance(5, 1000, 'valid reason', admin as any)).rejects.toThrow(/cannot be corrected/);
  });

  it('refuses another tenant\'s loan', async () => {
    const { svc } = build(makeLoan({ tenantId: 99 }));
    await expect(svc.correctBalance(5, 1000, 'valid reason', admin as any)).rejects.toThrow(ForbiddenException);
  });

  it('admin applies immediately and a zero balance completes the loan', async () => {
    const loan = makeLoan();
    const { svc, queries } = build(loan);
    const res: any = await svc.correctBalance(5, 0, 'cleared at head office', admin as any);
    expect(res.status).toBe('APPLIED');
    expect(loan.balance).toBe(0);
    expect(loan.status).toBe('COMPLETED');
    expect(queries.some((q) => /INSERT INTO loan_corrections/.test(q.sql) && /'APPLIED'/.test(q.sql))).toBe(true);
  });

  it('a user without approval rights only queues it; the balance does not change', async () => {
    const loan = makeLoan();
    const { svc, queries } = build(loan);
    const res: any = await svc.correctBalance(5, 90000, 'cashier found a keying error', clerk as any);
    expect(res.status).toBe('PENDING');
    expect(loan.balance).toBe(100000);
    expect(queries.some((q) => /'PENDING'/.test(q.sql))).toBe(true);
  });
});

describe('decideCorrection', () => {
  const pending = (over: any = {}) => ({
    id: 99, tenant_id: 7, loan_id: 5, status: 'PENDING', correction_type: 'BALANCE', requested_by_id: 2,
    previous_snapshot: { balance: 100000 }, new_snapshot: { balance: 90000 }, ...over,
  });

  it('requester cannot approve their own request', async () => {
    const { svc } = build(makeLoan(), pending({ requested_by_id: 3 }), { id: 5, balance: 100000, status: 'ACTIVE', tenant_id: 7 });
    await expect(svc.decideCorrection(99, 'APPROVE', undefined, approver as any)).rejects.toThrow(ForbiddenException);
  });

  it('refuses to apply when the balance moved since the request (stale)', async () => {
    const { svc, queries } = build(makeLoan(), pending(), { id: 5, balance: 80000, status: 'ACTIVE', tenant_id: 7 });
    await expect(svc.decideCorrection(99, 'APPROVE', undefined, approver as any)).rejects.toThrow(ConflictException);
    expect(queries.some((q) => /UPDATE loans SET balance/.test(q.sql))).toBe(false);
  });

  it('applies when the balance still matches and syncs status', async () => {
    const { svc, queries } = build(makeLoan(), pending({ new_snapshot: { balance: 0 } }), { id: 5, balance: 100000, status: 'ACTIVE', tenant_id: 7 });
    const res: any = await svc.decideCorrection(99, 'APPROVE', undefined, approver as any);
    expect(res.status).toBe('APPLIED');
    const upd = queries.find((q) => /UPDATE loans SET balance = \$1, status = \$2/.test(q.sql));
    expect(upd?.params.slice(0, 2)).toEqual([0, 'COMPLETED']);
  });

  it('reject leaves the balance alone and records the reason on the loan', async () => {
    const { svc, queries } = build(makeLoan(), pending(), { id: 5, balance: 100000, status: 'ACTIVE', tenant_id: 7 });
    const res: any = await svc.decideCorrection(99, 'REJECT', 'figure was right', approver as any);
    expect(res.status).toBe('REJECTED');
    expect(queries.some((q) => /UPDATE loans SET balance/.test(q.sql))).toBe(false);
    expect(queries.some((q) => /CORRECTION_REJECTED/.test(JSON.stringify(q.params)))).toBe(true);
  });

  it('an UNSUPPORTED correction type is refused (422) and nothing is written — never marked APPLIED', async () => {
    const { svc, queries } = build(makeLoan(), pending({ correction_type: 'TERMS' }), { id: 5, balance: 100000, status: 'ACTIVE', tenant_id: 7 });
    await expect(svc.decideCorrection(99, 'APPROVE', undefined, approver as any)).rejects.toThrow(UnprocessableEntityException);
    expect(queries.some((q) => /^\s*UPDATE/.test(q.sql))).toBe(false);
  });

  it('a BALANCE correction with no valid requested balance is refused (422), not marked APPLIED', async () => {
    for (const snap of [{}, { balance: -1 }, { balance: 'x' }]) {
      const { svc, queries } = build(makeLoan(), pending({ new_snapshot: snap }), { id: 5, balance: 100000, status: 'ACTIVE', tenant_id: 7 });
      await expect(svc.decideCorrection(99, 'APPROVE', undefined, approver as any)).rejects.toThrow(UnprocessableEntityException);
      expect(queries.some((q) => /^\s*UPDATE/.test(q.sql))).toBe(false);
    }
  });

  it('a branch-scoped approver cannot decide another branch\'s correction', async () => {
    const brUser = { ...approver, roleName: 'branch_manager', branchId: 2 };
    const { svc } = build(makeLoan(), pending({ branch_id: 1 }), { id: 5, balance: 100000, status: 'ACTIVE', tenant_id: 7, branch_id: 1 });
    await expect(svc.decideCorrection(99, 'APPROVE', undefined, brUser as any)).rejects.toThrow(ForbiddenException);
  });
});
