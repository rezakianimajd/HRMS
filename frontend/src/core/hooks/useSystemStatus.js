import { useEffect, useRef, useState } from 'react';
import axiosInstance from '../api/axiosConfig';

const POLL_MS = 60 * 1000;

/**
 * Polls the backend for the running product version.
 *
 * When the version changes while a tab is open (i.e. the server was updated),
 * `updateAvailable` flips to true so the UI can offer a reload.
 */
export default function useSystemStatus() {
  const [info, setInfo] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const initialVersion = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const check = async () => {
      try {
        const { data } = await axiosInstance.get('/system/version/');
        if (cancelled) return;
        if (!initialVersion.current) {
          initialVersion.current = data?.version || null;
        } else if (data?.version && data.version !== initialVersion.current) {
          setUpdateAvailable(true);
        }
        setInfo(data);
      } catch {
        /* شبکه/سرور در دسترس نیست — در نوبت بعدی تلاش می‌شود */
      }
    };

    check();
    timer = setInterval(check, POLL_MS);
    return () => { cancelled = true; if (timer) clearInterval(timer); };
  }, []);

  return { info, updateAvailable };
}
