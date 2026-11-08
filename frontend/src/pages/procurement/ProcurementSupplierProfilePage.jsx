/** پروندهٔ خرید بر اساس طرف حساب — تب‌های اسناد یک تأمین‌کننده (پوستهٔ استودیو تم). */
import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, MenuItem, Stack, Tab, Table, TableBody, TableCell,
  TableHead, TableRow, Tabs, TextField, Typography } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import { dateLabel, digits, money, useList } from './procurementUi';
import { StudioCard, StudioChip, StudioHeader, StudioKpi, studioTableSx, useProcurementStudio } from './procurementStudioUi';

const TABS = [
  { key: 'orders', label: 'سفارش‌ها', endpoint: '/procurement/purchase-orders/', supplierKey: 'supplier' },
  { key: 'invoices', label: 'فاکتورها', endpoint: '/procurement/purchase-invoices/', supplierKey: 'supplier' },
  { key: 'proformas', label: 'پیش‌فاکتورها', endpoint: '/procurement/proforma-invoices/', supplierKey: 'supplier' },
  { key: 'quotations', label: 'پیشنهادها', endpoint: '/procurement/quotations/', supplierKey: 'supplier' },
  { key: 'inquiries', label: 'استعلام‌ها', endpoint: '/procurement/inquiries/', supplierKey: 'supplier' },
  { key: 'guarantees', label: 'تضامین', endpoint: '/procurement/procurement-guarantees/', supplierKey: 'supplier' },
  { key: 'payments', label: 'پرداخت‌ها', endpoint: '/procurement/purchase-payments/', supplierKey: 'supplier' },
];

const COLUMNS = {
  orders: [
    { key: 'number', label: 'شماره' },
    { key: 'date', label: 'تاریخ', type: 'date' },
    { key: 'total', label: 'مبلغ', type: 'money' },
    { key: 'status_display', label: 'وضعیت' },
  ],
  invoices: [
    { key: 'number', label: 'شماره' },
    { key: 'invoice_number', label: 'شماره فاکتور' },
    { key: 'date', label: 'تاریخ', type: 'date' },
    { key: 'total', label: 'مبلغ', type: 'money' },
    { key: 'paid_amount', label: 'پرداخت‌شده', type: 'money' },
    { key: 'payment_status', label: 'وضعیت پرداخت', type: 'status' },
  ],
  proformas: [
    { key: 'number', label: 'شماره' },
    { key: 'proforma_number', label: 'شماره تأمین‌کننده' },
    { key: 'date', label: 'تاریخ', type: 'date' },
    { key: 'valid_until', label: 'اعتبار تا', type: 'date' },
    { key: 'total', label: 'مبلغ', type: 'money' },
    { key: 'status_label', label: 'وضعیت' },
  ],
  quotations: [
    { key: 'number', label: 'شماره' },
    { key: 'inquiry_number', label: 'استعلام' },
    { key: 'date', label: 'تاریخ', type: 'date' },
    { key: 'total', label: 'مبلغ', type: 'money' },
    { key: 'delivery_days', label: 'تحویل (روز)' },
    { key: 'status_label', label: 'وضعیت' },
  ],
  inquiries: [
    { key: 'number', label: 'شماره' },
    { key: 'subject', label: 'موضوع' },
    { key: 'deadline', label: 'مهلت', type: 'date' },
    { key: 'status_label', label: 'وضعیت' },
  ],
  guarantees: [
    { key: 'number', label: 'شماره' },
    { key: 'kind_label', label: 'نوع' },
    { key: 'amount', label: 'مبلغ', type: 'money' },
    { key: 'valid_until', label: 'اعتبار تا', type: 'date' },
    { key: 'validity', label: 'وضعیت اعتبار', type: 'validity' },
  ],
  payments: [
    { key: 'date', label: 'تاریخ', type: 'date' },
    { key: 'amount', label: 'مبلغ', type: 'money' },
    { key: 'method', label: 'روش' },
    { key: 'reference', label: 'مرجع' },
  ],
};

