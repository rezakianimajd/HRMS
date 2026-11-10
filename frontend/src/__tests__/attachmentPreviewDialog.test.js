import React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';

import AttachmentPreviewDialog, { attachmentUrls } from '../core/components/ui/AttachmentPreviewDialog';

const wait = (ms = 80) => new Promise((resolve) => setTimeout(resolve, ms));

const PREVIEW = 'http://host/api/letter-attachments/1/download/?t=tok&inline=1';
const DOWNLOAD = 'http://host/api/letter-attachments/1/download/?t=tok';
const DIRECT = 'http://host/media/archive/company_1/a.pdf';

const pdfItem = {
  id: 1, title: 'قرارداد اجرای پروژه', size: 2048 * 1024,
  file_url: DIRECT, preview_url: PREVIEW, download_url: DOWNLOAD,
};

const renderDialog = async (props) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(<AttachmentPreviewDialog {...props} />);
    await wait();
  });
  return { container, root };
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('AttachmentPreviewDialog', () => {
  test('preview URL prefers the tokenized inline endpoint', () => {
    expect(attachmentUrls(pdfItem)).toEqual({
      previewUrl: PREVIEW,
      fileUrl: DIRECT,
      downloadUrl: DOWNLOAD,
    });
  });

  test('falls back to the media URL when no token endpoint exists', () => {
    const urls = attachmentUrls({ file_url: DIRECT });
    expect(urls.previewUrl).toBe(DIRECT);
    expect(urls.downloadUrl).toBe(DIRECT);
  });

  test('renders the PDF in an iframe with the preview URL', async () => {
    const { root } = await renderDialog({ open: true, items: [pdfItem], index: 0, title: 'نامه' });
    const frame = document.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame.getAttribute('src').startsWith(PREVIEW)).toBe(true);
    await act(async () => { root.unmount(); });
  });

  test('open-in-new-tab uses preview URL and download button uses download URL', async () => {
    const { root } = await renderDialog({ open: true, items: [pdfItem], index: 0 });
    const links = Array.from(document.querySelectorAll('a[href]'));
    const openLink = links.find((link) => link.getAttribute('target') === '_blank');
    const downloadLink = links.find((link) => link.hasAttribute('download'));
    expect(openLink.getAttribute('href')).toBe(PREVIEW);
    expect(downloadLink.getAttribute('href')).toBe(DOWNLOAD);
    await act(async () => { root.unmount(); });
  });

  test('shows a fallback hint when the embedded image fails to load', async () => {
    const imageItem = {
      id: 2, title: 'تصویر', file_url: 'http://host/media/a.png', preview_url: 'http://host/media/a.png',
    };
    const { root } = await renderDialog({ open: true, items: [imageItem], index: 0 });
    const image = document.querySelector('img');
    expect(image).not.toBeNull();
    await act(async () => {
      image.dispatchEvent(new Event('error'));
      await wait(40);
    });
    expect(document.body.textContent).toContain('پیش‌نمایش درون‌برنامه‌ای نمایش داده نشد');
    await act(async () => { root.unmount(); });
  });
});
