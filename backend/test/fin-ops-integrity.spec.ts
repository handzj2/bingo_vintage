/**
 * Pure integrity rules for deposits and allocations (no DB required).
 */
describe('Deposit allocation integrity', () => {
  function available(received: number, allocated: number, refunded: number) {
    return received - allocated - refunded;
  }

  function canAllocate(received: number, allocated: number, refunded: number, amount: number) {
    return amount > 0 && amount <= available(received, allocated, refunded) + 0.001;
  }

  function canRefund(received: number, allocated: number, refunded: number, amount: number) {
    return amount > 0 && amount <= available(received, allocated, refunded) + 0.001;
  }

  it('prevents over-allocation', () => {
    expect(canAllocate(100000, 60000, 0, 50000)).toBe(false);
    expect(canAllocate(100000, 60000, 0, 40000)).toBe(true);
  });

  it('prevents refund of allocated funds', () => {
    expect(canRefund(100000, 80000, 0, 30000)).toBe(false);
    expect(canRefund(100000, 80000, 0, 20000)).toBe(true);
  });

  it('tracks remaining after partial refund and allocation', () => {
    expect(available(100000, 30000, 20000)).toBe(50000);
  });

  it('rejects zero/negative amounts', () => {
    expect(canAllocate(100000, 0, 0, 0)).toBe(false);
    expect(canRefund(100000, 0, 0, -1)).toBe(false);
  });
});
