import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, FormControlLabel, InputLabel, LinearProgress, MenuItem,
  Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';

const STATUS_COLORS = {
  generated: 'info',
  filled: 'success',
  dry_run: 'warning',
  failed: 'error',
};

const STATUS_LABELS = {
  generated: 'ساخته شد (در انتظار اجرا)',
  filled: 'روی فایل TTMS درج شد',
  dry_run: 'اجرای آزمایشی',
  failed: 'ناموفق',
};

const downloadBlob = (data, filename, type = 'application/zip') => {
  const blob = new Blob([data], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
};

const filenameFromHeaders = (headers, fallback) => {
  const disposition = headers?.['content-disposition'] || '';
  const match = /filename="?([^";]+)"?/.exec(disposition);
  return match ? decodeURIComponent(match[1]) : fallback;
};

const SeasonalTtmsDialog = ({
  open, onClose, apiBase, reportId, params = {}, rowCount = 0, prepare, onToast,
}) => {
  const [kalaType, setKalaType] = useState(12);
  const [kalaName, setKalaName] = useState('کالا/خدمات');
  const [sellerStatus, setSellerStatus] = useState('auto');
  const [continueRadif, setContinueRadif] = useState(true);
  const [dryRun, setDryRun] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [building, setBuilding] = useState(false);
  const [message, setMessage] = useState(null);
  const [lastRunId, setLastRunId] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const referenceQuery = useQuery({
    queryKey: ['seasonal-ttms-reference'],
    queryFn: async () => {
      const response = await axiosInstance.get(`${apiBase}/ttms-reference/`);
      return response.data;
    },
    enabled: open,
    staleTime: 10 * 60 * 1000,
  });

  const runsQuery = useQuery({
    queryKey: ['seasonal-export-runs', reportId],
    queryFn: async () => {
      const response = await axiosInstance.get(`${apiBase}/${reportId}/export-runs/`);
      return response.data;
    },
    enabled: open && Boolean(reportId),
    staleTime: 30 * 1000,
  });

  const reference = referenceQuery.data;
  const runs = useMemo(() => {
    const list = Array.isArray(runsQuery.data) ? runsQuery.data : runsQuery.data?.results || [];
    return list;
  }, [runsQuery.data]);

  useEffect(() => {
    if (!reference) return;
    const defaults = reference.defaults || {};
    setKalaType(defaults.kala_type || 12);
    setKalaName(defaults.kala_name || 'کالا/خدمات');
    setSellerStatus(defaults.seller_type1_code ? String(defaults.seller_type1_code) : 'auto');
    setContinueRadif(defaults.continue_radif !== false);
  }, [reference]);

  useEffect(() => {
    if (!open) {
      setMessage(null);
      setTargetName('');
    }
  }, [open]);

  const kalaOptions = reference?.kala_types || [];
  const sellerOptions = reference?.seller_status_codes || [];

  const buildPackage = useCallback(async () => {
    if (!reportId) {
      setMessage({ severity: 'warning', text: 'ابتدا گزارش فصل را از سرور دریافت کنید.' });
      return;
    }
    setBuilding(true);
    setMessage(null);
    try {
      if (typeof prepare === 'function') await prepare();
      const response = await axiosInstance.post(
        `${apiBase}/${reportId}/ttms-package/`,
        {
          ...params,
          target_name: targetName,
          options: {
            kala_type: kalaType,
            kala_name: kalaName,
            seller_type1_code: sellerStatus === 'auto' ? null : Number(sellerStatus),
            continue_radif: continueRadif,
            dry_run: dryRun,
          },
        },
        { responseType: 'blob' },
      );
      const runId = response.headers?.['x-export-run'] || '';
      const rows = response.headers?.['x-export-rows'] || '';
      const filename = filenameFromHeaders(
        response.headers,
        `ttms-fill-purchase-${reportId}.zip`,
      );
      downloadBlob(response.data, filename);
      setLastRunId(runId);
      setMessage({
        severity: 'success',
        text: `بسته ساخته شد (${toPersianDigits(rows)} ردیف). فایل zip را در ویندوز از حالت فشرده خارج و fill_ttms.ps1 را اجرا کنید.`,
      });
      onToast?.('بستهٔ درج TTMS ساخته شد');
      runsQuery.refetch?.();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setMessage({
        severity: 'error',
        text: detail || 'ساخت بسته ناموفق بود؛ اتصال به سرور یا فیلترها را بررسی کنید.',
      });
    } finally {
      setBuilding(false);
    }
  }, [
    apiBase, continueRadif, dryRun, kalaName, kalaType, onToast, params, prepare,
    reportId, runsQuery, sellerStatus, targetName,
  ]);

  const registerResult = useCallback(async (file) => {
    if (!file) return;
    if (!lastRunId) {
      setMessage({ severity: 'warning', text: 'ابتدا بسته را بسازید تا شمارهٔ اجرا مشخص شود.' });
      return;
    }
    setUploading(true);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      await axiosInstance.post(
        `${apiBase}/${reportId}/export-runs/${lastRunId}/result/`,
        { result: payload },
      );
      setMessage({ severity: 'success', text: 'نتیجهٔ اجرا در تاریخچهٔ گزارش ثبت شد.' });
      onToast?.('نتیجهٔ اجرای TTMS ثبت شد');
      runsQuery.refetch?.();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setMessage({ severity: 'error', text: detail || 'فایل result.json معتبر نبود.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [apiBase, lastRunId, onToast, reportId, runsQuery]);


  return (
    <Dialog open={open} onClose={building ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 15, fontWeight: 800 }}>
        بستهٔ درج ردیف‌ها در فایل Access نسخهٔ TTMS
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 1.5, fontSize: 11.5 }}>
          {`ساختار فایل TTMS روی کپی نسخهٔ ${reference?.template_reference || 'TTMS'} آزمایش شده است. `
            + 'اسکریپت داخل بسته فقط روی «کپی» فایل Access می‌نویسد، فایل اصلی دست‌نخورده می‌ماند '
            + 'و در پایان result.json را برای ثبت در HRMS تولید می‌کند.'}
        </Alert>

        {referenceQuery.isError ? (
          <Alert severity="warning" sx={{ mb: 1.5, fontSize: 11.5 }}>
            {'نسخهٔ فعلی سرور هنوز نقطهٔ پایانی بستهٔ درج TTMS را ندارد؛ '
              + 'پس از استقرار بک‌اند (migration 0032) این بخش فعال می‌شود.'}
          </Alert>
        ) : null}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          <Chip size="small" color="primary" variant="outlined"
                label={`ردیف‌های فیلترشدهٔ جدول: ${toPersianDigits(rowCount)}`} />
          <Chip size="small" variant="outlined"
                label={`نسخهٔ نگاشت: ${reference?.package_version || '…'}`} />
          <Chip size="small" variant="outlined"
                label={`جدول هدف: ${reference?.tables?.detail || 'Kharid_Detail'}`} />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mb: 1.25 }}>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="ttms-kala-label">نوع کالا در فایل TTMS</InputLabel>
            <Select
              labelId="ttms-kala-label"
              label="نوع کالا در فایل TTMS"
              value={kalaType}
              onChange={(event) => setKalaType(Number(event.target.value))}
              sx={{ fontSize: 12.5 }}
            >
              {kalaOptions.map((item) => (
                <MenuItem key={item.value} value={item.value} sx={{ fontSize: 12.5 }}>
                  {`${toPersianDigits(item.value)} — ${item.label}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="ttms-seller-label">وضعیت مودی فروشنده</InputLabel>
            <Select
              labelId="ttms-seller-label"
              label="وضعیت مودی فروشنده"
              value={sellerStatus}
              onChange={(event) => setSellerStatus(event.target.value)}
              sx={{ fontSize: 12.5 }}
            >
              <MenuItem value="auto" sx={{ fontSize: 12.5 }}>خودکار (بر اساس نوع شخص)</MenuItem>
              {sellerOptions.map((item) => (
                <MenuItem key={item.value} value={String(item.value)} sx={{ fontSize: 12.5 }}>
                  {`${toPersianDigits(item.value)} — ${item.label}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="شرح پیش‌فرض کالا/خدمات"
            value={kalaName}
            onChange={(event) => setKalaName(event.target.value)}
            sx={{ minWidth: 200 }}
            inputProps={{ maxLength: 100, style: { fontSize: 12.5 } }}
          />
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} alignItems="center" sx={{ mb: 1 }}>
          <TextField
            size="small"
            label="نام فایل TTMS (اختیاری، برای تاریخچه)"
            value={targetName}
            onChange={(event) => setTargetName(event.target.value)}
            sx={{ minWidth: 260 }}
            inputProps={{ maxLength: 200, style: { fontSize: 12.5 } }}
            placeholder="TTMS_96_New.mdb"
          />
          <FormControlLabel
            control={<Switch size="small" checked={continueRadif}
                             onChange={(event) => setContinueRadif(event.target.checked)} />}
            label={<Typography sx={{ fontSize: 11.5 }}>شمارهٔ ردیف ادامهٔ ردیف‌های موجود باشد</Typography>}
          />
          <FormControlLabel
            control={<Switch size="small" checked={dryRun}
                             onChange={(event) => setDryRun(event.target.checked)} />}
            label={<Typography sx={{ fontSize: 11.5 }}>اجرای آزمایشی (Dry-run)</Typography>}
          />
        </Stack>

        {message ? (
          <Alert severity={message.severity} sx={{ mt: 1, fontSize: 11.5 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        ) : null}

        {building || uploading ? <LinearProgress sx={{ mt: 1.5 }} /> : null}


        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>تاریخچهٔ بسته‌های همین فصل</Typography>
          <Tooltip title="به‌روزرسانی تاریخچه">
            <span>
              <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
                      onClick={() => runsQuery.refetch?.()} disabled={runsQuery.isFetching}>
                به‌روزرسانی
              </Button>
            </span>
          </Tooltip>
        </Stack>

        {runs.length === 0 ? (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            هنوز بسته‌ای برای این فصل ساخته نشده است.
          </Typography>
        ) : (
          <Box sx={{ maxHeight: 220, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['زمان', 'ردیف‌ها', 'جمع مبلغ', 'وضعیت', 'فایل هدف', 'سازنده'].map((label) => (
                    <TableCell key={label} sx={{ fontSize: 11, fontWeight: 800 }}>{label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id} hover selected={String(run.id) === String(lastRunId)}>
                    <TableCell sx={{ fontSize: 11 }}>
                      {run.created_at ? new Date(run.created_at).toLocaleString('fa-IR') : '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{toPersianDigits(run.row_count || 0)}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>
                      {formatPersianNumber(run.totals?.total || 0)}
                    </TableCell>
                    <TableCell sx={{ fontSize: 11 }}>
                      <Chip
                        size="small"
                        color={STATUS_COLORS[run.status] || 'default'}
                        label={STATUS_LABELS[run.status] || run.status_display || run.status}
                        sx={{ fontSize: 10.5, height: 20 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{run.target_name || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>{run.created_by_name || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        <Alert severity="warning" sx={{ mt: 1.5, fontSize: 11 }}>
          {'پس از اجرای اسکریپت، فایل result.json را اینجا بارگذاری کنید تا نتیجه در تاریخچه ثبت شود. '
            + 'پیش‌نیاز اجرا: نصب Microsoft Access Database Engine (ACE) روی ویندوز.'}
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25, gap: 1, flexWrap: 'wrap' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(event) => registerResult(event.target.files?.[0])}
        />
        <Button
          size="small"
          startIcon={<CloudUploadOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={() => fileInputRef.current?.click()}
          disabled={!lastRunId || uploading}
        >
          بارگذاری نتیجه (result.json)
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button size="small" onClick={onClose} disabled={building}>بستن</Button>
        <Button
          size="small"
          variant="contained"
          startIcon={dryRun
            ? <PlayCircleOutlineIcon sx={{ fontSize: 16 }} />
            : <DownloadIcon sx={{ fontSize: 16 }} />}
          onClick={buildPackage}
          disabled={building || !reference || rowCount === 0}
        >
          {building ? 'در حال ساخت…' : 'ساخت بستهٔ درج'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SeasonalTtmsDialog;
