import {
  JALALI_MONTHS, groupByDate, jalaliDayLabel, jalaliMonthGrid, jalaliMonthLength,
  shiftJalaliMonth,
} from '../pages/planning/planningCalendar';

test('jalali month grid covers whole weeks with the right month length', () => {
  const grid = jalaliMonthGrid(1405, 8, '2026-11-15');
  expect(grid.title).toBe('آبان 1405');
  expect(grid.cells.length % 7).toBe(0);
  expect(grid.cells[0].iso <= grid.start).toBe(true);
  expect(grid.end >= grid.cells[grid.cells.length - 1].iso).toBe(true);
  expect(grid.cells.filter((cell) => cell.inMonth).length).toBe(jalaliMonthLength(1405, 8));
  expect(grid.cells.some((cell) => cell.isToday)).toBe(true);
});

test('jalali month lengths follow the 31/30 rule', () => {
  expect(jalaliMonthLength(1405, 1)).toBe(31);
  expect(jalaliMonthLength(1405, 6)).toBe(31);
  expect(jalaliMonthLength(1405, 7)).toBe(30);
  expect(jalaliMonthLength(1405, 8)).toBe(30);
});

test('shifting the month handles year boundaries', () => {
  expect(shiftJalaliMonth(1405, 12, 1)).toEqual({ jy: 1406, jm: 1 });
  expect(shiftJalaliMonth(1405, 1, -1)).toEqual({ jy: 1404, jm: 12 });
  expect(shiftJalaliMonth(1405, 8, 13)).toEqual({ jy: 1406, jm: 9 });
});

test('day label and grouping use persian digits and iso keys', () => {
  expect(jalaliDayLabel('2026-11-15')).toContain('آبان');
  expect(jalaliDayLabel('2026-11-15')).toMatch(/[۰-۹]/);
  const grouped = groupByDate(
    [{ id: 1, due_date: '2026-11-15' }, { id: 2, due_date: '2026-11-15' }, { id: 3 }],
    (row) => row.due_date,
  );
  expect(grouped['2026-11-15'].length).toBe(2);
  expect(Object.keys(grouped).length).toBe(1);
  expect(JALALI_MONTHS[7]).toBe('آبان');
});
