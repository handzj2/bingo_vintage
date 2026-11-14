/**
 * Unit tests for the reversal request state machine (no database needed).
 * Run: npx jest test/payment-reversal-flow.spec.ts
 */
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { PaymentStatus } from '../src/modules/enums/payment-status.enum';
import { ReversalStatus } from '../src/modules/payments/entities/payment.entity';

const admin = { id: 1, email: 'admin@bv.test', tenantId: 7, roleName: 'admin' };

function build(payment: any) {
  const paymentRepo: any = {
    findOne: jest.fn(async ({ where }: any) =>
      payment && where.id === payment.id && (!where.tenantId || where.tenantId === payment.tenantId) ? payment : null),
    update: jest.fn(async () => ({ affected: 1 })),
    find: jest.fn(async () => []),
  };
  const audit: any = { logAction: jest.fn(async () => undefined) };
  const svc = new PaymentsService(paymentRepo, {} as any, {} as any, audit, {} as any, {} as any, {} as any, {} as any, {} as any, {} as any);
  return { svc, paymentRepo, audit };
}

const completed = () => ({ id: 10, tenantId: 7, status: PaymentStatus.COMPLETED, reversalStatus: null });

describe('requestReversal', () => {
  it('rejects a reason shorter than 10 characters', async () => {
    const { svc } = build(completed());
    await expect(svc.requestReversal(10, 'cashier@bv.test', 'too short', 7)).rejects.toThrow(BadRequestException);
  });

  it('does not reveal or touch another tenant\'s payment', async () => {
    const { svc, paymentRepo } = build(completed());
    await expect(svc.requestReversal(10, 'c@bv.test', 'wrong amount entered', 99)).rejects.toThrow(NotFoundException);
    expect(paymentRepo.update).not.toHaveBeenCalled();
  });

  it('stores the requester in its own column, not reversed_by', async () => {
    const { svc, paymentRepo } = build(completed());
    await svc.requestReversal(10, 'cashier@bv.test', 'wrong amount entered', 7);
    const patch = paymentRepo.update.mock.calls[0][1];
    expect(patch.reversalRequestedBy).toBe('cashier@bv.test');
    expect(patch.reversalStatus).toBe(ReversalStatus.PENDING);
    expect(patch).not.toHaveProperty('reversedBy');
  });

  it('refuses a second request while one is pending', async () => {
    const { svc } = build({ ...completed(), status: PaymentStatus.REVERSAL_REQUESTED, reversalStatus: ReversalStatus.PENDING });
    await expect(svc.requestReversal(10, 'c@bv.test', 'wrong amount entered', 7)).rejects.toThrow(ConflictException);
  });

  it('refuses FAILED / PENDING payments', async () => {
    const { svc } = build({ ...completed(), status: PaymentStatus.FAILED });
    await expect(svc.requestReversal(10, 'c@bv.test', 'wrong amount entered', 7)).rejects.toThrow(ConflictException);
  });
});

