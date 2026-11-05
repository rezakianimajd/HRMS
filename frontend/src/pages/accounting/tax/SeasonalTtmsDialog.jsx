import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, FormControlLabel, InputLabel, LinearProgress, MenuItem,
  Select, Stack, Switch, Tab, Table, TableBody, TableCell, TableHead, TableRow,
  Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';
import SeasonalTtmsPreview from './SeasonalTtmsPreview';

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
  const [taxOffice, setTaxOffice] = useState('');
  const [continueRadif, setContinueRadif] = useState(true);
  const [dryRun, setDryRun] = useState(false);
  const [targetName, setTargetName] = useState('');
  const [templateFile, setTemplateFile] = useState(null);
  const templateInputRef = useRef(null);
  const [building, setBuilding] = useState(false);
  const [message, setMessage] = useState(null);
  const [lastRunId, setLastRunId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [manualStatus, setManualStatus] = useState('filled');
  const [manualInserted, setManualInserted] = useState('');
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('options');
  const [overrides, setOverrides] = useState({});
  const [defaults, setDefaults] = useState({});
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const expressionParam = params?.expression || '';

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
      setTemplateFile(null);
      setManualInserted('');
      if (templateInputRef.current) templateInputRef.current.value = '';
    }
  }, [open]);

  useEffect(() => {
    if (open) setManualInserted(rowCount ? String(rowCount) : '');
  }, [open, rowCount]);

  const kalaOptions = reference?.kala_types || [];
  const sellerOptions = reference?.seller_status_codes || [];
  const provinces = reference?.provinces || [];
  const taxOffices = reference?.tax_offices || [];

  const optionsPayload = useCallback(() => ({
    kala_type: kalaType,
    kala_name: kalaName,
    seller_type1_code: sellerStatus === 'auto' ? null : Number(sellerStatus),
    continue_radif: continueRadif,
    dry_run: dryRun,
    tax_office_code: taxOffice ? Number(taxOffice) : null,
  }), [kalaType, kalaName, sellerStatus, continueRadif, dryRun, taxOffice]);

  const setOverride = useCallback((key, column, value) => {
    setOverrides((current) => {
      const next = { ...current };
      const row = { ...(next[key] || {}) };
      if (value === '' || value === null || value === undefined) row[column] = null;
      else row[column] = value;
      if (Object.keys(row).length) next[key] = row;
      else delete next[key];
      return next;
    });
  }, []);

  const setDefault = useCallback((column, value) => {
    setDefaults((current) => {
      if (!column) return {};
      const next = { ...current };
      if (value === '' || value === null || value === undefined) delete next[column];
      else next[column] = value;
      return next;
    });
  }, []);

  const loadPreview = useCallback(async () => {
    if (!reportId) {
      setPreviewError('ابتدا گزارش فصل را از سرور دریافت کنید.');
      return null;
    }
    setPreviewLoading(true);
    setPreviewError('');
    try {
      if (typeof prepare === 'function') await prepare();
      const response = await axiosInstance.post(`${apiBase}/${reportId}/ttms-preview/`, {
        ...params,
        options: optionsPayload(),
        overrides,
        defaults,
      });
      setPreview(response.data);
      return response.data;
    } catch (error) {
      setPreviewError(
        error?.response?.data?.detail || 'دریافت پیش‌نمایش ناموفق بود؛ اتصال به سرور را بررسی کنید.',
      );
      return null;
    } finally {
      setPreviewLoading(false);
    }
  }, [apiBase, defaults, optionsPayload, overrides, params, prepare, reportId]);

  useEffect(() => {
    if (open && tab === 'preview' && !preview && !previewLoading) loadPreview();
  }, [open, tab, preview, previewLoading, loadPreview]);

  useEffect(() => {
    if (!open) {
      setTab('options');
      setPreview(null);
      setPreviewError('');
    }
  }, [open]);

  useEffect(() => {
    setPreview(null);
  }, [kalaType, kalaName, sellerStatus, continueRadif, dryRun, expressionParam]);

  const downloadPreviewCsv = useCallback(async () => {
    if (!reportId) return;
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const response = await axiosInstance.post(
        `${apiBase}/${reportId}/ttms-preview/`,
        { ...params, options: optionsPayload(), overrides, defaults, format: 'csv' },
        { responseType: 'blob' },
      );
      const filename = filenameFromHeaders(response.headers, 'ttms-preview.csv');
      downloadBlob(response.data, filename, 'text/csv;charset=utf-8');
      onToast?.('فایل CSV پیش‌نمایش دانلود شد');
    } catch (error) {
      setPreviewError(error?.response?.data?.detail || 'دانلود CSV پیش‌نمایش ناموفق بود.');
    } finally {
      setPreviewLoading(false);
    }
  }, [apiBase, defaults, onToast, optionsPayload, overrides, params, reportId]);


  const buildPackage = useCallback(async () => {
    if (!reportId) {
      setMessage({ severity: 'warning', text: 'ابتدا گزارش فصل را از سرور دریافت کنید.' });
      return;
    }
    setBuilding(true);
    setMessage(null);
    try {
      if (typeof prepare === 'function') await prepare();
      const fresh = await loadPreview();
      if (fresh?.errors?.length) {
        setBuilding(false);
        setTab('preview');
        setMessage({
          severity: 'error',
          text: `مقادیر اصلاح‌شده معتبر نیست: ${fresh.errors.slice(0, 3).map((item) => item.message).join(' | ')}`,
        });
        return;
      }
      const basePayload = {
        ...params,
        target_name: targetName,
        options: optionsPayload(),
        overrides,
        defaults,
      };
      let requestBody = basePayload;
      if (templateFile) {
        const form = new FormData();
        Object.entries(basePayload).forEach(([key, value]) => {
          if (value === null || value === undefined) return;
          form.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        });
        form.append('template', templateFile);
        requestBody = form;
      }
      const response = await axiosInstance.post(
        `${apiBase}/${reportId}/ttms-package/`,
        requestBody,
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
        text: `بسته ساخته شد (${toPersianDigits(rows)} ردیف فیلترشده). فایل zip را از حالت فشرده خارج کنید و `
          + (templateFile
            ? 'روی run_fill.cmd دابل‌کلیک کنید تا همان فایل Access شما پر شود.'
            : 'fill_ttms.ps1 را با مسیر فایل Access اجرا کنید (یا فایل را کنار اسکریپت بگذارید و run_fill.cmd را اجرا کنید).')
          + ' نتیجه در result.json نوشته می‌شود.',
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
    apiBase, defaults, loadPreview, onToast, optionsPayload, overrides, params,
    prepare, reportId, runsQuery, targetName, templateFile,
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
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        setMessage({
          severity: 'error',
          text: 'این فایل JSON معتبر نیست؛ فایل result.json تولیدشده با run_fill.cmd را انتخاب کنید.',
        });
        return;
      }
      const status = String(payload?.status || '').trim().toLowerCase();
      if (!status && (payload?.package || payload?.totals)) {
        setMessage({
          severity: 'warning',
          text: 'این فایل manifest.json است؛ فایل result.json را بارگذاری کنید.',
        });
        return;
      }
      if (!status) {
        setMessage({
          severity: 'warning',
          text: 'این فایل نتیجهٔ اجرا نیست (کلید status ندارد). فایل result.json داخل پوشهٔ بسته را انتخاب کنید.',
        });
        return;
      }
      await axiosInstance.post(
        `${apiBase}/${reportId}/export-runs/${lastRunId}/result/`,
        { result: payload },
      );
      const inserted = Number(payload?.inserted || 0);
      const duplicates = Number(payload?.skipped || 0);
      const outputPath = String(payload?.output || '').trim();
      if (status === 'failed') {
        setMessage({
          severity: 'error',
          text: payload?.message
            || 'اجرای اسکریپت با خطا تمام شد؛ جزئیات در result.json و fill_ttms.log است.',
        });
      } else if (status === 'dry_run') {
        setMessage({
          severity: 'info',
          text: 'نتیجهٔ اجرای آزمایشی ثبت شد؛ تراکنش بازگردانی شده و فایلی تغییر نکرده است.',
        });
      } else {
        setMessage({
          severity: 'success',
          text: `ثبت شد — ${toPersianDigits(inserted)} ردیف درج شد`
            + (duplicates ? ` و ${toPersianDigits(duplicates)} ردیف تکراری نادیده گرفته شد` : '')
            + (outputPath ? `؛ فایل پرشده: ${outputPath}` : ''),
        });
      }
      onToast?.(status === 'failed' ? 'اجرای TTMS ناموفق بود' : 'نتیجهٔ اجرای TTMS ثبت شد');
      runsQuery.refetch?.();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setMessage({ severity: 'error', text: detail || 'فایل result.json معتبر نبود.' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [apiBase, lastRunId, onToast, reportId, runsQuery]);

  const registerManualResult = useCallback(async () => {
    if (!lastRunId) {
      setMessage({ severity: 'warning', text: 'ابتدا بسته را بسازید تا شمارهٔ اجرا مشخص شود.' });
      return;
    }
    const inserted = Math.max(0, Number(manualInserted) || 0);
    setUploading(true);
    try {
      await axiosInstance.post(
        `${apiBase}/${reportId}/export-runs/${lastRunId}/result/`,
        {
          result: {
            status: manualStatus,
            mode: 'manual',
            inserted,
            skipped: 0,
            message: 'ثبت دستی نتیجه از پنل HRMS (بدون فایل result.json)',
            finished_at: new Date().toISOString(),
          },
        },
      );
      setMessage({
        severity: manualStatus === 'failed' ? 'warning' : 'success',
        text: `نتیجه به‌صورت دستی ثبت شد: ${STATUS_LABELS[manualStatus] || manualStatus}`
          + (manualStatus === 'filled' ? ` — ${toPersianDigits(inserted)} ردیف` : ''),
      });
      onToast?.('نتیجهٔ اجرای TTMS ثبت شد');
      runsQuery.refetch?.();
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setMessage({ severity: 'error', text: detail || 'ثبت نتیجهٔ دستی ناموفق بود.' });
    } finally {
      setUploading(false);
    }
  }, [
    apiBase, lastRunId, manualInserted, manualStatus, onToast, reportId, runsQuery,
  ]);


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

        <Tabs
          value={tab}
          onChange={(event, value) => setTab(value)}
          sx={{ mb: 1.5, minHeight: 32 }}
          variant="fullWidth"
        >
          <Tab value="options" label="تنظیمات بسته" sx={{ fontSize: 12, minHeight: 32 }} />
          <Tab value="preview" label="پیش‌نمایش و اصلاح خروجی" sx={{ fontSize: 12, minHeight: 32 }} />
        </Tabs>

        {message ? (
          <Alert severity={message.severity} sx={{ mb: 1.5, fontSize: 11.5 }}
                 onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        ) : null}

        {building || uploading ? <LinearProgress sx={{ mb: 1.5 }} /> : null}

        {tab === 'preview' ? (
          <SeasonalTtmsPreview
            apiBase={apiBase}
            preview={preview}
            loading={previewLoading}
            error={previewError}
            provinces={provinces}
            kalaTypes={kalaOptions}
            statusCodes={sellerOptions}
            currencies={reference?.currencies || []}
            overrides={overrides}
            defaults={defaults}
            onOverride={setOverride}
            onDefault={setDefault}
            onRefresh={() => loadPreview()}
            onDownloadCsv={downloadPreviewCsv}
          />
        ) : null}

        {tab === 'options' ? (
        <>
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

          <FormControl size="small" sx={{ minWidth: 230 }}>
            <InputLabel id="ttms-office-label">ادارهٔ کل امور مالیاتی (پروفایل TTMS)</InputLabel>
            <Select
              labelId="ttms-office-label"
              label="ادارهٔ کل امور مالیاتی (پروفایل TTMS)"
              displayEmpty
              value={taxOffice}
              onChange={(event) => setTaxOffice(event.target.value)}
              sx={{ fontSize: 12.5 }}
            >
              <MenuItem value="" sx={{ fontSize: 12.5 }}>—</MenuItem>
              {taxOffices.map((office) => (
                <MenuItem key={office.code} value={String(office.code)} sx={{ fontSize: 12.5 }}>
                  {`${toPersianDigits(office.code)} — ${office.name}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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

        {/* فایل Access مشتری: داخل بسته قرار می‌گیرد و با دابل‌کلیک پر می‌شود */}
        <Box sx={{
          display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center',
          p: 1, mb: 1, borderRadius: '10px',
          border: '1px dashed', borderColor: templateFile ? '#16a34a' : 'divider',
          bgcolor: templateFile ? 'rgba(22,163,74,0.05)' : 'transparent',
        }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 800 }}>فایل Access نسخهٔ TTMS:</Typography>
          <input
            ref={templateInputRef}
            type="file"
            accept=".mdb,.accdb"
            style={{ display: 'none' }}
            aria-label="فایل Access نسخهٔ TTMS"
            onChange={(event) => setTemplateFile(event.target.files?.[0] || null)}
          />
          <Button size="small" variant="outlined"
            startIcon={<CloudUploadOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={() => templateInputRef.current?.click()} sx={{ fontSize: 11 }}>
            {templateFile ? 'تغییر فایل' : 'انتخاب فایل mdb / accdb'}
          </Button>
          {templateFile ? (
            <>
              <Chip size="small" color="success" variant="outlined"
                label={`${templateFile.name} (${toPersianDigits(Math.round((templateFile.size || 0) / 1024))} KB)`}
                onDelete={() => {
                  setTemplateFile(null);
                  if (templateInputRef.current) templateInputRef.current.value = '';
                }}
                sx={{ fontSize: 10, height: 22, maxWidth: 320 }} />
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                این فایل داخل بسته قرار می‌گیرد و اجرای run_fill.cmd همان را پر می‌کند (فایل اصلی دست‌نخورده می‌ماند).
              </Typography>
            </>
          ) : (
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
              اگر انتخاب نشود، بسته فقط اسکریپت و CSV دارد و هنگام اجرا مسیر فایل Access را می‌پرسد.
            </Typography>
          )}
        </Box>

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
                  {['زمان', 'ردیف‌ها', 'درج‌شده', 'تکراری', 'جمع مبلغ', 'وضعیت', 'فایل هدف', 'سازنده'].map((label) => (
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
                    <TableCell sx={{ fontSize: 11 }}>{toPersianDigits(run.filled_rows || 0)}</TableCell>
                    <TableCell sx={{ fontSize: 11 }}>
                      {toPersianDigits(run.result?.skipped || 0)}
                    </TableCell>
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
          {'پس از اجرای اسکریپت، فایل result.json را اینجا بارگذاری کنید تا نتیجه در تاریخچه ثبت شود '
            + '(وضعیت آن یکی از filled / dry_run / failed است؛ manifest.json فایل نتیجه نیست). '
            + 'اسکریپت ردیف‌ها را در یک کپی «.filled-<زمان>» درج می‌کند؛ فایل اصلی دست‌نخورده می‌ماند '
            + 'و مسیر کپی در output_path.txt نوشته می‌شود. پیش‌نیاز اجرا: Microsoft Access Database Engine (ACE).'}
        </Alert>

        <Box sx={{ mt: 1, p: 1.25, border: '1px dashed', borderColor: 'divider', borderRadius: 1.5 }}>
          <Typography sx={{ fontSize: 11.5, fontWeight: 800, mb: 0.75 }}>
            فایل result.json در دسترس نیست؟ نتیجه را دستی ثبت کنید
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="ttms-manual-status-label">وضعیت</InputLabel>
              <Select
                labelId="ttms-manual-status-label"
                label="وضعیت"
                value={manualStatus}
                onChange={(event) => setManualStatus(event.target.value)}
                sx={{ fontSize: 11.5, height: 32 }}
              >
                <MenuItem value="filled" sx={{ fontSize: 11.5 }}>درج شد (filled)</MenuItem>
                <MenuItem value="dry_run" sx={{ fontSize: 11.5 }}>اجرای آزمایشی (dry_run)</MenuItem>
                <MenuItem value="failed" sx={{ fontSize: 11.5 }}>ناموفق (failed)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="number"
              label="ردیف‌های درج‌شده"
              value={manualInserted}
              onChange={(event) => setManualInserted(event.target.value)}
              sx={{ width: 150, '& input': { fontSize: 11.5 } }}
            />
            <Button size="small" variant="outlined" onClick={registerManualResult}
                    disabled={!lastRunId || uploading}>
              ثبت نتیجه
            </Button>
          </Stack>
          <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.5 }}>
            برای وقتی که اسکریپت اجرا شده ولی فایل نتیجه ساخته نشده است؛ نتیجه در تاریخچهٔ همین فصل ثبت می‌شود.
          </Typography>
        </Box>
        </>
        ) : null}
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
