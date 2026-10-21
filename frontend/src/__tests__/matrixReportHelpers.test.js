import { buildCatalog, flattenTree, scopeRows, searchCatalog } from '../pages/accounting/reports/matrixHelpers';

const amounts = (debit) => ({
  debit, credit: 0, balance_debit: debit, balance_credit: 0,
  opening_balance_debit: 0, opening_balance_credit: 0,
  closing_balance_debit: debit, closing_balance_credit: 0,
});

const makeTree = () => ([{
  kind: 'group', id: 10, code: '1', name: 'دارایی‌ها', level: 0, children: [
    {
      kind: 'account', id: 1, code: '1101', name: 'حساب‌های دریافتنی', level: 1, children: [
        {
          kind: 'account', id: 2, code: '110101', name: 'معین مشتریان', level: 2, children: [
            {
              kind: 'aux1', id: 100, code: 'A-100', name: 'شرکت فلان', level: 3, ...amounts(100), children: [
                {
                  kind: 'aux2', id: 200, code: 'P-200', name: 'پروژه الف', level: 4, ...amounts(100), children: [
                    { kind: 'aux3', id: 300, code: 'S-300', name: 'قرارداد یک', level: 5, ...amounts(100), children: [] },
                  ],
                },
              ],
            },
          ],
        },
        {
          kind: 'account', id: 3, code: '110102', name: 'معین پیمانکاران', level: 2, children: [
            { kind: 'aux1', id: 100, code: 'A-100', name: 'شرکت فلان', level: 3, ...amounts(50), children: [] },
          ],
        },
      ],
    },
    {
      kind: 'account', id: 4, code: '1201', name: 'موجودی‌ها', level: 1, children: [
        {
          kind: 'account', id: 5, code: '120101', name: 'معین انبار', level: 2, children: [
            { kind: 'aux1', id: 100, code: 'A-100', name: 'شرکت فلان', level: 3, ...amounts(25), children: [] },
          ],
        },
      ],
    },
  ],
}]);

describe('matrix report path drill-down', () => {
  const { flat, byKey } = flattenTree(makeTree());
  const catalog = buildCatalog(flat);
  const party = catalog.find((entry) => entry.id === 100 && entry.kind === 'aux1');

  test('a party used in several accounts is one search result with involvement counts', () => {
    expect(party).toBeTruthy();
    expect(party.occurrences).toHaveLength(3);
    expect(party.counts[2]).toBe(3); // سه معین
    expect(party.counts[1]).toBe(2); // دو کل
    expect(searchCatalog(catalog, 'شرکت فلان')).toHaveLength(1);
    expect(searchCatalog(catalog, 'A-100')[0].id).toBe(100);
  });

  test('general and subsidiary levels aggregate only the selected party amounts', () => {
    const subsidiaryRows = scopeRows(flat, party.occurrences, 2);
    expect(subsidiaryRows).toHaveLength(3);
    expect(subsidiaryRows.find((row) => row.node.id === 2).debit).toBe(100);
    expect(subsidiaryRows.find((row) => row.node.id === 3).debit).toBe(50);
    expect(subsidiaryRows.find((row) => row.node.id === 5).debit).toBe(25);

    const generalRows = scopeRows(flat, party.occurrences, 1);
    expect(generalRows).toHaveLength(2);
    expect(generalRows.find((row) => row.node.id === 1).debit).toBe(150);
    expect(generalRows.find((row) => row.node.id === 4).debit).toBe(25);
  });

  test('selecting a subsidiary row narrows detail 5 to that exact path', () => {
    const subsidiaryRows = scopeRows(flat, party.occurrences, 2);
    const customers = subsidiaryRows.find((row) => row.node.id === 2);
    expect(customers.sources).toHaveLength(1);
    const detail5 = scopeRows(flat, customers.sources, 4);
    expect(detail5).toHaveLength(1);
    expect(detail5[0].node.id).toBe(200);
    expect(detail5[0].debit).toBe(100);
    expect(detail5[0].node.__parents.map((item) => item.id)).toEqual([10, 1, 2, 100]);
  });

  test('double-click target keeps the selected path instead of merging same party rows', () => {
    const subsidiaryRows = scopeRows(flat, party.occurrences, 2);
    const customers = subsidiaryRows.find((row) => row.node.id === 2);
    const drill = customers.sources[0] || customers.node;
    expect(byKey.get(drill.__key)).toBeTruthy();
    expect(drill.name).toBe('شرکت فلان');
    expect(drill.__parents.filter((item) => item.kind === 'account').slice(-1)[0].id).toBe(2);
  });
});
