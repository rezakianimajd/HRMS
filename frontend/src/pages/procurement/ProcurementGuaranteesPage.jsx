/** تضامین خرید — فهرست، KPI اعتبار و اقدامات (پوستهٔ استودیو تم). */
import React, { useMemo, useState } from 'react';
import axiosInstance from '../../core/api/axiosConfig';
import { Box, Button, CircularProgress, IconButton, MenuItem, Stack, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GavelIcon from '@mui/icons-material/Gavel';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import UndoIcon from '@mui/icons-material/Undo';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { DialogShell, Field, FormGrid, dateLabel, digits, money, num, todayIso, useList } from './procurementUi';
import { StudioCard, StudioChip, StudioHeader, StudioKpi, studioTableSx, useProcurementStudio } from './procurementStudioUi';

const KIND_OPTIONS = [
  { value: 'bid', label: 'شرکت در استعلام' },
  { value: 'performance', label: 'حسن انجام تعهدات' },
  { value: 'advance', label: 'پیش‌پرداخت' },
  { value: 'payment', label: 'حسن پرداخت' },
  { value: 'warranty', label: 'دورهٔ تضمین' },
  { value: 'other', label: 'سایر' },
];
const INSTRUMENT_OPTIONS = [
  { value: 'check', label: 'چک' },
  { value: 'promissory', label: 'سفته' },
  { value: 'bank_guarantee', label: 'ضمانت‌نامه بانکی' },
  { value: 'cash_deposit', label: 'وجه نقد / سپرده' },
  { value: 'other', label: 'سایر' },
];
const EMPTY = {
  supplier: '', kind: 'performance', instrument_type: 'check', number: '', amount: '',
  bank: '', issue_date: todayIso(), expiry_date: '', note: '',
};

const ProcurementGuaranteesPage = () => {
  const studio = useProcurementStudio();
  const [kind, setKind] = useState('');
  const params = useMemo(() => ({ page_size: 200, ...(kind ? { kind } : {}) }), [kind]);
  const { rows, loading, error, reload } = useList('/procurement/procurement-guarantees/', params);
  const suppliers = useList('/procurement/suppliers/', { page_size: 400 });
  const overview = useList('/procurement/procurement-guarantees/overview/', {});

  const [form, setForm] = useState(EMPTY);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const stats = (Array.isArray(overview.rows) ? overview.rows[0] : overview.rows) || {};
  const supplierOptions = (suppliers.rows || []).map((row) => ({ value: row.id, label: row.name }));

  const validityChip = (row) => {
    if (row.is_released) return <StudioChip label="آزادشده" color="#64748b" />;
    if (row.is_expired) {
      return <StudioChip label={row.is_check ? 'پایان اعتبار چک' : 'منقضی'} color="#be123c" />;
    }
    if (row.days_to_expiry !== null && row.days_to_expiry !== undefined && row.days_to_expiry <= 30) {
      return <StudioChip label={`${digits(row.days_to_expiry)} روز`} color="#b45309" />;
    }
    return <StudioChip label={row.is_check ? 'چک معتبر' : 'معتبر'} color="#0f766e" />;
  };

  const submit = () => {
    setFormError('');
    if (!form.supplier) { setFormError('تأمین‌کننده را انتخاب کنید.'); return; }
    const isGuarantee = ['bank_guarantee', 'cash_deposit', 'other'].includes(form.instrument_type);
    setSaving(true);
    axiosInstance.post('/procurement/procurement-guarantees/', {
      supplier: form.supplier, kind: form.kind, instrument_type: form.instrument_type,
      number: form.number, amount: num(form.amount), bank: form.bank,
      issue_date: form.issue_date || null,
      expiry_date: form.expiry_date || null,
      check_due_date: form.instrument_type === 'check' ? (form.expiry_date || null) : null,
      guarantee_expiry_date: isGuarantee ? (form.expiry_date || null) : null,
      note: form.note,
    })
      .then(() => { setFormOpen(false); setForm(EMPTY); reload(); overview.reload(); })
      .catch((err) => setFormError(err?.response?.data?.detail || 'ثبت تضمین ناموفق بود.'))
      .finally(() => setSaving(false));
  };

  const runAction = (row, action) => {
    const labels = { released: 'آزادسازی', returned: 'استرداد', executed: 'اجرا / ضبط' };
    if (!window.confirm(`${labels[action]} تضمین «${row.number || row.supplier_name}»؟`)) return;
    axiosInstance.post(`/procurement/procurement-guarantees/${row.id}/action/`, {
      action, date: todayIso(), note: '',
    })
      .then(() => { reload(); overview.reload(); })
      .catch((err) => setFormError(err?.response?.data?.detail || 'ثبت اقدام ناموفق بود.'));
  };

  return (
    <Box>
      <StudioHeader icon={<VerifiedUserIcon />} title="تضامین خرید"
        subtitle="تضمین شرکت در استعلام، حسن انجام تعهدات، پیش‌پرداخت و دورهٔ تضمین"
        actions={(
          <Stack direction="row" spacing={1}>
            <TextField size="small" select label="نوع تضمین" value={kind} sx={{ width: 170 }}
              onChange={(event) => setKind(event.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {KIND_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
            <Button variant="contained" size="small" startIcon={<AddIcon fontSize="small" />}
              onClick={() => { setForm(EMPTY); setFormError(''); setFormOpen(true); }}
              sx={{ bgcolor: studio.accent }}>
              تضمین جدید
            </Button>
          </Stack>
        )} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
        gap: 1.5, mb: 1.5 }}>
        <StudioKpi label="ثبت‌شده" value={digits(stats.count ?? rows.length)}
          hint={`مبلغ: ${money(stats.amount_total || 0)}`} icon={VerifiedUserIcon} color={studio.accent} />
        <StudioKpi label="معتبر" value={digits(stats.active || 0)} icon={VerifiedUserIcon} color="#0f766e" />
        <StudioKpi label="نزدیک پایان اعتبار" value={digits(stats.expiring_30 || 0)}
          hint={`ریسک: ${money(stats.amount_risk || 0)}`} icon={WarningAmberIcon} color="#b45309" />
        <StudioKpi label="منقضی / پایان اعتبار" value={digits(stats.expired || 0)}
          hint={`مبلغ: ${money(stats.amount_expired || 0)}`} icon={WarningAmberIcon} color="#be123c" />
        <StudioKpi label="آزادشده" value={digits(stats.released || 0)} icon={LockOpenIcon} color="#64748b" />
      </Box>

      {error || formError ? (
        <Typography sx={{ color: 'error.main', fontSize: 12, mb: 1 }}>{error || formError}</Typography>
      ) : null}

      <StudioCard padding={0}>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={22} /></Stack>
        ) : (
          <Table size="small" sx={studioTableSx(studio)}>
            <TableHead>
              <TableRow>
                <TableCell>شماره</TableCell>
                <TableCell>تأمین‌کننده</TableCell>
                <TableCell>نوع / ابزار</TableCell>
                <TableCell>مبلغ</TableCell>
                <TableCell>صدور</TableCell>
                <TableCell>اعتبار تا</TableCell>
                <TableCell align="center">وضعیت</TableCell>
                <TableCell align="center">اقدامات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{digits(row.number || '—')}</TableCell>
                  <TableCell>{row.supplier_name}</TableCell>
                  <TableCell>
                    <Typography sx={{ fontSize: 11.5 }}>{row.kind_label}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: studio.muted }}>{row.instrument_label}</Typography>
                  </TableCell>
                  <TableCell>{money(row.amount)}</TableCell>
                  <TableCell>{dateLabel(row.issue_date)}</TableCell>
                  <TableCell>
                    {dateLabel(row.valid_until)}
                    {row.is_check ? (
                      <Typography sx={{ fontSize: 10, color: studio.muted }}>
                        سررسید: {dateLabel(row.due_date)}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell align="center">{validityChip(row)}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={0.25} justifyContent="center">
                      <Tooltip title="آزادسازی">
                        <span>
                          <IconButton size="small" disabled={row.is_released}
                            onClick={() => runAction(row, 'released')}>
                            <LockOpenIcon fontSize="small" sx={{ color: '#0f766e' }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="استرداد">
                        <span>
                          <IconButton size="small" disabled={row.is_released}
                            onClick={() => runAction(row, 'returned')}>
                            <UndoIcon fontSize="small" sx={{ color: '#64748b' }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="اجرا / ضبط">
                        <span>
                          <IconButton size="small" disabled={row.is_released}
                            onClick={() => runAction(row, 'executed')}>
                            <GavelIcon fontSize="small" sx={{ color: '#be123c' }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: studio.muted }}>
                    تضمینی ثبت نشده است.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </StudioCard>

      <DialogShell open={formOpen} title="ثبت تضمین خرید" onClose={() => setFormOpen(false)}
        onSubmit={submit} loading={saving} error={formError}>
        <FormGrid>
          <Field size={6} label="تأمین‌کننده" select required options={supplierOptions} value={form.supplier}
            onChange={(event) => setForm((prev) => ({ ...prev, supplier: event.target.value }))} />
          <Field size={3} label="نوع تضمین" select options={KIND_OPTIONS} value={form.kind}
            onChange={(event) => setForm((prev) => ({ ...prev, kind: event.target.value }))} />
          <Field size={3} label="نوع ابزار" select options={INSTRUMENT_OPTIONS} value={form.instrument_type}
            onChange={(event) => setForm((prev) => ({ ...prev, instrument_type: event.target.value }))} />
          <Field size={4} label="شماره" value={form.number}
            onChange={(event) => setForm((prev) => ({ ...prev, number: event.target.value }))} />
          <Field size={4} label="مبلغ (ریال)" type="number" value={form.amount}
            onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} />
          <Field size={4} label="بانک / مرجع صدور" value={form.bank}
            onChange={(event) => setForm((prev) => ({ ...prev, bank: event.target.value }))} />
          <Field size={4} label="تاریخ صدور" type="date" value={form.issue_date}
            onChange={(event) => setForm((prev) => ({ ...prev, issue_date: event.target.value }))} />
          <Field size={4} label="سررسید / انقضا" type="date" value={form.expiry_date}
            onChange={(event) => setForm((prev) => ({ ...prev, expiry_date: event.target.value }))} />
          <Field size={12} label="یادداشت" value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} />
        </FormGrid>
        <Typography sx={{ mt: 1.5, fontSize: 11.5, color: 'text.secondary' }}>
          برای چک، اعتبار قانونی ۵ سال از تاریخ صدور محاسبه می‌شود و «سررسید» فقط هشدار عملیاتی است.
        </Typography>
      </DialogShell>
    </Box>
  );
};

export default ProcurementGuaranteesPage;
