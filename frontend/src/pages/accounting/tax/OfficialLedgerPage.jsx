import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Grid, Paper, Typography, Autocomplete, TextField, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { glass, BLUE, GREEN, ReportHeader, Loading, StatCard } from './taxHelpers';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';
import { toJalali } from '../../../core/utils/dateUtils';

const OfficialLedgerPage = () => {
  const [years, setYears] = useState([]);
  const [year, setYear] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    axiosInstance.get('/accounting/fiscal-years/').then((r) => {
      const d = r.data;
      setYears(Array.isArray(d) ? d : d?.results || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!year) { setData(null); return; }
    setLoading(true);
    axiosInstance.get('/accounting/tax/official-ledger/', { params: { fiscal_year: year.id } })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year]);

  const journal = data?.journal_book || [];
  const subsidiary = data?.subsidiary_ledger || [];

  return (
    <>
      <ReportHeader
        icon={<MenuBookIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="دفاتر رسمی مالیاتی"
        subtitle="دفتر روزنامه و دفتر معین به تفکیک حساب"
      />

      <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Grid item xs={12} sm={5}>
          <Autocomplete size="small" options={years} getOptionLabel={(o) => o.name}
            value={year} onChange={(e, v) => setYear(v)}
            renderInput={(p) => <TextField {...p} label="سال مالی" />} />
        </Grid>
        {data && (
          <>
            <Grid item xs={6} sm={3}><StatCard label="اسناد روزنامه" value={journal.length} color={BLUE} /></Grid>
            <Grid item xs={6} sm={3}><StatCard label="تعداد حساب‌ها" value={subsidiary.length} color={GREEN} /></Grid>
          </>
        )}
      </Grid>

      {!year ? (
        <Paper sx={{ ...glass, p: 4, textAlign: 'center' }}><Typography color="textSecondary">سال مالی را انتخاب کنید</Typography></Paper>
      ) : loading ? (
        <Loading />
      ) : (
        <Paper sx={{ ...glass, overflow: 'hidden' }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
            sx={{ borderBottom: '1px solid rgba(225,225,225,0.5)', px: 2 }}>
            <Tab label={`دفتر روزنامه (${toPersianDigits(journal.length)})`} />
            <Tab label={`دفتر معین (${toPersianDigits(subsidiary.length)})`} />
          </Tabs>

          {tab === 0 && (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow>
                  <TableCell>تاریخ</TableCell><TableCell>شماره</TableCell><TableCell>شرح</TableCell>
                  <TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {journal.map((d, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{toJalali(d.date)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{d.number}</TableCell>
                      <TableCell sx={{ maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.description}</TableCell>
                      <TableCell sx={{ color: BLUE }}>{formatPersianNumber(d.debit)}</TableCell>
                      <TableCell sx={{ color: GREEN }}>{formatPersianNumber(d.credit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tab === 1 && (
            <TableContainer sx={{ maxHeight: 600 }}>
              {subsidiary.map((acc) => (
                <div key={acc.code} style={{ marginBottom: 12 }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ px: 2, py: 1, color: '#b45309', bgcolor: 'rgba(217,119,6,0.06)' }}>
                    {acc.code} - {acc.name}
                  </Typography>
                  <Table size="small">
                    <TableHead><TableRow>
                      <TableCell>تاریخ</TableCell><TableCell>شماره</TableCell><TableCell>شرح</TableCell>
                      <TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                      {acc.rows.map((r, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{toJalali(r.date)}</TableCell>
                          <TableCell>{r.number}</TableCell>
                          <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description}</TableCell>
                          <TableCell sx={{ color: BLUE }}>{formatPersianNumber(r.debit)}</TableCell>
                          <TableCell sx={{ color: GREEN }}>{formatPersianNumber(r.credit)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Divider sx={{ my: 1 }} />
                </div>
              ))}
            </TableContainer>
          )}
        </Paper>
      )}
    </>
  );
};

export default OfficialLedgerPage;