describe('rejectReversalRequest', () => {
  it('cannot flip an already-REVERSED payment back to COMPLETED', async () => {
    const { svc, paymentRepo } = build({ ...completed(), status: PaymentStatus.REVERSED, reversalStatus: ReversalStatus.APPROVED });
    await expect(svc.rejectReversalRequest(10, admin, 'not valid')).rejects.toThrow(ConflictException);
    expect(paymentRepo.update).not.toHaveBeenCalled();
  });

  it('requires a reason', async () => {
    const { svc } = build({ ...completed(), status: PaymentStatus.REVERSAL_REQUESTED, reversalStatus: ReversalStatus.PENDING });
    await expect(svc.rejectReversalRequest(10, admin, '  ')).rejects.toThrow(BadRequestException);
  });

  it('keeps the requester\'s reason and records the rejection separately', async () => {
    const { svc, paymentRepo, audit } = build({
      ...completed(), status: PaymentStatus.REVERSAL_REQUESTED, reversalStatus: ReversalStatus.PENDING,
      reversalReason: 'cashier typed wrong amount',
    });
    await svc.rejectReversalRequest(10, admin, 'amount was correct');
    const patch = paymentRepo.update.mock.calls[0][1];
    expect(patch.status).toBe(PaymentStatus.COMPLETED);
    expect(patch.reversalStatus).toBe(ReversalStatus.REJECTED);
    expect(patch.reversalRejectReason).toBe('amount was correct');
    expect(patch).not.toHaveProperty('reversalReason');
    expect(audit.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYMENT_REVERSAL_REJECTED' }));
  });
});

describe('approveReversalRequest', () => {
  it('requires a pending request', async () => {
    const { svc } = build(completed());
    await expect(svc.approveReversalRequest(10, admin)).rejects.toThrow(ConflictException);
  });
});

describe('findByDateRange', () => {
  it('rejects invalid or inverted ranges', async () => {
    const { svc } = build(completed());
    await expect(svc.findByDateRange(new Date('x'), new Date(), 7)).rejects.toThrow(BadRequestException);
    await expect(svc.findByDateRange(new Date('2026-11-10'), new Date('2026-11-01'), 7)).rejects.toThrow(BadRequestException);
  });
});

describe('rejectReversalRequest — concurrent approval', () => {
  it('refuses when the conditional update matches nothing (approved in the meantime)', async () => {
    const { svc, paymentRepo, audit } = build({ ...completed(), status: PaymentStatus.REVERSAL_REQUESTED, reversalStatus: ReversalStatus.PENDING });
    paymentRepo.update.mockResolvedValueOnce({ affected: 0 });
    await expect(svc.rejectReversalRequest(10, admin, 'amount was correct')).rejects.toThrow(ConflictException);
    expect(audit.logAction).not.toHaveBeenCalled();
    // the write was conditional on the pending state, not on the id alone
    expect(paymentRepo.update.mock.calls[0][0]).toMatchObject({ id: 10, status: PaymentStatus.REVERSAL_REQUESTED, reversalStatus: ReversalStatus.PENDING });
  });
});

/** Fake transaction: enough of QueryRunner/EntityManager for reversePayment(). */
function buildTx(payment: any) {
  const writes: any[] = [];
  const qb: any = {
    innerJoinAndSelect: () => qb, where: () => qb, setLock: () => qb,
    getOne: async () => payment,
  };
  const manager: any = {
    createQueryBuilder: () => qb,
    update: jest.fn(async (_e: any, id: any, patch: any) => { writes.push({ id, patch }); }),
    query: jest.fn(async () => []),
  };
  const qr: any = {
    connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(), release: jest.fn(), manager,
  };
  const connection: any = { createQueryRunner: () => qr };
  const audit: any = { logAction: jest.fn(async () => undefined) };
  const ledger: any = { recordReversal: jest.fn(async () => undefined) };
  const svc = new PaymentsService({} as any, {} as any, {} as any, audit, connection, {} as any, ledger, {} as any, {} as any, {} as any);
  return { svc, qr, writes, ledger, audit };
}

const pendingWithLoan = () => ({
  id: 10, tenantId: 7, amount: 50000, receiptNumber: 'R-1', scheduleId: null,
  status: PaymentStatus.REVERSAL_REQUESTED, reversalStatus: ReversalStatus.PENDING,
  loan: { id: 3, tenantId: 7, balance: 100000, status: 'ACTIVE', bikeId: null, clientId: 1, loanNumber: 'L-3' },
});

describe('reversePayment / approval', () => {
  it('restores the loan, writes the decider in the same transaction and posts the ledger entry', async () => {
    const { svc, qr, writes, ledger } = buildTx(pendingWithLoan());
    const res = await svc.reversePayment(10, admin, 'cashier typed wrong amount');
    expect(res.data.restoredBalance).toBe(150000);
    expect(res.message).not.toContain('${');            // POLICY_REF is interpolated
    const loanWrite = writes.find((w) => w.patch.balance !== undefined);
    expect(loanWrite.patch.balance).toBe(150000);
    const payWrite = writes.find((w) => w.patch.status === PaymentStatus.REVERSED);
    expect(payWrite.patch.reversalDecidedBy).toBe('admin@bv.test');
    expect(payWrite.patch.reversalStatus).toBe(ReversalStatus.APPROVED);
    expect(ledger.recordReversal).toHaveBeenCalledTimes(1);
    expect(qr.commitTransaction).toHaveBeenCalled();
  });

  it('is invisible to another tenant and changes nothing', async () => {
    const { svc, qr, writes } = buildTx(pendingWithLoan());
    await expect(svc.reversePayment(10, { ...admin, tenantId: 99 }, 'cashier typed wrong amount')).rejects.toThrow(NotFoundException);
    expect(writes).toHaveLength(0);
    expect(qr.rollbackTransaction).toHaveBeenCalled();
  });

  it('refuses FAILED payments so the loan balance is not inflated', async () => {
    const { svc, writes } = buildTx({ ...pendingWithLoan(), status: PaymentStatus.FAILED, reversalStatus: null });
    await expect(svc.reversePayment(10, admin, 'cashier typed wrong amount')).rejects.toThrow(ConflictException);
    expect(writes).toHaveLength(0);
  });

  it('refuses an already reversed payment (no double restore)', async () => {
    const { svc, writes } = buildTx({ ...pendingWithLoan(), status: PaymentStatus.REVERSED });
    await expect(svc.reversePayment(10, admin, 'cashier typed wrong amount')).rejects.toThrow(ConflictException);
    expect(writes).toHaveLength(0);
  });
});
