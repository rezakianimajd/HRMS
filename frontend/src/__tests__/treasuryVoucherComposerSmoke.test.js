import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import TreasuryVoucherComposerDialog from '../pages/treasury/TreasuryVoucherComposerDialog';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: {
    get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn(),
  },
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { treasury: '#14b8a6' },
}));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const preview = {
  kind: 'receipt',
  number: 'RC-1405-000010',
  date: '۱۴۰۵/۰۸/۱۶',
  amount: '2500000',
  amount_words: 'دو میلیون و پانصد هزار ریال',
  template_name: 'فیش دریافت استاندارد',
  paper: 'A5',
  html: '<html><body><h1>فیش دریافت وجه RC-1405-000010</h1></body></html>',
};

const voucher = {
  kind: 'receipt',
  title: 'فیش دریافت وجه',
  company: { name: 'موسسه نمونه', code: 'T1' },
  number: 'RC-1405-000010',
  date: '۱۴۰۵/۰۸/۱۶',
  amount: '2500000',
  amount_words: 'دو میلیون و پانصد هزار ریال',
  currency: 'IRR',
  html: '<html><body><h1>فیش نهایی RC-1405-000010</h1></body></html>',
  paper: 'A5',
  template_name: 'فیش دریافت استاندارد',
};

const setInputValue = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

beforeEach(() => {
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/treasury/receipts/9/print-data/') return Promise.resolve({ data: voucher });
    return Promise.resolve({ data: { results: [] } });
  });
  axiosInstance.post.mockImplementation((url) => {
    if (url === '/treasury/voucher-preview/') return Promise.resolve({ data: preview });
    if (url === '/treasury/voucher-issue/') {
      return Promise.resolve({
        data: { kind: 'receipt', id: 9, number: 'RC-1405-000010', print_url: '/treasury/receipts/9/print-data/' },
      });
    }
    return Promise.resolve({ data: {} });
  });
});

const renderDialog = async (props = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <TreasuryVoucherComposerDialog open initialKind="receipt" onClose={() => {}} {...props} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(700);
  });
  await act(async () => { await wait(300); });
  return { container, root };
};

test('composer shows live print preview from the theme template', async () => {
  const { root } = await renderDialog();

  const dialog = [...document.querySelectorAll('[role="dialog"]')]
    .find((node) => node.textContent.includes('صدور سند با پیش‌نمایش چاپ'));
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('فیش دریافت');
  expect(dialog.textContent).toContain('حواله پرداخت');
  expect(dialog.textContent).toContain('رسید انتقال وجه');

  const amountInput = dialog.querySelector('input[type="number"]');
  setInputValue(amountInput, '2500000');
  await act(async () => { await wait(900); });

  const frame = dialog.querySelector('iframe[title="پیش‌نمایش چاپ سند"]');
  expect(frame).toBeTruthy();
  expect(frame.getAttribute('srcdoc')).toContain('RC-1405-000010');
  expect(dialog.textContent).toContain('RC-1405-000010');
  expect(dialog.textContent).toContain('مبلغ به حروف: دو میلیون و پانصد هزار ریال');

  const previewCall = axiosInstance.post.mock.calls
    .find(([url]) => url === '/treasury/voucher-preview/');
  expect(previewCall[1]).toMatchObject({ kind: 'receipt', amount: '2500000' });

  root.unmount();
});

test('issuing from the composer saves the document and opens the printable voucher', async () => {
  const { root } = await renderDialog({ initialKind: 'payment' });

  const dialog = [...document.querySelectorAll('[role="dialog"]')]
    .find((node) => node.textContent.includes('صدور سند با پیش‌نمایش چاپ'));
  expect(dialog.textContent).toContain('نوع سند پرداخت');

  const amountInput = dialog.querySelector('input[type="number"]');
  setInputValue(amountInput, '12000000');
  await act(async () => { await wait(700); });

  const issueButton = [...dialog.querySelectorAll('button')]
    .find((node) => node.textContent.includes('ثبت و صدور سند'));
  expect(issueButton).toBeTruthy();
  await act(async () => {
    issueButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await wait(600);
  });

  const issueCall = axiosInstance.post.mock.calls
    .find(([url]) => url === '/treasury/voucher-issue/');
  expect(issueCall[1]).toMatchObject({ kind: 'payment', amount: '12000000' });

  const printFrame = await wait(400).then(() => document.querySelector('iframe[title="قالب چاپ سند"]'));
  expect(printFrame).toBeTruthy();
  expect(printFrame.getAttribute('srcdoc')).toContain('RC-1405-000010');

  root.unmount();
});
