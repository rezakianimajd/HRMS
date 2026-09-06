import React, { useEffect, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import errorBus from '../../engines/errorBus';

/* Global error snackbar (Proposal 7).
   Todos: subscribe to errorBus; if a request failed with 403/404/500/network,
   show a persistent snackbar — errors are trapped & never leave a blank page. */
let _notify = null;

const GlobalErrorSnackbar = () => {
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    _notify = (payload) => setMsg(payload);
    const unsub = errorBus.onError((payload) => setMsg(payload));
    return () => { unsub(); _notify = null; };
  }, []);

  const close = () => setMsg(null);
  if (!msg) return null;

  return (
    <Snackbar
      open={Boolean(msg)}
      onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      autoHideDuration={msg?.autoHide ?? 5000}
    >
      <Alert severity="error" onClose={close} sx={{ width: '100%' }}>
        {msg?.message || 'خطایی رخ داد'}
      </Alert>
    </Snackbar>
  );
};

/** helper export so non-react code can dispatch */
export const showGlobalError = (message) => { if (_notify) _notify({ message }); };

export default GlobalErrorSnackbar;