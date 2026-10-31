import {
  GRID_FIELDS, buildRowsFromMatrix, detectMapping, matchField, parseClipboardMatrix, rowsToTsv,
} from '../pages/accounting/tax/seasonalGridEntry';

const makeRow = () => ({
  id: 'r-1', name: '', firstName: '', lastName: '', personType: 'legal', nationalId: '',
  postalCode: '', country: 'ایران', city: '', address: '', description: '', amount: '', vat: '',
  kind: 1, invoiceDate: '', invoiceNo: '', moadianUid: '', status: 'pending',
});

describe('seasonal grid entry helpers', () => {
  test('parses a TSV block pasted from Excel and detects the header', () => {
    const text = [
      'نام شرکت\tشناسه ملی\tمبلغ\tتاریخ فاکتور',
      'شرکت آلفا\t10101010101\t۱٬۲۵۰٬۰۰۰\t1405/01/21',
      'شرکت بتا\t20202020202\t500000\t',
    ].join('\n');

    const parsed = parseClipboardMatrix(text);
    expect(parsed.hasHeader).toBe(true);
    expect(parsed.matrix).toHaveLength(3);
    expect(parsed.matrix[1][0]).toBe('شرکت آلفا');
    expect(parsed.delimiter).toBe('\t');
  });

  test('detects fields from Persian headers and falls back to grid order without header', () => {
    expect(matchField('شناسه ملی / کد ملی')).toBe('nationalId');
    expect(matchField('مبلغ خرید (ریال)')).toBe('amount');
    expect(matchField('تاریخ')).toBe('invoiceDate');
    expect(matchField('ستون ناشناخته')).toBeNull();

    const withHeader = parseClipboardMatrix('نام\tمبلغ\nالف\t100');
    /* «نام» خالی در متادیتای ما به ستون «نام» (حقیقی) نگاشت می‌شود و «نام شرکت» به عنوان */
    expect(detectMapping(withHeader.matrix, withHeader.hasHeader)).toEqual(['firstName', 'amount']);
    const companyHeader = parseClipboardMatrix('نام شرکت\tمبلغ\nالف\t100');
    expect(detectMapping(companyHeader.matrix, companyHeader.hasHeader)).toEqual(['name', 'amount']);

    const noHeader = parseClipboardMatrix('شرکت آلفا\t10010101010\t1000');
    expect(noHeader.hasHeader).toBe(false);
    expect(detectMapping(noHeader.matrix, noHeader.hasHeader).slice(0, 3))
      .toEqual(GRID_FIELDS.slice(0, 3));
  });

  test('builds grid rows with normalized amounts, ids, dates and warnings', () => {
    const parsed = parseClipboardMatrix([
      'نام شرکت\tشناسه ملی\tمبلغ\tمالیات\tتاریخ فاکتور\tنوع فروشنده\tکد پستی',
      'شرکت آلفا\t۱۰۱۰۱۰۱۰۱۰۱\t۱٬۲۵۰٬۰۰۰\t۱۲۵٬۰۰۰\t1405/01/21\tحقوقی\t12345',
      'علی رضایی\t0012345678\t300000\t30000\t2026-05-01\tحقیقی\t1234567890',
    ].join('\n'));

    const { rows, warnings } = buildRowsFromMatrix({ ...parsed, mapping: detectMapping(parsed.matrix, parsed.hasHeader) }, makeRow);

    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('شرکت آلفا');
    expect(rows[0].nationalId).toBe('10101010101');
    expect(rows[0].amount).toBe('1250000');
    expect(rows[0].vat).toBe('125000');
    expect(rows[0].invoiceDate).toBe('2026-04-10');
    expect(rows[0].personType).toBe('legal');
    expect(rows[1].personType).toBe('natural');
    expect(rows[1].invoiceDate).toBe('2026-05-01');

    /* کد پستی ۵ رقمی رد نمی‌شود اما هشدار می‌دهد */
    expect(warnings.some((warning) => warning.includes('کد پستی'))).toBe(true);
    expect(warnings.some((warning) => warning.includes('ردیف 1'))).toBe(true);
  });

  test('skips rows without name and amount and clamps the transaction kind', () => {
    const parsed = parseClipboardMatrix('نام شرکت\tمبلغ\tنوع\n\t\t3\nشرکت گاما\t1000\t9');
    const { rows, warnings } = buildRowsFromMatrix({ ...parsed, mapping: detectMapping(parsed.matrix, parsed.hasHeader) }, makeRow);

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('شرکت گاما');
    expect(rows[0].kind).toBe(1);           // ۹ نامعتبر → ۱
    expect(warnings.some((warning) => warning.includes('نادیده'))).toBe(true);
  });

  test('export rows to TSV with headers for copying back to Excel', () => {
    const tsv = rowsToTsv([{
      ...makeRow(), name: 'شرکت آلفا', amount: '1000', vat: '100', status: 'registered',
    }]);
    const lines = tsv.split('\n');
    expect(lines[0]).toContain('نام شرکت / عنوان');
    expect(lines[0]).toContain('مالیات بر ارزش افزوده');
    expect(lines[1]).toContain('شرکت آلفا');
    expect(lines[1]).toContain('1000');
    expect(lines[1]).toContain('درج‌شده');
    expect(lines[1].split('\t')).toHaveLength(GRID_FIELDS.length);
  });
});
