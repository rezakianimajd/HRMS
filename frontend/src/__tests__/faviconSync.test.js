import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import axiosInstance from '../core/api/axiosConfig';
import FaviconSync, { FAVICON_LINK_ID, faviconMimeType } from '../core/components/ui/FaviconSync';

jest.mock('../core/api/axiosConfig', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

/** تا ظاهر/حذف شدن آیکن صبر می‌کند (React Query آپدیت را در تیک بعدی می‌دهد). */
const waitForFavicon = async (shouldExist) => {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const link = document.getElementById(FAVICON_LINK_ID);
    if (shouldExist ? link : !link) return link;
    // eslint-disable-next-line no-await-in-loop
    await act(async () => { await wait(40); });
  }
  return document.getElementById(FAVICON_LINK_ID);
};

const renderFavicon = async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <FaviconSync />
      </QueryClientProvider>,
    );
    await wait(150);
  });
  return { container, root };
};

const cleanup = ({ container, root }) => {
  root.unmount();
  container.remove();
  const link = document.getElementById(FAVICON_LINK_ID);
  if (link) link.remove();
};

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  axiosInstance.get.mockReset();
  const stale = document.getElementById(FAVICON_LINK_ID);
  if (stale) stale.remove();
});

test('company logo from the company profile becomes the browser tab icon', async () => {
  axiosInstance.get.mockResolvedValue({
    data: {
      name: 'موسسه مدیریت راهبردی خاتم پاسارگاد',
      legal_name: 'موسسه مدیریت راهبردی خاتم پاسارگاد',
      logo_url: '/media/company_logos/kpsmi.png',
      favicon_url: '/media/company_logos/kpsmi.png?v=1700000000',
      version: 1700000000,
    },
  });

  const rendered = await renderFavicon();
  const link = await waitForFavicon(true);

  expect(axiosInstance.get).toHaveBeenCalledWith('/company/branding/');
  expect(link).toBeTruthy();
  expect(link.tagName.toLowerCase()).toBe('link');
  expect(link.getAttribute('rel')).toBe('icon');
  expect(link.getAttribute('href')).toBe('/media/company_logos/kpsmi.png?v=1700000000');
  expect(link.getAttribute('type')).toBe('image/png');

  cleanup(rendered);
});

test('no logo means no injected icon (no broken favicon request)', async () => {
  axiosInstance.get.mockResolvedValue({
    data: { name: 'کیان', legal_name: '', logo_url: null, favicon_url: null, version: null },
  });

  const rendered = await renderFavicon();
  const link = await waitForFavicon(false);

  expect(link).toBeNull();

  cleanup(rendered);
});

test('favicon mime type follows the file extension', () => {
  expect(faviconMimeType('/media/company_logos/logo.svg')).toBe('image/svg+xml');
  expect(faviconMimeType('/media/company_logos/logo.PNG?v=12')).toBe('image/png');
  expect(faviconMimeType('/media/company_logos/logo.ico')).toBe('image/x-icon');
  expect(faviconMimeType('/media/company_logos/logo.jpeg')).toBe('image/jpeg');
  expect(faviconMimeType('')).toBeUndefined();
});
