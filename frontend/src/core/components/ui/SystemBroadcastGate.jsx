import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  Paper, Stack, Typography,
} from '@mui/material';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import LogoutIcon from '@mui/icons-material/Logout';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import useAuth from '../../hooks/useAuth';
import axiosInstance from '../../api/axiosConfig';

const POLL_MS = 15000;

/**
 * Platform-wide gate:
 *  - shows the "system is updating" screen while maintenance mode is on,
 *  - shows a logout countdown before an update starts,
 *  - offers a reload when a new version becomes active.
 */
const SystemBroadcastGate = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(null);

  const { data } = useQuery({
    queryKey: ['system-broadcast'],
    queryFn: () => axiosInstance.get('/system/broadcast/', { quiet: true }).then((r) => r.data),
    enabled: isAuthenticated,
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: true,
    retry: 0,
    staleTime: 5000,
  });

  const items = useMemo(() => data?.items || [], [data]);
  const maintenance = data?.maintenance;
  const logoutItem = items.find((item) => item.action === 'logout');
  const reloadItem = items.find((item) => item.action === 'reload');
  const infoItem = items.find((item) => item.action === 'none');

  const target = logoutItem?.starts_at ? new Date(logoutItem.starts_at).getTime() : null;

  useEffect(() => {
    if (!target) { setSecondsLeft(null); return undefined; }
    const tick = () => setSecondsLeft(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [target]);

  const doLogout = useCallback(async () => {
    try { await logout(); } catch { /* ignore */ }
    navigate('/login', { replace: true });
    window.location.reload();
  }, [logout, navigate]);

  useEffect(() => {
    if (logoutItem && secondsLeft === 0) doLogout();
  }, [logoutItem, secondsLeft, doLogout]);

  const acknowledge = async (id) => {
    try { await axiosInstance.post(`/system/broadcast/${id}/ack/`, {}, { quiet: true }); } catch { /* ignore */ }
  };

  const reloadNow = async () => {
    if (reloadItem) await acknowledge(reloadItem.id);
    window.location.reload();
  };

  // Keep the latest handler in a ref so the timer is not reset on every render.
  const reloadRef = useRef(reloadNow);
  reloadRef.current = reloadNow;

  useEffect(() => {
    if (!reloadItem?.id) return undefined;
    const timer = setTimeout(() => { reloadRef.current(); }, 10000);
    return () => clearTimeout(timer);
  }, [reloadItem?.id]);

  if (maintenance?.active) {
    return (
      <Box sx={{
        position: 'fixed', inset: 0, zIndex: 3000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #eef2ff, #fdf2f8)', p: 2,
      }}>
        <Paper elevation={6} sx={{ p: 4, maxWidth: 520, textAlign: 'center', borderRadius: 4 }}>
          <BuildCircleIcon sx={{ fontSize: 56, color: '#6366f1', mb: 1 }} />
          <Typography variant="h5" fontWeight={800} sx={{ color: '#6366f1', mb: 1 }}>
            سیستم در حال به‌روزرسانی است
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {maintenance.message || 'لطفاً چند لحظه صبر کنید؛ پس از پایان به‌روزرسانی صفحه بازخوانی می‌شود.'}
          </Typography>
          {maintenance.version && (
            <Typography variant="caption" color="text.secondary">
              نسخهٔ در حال نصب: {maintenance.version}
            </Typography>
          )}
          <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mt: 3 }}>
            <CircularProgress size={22} />
            <Button variant="outlined" onClick={() => window.location.reload()}>تلاش مجدد</Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <>
      {infoItem && (
        <Box sx={{
          position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 2500, width: 'min(680px, 94vw)',
        }}>
          <Alert
            severity={infoItem.level === 'warning' ? 'warning' : infoItem.level === 'success' ? 'success' : 'info'}
            onClose={() => acknowledge(infoItem.id)}
          >
            <b>{infoItem.title}</b>{infoItem.message ? ` — ${infoItem.message}` : ''}
          </Alert>
        </Box>
      )}

      <Dialog open={Boolean(logoutItem)} disableEscapeKeyDown maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', pt: 3 }}>
          <BuildCircleIcon sx={{ fontSize: 48, color: '#f59e0b', mb: 1 }} />
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            {logoutItem?.title || 'سیستم به‌زودی به‌روزرسانی می‌شود'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {logoutItem?.message || 'لطفاً کار خود را ذخیره کنید و از سیستم خارج شوید.'}
          </Typography>
          <Typography variant="h3" fontWeight={900} sx={{ color: '#ef4444', mb: 1 }}>
            {secondsLeft == null ? '—' : secondsLeft}
          </Typography>
          <Typography variant="caption" color="text.secondary">ثانیه تا بسته‌شدن سیستم</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
          <Button variant="contained" color="error" startIcon={<LogoutIcon />} onClick={doLogout}>
            خروج الان
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(reloadItem)} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: 'center', pt: 3 }}>
          <SystemUpdateAltIcon sx={{ fontSize: 48, color: '#10b981', mb: 1 }} />
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            {reloadItem?.title || 'نسخهٔ جدید فعال شد'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {reloadItem?.message || 'برای استفاده از نسخهٔ جدید، صفحه بازخوانی می‌شود.'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            بازخوانی خودکار تا ۱۰ ثانیهٔ دیگر…
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'center' }}>
          <Button variant="contained" onClick={reloadNow}>بازخوانی کن</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SystemBroadcastGate;

