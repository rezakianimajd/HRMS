import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../core/api/axiosConfig';
import CorrespondenceNumberingPage from '../pages/correspondence/CorrespondenceNumberingPage';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock('../core/print/printEngine', () => ({
  __esModule: true,
  printElement: jest.fn(),
}));

jest.mock('../core/context/ModulePaletteContext', () => ({
  __esModule: true,
  useModulePalette: () => ({ getPalette: () => null, typography: {} }),
  MODULE_DEFAULT_ACCENTS: { correspondence: '#0ea5e9' },
}));

jest.mock('../core/context/ApplicationContext', () => ({
  __esModule: true,
  useApplication: () => ({ currentApp: { slug: 'correspondence' }, applications: [] }),
}));

const series = [
  {
    id: 1, title: 'مکاتبات صادرهٔ مؤسسه', direction: 'outgoing', direction_display: 'صادره',
    prefix: 'م', template: '{prefix}/{year}/{seq}', start_number: 1, next_number: 6,
    end_number: null, padding: 3, reset_yearly: true, is_default: true, is_active: true,
    description: 'نامه‌های اداری مؤسسه', preview: 'م/1405/006', letter_count: 5,
  },
  {
    id: 2, title: 'مکاتبات صادرهٔ دانشگاه', direction: 'outgoing', direction_display: 'صادره',
    prefix: 'دانشگاه', template: 'دانشگاه-{yy}-{seq}', start_number: 100, next_number: 101,
    end_number: 999, padding: 4, reset_yearly: false, is_default: false, is_active: true,
    description: '', preview: 'دانشگاه-05-0101', letter_count: 1,
  },
  {
    id: 3, title: 'وارده دبیرخانه', direction: 'incoming', direction_display: 'وارده',
    prefix: 'و', template: '{seq}', start_number: 1, next_number: 3, end_number: null,
    padding: 4, reset_yearly: true, is_default: true, is_active: true,
    description: '', preview: '0003', letter_count: 2,
  },
];

const wait = (ms = 220) => new Promise((resolve) => setTimeout(resolve, ms));

const renderPage = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/settings/correspondence-numbering']}>
          <CorrespondenceNumberingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await wait(400);
  });
  for (let index = 0; index < 3; index += 1) {
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(160); });
  }
  return { container, root };
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }));
  axiosInstance.get.mockImplementation((url) => {
    if (url === '/letter-series/') return Promise.resolve({ data: series });
    return Promise.resolve({ data: null });
  });
  axiosInstance.post.mockResolvedValue({ data: {} });
  axiosInstance.patch.mockResolvedValue({ data: {} });
  axiosInstance.delete.mockResolvedValue({ data: {} });
});

afterEach(() => {
  jest.clearAllMocks();
});

test('lists numbering groups with their next-number suggestion', async () => {
  const { container, root } = await renderPage();

  expect(axiosInstance.get).toHaveBeenCalledWith('/letter-series/', expect.objectContaining({
    params: expect.objectContaining({ page_size: 200 }),
  }));
  expect(container.textContent).toContain('تعاریف اولیه و شماره‌گذاری مکاتبات');
  expect(container.textContent).toContain('مکاتبات صادرهٔ مؤسسه');
  expect(container.textContent).toContain('مکاتبات صادرهٔ دانشگاه');
  expect(container.textContent).toContain('م/1405/006');
  expect(container.textContent).toContain('دانشگاه-05-0101');
  expect(container.textContent).toContain('الگوی شماره');

  root.unmount();
  container.remove();
});

test('create dialog exposes pattern builder, start and last number fields', async () => {
  const { container, root } = await renderPage();

  const createButton = Array.from(container.querySelectorAll('button'))
    .find((button) => button.textContent.includes('گروه شماره‌گذاری جدید'));
  expect(createButton).toBeTruthy();

  await act(async () => {
    createButton.click();
    await wait(250);
  });

  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog).toBeTruthy();
  expect(dialog.textContent).toContain('گروه شماره‌گذاری جدید');
  expect(dialog.textContent).toContain('الگوی شماره');
  expect(dialog.textContent).toContain('شماره شروع');
  expect(dialog.textContent).toContain('آخرین شمارهٔ زده‌شده');
  expect(dialog.textContent).toContain('تا شماره');
  expect(dialog.textContent).toContain('پیش‌نمایش شمارهٔ بعدی');
  expect(dialog.textContent).toContain('فقط شماره (تک‌قسمتی)');
  // پیشوند خالی → پیش‌نمایش با سال و شماره
  expect(dialog.textContent).toContain('/001');
  expect(Array.from(dialog.querySelectorAll('button')).some((b) => b.textContent.includes('ثبت گروه')))
    .toBe(true);

  root.unmount();
  container.remove();
});

test('direction chips filter the groups', async () => {
  const { container, root } = await renderPage();

  expect(container.textContent).toContain('وارده دبیرخانه');
  const chip = Array.from(container.querySelectorAll('.MuiChip-root'))
    .find((node) => (node.textContent || '').startsWith('وارده ('));
  expect(chip).toBeTruthy();

  await act(async () => {
    chip.click();
    await wait(250);
  });

  expect(container.textContent).toContain('وارده دبیرخانه');
  expect(container.textContent).not.toContain('مکاتبات صادرهٔ دانشگاه');

  root.unmount();
  container.remove();
});
