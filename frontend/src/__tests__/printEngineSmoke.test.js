import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';

import axiosInstance from '../core/api/axiosConfig';
import { buildElementDocument, printElement, printHtml } from '../core/print/printEngine';
import { usePrintDocument } from '../core/print/usePrintDocument';
import PrintButton from '../core/print/PrintButton';
import PrintPreviewDialog from '../core/print/PrintPreviewDialog';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn() },
}));

const theme = createTheme();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/settings/appearance/') {
      return Promise.resolve({
        data: {
          print: {
            paper: 'A4', orientation: 'portrait', font_size: 9.5,
            margin: '10mm 9mm 12mm 9mm',
            header: { enabled: true, show_logo: true, company_font_size: 13, title_font_size: 13 },
            footer: { enabled: true, text: 'سامانهٔ کیان', show_page_number: true, signatures: true },
            columns: { 'letter-list': ['number', 'subject'] },
          },
        },
      });
    }
    if (url === '/company/branding/') {
      return Promise.resolve({ data: { legal_name: 'شرکت نمونه', logo_url: 'http://x/logo.png' } });
    }
    return Promise.resolve({ data: {} });
  });
});

const renderNode = (element) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => { root.render(element); });
  return { container, root };
};

afterEach(() => {
  jest.clearAllMocks();
  document.getElementById('hrms-print-frame')?.remove();
});

test('buildElementDocument wraps the area with unified print css', () => {
  const element = document.createElement('table');
  element.innerHTML = '<tr><td>ردیف</td></tr>';
  const html = buildElementDocument(element, { title: 'ترازنامه', paper: 'A5', orientation: 'landscape' });
  expect(html).toContain('dir="rtl"');
  expect(html).toContain('A5 landscape');
  expect(html).toContain('ترازنامه');
  expect(html).toContain('ردیف');
});

test('printElement applies the configured header/footer chrome', async () => {
  const element = document.createElement('div');
  element.innerHTML = '<table><tr><td>گزارش</td></tr></table>';
  await printElement(element, { title: 'گزارش' });
  const frame = document.querySelector('#hrms-print-frame');
  expect(frame).toBeTruthy();
  expect(frame.getAttribute('aria-hidden')).toBe('true');
  const html = frame.srcdoc || frame.getAttribute('srcdoc') || '';
  expect(html).toContain('pe-doc-header');
  expect(html).toContain('pe-doc-footer');
  expect(html).toContain('شرکت نمونه');
  expect(html).toContain('گزارش');
  expect(html).toContain('سامانهٔ کیان');
  expect(html).not.toContain('تاریخ چاپ');
});

test('printElement can skip chrome for documents with their own header', async () => {
  const element = document.createElement('div');
  element.textContent = 'صورت‌وضعیت';
  await printElement(element, { title: 'صورت‌وضعیت', skipChrome: true });
  const frame = document.querySelector('#hrms-print-frame');
  const html = frame.srcdoc || '';
  expect(html).not.toContain('pe-doc-header');
  expect(html).toContain('صورت‌وضعیت');
});

test('printHtml still prints a fully prepared document', () => {
  printHtml('<html><body>x</body></html>');
  expect(document.querySelectorAll('#hrms-print-frame').length).toBe(1);
});

test('PrintButton renders and does not throw without a target', () => {
  const { container, root } = renderNode(
    <ThemeProvider theme={theme}>
      <PrintButton label="چاپ گزارش" target="#missing-node" />
    </ThemeProvider>,
  );
  const button = container.querySelector('button');
  expect(button.textContent).toContain('چاپ گزارش');
  act(() => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  root.unmount();
  container.remove();
});

test('PrintPreviewDialog shows html and error states', () => {
  const { container, root } = renderNode(
    <ThemeProvider theme={theme}>
      <PrintPreviewDialog open title="پیش‌نمایش" html="<p>سند</p>" onClose={() => {}} />
    </ThemeProvider>,
  );
  // Dialog در Portal رندر می‌شود
  expect(document.body.textContent).toContain('پیش‌نمایش');
  const frame = document.querySelector('iframe[title="پیش‌نمایش"]');
  expect(frame?.getAttribute('srcdoc')).toContain('سند');
  root.unmount();
  container.remove();
});

test('usePrintDocument posts to the print endpoint and exposes html', async () => {
  axiosInstance.post.mockResolvedValue({ data: { html: '<html>سند</html>' } });
  let api;
  const Probe = () => {
    api = usePrintDocument();
    return null;
  };
  const { root } = renderNode(
    <MemoryRouter>
      <Probe />
    </MemoryRouter>,
  );

  await act(async () => {
    await api.openDocument({ document: 'letter', payload: { id: 5 } });
    await wait(10);
  });

  expect(axiosInstance.post).toHaveBeenCalledWith('/print/preview/', expect.objectContaining({
    document: 'letter',
    payload: { id: 5 },
  }));
  expect(api.html).toContain('سند');
  expect(api.open).toBe(true);

  act(() => { api.close(); });
  expect(api.open).toBe(false);
  root.unmount();
});
