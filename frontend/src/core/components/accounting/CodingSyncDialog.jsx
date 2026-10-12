import React, { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../../api/axiosConfig';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, Paper, Stack, Typography,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const FONT = 'Vazirmatn, IRANSans, sans-serif';

const CATEGORY_FA = {
  asset: 'دارایی', liability: 'بدهی', equity: 'حقوق صاحبان سهام',
  revenue: 'درآمد', expense: 'هزینه', cost_of_sales: 'بهای تمام‌شده',
};
const SOURCE_FA = {
  parent: 'حساب والد', parent_name: 'نام والد', group: 'گروه حساب',
  ancestor_name: 'نام گروهِ بالادستی', account_name: 'نام حساب', group_type: 'نوع گروه',
};
const NATURE_FA = { debit: 'بدهکار', credit: 'بستانکار', none: 'مهم نیست' };

/**
 * دیالوگ «بررسی و اصلاح ناهمگونی کدینگ».
 *
 * ابتدا **پیشنهادها** را نشان می‌دهد و تنها با تأیید کاربر اعمال می‌کند.
 * رکوردهایی که نوع/ماهیت آن‌ها دستی تعیین شده (`coding_locked`) کنار گذاشته
 * می‌شوند؛ مگر کاربر صریحاً «بازنویسی موارد دستی» را انتخاب کند.
 */
const CodingSyncDialog = ({ open, onClose, onApplied }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState(null);
  const [fixGroups, setFixGroups] = useState(true);
  const [force, setForce] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axiosInstance.get('/accounting/accounts/sync-types/', {
        params: { fix_groups: 1, ...(force ? { force: 1 } : {}) },
      });
      setReport(data);
      setFixGroups((data.groups_to_fix || []).length > 0);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.response?.data?.error || 'دریافت پیشنهادها ممکن نشد.');
    } finally {
      setLoading(false);
    }
  }, [force]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const apply = async () => {
    setApplying(true);
    setError(null);
    try {
      const { data } = await axiosInstance.post('/accounting/accounts/sync-types/', {
        apply: 1,
        fix_groups: fixGroups ? 1 : 0,
        ...(force ? { force: 1 } : {}),
      });
      setReport(data);
      if (onApplied) onApplied(data);
    } catch (e) {
      setError(e?.response?.data?.detail || e?.response?.data?.error || 'اعمال اصلاحات ممکن نشد.');
    } finally {
      setApplying(false);
    }
  };

  const unlockAll = async () => {
    setUnlocking(true);
    setError(null);
    try {
      await axiosInstance.post('/accounting/accounts/unlock-coding/', {});
      await load();
    } catch (e) {
      setError(e?.response?.data?.detail || 'آزادسازی موارد دستی ممکن نشد.');
    } finally {
      setUnlocking(false);
    }
  };

  const mismatched = report?.accounts_mismatched || 0;
  const lockedAccounts = report?.locked_accounts || 0;
  const lockedGroups = report?.locked_groups || 0;
  const locked = lockedAccounts + lockedGroups;
  const reviewGroups = (report?.groups_report || []).filter(g => g.source === 'group_type' && (g.accounts_count || 0) > 0);
  const nothingToDo = mismatched === 0 && !(report?.groups_to_fix || []).length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontFamily: FONT, fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 1 }}>
        <WarningAmberIcon sx={{ color: '#dc2626' }} />
        بررسی و اصلاح ناهمگونی کدینگ
      </DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }}>{error}</Alert>}
        {loading && !report && <Box textAlign="center" py={4}><CircularProgress /></Box>}

        {report && (
          <Stack spacing={2}>
            <Alert severity="info" sx={{ borderRadius: '12px', fontFamily: FONT }}>
              این ابزار فقط <strong>پیشنهاد</strong> می‌دهد و تا وقتی «اعمال پیشنهادها» را نزنید هیچ تغییری در
              داده‌ها انجام نمی‌شود. مواردی که نوع/ماهیت آن‌ها را دستی تعیین کرده‌اید (قفل) کنار گذاشته می‌شوند.
            </Alert>

            {report.applied && (
              <Alert severity="success" sx={{ borderRadius: '12px', fontFamily: FONT }}>
                اعمال شد: {report.accounts_updated || 0} حساب
                {report.groups_updated ? ` و ${report.groups_updated} گروه` : ''} اصلاح شد.
              </Alert>
            )}

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`کل حساب‌ها: ${report.accounts_total}`} sx={{ fontFamily: FONT, fontWeight: 700 }} />
              <Chip label={`پیشنهاد تغییر: ${mismatched}`} sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: mismatched ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)', color: mismatched ? '#b91c1c' : '#047857' }} />
              <Chip label={`ماهیت: ${report.nature_mismatched}`} sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(245,158,11,0.14)', color: '#b45309' }} />
              <Chip label={`گروه: ${(report.groups_to_fix || []).length}`} sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(124,58,237,0.12)', color: '#6d28d9' }} />
              <Chip label={`دستی (قفل) کنارگذاشته: ${locked}`} sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(15,23,42,0.08)' }} />
            </Stack>

            {Object.keys(report.summary_by_category || {}).length > 0 && (
              <Typography variant="body2" color="textSecondary" sx={{ fontFamily: FONT }}>
                انتقال‌ها: {Object.entries(report.summary_by_category).map(([k, v]) => `${v} حساب → «${CATEGORY_FA[k] || k}»`).join(' · ')}
              </Typography>
            )}

            {nothingToDo ? (
              <Alert severity="success" sx={{ borderRadius: '12px', fontFamily: FONT }}>
                هیچ پیشنهادی برای اصلاح نیست؛ نوع همهٔ حساب‌های آزاد با والد/گروه آن‌ها هم‌خوان است.
              </Alert>
            ) : (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', maxHeight: 280, overflow: 'auto' }}>
                <Stack spacing={0.75} divider={<Divider flexItem />}>
                  {(report.changes || []).slice(0, 40).map(r => (
                    <Stack key={r.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={r.code} sx={{ fontFamily: FONT, fontWeight: 800, bgcolor: 'rgba(59,130,246,0.1)', color: '#1d4ed8' }} />
                      <Typography variant="body2" fontWeight={700} sx={{ fontFamily: FONT, flex: 1, minWidth: 120 }}>{r.name}</Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>{r.group_name || r.parent_code || '—'}</Typography>
                      <Chip size="small" label={r.current_type_name} sx={{ fontFamily: FONT, bgcolor: 'rgba(239,68,68,0.1)', color: '#b91c1c', fontWeight: 700 }} />
                      <Typography variant="caption">→</Typography>
                      <Chip size="small" label={r.new_type_name} sx={{ fontFamily: FONT, bgcolor: 'rgba(16,185,129,0.12)', color: '#047857', fontWeight: 700 }} />
                      {r.current_nature !== r.new_nature && (
                        <Chip size="small" label={`ماهیت: ${NATURE_FA[r.new_nature] || r.new_nature}`} sx={{ fontFamily: FONT, fontWeight: 700 }} />
                      )}
                      {r.coding_locked && <Chip size="small" label="دستی" sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(15,23,42,0.08)' }} />}
                      <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>منبع: {SOURCE_FA[r.source] || r.source || '—'}</Typography>
                    </Stack>
                  ))}
                  {(report.changes || []).length > 40 && (
                    <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
                      … و {report.changes.length - 40} مورد دیگر
                    </Typography>
                  )}
                </Stack>
              </Paper>
            )}

            {(report.groups_to_fix || []).length > 0 && (
              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px' }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
                  گروه‌هایی که نامشان با نوعشان نمی‌خواند:
                </Typography>
                <Stack spacing={0.5} mt={0.5}>
                  {report.groups_to_fix.map(g => (
                    <Typography key={g.id} variant="caption" sx={{ fontFamily: FONT }}>
                      • {g.code} {g.name}: {g.from_type_name} → {g.to_type_name}
                      {g.parent_code ? ` (بالادستی: ${g.parent_code})` : ''}
                    </Typography>
                  ))}
                </Stack>
              </Paper>
            )}

            {reviewGroups.length > 0 && (
              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '12px', bgcolor: 'rgba(245,158,11,0.06)' }}>
                <Typography variant="caption" sx={{ fontFamily: FONT, fontWeight: 700, color: '#b45309' }}>
                  گروه‌های نیازمند بازبینی دستی ({reviewGroups.length}): نامشان نشانه‌ای از طبقهٔ حساب ندارد؛
                  نوع را در «کدینگ/گروه حساب‌ها» تعیین کنید (پس از تعیین، دستی محسوب و قفل می‌شود).
                </Typography>
                <Stack spacing={0.5} mt={0.5}>
                  {reviewGroups.slice(0, 12).map(g => (
                    <Typography key={g.id} variant="caption" sx={{ fontFamily: FONT }}>
                      • {g.code} {g.name} — نوع فعلی: {g.current_type_name} — {g.accounts_count} حساب
                    </Typography>
                  ))}
                  {reviewGroups.length > 12 && (
                    <Typography variant="caption" sx={{ fontFamily: FONT }}>… و {reviewGroups.length - 12} گروه دیگر</Typography>
                  )}
                </Stack>
              </Paper>
            )}

            <FormControlLabel
              control={<Checkbox size="small" checked={fixGroups} onChange={e => setFixGroups(e.target.checked)} />}
              label={<Typography variant="body2" sx={{ fontFamily: FONT }}>{`نوع ${(report.groups_to_fix || []).length} گروه ناهمگون نیز اصلاح شود`}</Typography>}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={force} onChange={e => setForce(e.target.checked)} />}
              label={<Typography variant="body2" sx={{ fontFamily: FONT }}>{`موارد دستی (قفل‌شده) هم بازنویسی شوند — ${locked} رکورد`}</Typography>}
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button onClick={load} disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />} sx={{ fontFamily: FONT, fontWeight: 700 }}>
            بازخوانی پیشنهادها
          </Button>
          {locked > 0 && (
            <Button onClick={unlockAll} disabled={unlocking} startIcon={<LockOpenIcon />} color="inherit" sx={{ fontFamily: FONT, fontWeight: 700 }}>
              {unlocking ? 'در حال آزادسازی…' : `آزادسازی ${locked} مورد دستی`}
            </Button>
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} sx={{ fontFamily: FONT, fontWeight: 700 }}>بستن</Button>
          <Button
            variant="contained"
            onClick={apply}
            disabled={applying || !report || (nothingToDo && !force)}
            startIcon={applying ? <CircularProgress size={16} color="inherit" /> : <BoltIcon />}
            sx={{ borderRadius: '12px', fontFamily: FONT, fontWeight: 800, background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
            {applying ? 'در حال اعمال…' : 'اعمال پیشنهادها'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default CodingSyncDialog;
