import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, FormControlLabel, IconButton, InputLabel,
  LinearProgress, List, ListItem, ListItemIcon, ListItemText, MenuItem, Paper,
  Select, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography, Avatar,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckIcon from '@mui/icons-material/Check';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SettingsIcon from '@mui/icons-material/Settings';
import JalaliDatePicker from '../ui/JalaliDatePicker';
import useSystemStatus from '../../hooks/useSystemStatus';
import axiosInstance from '../../api/axiosConfig';
import { formatBytes } from './StorageArchivePanel';
import { toJalali } from '../../utils/dateUtils';
import { toEnglishDigits, toPersianDigits } from '../../utils/numberUtils';
import { SURFACE, SOFT } from './settingsUi';

const COLOR = SOFT.violet;
const CARD = { ...SURFACE, p: 1.75, mb: 1.75 };

const FIELD_SX = {
  '& .MuiInputBase-input': { fontSize: 11.5 },
  '& .MuiSelect-select': { fontSize: 11.5 },
  '& .MuiInputLabel-root': { fontSize: 11 },
};

const onlyDigits = (value) => Number(toEnglishDigits(String(value)).replace(/[^0-9]/g, '')) || 0;

const SectionHead = ({ icon, title, actions }) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
    <Avatar variant="rounded" sx={{
      width: 30, height: 30, borderRadius: '9px',
      bgcolor: `${COLOR}24`, color: COLOR,
    }}>
      {React.cloneElement(icon, { sx: { fontSize: 17 } })}
    </Avatar>
    <Typography sx={{ fontSize: 13, fontWeight: 800, flex: 1 }}>{title}</Typography>
    {actions}
  </Stack>
);

const ACCEPT = '.zip,.tar.gz,.tgz';
const FALLBACK_CHUNK = 4 * 1024 * 1024;

const signatureChip = (value) => {
  switch (value) {
    case 'valid':
      return <Chip size="small" color="success" label="امضا تأیید شد" />;
    case 'unverified':
      return <Chip size="small" color="warning" label="امضا با کلید بررسی نشد" />;
    case 'unconfigured':
      return <Chip size="small" color="warning" variant="outlined" label="بدون امضا" />;
    default:
      return <Chip size="small" label="نامشخص" />;
  }
};

const statusChip = (release) => {
  const map = {
    uploaded: 'default',
    verified: 'info',
    staged: 'warning',
    applied: 'success',
    failed: 'error',
  };
  return <Chip size="small" color={map[release.status] || 'default'} label={release.status_display} />;
};

