import {
  buildStatementFormData, emptyLine, hasLineData, lineIssues, totalsOf,
} from '../pages/pettyCashExpenseForm';

describe('pettyCashExpenseForm', () => {
  it('کلیدهای تودرتو را با قالب HTML می‌سازد (سازگار با DRF)', () => {
    const header = {
      fund: 3, number: 'PC-EXP-TEST', date: '2026-11-14', description: 'خرید',
      payment_method: 'cash', project: 7, cost_center: 2,
    };
    const lines = [
      { ...emptyLine(), account: 11, aux1: 21, invoice_number: 'A-1', supplier: 'شرکت الف', debit: '1000', vat_amount: '100', tax_amount: '0' },
      { ...emptyLine(), account: 12, debit: '500' },
      { ...emptyLine() },
    ];
    const form = buildStatementFormData({ header, lines });
    expect(form.get('fund')).toBe('3');
    expect(form.get('number')).toBe('PC-EXP-TEST');
    expect(form.get('lines[0]account')).toBe('11');
    expect(form.get('lines[0]auxiliary_1')).toBe('21');
    expect(form.get('lines[0]supplier')).toBe('شرکت الف');
    expect(form.get('lines[0]net_amount')).toBe('900');
    expect(form.get('lines[1]account')).toBe('12');
    // قالب قدیمی (با نقطه) هرگز نباید ساخته شود
    expect(form.get('lines[0].account')).toBeNull();
    expect(form.get('lines[0].debit')).toBeNull();
  });

  it('جمع‌ها و خالص را درست حساب می‌کند', () => {
    const lines = [
      { ...emptyLine(), debit: '1000', vat_amount: '100' },
      { ...emptyLine(), debit: '500', vat_amount: '0' },
    ];
    expect(totalsOf(lines)).toEqual({
      count: 2, gross: 1500, vat: 100, net: 1400,
    });
  });

  it('ردیف خالی هشدارهای سخت می‌دهد و hasLineData درست است', () => {
    const line = emptyLine();
    expect(hasLineData(line)).toBe(false);
    expect(lineIssues(line).filter((item) => item.hard)).toHaveLength(2);
    const filled = { ...line, account: 1, debit: '100' };
    expect(hasLineData(filled)).toBe(true);
    expect(lineIssues(filled).some((item) => item.hard)).toBe(false);
  });
});
