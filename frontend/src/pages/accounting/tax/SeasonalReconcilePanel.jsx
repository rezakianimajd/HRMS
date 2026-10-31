import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider,
  Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import axiosInstance from '../../../core/api/axiosConfig';
import { formatPersianNumber, toEnglishDigits, toPersianDigits } from '../../../core/utils/numberUtils';

const INK = '#0f172a';
const MUTED = '#64748b';
const KIND_COLORS = {
  amount_mismatch: '#dc2626',
  difference: '#d97706',
  missing_in_seasonal: '#b91c1c',
  missing_in_ledger: '#7c3aed',
  matched: '#15803d',
};
const KIND_LABELS = {
  amount_mismatch: 'مغایرت مبلغ',
  difference: 'اختلاف جزئی',
  missing_in_seasonal: 'فقط در دفاتر',
  missing_in_ledger: 'فقط در فصلی',
  matched: 'تطبیق کامل',
};
const FIELD_FA = {
  invoice_no: 'شمارهٔ فاکتور',
  invoice_date: 'تاریخ',
  party_name: 'طرف حساب',
  national_id: 'شناسه/کد ملی',
  amount: 'مبلغ',
  vat: 'مالیات',
  total: 'جمع',
};

const num = (value) => Number(String(value ?? '').replace(/[^\d.-]/g, '')) || 0;
const percent = (value) => `${toPersianDigits(Math.round(num(value) * 100))}٪`;

const StatBox = ({ label, value, hint, color = INK }) => (
  <Paper elevation={0} sx={{
    flex: '1 1 140px', minWidth: 138, px: 1.3, py: 1, borderRadius: '12px',
    border: '1px solid var(--hrms-table-border-color, #e2e8f0)', bgcolor: 'background.paper',
  }}>
    <Typography sx={{ fontSize: 10.5, color: MUTED }}>{label}</Typography>
    <Typography noWrap sx={{ fontSize: 15, fontWeight: 900, color, mt: 0.2 }}>{value}</Typography>
    {hint ? <Typography sx={{ fontSize: 9.5, color: MUTED }}>{hint}</Typography> : null}
  </Paper>
);

