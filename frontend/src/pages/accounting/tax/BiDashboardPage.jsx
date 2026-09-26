import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Grid, Paper, Typography, Autocomplete, TextField,
} from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts';
import { glass, GREEN, RED, BLUE, ReportHeader, Loading, StatCard } from './taxHelpers';
import { toPersianDigits } from '../../../core/utils/numberUtils';

const BiDashboardPage = () => {
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
    axiosInstance.get('/accounting/tax/bi-dashboard/', { params: { fiscal_year: year.id } })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [year]);

  const monthly = (data?.monthly || []).map((m) => ({
    ...m,
    label: toPersianDigits(m.month),
  }));
  const categories = data?.categories || [];

  const netSum = monthly.reduce((s, m) => s + (m.net || 0), 0);

  return (
    <>
      <ReportHeader
        icon={<InsightsIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="داشبورد هوش مالی (BI)"
        subtitle="روند سود/زیان، درآمد و هزینه به تفکیک ماه"
        color="#8b5cf6"
        dark="#7c3aed"
      />

      <Grid container spacing={2} sx={{ mb: 2 }} alignItems="center">
        <Grid item xs={12} sm={5}>
          <Autocomplete size="small" options={years} getOptionLabel={(o) => o.name}
            value={year} onChange={(e, v) => setYear(v)}
            renderInput={(p) => <TextField {...p} label="سال مالی" />} />
        </Grid>
        {data && (
          <>
            <Grid item xs={6} sm={2}><StatCard label="نتیجهٔ خالص" value={netSum} color={netSum >= 0 ? GREEN : RED} /></Grid>
            <Grid item xs={6} sm={2}><StatCard label="طبقات" value={categories.length} color={BLUE} /></Grid>
          </>
        )}
      </Grid>

      {!year ? (
        <Paper sx={{ ...glass, p: 4, textAlign: 'center' }}><Typography color="textSecondary">سال مالی را انتخاب کنید</Typography></Paper>
      ) : loading ? (
        <Loading />
      ) : (
        <>
          <Paper sx={{ ...glass, p: 2, mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#7c3aed', mb: 1 }}>
              روند سود و زیان ماهانه
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="درآمد" stroke="#059669" strokeWidth={2} />
                <Line type="monotone" dataKey="expense" name="هزینه" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="net" name="خالص" stroke="#7c3aed" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>

          <Paper sx={{ ...glass, p: 2 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#7c3aed', mb: 1 }}>
              ترکیب طبقات حساب
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categories} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="مبلغ" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </>
      )}
    </>
  );
};

export default BiDashboardPage;