/** تخصیص پرداخت‌های خرید — اتصال پرداخت به فاکتور/پیش‌فاکتور (پوستهٔ استودیو تم). */
import React, { useMemo, useState } from 'react';
import axiosInstance from '../../core/api/axiosConfig';
import { Box, Button, CircularProgress, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PaymentsIcon from '@mui/icons-material/Payments';
import { DialogShell, Field, FormGrid, dateLabel, digits, money, num, useList } from './procurementUi';
import { StudioCard, StudioChip, StudioHeader, StudioKpi, studioTableSx, useProcurementStudio } from './procurementStudioUi';

const EMPTY = { payment: '', invoice: '', proforma: '', amount: '', note: '' };

const ProcurementAllocationsPage = () => {
  const studio = useProcurementStudio();
  const allocations = useList('/procurement/payment-allocations/', { page_size: 200 });
  const payments = useList('/procurement/purchase-payments/', { page_size: 400 });
  const invoices = useList('/procurement/purchase-invoices/', { page_size: 400 });
  const proformas = useList('/procurement/proforma-invoices/', { page_size: 200 });

  const [form, setForm] = useState(EMPTY);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const rows = allocations.rows || [];
  const paymentOptions = (payments.rows || []).map((row) => ({
    value: row.id,
    label: `${digits(row.id)} · ${dateLabel(row.date)} · ${money(row.amount)}`,
  }));
  const invoiceOptions = (invoices.rows || []).map((row) => ({
    value: row.id,
    label: `${row.number || digits(row.id)} · ${row.supplier_name || ''} · ${money(row.total)}`,
  }));
  const proformaOptions = (proformas.rows || []).map((row) => ({
    value: row.id,
    label: `${row.number || digits(row.id)} · ${row.supplier_name || ''}`,
  }));

  const invoiceById = useMemo(() => {
    const map = {};
    (invoices.rows || []).forEach((row) => { map[row.id] = row; });
    return map;
  }, [invoices.rows]);

  const totals = rows.reduce(
    (acc, row) => ({ amount: acc.amount + num(row.amount), count: acc.count + 1 }),
    { amount: 0, count: 0 },
  );
  const openInvoices = (invoices.rows || []).filter((row) => row.payment_status !== 'paid');
  const openAmount = openInvoices.reduce((sum, row) => sum + num(row.total) - num(row.paid_amount), 0);

  const submit = () => {
    setError('');
    if (!form.payment) { setError('پرداخت را انتخاب کنید.'); return; }
    if (!form.invoice && !form.proforma) { setError('فاکتور یا پیش‌فاکتور مقصد را انتخاب کنید.'); return; }
    if (!num(form.amount)) { setError('مبلغ تخصیص را وارد کنید.'); return; }
    setSaving(true);
    axiosInstance.post('/procurement/payment-allocations/', {
      payment: form.payment,
      invoice: form.invoice || null,
      proforma: form.invoice ? null : (form.proforma || null),
      amount: num(form.amount),
      note: form.note,
    })
      .then(() => { setOpen(false); setForm(EMPTY); allocations.reload(); invoices.reload(); })
      .catch((err) => setError(err?.response?.data?.detail || 'ثبت تخصیص ناموفق بود.'))
      .finally(() => setSaving(false));
  };

  const statusChip = (status) => {
    if (status === 'paid') return <StudioChip label="پرداخت کامل" color="#0f766e" />;
    if (status === 'partial') return <StudioChip label="پرداخت جزئی" color="#b45309" />;
    return <StudioChip label="پرداخت‌نشده" color="#be123c" />;
  };

  return (
    <Box>
      <StudioHeader icon={<PaymentsIcon />} title="تخصیص پرداخت‌های خرید"
        subtitle="اتصال هر پرداخت به فاکتور یا پیش‌فاکتور و به‌روزرسانی وضعیت پرداخت"
        actions={(
          <Button variant="contained" size="small" startIcon={<AddIcon fontSize="small" />}
            onClick={() => { setForm(EMPTY); setError(''); setOpen(true); }}
            sx={{ bgcolor: studio.accent }}>
            تخصیص جدید
          </Button>
        )} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 1.5, mb: 1.5 }}>
        <StudioKpi label="تخصیص‌های ثبت‌شده" value={digits(totals.count)} icon={PaymentsIcon}
          color={studio.accent} />
        <StudioKpi label="مبلغ تخصیص‌یافته" value={money(totals.amount)} color="#0f766e" />
        <StudioKpi label="فاکتورهای باز" value={digits(openInvoices.length)}
          hint={`مانده: ${money(openAmount)}`} color="#b45309" />
      </Box>

      {error || allocations.error ? (
        <Typography sx={{ color: 'error.main', fontSize: 12, mb: 1 }}>
          {error || allocations.error}
        </Typography>
      ) : null}

      <StudioCard padding={0}>
        {allocations.loading ? (
          <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={22} /></Stack>
        ) : (
          <Table size="small" sx={studioTableSx(studio)}>
            <TableHead>
              <TableRow>
                <TableCell>فاکتور / پیش‌فاکتور</TableCell>
                <TableCell>پرداخت</TableCell>
                <TableCell>مبلغ تخصیص</TableCell>
                <TableCell>وضعیت فاکتور</TableCell>
                <TableCell>مانده فاکتور</TableCell>
                <TableCell>یادداشت</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const invoice = row.invoice ? invoiceById[row.invoice] : null;
                return (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      {row.invoice_number || row.proforma_number || digits(row.invoice || row.proforma || '')}
                    </TableCell>
                    <TableCell>{digits(row.payment)}</TableCell>
                    <TableCell>{money(row.amount)}</TableCell>
                    <TableCell>{statusChip(invoice?.payment_status)}</TableCell>
                    <TableCell>
                      {invoice ? money(num(invoice.total) - num(invoice.paid_amount)) : '—'}
                    </TableCell>
                    <TableCell>{row.note || '—'}</TableCell>
                  </TableRow>
                );
              })}
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: studio.muted }}>
                    تخصیصی ثبت نشده است.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </StudioCard>

      <DialogShell open={open} title="تخصیص پرداخت به فاکتور" onClose={() => setOpen(false)}
        onSubmit={submit} loading={saving} error={error}>
        <FormGrid>
          <Field size={12} label="پرداخت" select required options={paymentOptions} value={form.payment}
            onChange={(event) => setForm((prev) => ({ ...prev, payment: event.target.value }))} />
          <Field size={6} label="فاکتور خرید" select options={invoiceOptions} value={form.invoice}
            onChange={(event) => setForm((prev) => ({ ...prev, invoice: event.target.value }))} />
          <Field size={6} label="یا پیش‌فاکتور" select options={proformaOptions} value={form.proforma}
            disabled={Boolean(form.invoice)}
            onChange={(event) => setForm((prev) => ({ ...prev, proforma: event.target.value }))} />
          <Field size={4} label="مبلغ تخصیص (ریال)" type="number" value={form.amount}
            onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} />
          <Field size={8} label="یادداشت" value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))} />
        </FormGrid>
        <Typography sx={{ mt: 1.5, fontSize: 11.5, color: 'text.secondary' }}>
          با ثبت تخصیص، مبلغ پرداخت‌شده و وضعیت پرداخت فاکتور به‌صورت خودکار بازمحاسبه می‌شود.
        </Typography>
      </DialogShell>
    </Box>
  );
};

export default ProcurementAllocationsPage;
