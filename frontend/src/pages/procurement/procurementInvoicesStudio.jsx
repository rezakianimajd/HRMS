/** صورتحساب‌های خرید — همان سبک فهرست فاکتورهای مدیریت قراردادها. */
import React, { useMemo, useState } from 'react';
import axiosInstance from '../../core/api/axiosConfig';
import { Box, Button, Chip, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaymentsIcon from '@mui/icons-material/Payments';
import EditIcon from '@mui/icons-material/Edit';
import PageHeader from '../../core/components/ui/PageHeader';
import { printElement } from '../../core/print/printEngine';
import {
  ModulePager, ModuleTable, ModuleToolbar,
  useModuleTableState, useModuleTheme, useRowHeight,
} from '../contracts/contractModuleUi';
import { DialogShell, Field, FormGrid, dateLabel, digits, money, num, todayIso, useList } from './procurementUi';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'submitted', label: 'در انتظار تأیید' },
  { value: 'approved', label: 'تأییدشده' },
  { value: 'paid', label: 'پرداخت‌شده' },
  { value: 'cancelled', label: 'لغو' },
];
const PAYMENT_META = {
  unpaid: { label: 'پرداخت‌نشده', color: '#be123c' },
  partial: { label: 'پرداخت جزئی', color: '#b45309' },
  paid: { label: 'پرداخت کامل', color: '#0f766e' },
};
const FILTERS = [
  { value: 'all', label: 'همه' },
  { value: 'unpaid', label: 'پرداخت‌نشده' },
  { value: 'partial', label: 'پرداخت جزئی' },
  { value: 'paid', label: 'پرداخت کامل' },
];
const EMPTY = {
  number: '', supplier: '', order: '', invoice_number: '', date: todayIso(),
  due_date: '', status: 'draft', subtotal: '', discount: '0', vat_rate: '0', description: '',
};
const cardSx = {
  borderRadius: 'var(--hrms-table-radius, 16px)', border: '1px solid',
  borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none',
};