const SeasonalReconcilePanel = ({ reportId, apiBase, mode, onAddRows, onToast }) => {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [options, setOptions] = useState({
    amount_tolerance: '1000',
    amount_tolerance_pct: '0.1',
    date_window_days: '3',
    name_threshold: '86',
    min_score: '55',
  });
  const inputRef = useRef(null);

  const loadRuns = useCallback(() => {
    if (mode !== 'api' || !reportId) return;
    axiosInstance.get(`${apiBase}/${reportId}/reconciliations/`)
      .then(({ data }) => setRuns(Array.isArray(data) ? data : []))
      .catch(() => setRuns([]));
  }, [apiBase, reportId, mode]);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  const optionsPayload = useMemo(() => ({
    amount_tolerance: num(options.amount_tolerance),
    amount_tolerance_pct: num(toEnglishDigits(options.amount_tolerance_pct)) / 100,
    date_window_days: Math.round(num(options.date_window_days)),
    name_threshold: Math.min(0.99, Math.max(0.5, num(options.name_threshold) / 100)),
    min_score: Math.min(0.9, Math.max(0.2, num(options.min_score) / 100)),
  }), [options]);

  const pickFile = (selected) => {
    if (!selected) return;
    const name = String(selected.name || '').toLowerCase();
    if (!/\.(xlsx|xlsm|csv|tsv|txt)$/.test(name)) {
      setError('فقط فایل‌های xlsx، xlsm، csv و tsv پشتیبانی می‌شوند (xls قدیمی را به xlsx تبدیل کنید).');
      return;
    }
    setError('');
    setFile(selected);
  };

  const runReconcile = (exportMode = false) => {
    if (mode !== 'api' || !reportId) {
      setError('مغایرت‌گیری نیازمند اتصال به سرور است؛ پس از استقرار بک‌اند فعال می‌شود.');
      return;
    }
    if (!file) {
      setError('ابتدا فایل دفاتر (اکسل یا CSV) را انتخاب کنید.');
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('options', JSON.stringify(optionsPayload));
    setLoading(true);
    setError('');
    axiosInstance.post(
      `${apiBase}/${reportId}/reconcile/${exportMode ? '?format=xlsx' : ''}`,
      form,
      exportMode ? { responseType: 'blob' } : undefined,
    )
      .then((response) => {
        if (exportMode) {
          const blob = new Blob([response.data], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `seasonal-reconcile-${reportId}.xlsx`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(link.href);
          if (onToast) onToast('فایل اکسل مغایرت‌گیری ساخته شد');
          loadRuns();
          return;
        }
        setResult(response.data);
        setKindFilter('all');
        loadRuns();
        if (onToast) onToast('مغایرت‌گیری انجام شد');
      })
      .catch((requestError) => {
        const detail = requestError?.response?.data?.detail;
        setError(detail || 'اجرای مغایرت‌گیری ناموفق بود.');
      })
      .finally(() => setLoading(false));
  };

  const summary = result?.summary;
  const items = useMemo(() => {
    const list = result?.items || [];
    return kindFilter === 'all' ? list : list.filter((item) => item.kind === kindFilter);
  }, [result, kindFilter]);

  const kindChips = useMemo(() => {
    const counts = summary?.counts || {};
    return [
      { key: 'all', label: `همه (${toPersianDigits(counts.items || 0)})` },
      { key: 'amount_mismatch', label: `مغایرت مبلغ (${toPersianDigits(counts.amount_mismatch || 0)})` },
      { key: 'difference', label: `اختلاف جزئی (${toPersianDigits(counts.difference || 0)})` },
      { key: 'missing_in_seasonal', label: `فقط در دفاتر (${toPersianDigits(counts.missing_in_seasonal || 0)})` },
      { key: 'missing_in_ledger', label: `فقط در فصلی (${toPersianDigits(counts.missing_in_ledger || 0)})` },
      { key: 'matched', label: `تطبیق کامل (${toPersianDigits(counts.matched || 0)})` },
    ];
  }, [summary]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Paper elevation={0} sx={{
        px: 1.5, py: 1.3, borderRadius: '12px',
        border: '1px solid var(--hrms-table-border-color, #e2e8f0)', bgcolor: 'background.paper',
      }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: INK }}>
          مغایرت‌گیری با اکسل دفاتر
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: MUTED, mb: 1, lineHeight: 1.8 }}>
          فایل دفتر خرید (اکسل یا CSV) را بدهید؛ ستون‌ها خودکار شناسایی می‌شوند و هر ردیف با ترکیب
          «شمارهٔ فاکتور + شناسهٔ ملی + شباهت نام + مبلغ + تاریخ» تطبیق داده می‌شود. برای هر مغایرت،
          دلیل و درصد اطمینان نمایش داده می‌شود.
        </Typography>

        <Box
          role="button"
          tabIndex={0}
          onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click(); }}
          onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            pickFile(event.dataTransfer?.files?.[0]);
          }}
          onClick={() => inputRef.current?.click()}
          sx={{
            border: '1.5px dashed',
            borderColor: dragOver ? '#0ea5e9' : '#cbd5e1',
            borderRadius: '10px',
            px: 2, py: 1.6,
            display: 'flex', alignItems: 'center', gap: 1.25,
            cursor: 'pointer',
            bgcolor: dragOver ? 'rgba(14,165,233,0.06)' : 'transparent',
            transition: 'all .15s ease',
          }}
        >
          <CloudUploadIcon sx={{ fontSize: 26, color: '#0ea5e9' }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>
              {file ? file.name : 'فایل دفاتر را اینجا رها کنید یا کلیک کنید'}
            </Typography>
            <Typography sx={{ fontSize: 10, color: MUTED }}>
              xlsx / xlsm / csv / tsv — سرصفحه با نام‌های «مبلغ»، «بدهکار»، «شمارهٔ سند»، «طرف حساب» و…
            </Typography>
          </Box>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xlsm,.csv,.tsv,.txt"
            aria-label="فایل دفاتر"
            style={{ display: 'none' }}
            onChange={(event) => pickFile(event.target.files?.[0])}
          />
          <Button size="small" variant="outlined" sx={{ fontSize: 10.5 }}>انتخاب فایل</Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.2, alignItems: 'center' }}>
          {[
            ['amount_tolerance', 'تحمل اختلاف مبلغ (ریال)', 165],
            ['amount_tolerance_pct', 'تحمل درصدی (%)', 120],
            ['date_window_days', 'پنجرهٔ تاریخ (روز)', 135],
            ['name_threshold', 'حد شباهت نام (%)', 140],
            ['min_score', 'حداقل اطمینان (%)', 140],
          ].map(([key, label, width]) => (
            <TextField
              key={key}
              size="small"
              label={label}
              value={options[key]}
              onChange={(event) => setOptions((prev) => ({ ...prev, [key]: event.target.value }))}
              inputProps={{ inputMode: 'decimal', style: { direction: 'ltr', textAlign: 'center' } }}
              sx={{ width, '& .MuiInputBase-input': { fontSize: 11 } }}
            />
          ))}
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => runReconcile(false)}
            disabled={loading}
            sx={{ fontSize: 11 }}
          >
            اجرای مغایرت‌گیری
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => runReconcile(true)}
            disabled={loading || !result}
            sx={{ fontSize: 11 }}
          >
            خروجی اکسل
          </Button>
        </Box>
        {loading ? <CircularProgress size={18} sx={{ mt: 1 }} /> : null}
        {error ? <Alert severity="warning" sx={{ mt: 1, fontSize: 11 }}>{error}</Alert> : null}
      </Paper>

      {summary ? (
        <>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <StatBox label="تطبیق‌یافته" value={toPersianDigits(summary.matched?.count || 0)}
                     hint={`اطمینان میانگین ${percent(summary.matched?.average_confidence)}`} color="#15803d" />
            <StatBox label="اختلاف مبلغ کل" value={formatPersianNumber(summary.amount_delta)}
                     hint="فصلی − دفاتر" color={summary.amount_delta ? '#dc2626' : INK} />
            <StatBox label="فقط در دفاتر (جاافتاده)" value={toPersianDigits(summary.only_in_ledger?.count || 0)}
                     hint={formatPersianNumber(summary.only_in_ledger?.amount)} color="#b91c1c" />
            <StatBox label="فقط در فصلی" value={toPersianDigits(summary.only_in_seasonal?.count || 0)}
                     hint={formatPersianNumber(summary.only_in_seasonal?.amount)} color="#7c3aed" />
            <StatBox label="مغایرت مبلغ" value={toPersianDigits(summary.differences?.amount || 0)}
                     hint={`اختلاف جزئی ${toPersianDigits(summary.differences?.amount_minor || 0)}`} color="#d97706" />
            <StatBox label="پوشش تطبیق"
                     value={`${percent(summary.coverage?.seasonal_matched_ratio)} / ${percent(summary.coverage?.ledger_matched_ratio)}`}
                     hint="فصلی / دفاتر" />
          </Box>

          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {kindChips.map((chip) => (
              <Chip
                key={chip.key}
                size="small"
                label={chip.label}
                onClick={() => setKindFilter(chip.key)}
                color={kindFilter === chip.key ? 'primary' : 'default'}
                variant={kindFilter === chip.key ? 'filled' : 'outlined'}
                sx={{ fontSize: 10, height: 24 }}
              />
            ))}
            <Box sx={{ flex: 1 }} />
            {result?.suggested_rows?.length ? (
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<AddCircleOutlineIcon />}
                sx={{ fontSize: 10.5 }}
                onClick={() => onAddRows?.(result.suggested_rows)}
              >
                {`افزودن ${toPersianDigits(result.suggested_rows.length)} ردیف جاافتاده به جدول`}
              </Button>
            ) : null}
          </Stack>
        </>
      ) : null}

      {result?.items ? (
        <Paper elevation={0} sx={{
          borderRadius: '12px', border: '1px solid var(--hrms-table-border-color, #e2e8f0)',
          overflow: 'hidden', bgcolor: 'background.paper',
        }}>
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader aria-label="جدول مغایرت‌ها">
              <TableHead>
                <TableRow>
                  {['نوع', 'شدت', 'اطمینان', 'طرف معامله (فصلی)', 'طرف معامله (دفاتر)',
                    'فاکتور (فصلی)', 'فاکتور (دفاتر)', 'مبلغ فصلی', 'مبلغ دفاتر', 'اختلاف'].map((label) => (
                      <TableCell key={label} align="center" sx={{ fontSize: 10.5, fontWeight: 800 }}>
                        {label}
                      </TableCell>
                    ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.slice(0, 300).map((item) => {
                  const seasonal = item.seasonal || {};
                  const ledger = item.ledger || {};
                  const delta = num(ledger.amount) - num(seasonal.amount);
                  return (
                    <TableRow key={item.key} hover>
                      <TableCell align="center" sx={{ fontSize: 10.5, color: KIND_COLORS[item.kind], fontWeight: 700 }}>
                        {KIND_LABELS[item.kind] || item.kind_label}
                      </TableCell>
                      <TableCell align="center" sx={{ fontSize: 10 }}>
                        {item.severity === 'error' ? 'خطا' : item.severity === 'warning' ? 'هشدار' : 'اطلاع'}
                      </TableCell>
                      <TableCell align="center" sx={{ fontSize: 10 }}>
                        {item.confidence ? percent(item.confidence) : '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 10.5 }}>{seasonal.party_name || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 10.5 }}>{ledger.party_name || '—'}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 10 }}>{seasonal.invoice_no || '—'}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 10 }}>{ledger.invoice_no || '—'}</TableCell>
                      <TableCell align="center" sx={{ fontSize: 10 }}>
                        {seasonal.amount ? formatPersianNumber(seasonal.amount) : '—'}
                      </TableCell>
                      <TableCell align="center" sx={{ fontSize: 10 }}>
                        {ledger.amount ? formatPersianNumber(ledger.amount) : '—'}
                      </TableCell>
                      <TableCell align="center" sx={{ fontSize: 10, color: delta ? '#dc2626' : MUTED }}>
                        {delta ? formatPersianNumber(Math.abs(delta)) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!items.length ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ fontSize: 11, py: 3, color: MUTED }}>
                      موردی با این فیلتر وجود ندارد.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : null}

      {result ? (
        <Box>
          {result.source?.mapping ? (
            <Typography sx={{ fontSize: 10, color: MUTED }}>
              {`ستون‌های شناسایی‌شده: ${Object.entries(result.source.mapping)
                .map(([field, header]) => `${FIELD_FA[field] || field} ← ${header}`)
                .join(' · ')}`}
            </Typography>
          ) : null}
          {(result.source?.warnings || []).map((warning) => (
            <Typography key={warning} sx={{ fontSize: 10, color: '#b45309' }}>{`• ${warning}`}</Typography>
          ))}
        </Box>
      ) : null}

      {runs.length ? (
        <Box>
          <Divider sx={{ my: 0.75 }} />
          <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: INK, mb: 0.5 }}>
            تاریخچهٔ مغایرت‌گیری‌ها
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {runs.slice(0, 6).map((run) => (
              <Paper key={run.id} elevation={0} sx={{
                px: 1.2, py: 0.8, borderRadius: '10px', minWidth: 190,
                border: '1px solid var(--hrms-table-border-color, #e2e8f0)',
              }}>
                <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 800, color: INK }}>
                  {run.file_name || 'فایل دفاتر'}
                </Typography>
                <Typography sx={{ fontSize: 9.5, color: MUTED }}>
                  {`${toPersianDigits(run.source_rows)} ردیف · تطبیق ${toPersianDigits(run.matched_count)}`}
                </Typography>
                <Typography sx={{ fontSize: 9.5, color: run.error_count ? '#dc2626' : MUTED }}>
                  {`${toPersianDigits(run.error_count)} خطا / ${toPersianDigits(run.warning_count)} هشدار`}
                </Typography>
                <Typography noWrap sx={{ fontSize: 9, color: MUTED }}>
                  {(run.created_at || '').replace('T', ' ').slice(0, 16)}
                </Typography>
              </Paper>
            ))}
          </Stack>
        </Box>
      ) : null}
    </Box>
  );
};

export default SeasonalReconcilePanel;





