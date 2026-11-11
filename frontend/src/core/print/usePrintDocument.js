/**
 * هوک موتور چاپ: گرفتن HTML سند از سرور، پیش‌نمایش و چاپ.
 */
import { useCallback, useRef, useState } from 'react';
import axiosInstance from '../api/axiosConfig';
import { printHtml } from './printEngine';

const DEFAULT_OPTIONS = { paper: 'A4', orientation: 'portrait' };

export const usePrintDocument = () => {
  const [state, setState] = useState({
    open: false, html: '', title: '', loading: false, error: '', options: DEFAULT_OPTIONS,
  });
  const requestRef = useRef(null);

  /** رندر سند در سرور و باز کردن پیش‌نمایش. */
  const openDocument = useCallback(async ({ document: documentKey, payload = {}, options = {} }) => {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    requestRef.current = { document: documentKey, payload, options: mergedOptions };
    setState((previous) => ({
      ...previous, open: true, html: previous.html, title: '', loading: true, error: '',
      options: mergedOptions,
    }));
    try {
      const response = await axiosInstance.post('/print/preview/', {
        document: documentKey,
        payload,
        options: mergedOptions,
      });
      setState({
        open: true,
        html: response.data?.html || '',
        title: response.data?.title || payload?.title || 'پیش‌نمایش چاپ',
        loading: false,
        error: '',
        options: mergedOptions,
      });
      return response.data?.html || '';
    } catch (error) {
      setState({
        open: true,
        html: '',
        title: '',
        loading: false,
        error: error?.response?.data?.detail || 'تهیهٔ سند چاپی ناموفق بود.',
        options: mergedOptions,
      });
      return '';
    }
  }, []);

  /** تغییر کاغذ/جهت در پیش‌نمایش و رندر دوبارهٔ همان سند. */
  const updateOptions = useCallback((next) => {
    const request = requestRef.current;
    if (!request) return;
    return openDocument({
      ...request,
      options: { ...request.options, ...(next || {}) },
    });
  }, [openDocument]);

  const refresh = useCallback(() => {
    const request = requestRef.current;
    if (!request) return;
    return openDocument(request);
  }, [openDocument]);

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

  return {
    ...state, openDocument, updateOptions, refresh, printDocument, printCurrent, close,
  };
};

export default usePrintDocument;
