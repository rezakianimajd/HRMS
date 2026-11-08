/** مقایسهٔ پیشنهادهای یک استعلام + ثبت پیشنهاد و انتخاب برنده. */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  ACCENT, ACCENT_DARK, DANGER, DialogShell, FONT, Field, FormGrid, INFO, OK,
  SectionShell, TD, TH, asList, dateLabel, digits, money, num, todayIso,
} from './procurementUi';

const emptyQuotation = () => ({
  supplier: '', number: '', date: todayIso(), validity_date: '',
  delivery_days: 0, vat_rate: 0, prices: {},
});

const ProcurementInquiryComparisonPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyQuotation());
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axiosInstance.get(`/procurement/inquiries/${id}/`).then((response) => response.data),
      axiosInstance.get(`/procurement/inquiries/${id}/comparison/`).then((response) => response.data),
      axiosInstance.get('/procurement/suppliers/', { params: { page_size: 500 } })
        .then((response) => asList(response.data)),
    ])
      .then(([inquiryData, comparisonData, supplierRows]) => {
        setInquiry(inquiryData);
        setComparison(comparisonData);
        setSuppliers(supplierRows);
        setError('');
      })
      .catch((err) => setError(err?.response?.data?.detail || 'بارگذاری اطلاعات مقایسه ناموفق بود.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const supplierOptions = useMemo(
    () => suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
    [suppliers],
  );
  const lineRows = comparison?.rows || [];
  const supplierColumns = comparison?.suppliers || [];

  const priceFor = (row, quotationId) => {
    const cell = (row.cells || []).find((item) => item.quotation === quotationId);
    return cell || { unit_price: null, has_offer: false, is_lowest: false };
  };

  const openQuotationForm = () => {
    const prices = {};
    lineRows.forEach((row) => { prices[row.id] = ''; });
    setForm({ ...emptyQuotation(), prices });
    setFormError('');
    setFormOpen(true);
  };

  const submitQuotation = () => {
    setFormError('');
    if (!form.supplier) { setFormError('تأمین‌کننده را انتخاب کنید.'); return; }
    const lines = lineRows
      .filter((row) => String(form.prices[row.id] ?? '') !== '')
      .map((row) => ({
        inquiry_line: row.id,
        quantity: num(row.quantity) || 1,
        unit_price: num(form.prices[row.id]),
      }));
    if (!lines.length) { setFormError('حداقل قیمت یک سطر را وارد کنید.'); return; }
    const subtotal = lines.reduce((total, line) => total + line.quantity * line.unit_price, 0);
    setBusy(true);
    axiosInstance.post('/procurement/quotations/', {
      inquiry: Number(id),
      supplier: form.supplier,
      number: form.number,
      date: form.date || todayIso(),
      validity_date: form.validity_date || null,
      delivery_days: num(form.delivery_days),
      vat_rate: num(form.vat_rate),
      subtotal,
      discount: 0,
      vat_amount: null,
      total: 0,
      status: 'received',
      lines,
    })
      .then(() => { setFormOpen(false); load(); })
      .catch((err) => setFormError(err?.response?.data?.detail || 'ثبت پیشنهاد ناموفق بود.'))
      .finally(() => setBusy(false));
  };

  const award = (quotation) => {
    if (!window.confirm(`انتخاب پیشنهاد «${quotation.supplier}» به‌عنوان برنده؟`)) return;
    setBusy(true);
    axiosInstance.post(`/procurement/inquiries/${id}/award/`, { quotation: quotation.id })
      .then(load)
      .catch((err) => setError(err?.response?.data?.detail || 'انتخاب برنده ناموفق بود.'))
      .finally(() => setBusy(false));
  };

  const removeQuotation = (quotation) => {
    if (!window.confirm('حذف این پیشنهاد؟')) return;
    setBusy(true);
    axiosInstance.delete(`/procurement/quotations/${quotation.id}/`)
      .then(load)
      .catch((err) => setError(err?.response?.data?.detail || 'حذف پیشنهاد ناموفق بود.'))
      .finally(() => setBusy(false));
  };

  const head = [
    <TH key="line">شرح سطر استعلام</TH>,
    <TH key="qty" align="center">مقدار</TH>,
    <TH key="target" align="center">کم‌ترین قیمت</TH>,
    ...supplierColumns.map((supplier) => (
      <TH key={`sup-${supplier.id}`} align="center">
        <Stack spacing={0.25} alignItems="center">
          <Typography sx={{ fontFamily: FONT, fontSize: 12, fontWeight: 900 }}>{supplier.supplier}</Typography>
          <Typography sx={{ fontFamily: FONT, fontSize: 10.5, color: '#64748b' }}>
            رتبه {digits(supplier.rank || '—')} · {money(supplier.total)}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            {supplier.status === 'winner' ? (
              <Chip size="small" label="برنده"
                sx={{ height: 18, fontSize: 10, bgcolor: '#8b5cf618', color: '#8b5cf6', fontFamily: FONT }} />
            ) : null}
            <Tooltip title="انتخاب به‌عنوان برنده">
              <IconButton size="small" disabled={busy} onClick={() => award(supplier)}>
                <EmojiEventsIcon fontSize="small" sx={{ color: ACCENT_DARK }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="حذف پیشنهاد">
              <IconButton size="small" disabled={busy} onClick={() => removeQuotation(supplier)}>
                <DeleteIcon fontSize="small" sx={{ color: DANGER }} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </TH>
    )),
  ];

  return (
    <SectionShell
      icon={<EmojiEventsIcon />}
      title={`مقایسهٔ پیشنهادها — ${inquiry?.subject || 'استعلام'}`}
      subtitle={inquiry
        ? `${inquiry.number || '—'} · مهلت ${dateLabel(inquiry.deadline)} · ${digits(supplierColumns.length)} پیشنهاد`
        : 'در حال بارگذاری…'}
      loading={loading}
      error={error}
      actions={(
        <>
          <Button size="small" variant="outlined" startIcon={<ArrowBackIcon fontSize="small" />}
            onClick={() => navigate('/procurement/inquiries')} sx={{ fontFamily: FONT }}>
            فهرست استعلام‌ها
          </Button>
          <Button size="small" variant="contained" startIcon={<AddIcon fontSize="small" />}
            onClick={openQuotationForm} disabled={!lineRows.length}
            sx={{ bgcolor: ACCENT_DARK, fontFamily: FONT }}>
            ثبت پیشنهاد تأمین‌کننده
          </Button>
        </>
      )}
    >
      {comparison?.best ? (
        <Alert severity="success" sx={{ mb: 1.5, fontFamily: FONT }}>
          پیشنهاد پیشنهادی: <strong>{comparison.best.supplier}</strong> با مبلغ {money(comparison.best.total)}
          {comparison.best.delivery_days ? ` و تحویل ${digits(comparison.best.delivery_days)} روز` : ''}
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 1.5, fontFamily: FONT }}>
          هنوز پیشنهادی ثبت نشده است؛ با دکمهٔ «ثبت پیشنهاد تأمین‌کننده» شروع کنید.
        </Alert>
      )}

      <TableContainer sx={{ maxHeight: '58vh' }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow>{head}</TableRow></TableHead>
          <TableBody>
            {lineRows.map((row) => (
              <TableRow key={row.id} hover>
                <TD bold>{row.description || '—'}</TD>
                <TD align="center">{digits(row.quantity)}{row.unit ? ` ${row.unit}` : ''}</TD>
                <TD align="center">{row.lowest_price ? money(row.lowest_price) : '—'}</TD>
                {supplierColumns.map((supplier) => {
                  const cell = priceFor(row, supplier.id);
                  return (
                    <TD key={`c-${supplier.id}-${row.id}`} align="center"
                      sx={{
                        fontWeight: cell.is_lowest ? 900 : 400,
                        color: cell.is_lowest ? OK : (cell.has_offer ? 'inherit' : '#cbd5e1'),
                        bgcolor: cell.is_lowest ? '#10b98110' : 'transparent',
                      }}>
                      {cell.has_offer ? money(cell.unit_price) : '—'}
                    </TD>
                  );
                })}
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: '#f1f5f9' }}>
              <TD bold>جمع پیشنهاد</TD>
              <TD align="center">—</TD>
              <TD align="center">—</TD>
              {supplierColumns.map((supplier) => (
                <TD key={`t-${supplier.id}`} align="center" bold>
                  {money(supplier.total)}
                  {supplier.delivery_days ? (
                    <Typography sx={{ fontFamily: FONT, fontSize: 10, color: '#64748b' }}>
                      تحویل {digits(supplier.delivery_days)} روز
                    </Typography>
                  ) : null}
                </TD>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <DialogShell open={formOpen} title="ثبت پیشنهاد تأمین‌کننده" maxWidth="md"
        onClose={() => setFormOpen(false)} onSubmit={submitQuotation} loading={busy}
        error={formError} submitLabel="ثبت پیشنهاد">
        <FormGrid>
          <Field size={5} label="تأمین‌کننده" select required options={supplierOptions} value={form.supplier}
            onChange={(event) => setForm((previous) => ({ ...previous, supplier: event.target.value }))} />
          <Field size={3} label="شماره پیشنهاد" value={form.number}
            onChange={(event) => setForm((previous) => ({ ...previous, number: event.target.value }))} />
          <Field size={2} label="تاریخ" type="date" value={form.date}
            onChange={(event) => setForm((previous) => ({ ...previous, date: event.target.value }))} />
          <Field size={2} label="اعتبار تا" type="date" value={form.validity_date}
            onChange={(event) => setForm((previous) => ({ ...previous, validity_date: event.target.value }))} />
          <Field size={3} label="زمان تحویل (روز)" type="number" value={form.delivery_days}
            onChange={(event) => setForm((previous) => ({ ...previous, delivery_days: event.target.value }))} />
          <Field size={3} label="نرخ ارزش افزوده (٪)" type="number" value={form.vat_rate}
            onChange={(event) => setForm((previous) => ({ ...previous, vat_rate: event.target.value }))} />
        </FormGrid>

        <Box sx={{ mt: 2 }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 900, fontSize: 13, mb: 1 }}>
            قیمت هر سطر (ریال)
          </Typography>
          <Stack spacing={1}>
            {lineRows.map((row) => (
              <Box key={row.id}
                sx={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.4fr', gap: 1, alignItems: 'center' }}>
                <Typography sx={{ fontFamily: FONT, fontSize: 12.5 }}>{row.description || '—'}</Typography>
                <Typography sx={{ fontFamily: FONT, fontSize: 12, color: '#64748b' }}>
                  {digits(row.quantity)} {row.unit || ''}
                </Typography>
                <TextField size="small" type="number" label="قیمت واحد" value={form.prices[row.id] ?? ''}
                  onChange={(event) => setForm((previous) => ({
                    ...previous,
                    prices: { ...previous.prices, [row.id]: event.target.value },
                  }))} />
              </Box>
            ))}
          </Stack>
          <Alert severity="info" sx={{ mt: 1.5, fontFamily: FONT }}>
            جمع پیشنهاد: {money(lineRows.reduce(
              (total, row) => total + num(row.quantity) * num(form.prices[row.id]), 0,
            ))}
          </Alert>
        </Box>
      </DialogShell>
    </SectionShell>
  );
};

export default ProcurementInquiryComparisonPage;
