import {
  addCondition, addGroup, combineExpressions, countConditions, describeExpression,
  duplicateInvoiceKeys, evaluateExpression, expressionFromSimple, fieldChoices, needsValue,
  normalizeExpression, operatorsFor, removeItem, rowValue, setGroupOp, updateCondition,
  FILTER_FIELDS, FILTER_PRESETS,
} from '../pages/accounting/tax/seasonalFilters';

const makeRow = (overrides = {}) => ({
  id: 'r-1',
  name: 'شرکت فولاد پارس',
  firstName: '',
  lastName: '',
  personType: 'legal',
  nationalId: '10101010101',
  postalCode: '1234567890',
  country: 'ایران',
  province: 'تهران',
  city: 'تهران',
  address: 'خیابان ولیعصر',
  description: 'ورق گالوانیزه',
  amount: '3,000,000',
  vat: '300,000',
  kind: 2,
  invoiceDate: '1405/02/11',
  invoiceNo: '1001',
  moadianUid: '',
  status: 'registered',
  ...overrides,
});

const rows = [
  makeRow(),
  makeRow({
    id: 'r-2', name: 'علی رضایی', firstName: 'علی', lastName: 'رضایی', personType: 'natural',
    nationalId: '0012345678', amount: '1200000', vat: '120000', kind: 3,
    invoiceDate: '1405/01/21', invoiceNo: '1002', status: 'pending', city: 'اصفهان',
  }),
  makeRow({
    id: 'r-3', name: '', firstName: '', lastName: '', personType: 'aggregate',
    nationalId: '', amount: '900000', vat: '0', kind: 2, invoiceDate: '', invoiceNo: '1001',
    description: '',
  }),
  makeRow({
    id: 'r-4', name: 'Trading LLC', personType: 'foreign', nationalId: '', amount: '45000000',
    vat: '4500000', kind: 2, invoiceNo: '', country: 'ترکیه', city: 'استانبول', status: 'registered',
  }),
];

const ids = (expression) => evaluateExpression(rows, expression).map((row) => row.id);

