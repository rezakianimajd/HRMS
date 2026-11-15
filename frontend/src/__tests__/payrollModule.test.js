import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import ModuleSelection from '../core/components/ui/ModuleSelection';
import { getMenuForApp } from '../core/config/menuConfig';
import { getModuleLandingPath } from '../core/constants/moduleIcons';

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { payroll: '#3b82f6' },
}));

const flatten = (menu) => menu.flatMap((group) => group.items || []);

test('payroll is a standalone module menu, not part of the HRMS menu', () => {
  const payrollItems = flatten(getMenuForApp('payroll'));
  const hrItems = flatten(getMenuForApp('hrms'));

  expect(payrollItems.map((item) => item.path)).toEqual(expect.arrayContaining([
    '/payroll/dashboard',
    '/payroll/employees',
    '/payroll/profiles',
    '/payroll/loans',
    '/payroll/calculate',
    '/payroll/accounting',
    '/payroll/reports',
    '/payroll/net-payments',
    '/payroll/results',
    '/payroll/payslips',
    '/payroll/employee-loans',
    '/payroll/advances',
    '/payroll/insurance-export',
    '/payroll/tax-export',
    '/payroll/annual/eidi-operations',
    '/payroll/leave/balance-operations',
    '/payroll/definitions/components',
  ]));
  expect(getMenuForApp('payroll').map((group) => group.title)).toEqual([
    'خانه', 'مشخصات پرسنل', 'محاسبات حقوق', 'عملیات سالانه (خروجی)', 'مانده مرخص', 'تعاریف اولیه',
  ]);
  expect(payrollItems.some((item) => item.id.startsWith('payroll-'))).toBe(true);

  expect(hrItems.some((item) => String(item.path || '').startsWith('/payroll'))).toBe(false);
  expect(hrItems.some((item) => String(item.id || '').startsWith('payroll-'))).toBe(false);
});

test('payroll landing path points to its independent dashboard page', () => {
  expect(getModuleLandingPath('payroll')).toBe('/payroll/dashboard');
});

test('payroll is selectable from the module picker', async () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <MemoryRouter>
        <ModuleSelection
          applications={[{
            id: 22, slug: 'payroll', title: 'حقوق و دستمزد', color: '#3b82f6',
            order: 4, is_coming_soon: false, accessible: true,
          }]}
          currentApp={null}
          user={{ first_name: 'مدیر', last_name: 'سیستم', username: 'admin' }}
          company={{ legal_name: 'شرکت نمونه', code: 'C-1' }}
          onPick={jest.fn()}
        />
      </MemoryRouter>,
    );
  });
  expect(container.textContent).toContain('انتخاب ماژول');
  expect(container.textContent).toContain('حقوق و دستمزد');
  act(() => root.unmount());
  container.remove();
});

