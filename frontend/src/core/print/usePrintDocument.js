/**
 * هوک موتور چاپ: گرفتن HTML سند از سرور، پیش‌نمایش و چاپ.
 */
import { useCallback, useState } from 'react';
import axiosInstance from '../api/axiosConfig';
import { printHtml } from './printEngine';

const DEFAULT_OPTIONS = { paper: 'A4', orientation: 'portrait' };

export const usePrintDocument = () => {
  const [state, setState] = useState({ open: false, html: '', title: '', loading: false, error: '' });

  /** رندر سند در سرور و باز کردن پیش‌نمایش. */
  const openDocument = useCallback(async ({ document: documentKey, payload = {}, options = {} }) => {
    setState({ open: true, html: '', title: '', loading: true, error: '' });
    try {
      const response = await axiosInstance.post('/print/preview/', {
        document: documentKey,
        payload,
        options: { ...DEFAULT_OPTIONS, ...options },
      });
      setState({
        open: true,
        html: response.data?.html || '',
        title: response.data?.title || payload?.title || 'پیش‌نمایش چاپ',
        loading: false,
        error: '',
      });
      return response.data?.html || '';
    } catch (error) {
      setState({
        open: true,
        html: '',
        title: '',
        loading: false,
        error: error?.response?.data?.detail || 'تهیهٔ سند چاپی ناموفق بود.',
      });
      return '';
    }
  }, []);

  const close = useCallback(() => setState((previous) => ({ ...previous, open: false })), []);

  /** چاپ مستقیم بدون نمایش پیش‌نمایش. */
  const printDocument = useCallback(async (request) => {
    const html = await openDocument(request);
    if (html) {
      setState((previous) => ({ ...previous, open: false }));
      printHtml(html);
    }
    return html;
  }, [openDocument]);

  const printCurrent = useCallback(() => {
    if (state.html) printHtml(state.html);
  }, [state.html]);

  return { ...state, openDocument, printDocument, printCurrent, close };
};

export default usePrintDocument;
