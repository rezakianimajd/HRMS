import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Alert, Autocomplete, Button, Checkbox, Chip, CircularProgress, FormControlLabel,
  Grid, IconButton, MenuItem, Paper, Select, Stack,
  Table, TableBody, TableCell, TableContainer, TableFooter, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SaveIcon from '@mui/icons-material/Save';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import JalaliDatePicker from '../../../core/components/ui/JalaliDatePicker';
import { glass, COLOR, COLOR_DARK, GREEN } from './annualHelpers';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';

const money = (v) => formatPersianNumber(Number(v) || 0);
const asNumber = (v) => {
  if (v === '' || v === null || v === undefined) return 0;
  return Number(String(v).replace(/[٫،,]/g, '')) || 0;
};

const STATUS_OPTIONS = [
  { value: 'draft', label: 'پیش‌نویس (قابل ویرایش در ثبت اسناد)' },
  { value: 'submitted', label: 'ارسال برای تأیید' },
  { value: 'posted', label: 'ثبت نهایی' },
];

/**
 * عملیات سالانه (افتتاحیه / اختتامیه / بستن حساب‌ها)
 *  ۱) انتخاب سال مالی و «تاریخ سند» (پیش‌فرض: ابتدا/پایان سال)
 *  ۲) پیش‌نمایش سطرها تا آخرین تفصیلِ مرتبط با حساب — قابل ویرایش
 *  ۳) ایجاد سند به‌صورت پیش‌نویس (قابل ادیت) یا ثبت نهایی
 */
