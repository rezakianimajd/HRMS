/** پیش‌فاکتورهای خرید — فهرست، ثبت و تبدیل به فاکتور (پوستهٔ استودیو تم). */
import React, { useMemo, useState } from 'react';
import axiosInstance from '../../core/api/axiosConfig';
import { Box, Button, CircularProgress, MenuItem, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import { DialogShell, Field, FormGrid, dateLabel, digits, money, num, todayIso, useList } from './procurementUi';
import { StudioCard, StudioChip, StudioHeader, StudioKpi, studioTableSx, useProcurementStudio } from './procurementStudioUi';

const STATUS = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  sent: { label: 'ارسال‌شده', color: '#3b82f6' },
  accepted: { label: 'پذیرفته‌شده', color: '#0f766e' },
  rejected: { label: 'رد‌شده', color: '#be123c' },
  converted: { label: 'تبدیل‌شده', color: '#8b5cf6' },
  cancelled: { label: 'لغو‌شده', color: '#be123c' },
};
const EMPTY = {
  supplier: '', proforma_number: '', date: todayIso(), valid_until: '',
  subtotal: '', discount: '0', vat_rate: '0', terms: '', description: '',
};

const ProcurementProformaPage = () => {
  const studio = useProcurementStudio();
  const [status, setStatus] = useState('');
  const params = useMemo(() => ({ page_size: 200, ...(status ? { status } : {}) }), [status]);
  const { rows, loading, error, reload } = useList('/procurement/proforma-invoices/', params);
  const suppliers = useList('/procurement/suppliers/', { page_size: 400 });

  const [form, setForm] = useState(EMPTY);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const supplierOptions = (suppliers.rows || []).map((row) => ({ value: row.id, label: row.name }));
  const totals = rows.reduce((acc, row) => ({
    count: acc.count + 1,
    amount: acc.amount + num(row.total),
    open: acc.open + (row.status === 'converted' ? 0 : 1),
  }), { count: 0, amount: 0, open: 0 });

  const submit = () => {
    setFormError('');
    if (!form.supplier) { setFormError('تأمین‌کننده را انتخاب کنید.'); return; }
    setSaving(true);
    axiosInstance.post('/procurement/proforma-invoices/', {
      supplier: form.supplier,
      proforma_number: form.proforma_number,
      date: form.date || todayIso(),
      valid_until: form.valid_until || null,
      status: 'draft',
      subtotal: num(form.subtotal),
      discount: num(form.discount),
      vat_rate: num(form.vat_rate),
      terms: form.terms,
      description: form.description,
    })
      .then(() => { setFormOpen(false); setForm(EMPTY); reload(); })
      .catch((err) => setFormError(err?.response?.data?.detail || 'ثبت پیش‌فاکتور ناموفق بود.'))
      .finally(() => setSaving(false));
  };

  const convert = (row) => {
    if (!window.confirm(`تبدیل پیش‌فاکتور ${row.number || row.proforma_number} به فاکتور خرید؟`)) return;
    axiosInstance.post(`/procurement/proforma-invoices/${row.id}/convert/`, {})
      .then(reload)
      .catch((err) => setFormError(err?.response?.data?.detail || 'تبدیل ناموفق بود.'));
  };

  return (
    <Box>
      <StudioHeader icon={<ReceiptLongIcon />} title="پیش‌فاکتورهای خرید"
        subtitle="ثبت پیش‌فاکتور تأمین‌کننده و تبدیل آن به صورتحساب خرید"
        actions={(
          <Stack direction="row" spacing={1}>
            <TextField size="small" select label="وضعیت" value={status} sx={{ width: 150 }}
              onChange={(event) => setStatus(event.target.value)}>
              <MenuItem value="">همه</MenuItem>
              {Object.entries(STATUS).map(([key, meta]) => (
                <MenuItem key={key} value={key}>{meta.label}</MenuItem>
              ))}
            </TextField>
            <Button variant="contained" size="small" startIcon={<AddIcon fontSize="small" />}
              onClick={() => { setForm(EMPTY); setFormError(''); setFormOpen(true); }}
              sx={{ bgcolor: studio.accent }}>پیش‌فاکتور جدید</Button>
          </Stack>
        )} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 1.5, mb: 1.5 }}>
        <StudioKpi label="تعداد پیش‌فاکتور" value={digits(totals.count)} icon={ReceiptLongIcon}
          color={studio.accent} />
        <StudioKpi label="مبلغ کل" value={money(totals.amount)} color={studio.accent} />
        <StudioKpi label="در جریان (تبدیل‌نشده)" value={digits(totals.open)} color="#b45309" />
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
                <TableCell>تاریخ</TableCell>
                <TableCell>اعتبار تا</TableCell>
                <TableCell>مبلغ</TableCell>
                <TableCell align="center">وضعیت</TableCell>
                <TableCell align="center">فاکتور</TableCell>
                <TableCell align="center">عملیات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{digits(row.number || '—')}</TableCell>
                  <TableCell>{row.supplier_name}</TableCell>
                  <TableCell>{dateLabel(row.date)}</TableCell>
                  <TableCell>{dateLabel(row.valid_until)}</TableCell>
                  <TableCell>{money(row.total)}</TableCell>
                  <TableCell align="center">
                    <StudioChip label={(STATUS[row.status] || {}).label || row.status_label}
                      color={(STATUS[row.status] || {}).color} />
                  </TableCell>
                  <TableCell align="center">
                    {row.converted_invoice_number ? digits(row.converted_invoice_number) : '—'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="تبدیل به فاکتور خرید">
                      <span>
                        <Button size="small" startIcon={<PlaylistAddCheckIcon fontSize="small" />}
                          disabled={row.status === 'converted'}
                          onClick={() => convert(row)} sx={{ fontSize: 11 }}>
                          تبدیل
                        </Button>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: studio.muted }}>
                    پیش‌فاکتوری ثبت نشده است.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </StudioCard>

      <DialogShell open={formOpen} title="ثبت پیش‌فاکتور خرید" onClose={() => setFormOpen(false)}
        onSubmit={submit} loading={saving} error={formError}>
        <FormGrid>
          <Field size={6} label="تأمین‌کننده" select required options={supplierOptions} value={form.supplier}
            onChange={(event) => setForm((prev) => ({ ...prev, supplier: event.target.value }))} />
          <Field size={3} label="شماره پیش‌فاکتور" value={form.proforma_number}
            onChange={(event) => setForm((prev) => ({ ...prev, proforma_number: event.target.value }))} />
          <Field size={3} label="تاریخ" type="date" value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
          <Field size={3} label="اعتبار تا" type="date" value={form.valid_until}
            onChange={(event) => setForm((prev) => ({ ...prev, valid_until: event.target.value }))} />
          <Field size={3} label="جمع خالص (ریال)" type="number" value={form.subtotal}
            onChange={(event) => setForm((prev) => ({ ...prev, subtotal: event.target.value }))} />
          <Field size={3} label="تخفیف" type="number" value={form.discount}
            onChange={(event) => setForm((prev) => ({ ...prev, discount: event.target.value }))} />
          <Field size={3} label="ارزش افزوده (٪)" type="number" value={form.vat_rate}
            onChange={(event) => setForm((prev) => ({ ...prev, vat_rate: event.target.value }))} />
          <Field size={12} label="شرایط" value={form.terms}
            onChange={(event) => setForm((prev) => ({ ...prev, terms: event.target.value }))} />
          <Field size={12} label="شرح" value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
        </FormGrid>
        <Typography sx={{ mt: 1.5, fontSize: 12, color: 'text.secondary' }}>
          مبلغ نهایی بر اساس جمع خالص، تخفیف و نرخ ارزش افزوده در سرور محاسبه می‌شود.
        </Typography>
      </DialogShell>
    </Box>
  );
};

export default ProcurementProformaPage;