const ProcurementInvoicesStudio = () => {
  const moduleTheme = useModuleTheme();
  const themeTokens = moduleTheme.tableTheme || {};
  const tableFrameSx = themeTokens.frame
    ? { px: `${themeTokens.frameX}px`, py: `${themeTokens.frameY}px` }
    : { px: 1.25, py: 1.25 };
  const pageSize = themeTokens.rowsPerPage || 25;

  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const invoices = useList('/procurement/purchase-invoices/', { page_size: 400 });
  const suppliers = useList('/procurement/suppliers/', { page_size: 400 });
  const orders = useList('/procurement/purchase-orders/', { page_size: 400 });

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = (invoices.rows || []).filter((row) => {
      if (paymentFilter !== 'all' && row.payment_status !== paymentFilter) return false;
      if (!query) return true;
      return [row.number, row.invoice_number, row.supplier_name, row.description].some(
        (value) => String(value || '').toLowerCase().includes(query),
      );
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'amount') return num(b.total) - num(a.total);
      if (sortBy === 'balance') {
        return (num(b.total) - num(b.paid_amount)) - (num(a.total) - num(a.paid_amount));
      }
      if (sortBy === 'oldest') return String(a.date || '').localeCompare(String(b.date || ''));
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
    return result;
  }, [invoices.rows, search, paymentFilter, sortBy]);

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    amount: acc.amount + num(row.total),
    paid: acc.paid + num(row.paid_amount),
    balance: acc.balance + Math.max(num(row.total) - num(row.paid_amount), 0),
  }), { amount: 0, paid: 0, balance: 0 }), [rows]);

  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    rows.length, pageSize, [search, paymentFilter, sortBy, pageSize],
  );
  const pagedRows = rows.slice(page * pageSize, page * pageSize + pageSize);
  const supplierOptions = (suppliers.rows || []).map((row) => ({ value: row.id, label: row.name }));
  const orderOptions = (orders.rows || []).map((row) => ({
    value: row.id, label: `${row.number || digits(row.id)} · ${row.supplier_name || ''}`,
  }));

  const activeChips = [
    paymentFilter !== 'all'
      ? { label: `پرداخت: ${(PAYMENT_META[paymentFilter] || {}).label || paymentFilter}`, onDelete: () => setPaymentFilter('all') }
      : null,
    search ? { label: `جستجو: ${search}`, onDelete: () => setSearch('') } : null,
  ].filter(Boolean);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setOpen(true); };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      ...EMPTY,
      ...Object.keys(EMPTY).reduce((acc, key) => {
        const value = row[key];
        acc[key] = value === null || value === undefined ? EMPTY[key] : String(value);
        return acc;
      }, {}),
      vat_rate: row.vat_rate ? String(row.vat_rate) : '0',
    });
    setError('');
    setOpen(true);
  };

  const submit = () => {
    setError('');
    if (!form.supplier) { setError('تأمین‌کننده را انتخاب کنید.'); return; }
    const payload = {
      ...form,
      order: form.order || null,
      due_date: form.due_date || null,
      subtotal: num(form.subtotal),
      discount: num(form.discount),
      vat_rate: num(form.vat_rate),
    };
    setSaving(true);
    const request = editing
      ? axiosInstance.patch(`/procurement/purchase-invoices/${editing.id}/`, payload)
      : axiosInstance.post('/procurement/purchase-invoices/', payload);
    request
      .then(() => { setOpen(false); invoices.reload(); })
      .catch((err) => setError(err?.response?.data?.detail || 'ذخیرهٔ صورتحساب ناموفق بود.'))
      .finally(() => setSaving(false));
  };

  const paymentChip = (status) => {
    const meta = PAYMENT_META[status] || { label: status || '—', color: '#64748b' };
    return (
      <Chip size="small" label={meta.label}
        sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(meta.color, 0.12), color: meta.color }} />
    );
  };

  return (
    <Box>
      <Box sx={{ ...cardSx, ...tableFrameSx }}>
        <ModuleTable
          tableTheme={themeTokens}
          ariaLabel="فهرست صورتحساب‌های خرید"
          containerRef={tableRef}
          tableHeight={tableHeight}
          rowHeight={rowHeight}
          dimmed={invoices.loading}
          rows={pagedRows}
          rowKey={(row) => row.id}
          onRowClick={(row) => openEdit(row)}
          emptyText="صورتحسابی با این شرایط پیدا نشد."
          columns={[
            { key: 'row', label: 'ردیف', width: '4%', align: 'center',
              render: (row, index) => digits(page * pageSize + index + 1) },
            { key: 'number', label: 'شماره', width: '9%', render: (row) => digits(row.number || '—') },
            { key: 'invoice_number', label: 'فاکتور تأمین‌کننده', width: '13%',
              render: (row) => digits(row.invoice_number || '—') },
            { key: 'supplier', label: 'تأمین‌کننده', width: '20%', render: (row) => row.supplier_name || '—' },
            { key: 'date', label: 'تاریخ', width: '9%', render: (row) => dateLabel(row.date) },
            { key: 'due', label: 'سررسید', width: '9%', render: (row) => dateLabel(row.due_date) },
            { key: 'total', label: 'مبلغ', width: '10%', render: (row) => money(row.total) },
            { key: 'paid', label: 'پرداخت‌شده', width: '10%', render: (row) => money(row.paid_amount) },
            { key: 'balance', label: 'مانده', width: '9%',
              render: (row) => money(num(row.total) - num(row.paid_amount)) },
            { key: 'payment', label: 'وضعیت پرداخت', width: '9%', align: 'center',
              render: (row) => paymentChip(row.payment_status) },
            { key: 'actions', label: 'عملیات', width: '8%', align: 'center',
              render: (row) => (
                <Stack direction="row" spacing={0.25} justifyContent="center">
                  <Button size="small" startIcon={<PaymentsIcon fontSize="small" />}
                    onClick={(event) => { event.stopPropagation(); openEdit(row); }}
                    sx={{ fontSize: 11 }}>پرداخت</Button>
                  <Button size="small" startIcon={<EditIcon fontSize="small" />}
                    onClick={(event) => { event.stopPropagation(); openEdit(row); }}
                    sx={{ fontSize: 11 }}>ویرایش</Button>
                </Stack>
              ) },
          ]}
        />
        <ModulePager
          tableTheme={themeTokens}
          page={page}
          onPage={setPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          total={rows.length}
          pageSize={pageSize}
          unit="صورتحساب"
        />
      </Box>

      <DialogShell open={open} title={editing ? 'ویرایش صورتحساب خرید' : 'ثبت صورتحساب خرید'} maxWidth="md"
        onClose={() => setOpen(false)} onSubmit={submit} loading={saving} error={error}>
        <FormGrid>
          <Field size={5} label="تأمین‌کننده" select required options={supplierOptions} value={form.supplier}
            onChange={(event) => setForm((prev) => ({ ...prev, supplier: event.target.value }))} />
          <Field size={4} label="سفارش خرید" select options={orderOptions} value={form.order}
            onChange={(event) => setForm((prev) => ({ ...prev, order: event.target.value }))} />
          <Field size={3} label="وضعیت" select options={STATUS_OPTIONS} value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))} />
          <Field size={4} label="شماره صورتحساب" value={form.number}
            onChange={(event) => setForm((prev) => ({ ...prev, number: event.target.value }))} />
          <Field size={4} label="شماره فاکتور تأمین‌کننده" value={form.invoice_number}
            onChange={(event) => setForm((prev) => ({ ...prev, invoice_number: event.target.value }))} />
          <Field size={4} label="تاریخ" type="date" value={form.date}
            onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))} />
          <Field size={4} label="سررسید" type="date" value={form.due_date}
            onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))} />
          <Field size={4} label="جمع خالص (ریال)" type="number" value={form.subtotal}
            onChange={(event) => setForm((prev) => ({ ...prev, subtotal: event.target.value }))} />
          <Field size={4} label="تخفیف" type="number" value={form.discount}
            onChange={(event) => setForm((prev) => ({ ...prev, discount: event.target.value }))} />
          <Field size={4} label="ارزش افزوده (٪)" type="number" value={form.vat_rate}
            onChange={(event) => setForm((prev) => ({ ...prev, vat_rate: event.target.value }))} />
          <Field size={12} label="شرح" value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
        </FormGrid>
      </DialogShell>
    </Box>
  );
};

export default ProcurementInvoicesStudio;