describe('seasonal advanced filters', () => {
  test('exposes fields, operators and choices', () => {
    expect(FILTER_FIELDS.map((field) => field.key)).toContain('amount');
    expect(operatorsFor('amount')).toEqual(expect.arrayContaining(['gte', 'between']));
    expect(operatorsFor('aggregate')).toEqual(['is_true', 'is_false']);
    expect(operatorsFor('invoice_no')).toContain('contains');
    expect(fieldChoices('person_type').map((choice) => choice.value)).toEqual(
      ['legal', 'natural', 'foreign', 'aggregate'],
    );
    expect(fieldChoices('kind')[0]).toEqual({ value: '1', label: 'نوع ۱' });
    expect(needsValue('empty')).toBe(false);
    expect(needsValue('contains')).toBe(true);
  });

  test('filters with AND/OR groups like the backend', () => {
    const expression = {
      op: 'and',
      items: [
        { field: 'amount', operator: 'gte', value: '1000000' },
        { op: 'or', items: [
          { field: 'person_type', operator: 'eq', value: 'legal' },
          { field: 'name', operator: 'contains', value: 'رضایی' },
        ] },
      ],
    };
    expect(ids(expression)).toEqual(['r-1', 'r-2']);
  });

  test('handles numbers, dates, lists and empty checks', () => {
    expect(ids({ items: [{ field: 'amount', operator: 'between', value: '900000', value2: '3000000' }] }))
      .toEqual(['r-1', 'r-2', 'r-3']);
    expect(ids({ items: [{ field: 'kind', operator: 'in', value: '۱، ۳' }] })).toEqual(['r-2']);
    expect(ids({ items: [{ field: 'invoice_date', operator: 'gte', value: '1405/02/01' }] }))
      .toEqual(['r-1', 'r-4']);
    /* مقدار میلادی (مثل خروجی تقویم شمسی صفحه) با تاریخ شمسی ردیف قابل مقایسه است */
    expect(ids({ items: [{ field: 'invoice_date', operator: 'between', value: '2026-04-10', value2: '2026-05-01' }] }))
      .toEqual(['r-1', 'r-2', 'r-4']);
    expect(ids({ items: [{ field: 'invoice_no', operator: 'empty' }] })).toEqual(['r-4']);
    expect(ids({ items: [{ field: 'vat_ratio', operator: 'gte', value: '0.1' }] }))
      .toEqual(['r-1', 'r-2', 'r-4']);
  });

  test('detects duplicate invoices and aggregate rows', () => {
    expect([...duplicateInvoiceKeys(rows)]).toEqual(['1001']);
    expect(ids({ items: [{ field: 'duplicate', operator: 'is_true' }] })).toEqual(['r-1', 'r-3']);
    expect(ids({ items: [{ field: 'aggregate', operator: 'is_true' }] })).toEqual(['r-3']);
    expect(rowValue(rows[2], 'name')).toBe('');
    expect(rowValue(rows[1], 'name')).toBe('علی رضایی');
  });

  test('normalizes invalid or incomplete conditions', () => {
    const normalized = normalizeExpression({
      op: 'any',
      items: [
        { field: 'unknown', operator: 'eq', value: 'x' },
        { field: 'amount', operator: 'between', value: '10' },
        { field: 'name', operator: 'contains', value: '   ' },
        { field: 'name', operator: 'contains', value: '  مس  ' },
        { op: 'and', items: [] },
      ],
    });
    expect(normalized).toEqual({
      op: 'or',
      items: [{ field: 'name', operator: 'contains', value: 'مس', value2: '' }],
    });
    expect(normalizeExpression(null)).toEqual({ op: 'and', items: [] });
  });

  test('builds expressions immutably', () => {
    let expression = addCondition({ op: 'and', items: [] }, -1);
    expect(countConditions(expression)).toBe(1);
    expect(expression.items[0].field).toBe('name');

    expression = updateCondition(expression, -1, 0, { field: 'amount' });
    expect(expression.items[0]).toMatchObject({ field: 'amount', operator: 'eq' });

    expression = updateCondition(expression, -1, 0, { operator: 'between', value: '10', value2: '20' });
    expect(expression.items[0]).toMatchObject({ operator: 'between', value: '10', value2: '20' });

    const withGroup = addGroup(expression);
    expect(withGroup.items).toHaveLength(2);
    expect(withGroup.items[1].op).toBe('or');
    expect(countConditions(withGroup)).toBe(2);

    const toggled = setGroupOp(withGroup, 1, 'and');
    expect(toggled.items[1].op).toBe('and');
    expect(withGroup.items[1].op).toBe('or');

    const trimmed = removeItem(toggled, 1, 0);
    expect(trimmed.items).toHaveLength(2);
    expect(trimmed.items[1].items).toHaveLength(0);
    expect(removeItem({ op: 'and', items: [] }, -1, 5).items).toHaveLength(0);
  });

  test('merges quick chips into an expression', () => {
    const simple = expressionFromSimple({ kind: '2', status: 'pending', personType: 'all', search: 'فولاد' });
    expect(simple.items[0]).toMatchObject({ field: 'kind', value: '2' });
    expect(simple.items[1]).toMatchObject({ field: 'moadian_status', value: 'pending' });
    expect(simple.items[2].op).toBe('or');
    expect(expressionFromSimple({ kind: 'all', status: 'all', personType: 'all' }).items).toEqual([]);

    const combined = combineExpressions(
      { op: 'and', items: [{ field: 'amount', operator: 'gte', value: '1000' }] },
      simple,
    );
    expect(countConditions(combined)).toBe(9);
    expect(ids(combined)).toEqual([]);
  });

  test('describes expressions in Persian', () => {
    expect(describeExpression({ op: 'and', items: [] })).toBe('بدون فیلتر');
    expect(describeExpression({
      op: 'or',
      items: [{ field: 'amount', operator: 'gte', value: '1000000' }, { field: 'kind', operator: 'eq', value: '2' }],
    })).toBe('مبلغ بزرگ‌تر یا مساوی ۱٬۰۰۰٬۰۰۰ یا نوع معامله برابر باشد با نوع ۲');
    expect(describeExpression({
      op: 'and',
      items: [{ field: 'invoice_no', operator: 'empty' }, { field: 'aggregate', operator: 'is_false' }],
    })).toBe('شمارهٔ فاکتور خالی باشد و ردیف تجمیعی خیر');
    expect(describeExpression({
      items: [{ op: 'or', items: [
        { field: 'person_type', operator: 'eq', value: 'foreign' },
        { field: 'city', operator: 'in', value: 'تهران، اصفهان' },
      ] }],
    })).toBe('(نوع طرف معامله برابر باشد با خارجی یا شهر یکی از تهران، اصفهان)');
  });

  test('presets produce working expressions', () => {
    expect(FILTER_PRESETS).toHaveLength(6);
    const pending = FILTER_PRESETS.find((preset) => preset.key === 'pending');
    expect(ids(pending.build())).toEqual(['r-2']);
    const duplicate = FILTER_PRESETS.find((preset) => preset.key === 'duplicate');
    expect(ids(duplicate.build())).toEqual(['r-1', 'r-3']);
    const big = FILTER_PRESETS.find((preset) => preset.key === 'big');
    expect(ids(big.build())).toEqual([]);
    expect(describeExpression({ items: [{ field: 'amount', operator: 'gte', value: '100000000' }] }))
      .toBe('مبلغ بزرگ‌تر یا مساوی ۱۰۰٬۰۰۰٬۰۰۰');
  });
});