const UpdatePanel = () => {
  const { info } = useSystemStatus();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [uploadId, setUploadId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const [applyTarget, setApplyTarget] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [forceApply, setForceApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [runId, setRunId] = useState(null);
  const [runData, setRunData] = useState(null);

  const [cfg, setCfg] = useState(null);
  const [savingCfg, setSavingCfg] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('02:00');
  const [scheduleForce, setScheduleForce] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/system/updates/status/');
      setStatus(data);
    } catch (e) {
      setError(e.response?.data?.error || 'دریافت وضعیت به‌روزرسانی ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const startUpload = async (file) => {
    if (!file) return;
    setError(''); setNotice('');

    const maxMb = status?.max_package_mb || 512;
    if (file.size > maxMb * 1024 * 1024) {
      setError(`حجم فایل (${formatBytes(file.size)}) بیشتر از حد مجاز (${maxMb} مگابایت) است.`);
      return;
    }
    if (!/\.(zip|tar\.gz|tgz)$/i.test(file.name)) {
      setError('فرمت بسته باید zip، tar.gz یا tgz باشد.');
      return;
    }

    setUploading(true); setProgress(0); setFileName(file.name); setUploadId(null);
    try {
      const init = await axiosInstance.post('/system/updates/upload/init/', {
        file_name: file.name,
        total_size: file.size,
      });
      const id = init.data.upload_id;
      setUploadId(id);

      const chunkSize = init.data.chunk_size || FALLBACK_CHUNK;
      const totalChunks = Math.max(1, Math.ceil(file.size / chunkSize));

      for (let index = 0; index < totalChunks; index += 1) {
        const start = index * chunkSize;
        const blob = file.slice(start, Math.min(start + chunkSize, file.size));
        const form = new FormData();
        form.append('chunk', blob, file.name);
        form.append('index', String(index));
        // eslint-disable-next-line no-await-in-loop
        await axiosInstance.post(`/system/updates/upload/${id}/chunk/`, form);
        setProgress(Math.round(((index + 1) / totalChunks) * 100));
      }

      const done = await axiosInstance.post(`/system/updates/upload/${id}/complete/`, {});
      const release = done.data.release;
      setNotice(`بستهٔ نسخهٔ ${release.version} بارگذاری و تأیید شد.`);
      if (done.data.warnings?.length) setError(done.data.warnings.join(' '));
      setUploadId(null);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || 'آپلود بسته ناموفق بود.');
    } finally {
      setUploading(false);
    }
  };

  const abortUpload = async () => {
    if (!uploadId) { setUploading(false); return; }
    try { await axiosInstance.delete(`/system/updates/upload/${uploadId}/`); } catch { /* ignore */ }
    setUploadId(null); setUploading(false); setProgress(0); setFileName('');
  };

  const removeRelease = async (release) => {
    if (!window.confirm(`بستهٔ نسخهٔ ${release.version} حذف شود؟`)) return;
    setError(''); setNotice('');
    try {
      await axiosInstance.delete(`/system/updates/releases/${release.id}/`);
      setNotice('بسته حذف شد.');
      await load();
    } catch (e) {
      setError(e.response?.data?.error || 'حذف بسته ناموفق بود.');
    }
  };

  // Live progress of the privileged updater (polls until the run ends).
  useEffect(() => {
    if (!runId) return undefined;
    let cancelled = false;

    const fetchRun = async () => {
      try {
        const { data } = await axiosInstance.get(
          `/system/updates/runs/${runId}/`, { quiet: true },
        );
        if (cancelled) return;
        setRunData(data);
        if (data.status !== 'running') {
          setRunId(null);
          load();
        }
      } catch {
        /* سرور در حال ری‌استارت است — در نوبت بعد تلاش می‌کنیم */
      }
    };

    fetchRun();
    const timer = setInterval(fetchRun, 2000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [runId, load]);

  // Phase 3: updater configuration (channel, countdown, retention, notifications)
  useEffect(() => {
    let cancelled = false;
    axiosInstance.get('/system/updates/settings/', { quiet: true })
      .then(({ data }) => { if (!cancelled) setCfg(data); })
      .catch(() => { /* بدون دسترسی یا سرور در دسترس نیست */ });
    return () => { cancelled = true; };
  }, []);

  const saveSettings = async () => {
    if (!cfg) return;
    setSavingCfg(true); setError(''); setNotice('');
    try {
      const { data } = await axiosInstance.patch('/system/updates/settings/', cfg);
      setCfg(data);
      setNotice('تنظیمات به‌روزرسانی ذخیره شد.');
      await load();
    } catch (e) {
      setError(e.response?.data?.error || 'ذخیرهٔ تنظیمات ناموفق بود.');
    } finally {
      setSavingCfg(false);
    }
  };

  const submitSchedule = async () => {
    if (!scheduleTarget || !scheduleDate) return;
    setError(''); setNotice('');
    try {
      await axiosInstance.post('/system/updates/schedules/', {
        release_id: scheduleTarget.id,
        scheduled_for: `${scheduleDate}T${scheduleTime || '02:00'}:00`,
        force: scheduleForce,
      });
      setScheduleTarget(null);
      setScheduleDate('');
      setNotice('زمان‌بندی نصب ثبت شد.');
      await load();
    } catch (e) {
      setError(e.response?.data?.error || 'ثبت زمان‌بندی ناموفق بود.');
    }
  };

  const cancelSchedule = async (id) => {
    setError(''); setNotice('');
    try {
      await axiosInstance.delete(`/system/updates/schedules/${id}/`);
      setNotice('زمان‌بندی لغو شد.');
      await load();
    } catch (e) {
      setError(e.response?.data?.error || 'لغو زمان‌بندی ناموفق بود.');
    }
  };

  const startApply = async () => {
    if (!applyTarget) return;
    setApplying(true); setError(''); setNotice('');
    try {
      const { data } = await axiosInstance.post(
        `/system/updates/releases/${applyTarget.id}/apply/`,
        { force: forceApply },
      );
      setRunData(data.run);
      setRunId(data.run.id);
      setApplyTarget(null);
      setConfirmText('');
      setNotice(data.message || 'درخواست نصب ثبت شد.');
      await load();
    } catch (e) {
      setError(e.response?.data?.error || 'ثبت درخواست نصب ناموفق بود.');
    } finally {
      setApplying(false);
    }
  };

  const startRollback = async () => {
    if (!status?.last_run) return;
    if (!window.confirm('بازگردانی به نسخهٔ قبلی انجام شود؟ سیستم چند لحظه بسته می‌شود.')) return;
    setError(''); setNotice('');
    try {
      await axiosInstance.post(`/system/updates/runs/${status.last_run.id}/rollback/`);
      setNotice('درخواست بازگشت ثبت شد؛ چند لحظه صبر کنید.');
      await load();
    } catch (e) {
      setError(e.response?.data?.error || 'ثبت درخواست بازگشت ناموفق بود.');
    }
  };

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={26} /></Box>;

  if (!status?.can_manage) {
    return (
      <Alert severity="warning">
        شما مجوز «مدیریت به‌روزرسانی سیستم» را ندارید. با مدیر ارشد سیستم تماس بگیرید.
      </Alert>
    );
  }

  const releases = status?.releases || [];
  const currentVersion = status?.current_version || info?.version || '—';

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}

      {/* Status */}
      <Paper elevation={0} sx={CARD}>
        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap" useFlexGap>
          <Avatar variant="rounded" sx={{ width: 32, height: 32, borderRadius: '10px', bgcolor: `${COLOR}24`, color: COLOR }}>
            <SystemUpdateAltIcon sx={{ fontSize: 18 }} />
          </Avatar>
          <Typography sx={{ fontSize: 13, fontWeight: 800 }}>به‌روزرسانی سیستم</Typography>
          <Chip size="small" variant="outlined" label={`نسخهٔ فعلی ${toPersianDigits(currentVersion)}`} />
          <Chip size="small" variant="outlined"
            color={status.signature_required ? 'success' : 'warning'}
            label={status.signature_required ? 'امضای بسته الزامی است' : 'کلید امضا تنظیم نشده'} />
          <Chip size="small" variant="outlined"
            color={status.apply_enabled ? 'success' : 'default'}
            label={status.apply_enabled ? 'نصب خودکار فعال' : 'نصب خودکار: فاز بعد'} />
          <Box sx={{ flex: 1 }} />
          <Button size="small" variant="outlined" onClick={load}
            sx={{ fontSize: 11, borderRadius: '9px', px: 1.5 }}>
            به‌روزرسانی وضعیت
          </Button>
        </Stack>

        {!status.signature_required && (
          <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mt: 1.5, '& .MuiAlert-message': { fontSize: 11 } }}>
            کلید عمومی امضا تنظیم نشده است؛ بسته‌ها بدون بررسی اصالت پذیرفته می‌شوند.
            برای امنیت کامل مقدار <code>UPDATE_PUBLIC_KEY</code> را روی سرور تنظیم کنید.
          </Alert>
        )}
      </Paper>

      {/* Phase 3: settings */}
      {cfg && (
        <Paper elevation={0} sx={CARD}>
          <SectionHead icon={<SettingsIcon />} title="تنظیمات به‌روزرسانی" />

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 150, ...FIELD_SX }}>
              <InputLabel>کانال</InputLabel>
              <Select label="کانال" value={cfg.channel}
                onChange={(event) => setCfg({ ...cfg, channel: event.target.value })}>
                <MenuItem value="stable" sx={{ fontSize: 11.5 }}>پایدار</MenuItem>
                <MenuItem value="beta" sx={{ fontSize: 11.5 }}>آزمایشی</MenuItem>
              </Select>
            </FormControl>
            <TextField size="small" label="شمارندهٔ خروج (ثانیه)"
              value={toPersianDigits(cfg.logout_countdown_seconds ?? '')} sx={{ width: 180, ...FIELD_SX }}
              onChange={(event) => setCfg({ ...cfg, logout_countdown_seconds: onlyDigits(event.target.value) })} />
            <TextField size="small" label="تعداد بستهٔ نگهداری"
              value={toPersianDigits(cfg.keep_releases ?? '')} sx={{ width: 170, ...FIELD_SX }}
              onChange={(event) => setCfg({ ...cfg, keep_releases: onlyDigits(event.target.value) })} />
            <FormControlLabel
              sx={{ '& .MuiFormControlLabel-label': { fontSize: 11.5 } }}
              control={<Switch checked={Boolean(cfg.notify_email)}
                onChange={(event) => setCfg({ ...cfg, notify_email: event.target.checked })} />}
              label="ایمیل" />
            <FormControlLabel
              sx={{ '& .MuiFormControlLabel-label': { fontSize: 11.5 } }}
              control={<Switch checked={Boolean(cfg.notify_bale)}
                onChange={(event) => setCfg({ ...cfg, notify_bale: event.target.checked })} />}
              label="بله" />
          </Stack>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mt: 1.5 }} useFlexGap>
            <TextField size="small" fullWidth label="ایمیل‌های اطلاع‌رسانی (با کاما)"
              value={(cfg.notify_emails || []).join(',')} sx={FIELD_SX}
              onChange={(event) => setCfg({
                ...cfg,
                notify_emails: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
              })} />
            <TextField size="small" fullWidth label="شناسه‌های چت بله (با کاما)"
              value={(cfg.notify_bale_chat_ids || []).join(',')} sx={FIELD_SX}
              onChange={(event) => setCfg({
                ...cfg,
                notify_bale_chat_ids: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
              })} />
          </Stack>

          <Box sx={{
            mt: 1.75, pt: 1.5, borderTop: '1px solid', borderColor: 'divider',
            display: 'flex', justifyContent: 'flex-end',
          }}>
            <Button size="small" variant="contained" onClick={saveSettings}
              disabled={savingCfg}
              sx={{ bgcolor: COLOR, fontSize: 11.5, borderRadius: '9px', px: 2 }}>
              {savingCfg ? <CircularProgress size={16} color="inherit" /> : 'ذخیرهٔ تنظیمات'}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Upload */}
      <Paper elevation={0} sx={CARD}>
        <SectionHead icon={<CloudUploadIcon />} title="بارگذاری بستهٔ به‌روزرسانی" />

        <Box
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            startUpload(event.dataTransfer.files?.[0]);
          }}
          onClick={() => { if (!uploading) inputRef.current?.click(); }}
          sx={{
            border: '2px dashed',
            borderColor: dragging ? COLOR : 'divider',
            borderRadius: '14px',
            p: 2.5,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            cursor: uploading ? 'default' : 'pointer',
            bgcolor: dragging ? `${COLOR}0d` : 'transparent',
            transition: 'all .15s ease',
          }}
        >
          <input ref={inputRef} type="file" accept={ACCEPT} hidden
            onChange={(event) => {
              startUpload(event.target.files?.[0]);
              event.target.value = '';
            }} />
          <CloudUploadIcon sx={{ fontSize: 34, color: COLOR, opacity: 0.85, mb: 0.5 }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, textAlign: 'center', width: '100%' }}>
            فایل بسته را انتخاب یا رها کنید
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', textAlign: 'center', width: '100%', mt: 0.25 }}>
            فرمت‌های مجاز: zip · tar.gz · tgz
          </Typography>
        </Box>

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography noWrap sx={{ fontSize: 10.5, maxWidth: 380 }}>{fileName}</Typography>
              <Typography variant="caption" fontWeight={700}>{toPersianDigits(progress)}٪</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
            <Box sx={{ mt: 1 }}>
              <Button size="small" color="error" onClick={abortUpload}>لغو آپلود</Button>
            </Box>
          </Box>
        )}
      </Paper>


      {/* Releases */}
      <Paper elevation={0} sx={{ ...CARD, p: 0, overflow: 'hidden' }}>
        <Box sx={{ px: 1.75, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
          <SectionHead icon={<SystemUpdateAltIcon />} title="بسته‌های بارگذاری‌شده" />
        </Box>
        {releases.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
              هنوز بسته‌ای بارگذاری نشده است.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" sx={{ '& th': { fontSize: 10.5, fontWeight: 800, bgcolor: 'rgba(139,92,246,0.04)' }, '& td': { fontSize: 11, py: 1 } }}>
              <TableHead>
                <TableRow>
                  <TableCell>نسخه</TableCell>
                  <TableCell>وضعیت</TableCell>
                  <TableCell>کانال</TableCell>
                  <TableCell>امضا</TableCell>
                  <TableCell>حجم</TableCell>
                  <TableCell>تاریخ</TableCell>
                  <TableCell>آپلودکننده</TableCell>
                  <TableCell align="center">عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {releases.map((release) => (
                  <TableRow key={release.id} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>{toPersianDigits(release.version)}</Typography>
                      {release.min_app_version && (
                        <Typography sx={{ fontSize: 9.5, color: 'text.secondary', display: 'block' }}>
                          حداقل نسخهٔ مبدأ: {toPersianDigits(release.min_app_version)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{statusChip(release)}</TableCell>
                    <TableCell>
                      <Chip size="small"
                        variant={release.channel === status.channel ? 'filled' : 'outlined'}
                        color={release.channel === status.channel ? 'default' : 'warning'}
                        label={release.channel === 'beta' ? 'آزمایشی' : 'پایدار'}
                        sx={{ fontSize: 10.5, height: 20 }} />
                    </TableCell>
                    <TableCell>{signatureChip(release.signature_status)}</TableCell>
                    <TableCell>{formatBytes(release.size)}</TableCell>
                    <TableCell>{toJalali(String(release.created_at || '').slice(0, 10))}</TableCell>
                    <TableCell>{release.uploaded_by || '—'}</TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="زمان‌بندی نصب">
                        <span>
                          <IconButton size="small" disabled={!status.apply_enabled}
                            onClick={() => { setScheduleTarget(release); setScheduleForce(false); }}>
                            <ScheduleIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Button size="small" variant="contained" startIcon={<PlayArrowIcon />}
                        disabled={!status.apply_enabled || release.status === 'applied'}
                        onClick={() => { setConfirmText(''); setApplyTarget(release); }}
                        sx={{ mr: 1, bgcolor: COLOR, fontSize: 10.5, borderRadius: '8px' }}>
                        نصب
                      </Button>
                      <Button size="small" color="error" startIcon={<DeleteIcon />}
                        sx={{ fontSize: 10.5, borderRadius: '8px' }}
                        onClick={() => removeRelease(release)}>
                        حذف
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Scheduled installs */}
      {(status.schedules || []).length > 0 && (
        <Paper elevation={0} sx={{ ...CARD, p: 0, mt: 0, overflow: 'hidden' }}>
          <Box sx={{ px: 1.75, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            <SectionHead icon={<ScheduleIcon />} title="زمان‌بندی‌های نصب" />
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>نسخه</TableCell>
                  <TableCell>زمان اجرا</TableCell>
                  <TableCell>وضعیت</TableCell>
                  <TableCell>ثبت‌کننده</TableCell>
                  <TableCell align="center">عملیات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(status.schedules || []).map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{toPersianDigits(item.version)}</TableCell>
                    <TableCell>
                      {toJalali(String(item.scheduled_for || '').slice(0, 10))}
                      {' — '}
                      {toPersianDigits(String(item.scheduled_for || '').slice(11, 16))}
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={item.status_display}
                        color={item.status === 'pending' ? 'info'
                          : item.status === 'queued' ? 'warning'
                            : item.status === 'done' ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>{item.created_by || '—'}</TableCell>
                    <TableCell align="center">
                      {item.status === 'pending' && (
                        <Button size="small" color="error" onClick={() => cancelSchedule(item.id)}>
                          لغو
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Last run */}
      {status.last_run && (
        <Paper elevation={0} sx={CARD}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap">
            <CheckCircleOutlineIcon sx={{ fontSize: 18, color: SOFT.green }} />
            <Typography sx={{ fontSize: 13, fontWeight: 800 }}>آخرین اجرای به‌روزرسانی</Typography>
            <Chip size="small" label={`${status.last_run.from_version} → ${status.last_run.to_version}`} />
            <Chip size="small" variant="outlined" label={status.last_run.status_display} />
            <Typography variant="caption" color="textSecondary">
              {toJalali(String(status.last_run.started_at || '').slice(0, 10))}
            </Typography>
            {status.last_run.status === 'success' && (
              <Button size="small" color="warning" variant="outlined" onClick={startRollback}>
                بازگشت به نسخهٔ قبل
              </Button>
            )}
          </Stack>
          {status.last_run.error && (
            <Alert severity="error" sx={{ mt: 1 }}>{status.last_run.error}</Alert>
          )}
        </Paper>
      )}

      {/* Apply confirmation */}
      <Dialog open={Boolean(applyTarget)} onClose={() => { if (!applying) setApplyTarget(null); }}
        maxWidth="sm" fullWidth>
        <DialogTitle>نصب نسخهٔ {applyTarget?.version}</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            با شروع نصب، سیستم برای همهٔ کاربران بسته می‌شود و پس از پایان، سرویس‌ها ری‌استارت می‌شوند.
            {applyTarget?.migrations?.length
              ? ` ${applyTarget.migrations.length} مهاجرت دیتابیس اجرا خواهد شد.`
              : ' این بسته مهاجرت دیتابیس ندارد.'}
          </Alert>
          <Typography variant="body2" sx={{ mb: 1 }}>
            برای تأیید، نسخه را تایپ کنید: <b>{applyTarget?.version}</b>
          </Typography>
          <TextField fullWidth size="small" value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={applyTarget?.version} />
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1.5 }}>
            شمارندهٔ خروج کاربران: {status?.countdown_seconds ?? 60} ثانیه
          </Typography>

          {applyTarget?.channel && status?.channel && applyTarget.channel !== status.channel && (
            <>
              <Alert severity="info" sx={{ mt: 1.5 }}>
                کانال بسته ({applyTarget.channel}) با کانال سیستم ({status.channel}) متفاوت است.
              </Alert>
              <FormControlLabel sx={{ mt: 1 }}
                control={<Switch checked={forceApply}
                  onChange={(event) => setForceApply(event.target.checked)} />}
                label="نصب اجباری با وجود اختلاف کانال" />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setApplyTarget(null)} disabled={applying}>انصراف</Button>
          <Button variant="contained" color="error" disabled={applying || !applyTarget
            || confirmText.trim() !== applyTarget.version
            || ((applyTarget?.channel && status?.channel && applyTarget.channel !== status.channel) && !forceApply)}
            onClick={startApply}>
            {applying ? <CircularProgress size={20} /> : 'شروع به‌روزرسانی'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Live progress */}
      <Dialog open={Boolean(runData)} onClose={() => { if (!runId) setRunData(null); }}
        maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar variant="rounded" sx={{ width: 32, height: 32, borderRadius: '10px', bgcolor: `${COLOR}24`, color: COLOR }}><SystemUpdateAltIcon sx={{ fontSize: 18 }} /></Avatar>
            <Typography fontWeight={800}>پیشرفت به‌روزرسانی</Typography>
            <Chip size="small" label={runData?.status_display || 'در حال اجرا'}
              color={runData?.status === 'success' ? 'success'
                : runData?.status === 'failed' ? 'error'
                  : runData?.status === 'rolled_back' ? 'warning' : 'default'} />
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="textSecondary">
            {runData?.from_version || '—'} → {runData?.to_version || '—'}
          </Typography>
          <List dense>
            {(runData?.steps || []).map((step, index) => (
              <ListItem key={`${step.name}-${index}`}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {step.status === 'done'
                    ? <CheckIcon color="success" fontSize="small" />
                    : <HourglassEmptyIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText
                  primary={step.name}
                  secondary={step.at ? new Date(step.at).toLocaleTimeString('fa-IR') : ''} />
              </ListItem>
            ))}
          </List>
          {runId && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress />
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                در حال اجرا… این پنجره را نبندید (در صورت قطع اتصال، وضعیت از تاریخچه قابل مشاهده است).
              </Typography>
            </Box>
          )}
          {runData?.error && <Alert severity="error" icon={<ErrorOutlineIcon />} sx={{ mt: 2 }}>{runData.error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setRunData(null)} disabled={Boolean(runId)}>بستن</Button>
        </DialogActions>
      </Dialog>

      {/* Schedule dialog */}
      <Dialog open={Boolean(scheduleTarget)} onClose={() => setScheduleTarget(null)}
        maxWidth="xs" fullWidth>
        <DialogTitle>زمان‌بندی نصب نسخهٔ {scheduleTarget?.version}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            در زمان تعیین‌شده، نصب به‌طور خودکار آغاز می‌شود و همهٔ کاربران اعلان خروج می‌گیرند.
          </Typography>
          <Stack spacing={2}>
            <JalaliDatePicker fullWidth label="تاریخ اجرا" value={scheduleDate}
              onChange={(value) => setScheduleDate(value)} />
            <TextField fullWidth size="small" type="time" label="ساعت اجرا"
              value={scheduleTime} onChange={(event) => setScheduleTime(event.target.value)}
              InputLabelProps={{ shrink: true }} />
          </Stack>
          {scheduleTarget?.channel && status?.channel && scheduleTarget.channel !== status.channel && (
            <FormControlLabel sx={{ mt: 1 }}
              control={<Switch checked={scheduleForce}
                onChange={(event) => setScheduleForce(event.target.checked)} />}
              label="زمان‌بندی اجباری با وجود اختلاف کانال" />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setScheduleTarget(null)}>انصراف</Button>
          <Button variant="contained" disabled={!scheduleDate} onClick={submitSchedule}
            sx={{ bgcolor: COLOR }}>
            ثبت زمان‌بندی
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UpdatePanel;

