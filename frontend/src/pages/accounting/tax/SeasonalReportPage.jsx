import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Grid, Paper, Typography, Autocomplete, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
} from '@mui/material';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';
import { glass, COLOR_DARK, GREEN, RED, BLUE, ReportHeader, Loading, StatCard } from './taxHelpers';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';

const SeasonalReportPage = () => {
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
    axiosInstance.get('/accounting/tax/seasonal/', { params: { fiscal_year: year.id } })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year]);

  const rows = data?.rows || [];

  return (
    <>
      <ReportHeader
        icon={<CalendarViewMonthIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="صورت معاملات فصلی"
        subtitle="ماده ۱۶۹ مکرر — تجمیع معاملات به تفکیک طرف معامله"
      />

      <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Grid item xs={12} sm={5}>
          <Autocomplete size="small" options={years} getOptionLabel={(o) => o.name}
            value={year} onChange={(e, v) => setYear(v)}
            renderInput={(p) => <TextField {...p} label="سال مالی" />} />
        </Grid>
        {data && (
          <>
            <Grid item xs={6} sm={2}><StatCard label="جمع فروش" value={data.total_sale} color={GREEN} /></Grid>
            <Grid item xs={6} sm={2}><StatCard label="جمع خرید" value={data.total_purchase} color={RED} /></Grid>
            <Grid item xs={6} sm={2}><StatCard label="تعداد طرف‌ها" value={data.total_parties} color={COLOR_DARK} /></Grid>
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
                <TableCell>شماره اقتصادی</TableCell>
                <TableCell>شناسه ملی</TableCell>
                <TableCell>کد پستی</TableCell>
                <TableCell>طرف معامله</TableCell>
                <TableCell>فروش (تعداد/مبلغ)</TableCell>
                <TableCell>خرید (تعداد/مبلغ)</TableCell>
                <TableCell>خدمت (تعداد/مبلغ)</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {rows.map((p, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{p.tax_id || '—'}</TableCell>
                    <TableCell>{p.national_id || '—'}</TableCell>
                    <TableCell>{p.postal_code || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{p.name || '—'}</TableCell>
                    <TableCell>
                      {p.sale_count > 0 ? (
                        <>
                          <Chip size="small" label={`${toPersianDigits(p.sale_count)} فاکتور`} sx={{ height: 18, fontSize: 10, mb: 0.25, display: 'block' }} />
                          <Typography variant="body2" color={GREEN}>{formatPersianNumber(p.sale_amount)}</Typography>
                        </>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {p.purchase_count > 0 ? (
                        <>
                          <Chip size="small" label={`${toPersianDigits(p.purchase_count)} فاکتور`} sx={{ height: 18, fontSize: 10, mb: 0.25, display: 'block' }} />
                          <Typography variant="body2" color={RED}>{formatPersianNumber(p.purchase_amount)}</Typography>
                        </>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {p.service_count > 0 ? (
                        <>
                          <Chip size="small" label={`${toPersianDigits(p.service_count)}`} sx={{ height: 18, fontSize: 10, mb: 0.25, display: 'block' }} />
                          <Typography variant="body2" color={BLUE}>{formatPersianNumber(p.service_amount)}</Typography>
                        </>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </>
  );
};

export default SeasonalReportPage;