const cellValue = (row, column) => {
  const value = row[column.key];
  if (column.type === 'money') return money(value);
  if (column.type === 'date') return dateLabel(value);
  if (column.type === 'status') {
    const map = { paid: ['پرداخت کامل', '#0f766e'], partial: ['پرداخت جزئی', '#b45309'],
      unpaid: ['پرداخت‌نشده', '#be123c'] };
    const [label, color] = map[value] || [value || '—', '#64748b'];
    return <StudioChip label={label} color={color} />;
  }
  if (column.type === 'validity') {
    if (row.is_released) return <StudioChip label="آزادشده" color="#64748b" />;
    if (row.is_expired) return <StudioChip label="پایان اعتبار" color="#be123c" />;
    const days = row.days_to_expiry;
    if (days !== null && days !== undefined && days <= 30) {
      return <StudioChip label={`${digits(days)} روز`} color="#b45309" />;
    }
    return <StudioChip label="معتبر" color="#0f766e" />;
  }
  return value === null || value === undefined || value === '' ? '—' : value;
};

const ProcurementSupplierProfilePage = () => {
  const studio = useProcurementStudio();
  const [searchParams, setSearchParams] = useSearchParams();
  const supplierId = searchParams.get('supplier') || '';
  const tabKey = searchParams.get('tab') || 'orders';
  const suppliers = useList('/procurement/suppliers/', { page_size: 500 });
  const tab = TABS.find((item) => item.key === tabKey) || TABS[0];
  const params = useMemo(
    () => ({ page_size: 200, ...(supplierId ? { [tab.supplierKey]: supplierId } : {}) }),
    [supplierId, tab.supplierKey],
  );
  const { rows, loading, error } = useList(tab.endpoint, params);

  const supplier = (suppliers.rows || []).find((row) => String(row.id) === String(supplierId));
  const totalAmount = rows.reduce((sum, row) => sum + Number(row.total || row.amount || 0), 0);

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const columns = COLUMNS[tab.key] || [];
  const supplierOptions = (suppliers.rows || []).map((row) => ({ value: String(row.id), label: row.name }));

  return (
    <Box>
      <StudioHeader icon={<BusinessIcon />} title="پرونده خرید طرف حساب"
        subtitle="همهٔ اسناد خرید یک تأمین‌کننده: استعلام، پیشنهاد، سفارش، پیش‌فاکتور، فاکتور، تضامین و پرداخت‌ها"
        actions={(
          <TextField size="small" select label="طرف حساب" value={supplierId} sx={{ minWidth: 240 }}
            onChange={(event) => setParam('supplier', event.target.value)}>
            <MenuItem value="">انتخاب طرف حساب…</MenuItem>
            {supplierOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
        )} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 1.5, mb: 1.5 }}>
        <StudioKpi label="طرف حساب" value={supplier?.name || 'انتخاب نشده'}
          hint={supplier ? `کد: ${digits(supplier.code || '—')}` : 'برای شروع، تأمین‌کننده را انتخاب کنید'}
          color={studio.accent} />
        <StudioKpi label={`تعداد ${tab.label}`} value={digits(rows.length)} color={studio.accent} />
        <StudioKpi label="جمع مبالغ" value={money(totalAmount)} color="#0f766e" />
      </Box>

      <StudioCard padding={0}>
        <Tabs value={tab.key} onChange={(_event, value) => setParam('tab', value)} variant="scrollable"
          scrollButtons="auto" sx={{ px: 1, borderBottom: '1px solid', borderColor: studio.border }}>
          {TABS.map((item) => (
            <Tab key={item.key} value={item.key} label={item.label}
              sx={{ fontFamily: studio.font, fontWeight: 700, fontSize: 12.5 }} />
          ))}
        </Tabs>

        {error ? (
          <Typography sx={{ p: 2, color: 'error.main', fontSize: 12 }}>{error}</Typography>
        ) : null}

        {loading ? (
          <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={22} /></Stack>
        ) : (
          <Table size="small" sx={studioTableSx(studio)}>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell key={column.key}>{column.label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  {columns.map((column) => (
                    <TableCell key={`${row.id}-${column.key}`}>{cellValue(row, column)}</TableCell>
                  ))}
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={Math.max(columns.length, 1)} align="center"
                    sx={{ py: 4, color: studio.muted }}>
                    {supplierId ? 'در این بخش سندی برای این طرف حساب ثبت نشده است.'
                      : 'برای مشاهدهٔ اسناد، طرف حساب را انتخاب کنید.'}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </StudioCard>
    </Box>
  );
};

export default ProcurementSupplierProfilePage;
