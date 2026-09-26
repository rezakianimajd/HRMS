import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Paper, Typography, Grid, Tabs, Tab, Autocomplete, TextField,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Divider,
} from '@mui/material';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { glass, COLOR_DARK, BLUE, GREEN, ReportHeader, Loading, StatCard } from './annualHelpers';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';
import { toJalali } from '../../../core/utils/dateUtils';

const LegalBooksPage = () => {
  const [year, setYear] = useState(null);
  const [years, setYears] = useState([]);
  const [tab, setTab] = useState(0);
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
    axiosInstance.get('/accounting/annual/legal-books/', { params: { fiscal_year: year.id } })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year]);

  const journal = data?.journal_book || [];
  const general = data?.general_ledger || [];
  const subsidiary = data?.subsidiary_ledger || [];
  const trial = data?.trial_balance || {};

  return (
    <>
      <ReportHeader
        icon={<MenuBookIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="ساخت دفاتر قانونی"
        subtitle="دفتر روزنامه، دفتر کل، دفتر معین و تراز آزمایشی سال مالی"
      />

      <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Grid item xs={12} sm={5}>
          <Autocomplete
            size="small"
            options={years}
            getOptionLabel={(o) => o.name}
            value={year}
            onChange={(e, v) => setYear(v)}
            renderInput={(p) => <TextField {...p} label="سال مالی" />}
          />
        </Grid>
        {data && (
          <>
            <Grid item xs={6} sm={2}><StatCard label="اسناد" value={journal.length} /></Grid>
            <Grid item xs={6} sm={2}><StatCard label="جمع بدهکار" value={trial.total_debit || 0} color={BLUE} /></Grid>
            <Grid item xs={6} sm={2}><StatCard label="جمع بستانکار" value={trial.total_credit || 0} color={GREEN} /></Grid>
          </>
        )}
      </Grid>

      {!year ? (
        <Paper sx={{ ...glass, p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">سال مالی را انتخاب کنید</Typography>
        </Paper>
      ) : loading ? (
        <Loading />
      ) : (
        <Paper sx={{ ...glass, overflow: 'hidden' }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
            sx={{ borderBottom: '1px solid rgba(225,225,225,0.5)', px: 2 }}>
            <Tab label={`دفتر روزنامه (${toPersianDigits(journal.length)})`} />
            <Tab label={`دفتر کل (${toPersianDigits(general.length)})`} />
            <Tab label={`دفتر معین (${toPersianDigits(subsidiary.length)})`} />
            <Tab label="تراز آزمایشی" />
          </Tabs>

          {tab === 0 && (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow>
                  <TableCell>تاریخ</TableCell><TableCell>شماره</TableCell><TableCell>شرح</TableCell>
                  <TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell><TableCell>سطرها</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {journal.map((d) => (
                    <TableRow key={d.id} hover>
                      <TableCell>{toJalali(d.date)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{d.number}</TableCell>
                      <TableCell sx={{ maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.description}</TableCell>
                      <TableCell sx={{ color: BLUE }}>{formatPersianNumber(d.debit)}</TableCell>
                      <TableCell sx={{ color: GREEN }}>{formatPersianNumber(d.credit)}</TableCell>
                      <TableCell>{toPersianDigits(d.lines?.length || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tab === 1 && (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow>
                  <TableCell>کد</TableCell><TableCell>حساب</TableCell>
                  <TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell><TableCell>مانده</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {general.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.code}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell sx={{ color: BLUE }}>{formatPersianNumber(r.debit)}</TableCell>
                      <TableCell sx={{ color: GREEN }}>{formatPersianNumber(r.credit)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{formatPersianNumber(r.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tab === 2 && (
            <TableContainer sx={{ maxHeight: 600 }}>
              {subsidiary.map((acc) => (
                <div key={acc.id} style={{ marginBottom: 12 }}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ px: 2, py: 1, color: COLOR_DARK, bgcolor: 'rgba(14,165,233,0.06)' }}>
                    {acc.code} - {acc.name}
                  </Typography>
                  <Table size="small">
                    <TableHead><TableRow>
                      <TableCell>تاریخ</TableCell><TableCell>شماره</TableCell><TableCell>شرح</TableCell>
                      <TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell><TableCell>مانده</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                      {acc.rows.map((r, i) => (
                        <TableRow key={i} hover>
                          <TableCell>{toJalali(r.date)}</TableCell>
                          <TableCell>{r.number}</TableCell>
                          <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description}</TableCell>
                          <TableCell sx={{ color: BLUE }}>{formatPersianNumber(r.debit)}</TableCell>
                          <TableCell sx={{ color: GREEN }}>{formatPersianNumber(r.credit)}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{formatPersianNumber(r.balance)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Divider sx={{ my: 1 }} />
                </div>
              ))}
            </TableContainer>
          )}

          {tab === 3 && (
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow>
                  <TableCell>کد</TableCell><TableCell>حساب</TableCell>
                  <TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell><TableCell>مانده</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {(trial.rows || []).map((r, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{r.account_code}</TableCell>
                      <TableCell>{r.account_name}</TableCell>
                      <TableCell sx={{ color: BLUE }}>{formatPersianNumber(r.debit)}</TableCell>
                      <TableCell sx={{ color: GREEN }}>{formatPersianNumber(r.credit)}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{formatPersianNumber(r.balance)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: 'rgba(14,165,233,0.06)' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 800 }}>جمع</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: BLUE }}>{formatPersianNumber(trial.total_debit)}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: GREEN }}>{formatPersianNumber(trial.total_credit)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}
    </>
  );
};

export default LegalBooksPage;