const PreviewPanel = ({
  preview, rows, totals, status, setStatus, replace, setReplace, forceReplace,
  setForceReplace, allowUnbalanced, setAllowUnbalanced, updateRow, removeRow, saving,
  onSave, buttonLabel,
}) => {
  const balanced = Math.abs(totals.difference) < 0.01;
  const auxOptionsFor = (row) => (preview.aux_options || {})[String(row.account)] || [];
  const auxValueFor = (row) => row.auxiliary_3 || row.auxiliary_2 || row.auxiliary_1 || row.auxiliary || '';

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2, mb: 1.5 }}>
        <Chip size="small" label={`سال مالی: ${preview.fiscal_year.name}`} sx={{ fontWeight: 700 }} />
        {preview.prev_year && (
          <Chip size="small" label={`سال مبدأ: ${preview.prev_year.name}`} sx={{ fontWeight: 700, bgcolor: 'rgba(14,165,233,0.12)' }} />
        )}
        <Chip size="small" label={`تاریخ سند: ${toPersianDigits(preview.date)}`} sx={{ fontWeight: 700 }} />
        <Chip size="small" label={`حساب هدف: ${preview.target_account ? `${preview.target_account.code} - ${preview.target_account.name}` : '—'}`} sx={{ fontWeight: 700, bgcolor: 'rgba(100,116,139,0.12)' }} />
        <Chip size="small" label={`سطر با تفصیلی: ${preview.aux_summary.with_aux}`} sx={{ fontWeight: 700, bgcolor: 'rgba(16,185,129,0.12)', color: '#047857' }} />
        {preview.aux_summary.without_aux > 0 && (
          <Chip size="small" label={`بدون تفصیلی: ${preview.aux_summary.without_aux}`} sx={{ fontWeight: 700, bgcolor: 'rgba(245,158,11,0.14)', color: '#b45309' }} />
        )}
        <Chip
          size="small"
          label={`جمع بدهکار: ${money(totals.debit)} / بستانکار: ${money(totals.credit)}`}
          sx={{ fontWeight: 800, bgcolor: 'rgba(37,99,235,0.12)', color: '#1d4ed8' }}
        />
        <Chip
          size="small"
          label={balanced ? 'متوازن' : `اختلاف: ${money(totals.difference)}`}
          sx={{ fontWeight: 800, bgcolor: balanced ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.14)', color: balanced ? '#047857' : '#b91c1c' }}
        />
      </Stack>

      {(preview.warnings || []).map((w) => (
        <Alert key={w} severity="warning" sx={{ mb: 1, borderRadius: '12px', fontSize: 12.5 }}>{w}</Alert>
      ))}

      {preview.existing && (
        <Alert severity="info" sx={{ mb: 1.5, borderRadius: '12px', fontSize: 12.5 }}>
          سند موجود: شماره {preview.existing.number} — وضعیت {preview.existing.status_display} — تاریخ {toPersianDigits(preview.existing.date)}
          <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
            <FormControlLabel control={<Checkbox size="small" checked={replace} onChange={(e) => setReplace(e.target.checked)} />} label="جایگزینی سند موجود" />
            <FormControlLabel control={<Checkbox size="small" checked={forceReplace} onChange={(e) => setForceReplace(e.target.checked)} />} label="جایگزینی سند ثبت‌شده/قفل" />
          </Stack>
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px', maxHeight: 460 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width={44}>#</TableCell>
              <TableCell>حساب</TableCell>
              <TableCell width={110}>نوع</TableCell>
              <TableCell width={230}>تفصیلی (تا آخرین سطح)</TableCell>
              <TableCell width={130}>بدهکار</TableCell>
              <TableCell width={130}>بستانکار</TableCell>
              <TableCell>شرح سطر</TableCell>
              <TableCell width={44} />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                  سطری برای نمایش نیست
                </TableCell>
              </TableRow>
            ) : rows.map((row, index) => (
              <TableRow key={`${row.account}-${row.auxiliary_path || ''}-${index}`} hover>
                <TableCell sx={{ color: 'text.secondary' }}>{toPersianDigits(index + 1)}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{row.account_code} - {row.account_name}</Typography>
                  {row.auxiliary_path ? (
                    <Typography variant="caption" color="textSecondary">تفصیلی فعلی: {row.auxiliary_path}</Typography>
                  ) : null}
                </TableCell>
                <TableCell><Chip size="small" label={row.account_type_name || '—'} variant="outlined" /></TableCell>
                <TableCell>
                  <Select
                    size="small" fullWidth displayEmpty
                    value={auxValueFor(row)}
                    onChange={(e) => updateRow(index, {
                      auxiliary_1: e.target.value || null,
                      auxiliary_2: null, auxiliary_3: null, auxiliary: null,
                    })}
                  >
                    <MenuItem value=""><em>— بدون تفصیلی —</em></MenuItem>
                    {auxOptionsFor(row).map((opt) => (
                      <MenuItem key={opt.id} value={opt.id}>{opt.path || `${opt.code} ${opt.name}`}</MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>
                  <TextField
                    size="small" fullWidth value={row.debit || ''} placeholder="0"
                    onChange={(e) => updateRow(index, { debit: e.target.value, credit: '' })}
                    inputProps={{ style: { textAlign: 'center' } }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small" fullWidth value={row.credit || ''} placeholder="0"
                    onChange={(e) => updateRow(index, { credit: e.target.value, debit: '' })}
                    inputProps={{ style: { textAlign: 'center' } }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small" fullWidth value={row.description || ''}
                    onChange={(e) => updateRow(index, { description: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="حذف سطر">
                    <IconButton size="small" color="error" onClick={() => removeRow(index)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} align="left">
                  <Typography variant="body2" fontWeight={800}>جمع کل ({toPersianDigits(rows.length)} سطر)</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={800} sx={{ color: '#1d4ed8' }}>{money(totals.debit)}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={800} sx={{ color: '#b45309' }}>{money(totals.credit)}</Typography>
                </TableCell>
                <TableCell colSpan={2}>
                  <Typography variant="caption" fontWeight={800} sx={{ color: balanced ? GREEN : '#b91c1c' }}>
                    {balanced ? 'متوازن' : `اختلاف ${money(totals.difference)}`}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>

      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
        <Select size="small" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 260 }}>
          {STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </Select>
        <FormControlLabel
          control={<Checkbox size="small" checked={allowUnbalanced} onChange={(e) => setAllowUnbalanced(e.target.checked)} />}
          label="ثبت با اختلاف (بدون توازن)"
        />
        <Button
          variant="contained"
          disabled={saving || !rows.length || (!balanced && !allowUnbalanced)}
          onClick={onSave}
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          sx={{ background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, borderRadius: '12px', fontWeight: 800, textTransform: 'none' }}
        >
          {buttonLabel}
        </Button>
        <Typography variant="caption" color="textSecondary">
          سند پیش‌فرض به‌صورت «پیش‌نویس» ساخته می‌شود و از «ثبت اسناد» قابل ویرایش است.
        </Typography>
      </Stack>
    </>
  );
};


const YearAction = ({ endpoint, kind, title, description, buttonLabel, dateLabel = 'تاریخ سند' }) => {
  const [years, setYears] = useState([]);
  const [year, setYear] = useState(null);
  const [date, setDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [status, setStatus] = useState('draft');
  const [replace, setReplace] = useState(false);
  const [forceReplace, setForceReplace] = useState(false);
  const [allowUnbalanced, setAllowUnbalanced] = useState(false);

  useEffect(() => {
    axiosInstance.get('/accounting/fiscal-years/').then((r) => {
      const d = r.data;
      const list = Array.isArray(d) ? d : d?.results || [];
      setYears(list);
      if (list.length) setYear((prev) => prev || list.find((y) => y.is_current) || list[0]);
    }).catch(() => {});
  }, []);

  const totals = useMemo(() => {
    const debit = rows.reduce((s, r) => s + asNumber(r.debit), 0);
    const credit = rows.reduce((s, r) => s + asNumber(r.credit), 0);
    return {
      debit: Math.round(debit * 100) / 100,
      credit: Math.round(credit * 100) / 100,
      difference: Math.round((debit - credit) * 100) / 100,
    };
  }, [rows]);

  const reset = () => {
    setPreview(null); setRows([]); setNotice(null); setError('');
    setReplace(false); setForceReplace(false); setAllowUnbalanced(false); setStatus('draft');
  };

  const loadPreview = async () => {
    if (!year) { setError('سال مالی را انتخاب کنید'); return; }
    setLoading(true); setError(''); setNotice(null);
    try {
      const params = { fiscal_year: year.id, preview: 1 };
      if (date) params.date = date;
      const res = await axiosInstance.get(endpoint, { params });
      setPreview(res.data);
      setRows(res.data.lines || []);
      if (res.data.date) setDate(res.data.date);
      setStatus('draft');
    } catch (e) {
      setError(e.response?.data?.error || 'خطا در تهیهٔ پیش‌نمایش');
      setPreview(null); setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (index, patch) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index) => setRows((prev) => prev.filter((_, i) => i !== index));

  const create = async () => {
    if (!year) { setError('سال مالی را انتخاب کنید'); return; }
    if (!rows.length) { setError('سطری برای ثبت وجود ندارد'); return; }
    setSaving(true); setError(''); setNotice(null);
    try {
      const payload = {
        fiscal_year: year.id,
        date: date || undefined,
        status,
        create: 1,
        ...(replace ? { replace: 1 } : {}),
        ...(forceReplace ? { force_replace: 1 } : {}),
        ...(allowUnbalanced ? { force: 1 } : {}),
        lines: rows.map((r) => ({
          account: r.account,
          auxiliary: r.auxiliary || null,
          auxiliary_1: r.auxiliary_1 || null,
          auxiliary_2: r.auxiliary_2 || null,
          auxiliary_3: r.auxiliary_3 || null,
          debit: asNumber(r.debit),
          credit: asNumber(r.credit),
          description: r.description || '',
        })),
      };
      const res = await axiosInstance.post(endpoint, payload);
      setNotice({
        ok: true,
        text: `سند با موفقیت ${status === 'posted' ? 'ثبت نهایی' : 'ذخیره'} شد — شماره ${res.data.number || res.data.id}`,
        docId: res.data.id,
      });
      const fresh = await axiosInstance.get(endpoint, { params: { fiscal_year: year.id, preview: 1 } });
      setPreview(fresh.data);
      setRows(fresh.data.lines || []);
    } catch (e) {
      setError(e.response?.data?.error || 'خطا در ایجاد سند');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Paper sx={{ ...glass, p: 2.5, mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: COLOR_DARK, mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{description}</Typography>

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={4}>
          <Autocomplete
            size="small"
            options={years}
            getOptionLabel={(o) => o.name}
            value={year}
            onChange={(e, v) => { setYear(v); reset(); }}
            renderInput={(p) => <TextField {...p} label="سال مالی" />}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <JalaliDatePicker label={dateLabel} value={date} onChange={setDate} fullWidth />
        </Grid>
        <Grid item xs={12} sm={4}>
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              disabled={loading}
              onClick={loadPreview}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <VisibilityIcon />}
              sx={{ background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
            >
              پیش‌نمایش سند
            </Button>
            <Button
              variant="outlined"
              disabled={saving || !rows.length}
              onClick={create}
              startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
              sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
            >
              {buttonLabel}
            </Button>
          </Stack>
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mt: 2, borderRadius: '12px', fontSize: 13 }}>{error}</Alert>}

      {notice?.ok && (
        <Alert
          severity="success"
          sx={{ mt: 2, borderRadius: '12px', fontSize: 13 }}
          action={notice.docId ? (
            <Button color="inherit" size="small" component={RouterLink} to={`/accounting/documents/${notice.docId}/edit`} startIcon={<OpenInNewIcon />}>
              مشاهده / ویرایش سند
            </Button>
          ) : null}
        >
          {notice.text}
        </Alert>
      )}

      {preview && (
        <PreviewPanel
          preview={preview}
          rows={rows}
          totals={totals}
          status={status}
          setStatus={setStatus}
          replace={replace}
          setReplace={setReplace}
          forceReplace={forceReplace}
          setForceReplace={setForceReplace}
          allowUnbalanced={allowUnbalanced}
          setAllowUnbalanced={setAllowUnbalanced}
          updateRow={updateRow}
          removeRow={removeRow}
          saving={saving}
          onSave={create}
          buttonLabel={buttonLabel}
        />
      )}
    </Paper>
  );

  // TABLE_PLACEHOLDER
};

export default YearAction;
