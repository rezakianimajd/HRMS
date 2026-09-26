import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Grid, Paper, Typography, Autocomplete, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { glass, GREEN, RED, BLUE, ReportHeader, Loading, StatCard } from './taxHelpers';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';

const VatLedgerPage = () => {
  const [years, setYears] = useState([]);
  const [year, setYear] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axiosInstance.get('/accounting/fiscal-years/').then((r) => {
      const d = r.data;
      setYears(Array.isArray(d) ? d : d?.results || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!year) { setData(null); return; }
    setLoading(true);
    axiosInstance.get('/accounting/tax/vat-ledger/', { params: { fiscal_year: year.id } })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year]);

  const rows = data?.rows || [];

  return (
    <>
      <ReportHeader
        icon={<ReceiptIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="گزارش ارزش افزوده"
        subtitle="جمع معاملات و مالیات به تفکیک نرخ و نوع (خرید / فروش)"
      />

      <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Grid item xs={12} sm={5}>
          <Autocomplete size="small" options={years} getOptionLabel={(o) => o.name}
            value={year} onChange={(e, v) => setYear(v)}
            renderInput={(p) => <TextField {...p} label="سال مالی" />} />
        </Grid>
        {data && (
          <>
            <Grid item xs={6} sm={2}><StatCard label="فروش (خالص)" value={data.total_sale_net} color={BLUE} /></Grid>
            <Grid item xs={6} sm={2}><StatCard label="خرید (خالص)" value={data.total_purchase_net} color={RED} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="مالیات قابل پرداخت" value={data.payable} color={data.payable >= 0 ? GREEN : RED} /></Grid>
          </>
        )}
      </Grid>

      {!year ? (
        <Paper sx={{ ...glass, p: 4, textAlign: 'center' }}><Typography color="textSecondary">سال مالی را انتخاب کنید</Typography></Paper>
      ) : loading ? (
        <Loading />
      ) : (
        <Paper sx={{ ...glass, p: 2, overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table size="small">
              <TableHead><TableRow>
                <TableCell>نرخ (٪)</TableCell>
                <TableCell>فروش خالص</TableCell>
                <TableCell>مالیات فروش</TableCell>
                <TableCell>خرید خالص</TableCell>
                <TableCell>مالیات خرید</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} hover>
                    <TableCell sx={{ fontWeight: 800 }}>{toPersianDigits(r.rate)}٪</TableCell>
                    <TableCell sx={{ color: BLUE }}>{formatPersianNumber(r.sale_net)}</TableCell>
                    <TableCell sx={{ color: GREEN }}>{formatPersianNumber(r.sale_vat)}</TableCell>
                    <TableCell sx={{ color: RED }}>{formatPersianNumber(r.purchase_net)}</TableCell>
                    <TableCell sx={{ color: RED }}>{formatPersianNumber(r.purchase_vat)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'rgba(217,119,6,0.06)' }}>
                  <TableCell sx={{ fontWeight: 800 }}>جمع</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: BLUE }}>{formatPersianNumber(data?.total_sale_net)}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: GREEN }}>{formatPersianNumber(data?.total_sale_vat)}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: RED }}>{formatPersianNumber(data?.total_purchase_net)}</TableCell>
                  <TableCell sx={{ fontWeight: 800, color: RED }}>{formatPersianNumber(data?.total_purchase_vat)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </>
  );
};

export default VatLedgerPage;