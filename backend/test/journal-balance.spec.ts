/**
 * Pure unit checks for journal balance rules used by JournalPosterService.
 * These do not require a database.
 */
describe('Journal balance enforcement', () => {
  function assertBalanced(lines: { debit?: number; credit?: number }[]) {
    if (!lines.length) throw new Error('Journal must have at least one line');
    let debit = 0;
    let credit = 0;
    for (const l of lines) {
      const d = Number(l.debit || 0);
      const c = Number(l.credit || 0);
      if (d < 0 || c < 0) throw new Error('Debit and credit must be non-negative');
      if (d > 0 && c > 0) throw new Error('A line cannot have both debit and credit');
      debit += d;
      credit += c;
    }
    const dRound = Math.round(debit * 100);
    const cRound = Math.round(credit * 100);
    if (dRound !== cRound) {
      throw new Error(`Journal is unbalanced: debit ${debit.toFixed(2)} != credit ${credit.toFixed(2)}`);
    }
    if (dRound === 0) throw new Error('Journal total cannot be zero');
  }

  it('accepts a simple balanced journal', () => {
    expect(() =>
      assertBalanced([
        { debit: 100000, credit: 0 },
        { debit: 0, credit: 100000 },
      ]),
    ).not.toThrow();
  });

  it('rejects unbalanced journal', () => {
    expect(() =>
      assertBalanced([
        { debit: 100000, credit: 0 },
        { debit: 0, credit: 99999 },
      ]),
    ).toThrow(/unbalanced/);
  });

  it('rejects zero total', () => {
    expect(() =>
      assertBalanced([
        { debit: 0, credit: 0 },
        { debit: 0, credit: 0 },
      ]),
    ).toThrow(/zero/);
  });

  it('rejects negative amounts', () => {
    expect(() =>
      assertBalanced([
        { debit: -1, credit: 0 },
        { debit: 0, credit: -1 },
      ]),
    ).toThrow(/non-negative/);
  });

  it('rejects a line with both debit and credit', () => {
    expect(() =>
      assertBalanced([
        { debit: 50, credit: 50 },
      ]),
    ).toThrow(/both debit and credit/);
  });

  it('accepts multi-line balanced journal', () => {
    expect(() =>
      assertBalanced([
        { debit: 60000, credit: 0 },
        { debit: 40000, credit: 0 },
        { debit: 0, credit: 100000 },
      ]),
    ).not.toThrow();
  });
});
