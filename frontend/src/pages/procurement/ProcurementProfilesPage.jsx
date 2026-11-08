/** پرونده‌های خرید — یک ردیف برای هر طرف حساب (تأمین‌کننده)، مثل فهرست قراردادها. */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Stack, Table, TableBody, TableCell, TableHead,
  TableRow, TextField, Typography } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import StorefrontIcon from '@mui/icons-material/Storefront';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { digits, money, useList } from './procurementUi';
import { StudioCard, StudioChip, StudioHeader, StudioKpi, studioTableSx, useProcurementStudio } from './procurementStudioUi';

const ProcurementProfilesPage = () => {
  const studio = useProcurementStudio();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const params = useMemo(() => ({ page_size: 500 }), []);
  const { rows, loading, error } = useList('/procurement/supplier-profiles/', params);

  const filtered = (rows || []).filter((row) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [row.name, row.code, row.phone].some(
      (value) => String(value || '').toLowerCase().includes(query),
    );
  });
  const totals = filtered.reduce((acc, row) => ({
    documents: acc.documents + row.documents_count,
    invoices: acc.invoices + row.invoices_total,
    paid: acc.paid + row.invoices_paid,
    balance: acc.balance + row.invoices_balance,
  }), { documents: 0, invoices: 0, paid: 0, balance: 0 });

  return (
    <Box>
      <StudioHeader icon={<StorefrontIcon />} title="پرونده خرید"
        subtitle="فهرست طرف حساب‌ها؛ برای هر تأمین‌کننده یک پرونده با سفارش‌ها، پیش‌فاکتور، فاکتور، تضامین و پرداخت‌ها"
        actions={(
          <TextField size="small" placeholder="جست‌وجوی طرف حساب…" value={search}
            onChange={(event) => setSearch(event.target.value)} sx={{ width: 230 }} />
        )} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 1.5, mb: 1.5 }}>
        <StudioKpi label="طرف حساب‌ها" value={digits(filtered.length)} icon={BusinessIcon}
          color={studio.accent} />
        <StudioKpi label="کل اسناد خرید" value={digits(totals.documents)} color={studio.accent} />
        <StudioKpi label="مبلغ فاکتورها" value={money(totals.invoices)} color="#0f766e" />
        <StudioKpi label="مانده پرداخت‌نشده" value={money(totals.balance)}
          hint={`پرداخت‌شده: ${money(totals.paid)}`} color="#b45309" />
      </Box>

      {error ? <Typography sx={{ color: 'error.main', fontSize: 12, mb: 1 }}>{error}</Typography> : null}

      <StudioCard padding={0}>
        {loading ? (
          <Stack alignItems="center" sx={{ py: 5 }}><CircularProgress size={22} /></Stack>
        ) : (
          <Table size="small" sx={studioTableSx(studio)}>
            <TableHead>
              <TableRow>
                <TableCell>طرف حساب</TableCell>
                <TableCell align="center">سفارش</TableCell>
                <TableCell align="center">پیشنهاد</TableCell>
                <TableCell align="center">پیش‌فاکتور</TableCell>
                <TableCell align="center">فاکتور</TableCell>
                <TableCell align="center">تضمین</TableCell>
                <TableCell>مبلغ فاکتورها</TableCell>
                <TableCell>مانده</TableCell>
                <TableCell align="center">پرونده</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id} hover sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/procurement/supplier-profile?supplier=${row.id}`)}>
                  <TableCell>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{row.name}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: studio.muted }}>
                      کد {digits(row.code || '—')} · {row.status_label}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{digits(row.orders_count)}</TableCell>
                  <TableCell align="center">{digits(row.quotations_count)}</TableCell>
                  <TableCell align="center">{digits(row.proformas_count)}</TableCell>
                  <TableCell align="center">{digits(row.invoices_count)}</TableCell>
                  <TableCell align="center">{digits(row.guarantees_count)}</TableCell>
                  <TableCell>{money(row.invoices_total)}</TableCell>
                  <TableCell>{money(row.invoices_balance)}</TableCell>
                  <TableCell align="center">
                    <Button size="small" startIcon={<OpenInNewIcon fontSize="small" />}
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/procurement/supplier-profile?supplier=${row.id}`);
                      }}
                      sx={{ fontSize: 11 }}>باز کردن</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!filtered.length ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: studio.muted }}>
                    طرف حسابی یافت نشد.
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

export default ProcurementProfilesPage;
