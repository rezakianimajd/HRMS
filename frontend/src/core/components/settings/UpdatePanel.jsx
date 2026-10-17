import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, LinearProgress, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import useSystemStatus from '../../hooks/useSystemStatus';
import axiosInstance from '../../api/axiosConfig';
import { formatBytes } from './StorageArchivePanel';
import { toJalali } from '../../utils/dateUtils';

const COLOR = '#8b5cf6';
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
      <Paper variant="outlined" sx={{
        p: 2, mb: 2, borderRadius: '12px', borderColor: `${COLOR}33`,
        background: `linear-gradient(135deg, ${COLOR}0d, transparent)`,
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <SystemUpdateAltIcon sx={{ color: COLOR }} />
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: COLOR }}>
              به‌روزرسانی سیستم
            </Typography>
            <Typography variant="caption" color="textSecondary">
              نسخهٔ فعلی <b>{currentVersion}</b> · کانال {status.channel} · حداکثر حجم {status.max_package_mb} مگابایت
            </Typography>
          </Box>
          <Chip size="small" variant="outlined"
            color={status.signature_required ? 'success' : 'warning'}
            label={status.signature_required ? 'امضای بسته الزامی است' : 'کلید امضا تنظیم نشده'} />
          <Chip size="small" variant="outlined"
            color={status.apply_enabled ? 'success' : 'default'}
            label={status.apply_enabled ? 'نصب خودکار فعال' : 'نصب خودکار: فاز بعد'} />
          <Button size="small" onClick={load}>به‌روزرسانی وضعیت</Button>
        </Stack>

        {!status.signature_required && (
          <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ mt: 1.5 }}>
            کلید عمومی امضا تنظیم نشده است؛ بسته‌ها بدون بررسی اصالت پذیرفته می‌شوند.
            برای امنیت کامل مقدار <code>UPDATE_PUBLIC_KEY</code> را روی سرور تنظیم کنید.
          </Alert>
        )}
      </Paper>

      {/* Upload */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '12px' }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
          بارگذاری بستهٔ به‌روزرسانی
        </Typography>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1.5 }}>
          فایل <code>.zip</code> یا <code>.tar.gz</code> را اینجا رها کنید. بسته ابتدا تأیید
          (امضا و چکسام) و سپس در فهرست زیر ثبت می‌شود.
        </Typography>

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
            borderRadius: '12px',
            p: 3,
            textAlign: 'center',
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
          <CloudUploadIcon sx={{ fontSize: 40, color: COLOR, opacity: 0.85 }} />
          <Typography variant="body2" fontWeight={600}>فایل بسته را انتخاب یا رها کنید</Typography>
          <Typography variant="caption" color="textSecondary">فرمت‌های مجاز: zip · tar.gz · tgz</Typography>
        </Box>

        {uploading && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" noWrap sx={{ maxWidth: 380 }}>{fileName}</Typography>
              <Typography variant="caption" fontWeight={700}>{progress}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
            <Box sx={{ mt: 1 }}>
              <Button size="small" color="error" onClick={abortUpload}>لغو آپلود</Button>
            </Box>
          </Box>
        )}
      </Paper>


      {/* Releases */}
      <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight={700}>بسته‌های بارگذاری‌شده</Typography>
        </Box>
        {releases.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="textSecondary">
              هنوز بسته‌ای بارگذاری نشده است.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>نسخه</TableCell>
                  <TableCell>وضعیت</TableCell>
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
                      <Typography variant="body2" fontWeight={700}>{release.version}</Typography>
                      {release.min_app_version && (
                        <Typography variant="caption" color="textSecondary">
                          حداقل نسخهٔ مبدأ: {release.min_app_version}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{statusChip(release)}</TableCell>
                    <TableCell>{signatureChip(release.signature_status)}</TableCell>
                    <TableCell>{formatBytes(release.size)}</TableCell>
                    <TableCell>{toJalali(String(release.created_at || '').slice(0, 10))}</TableCell>
                    <TableCell>{release.uploaded_by || '—'}</TableCell>
                    <TableCell align="center">
                      <Button size="small" color="error" startIcon={<DeleteIcon />}
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

      {/* Last run */}
      {status.last_run && (
        <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: '12px' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap">
            <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <Typography variant="subtitle2" fontWeight={700}>آخرین اجرای به‌روزرسانی</Typography>
            <Chip size="small" label={`${status.last_run.from_version} → ${status.last_run.to_version}`} />
            <Chip size="small" variant="outlined" label={status.last_run.status_display} />
            <Typography variant="caption" color="textSecondary">
              {toJalali(String(status.last_run.started_at || '').slice(0, 10))}
            </Typography>
          </Stack>
          {status.last_run.error && (
            <Alert severity="error" sx={{ mt: 1 }}>{status.last_run.error}</Alert>
          )}
        </Paper>
      )}

      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
        بسته‌ها در مسیر سرور <code>{status.update_root}</code> نگهداری می‌شوند و از طریق
        آدرس عمومی <code>/media/</code> قابل دانلود نیستند.
      </Typography>
    </Box>
  );
};

export default UpdatePanel;

