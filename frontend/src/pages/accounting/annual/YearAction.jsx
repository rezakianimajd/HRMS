import React, { useState, useEffect } from 'react';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Grid, Paper, Typography, Button, Autocomplete, TextField, Alert, CircularProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { glass, COLOR, COLOR_DARK } from './annualHelpers';
import { formatPersianNumber } from '../../../core/utils/numberUtils';

const YearAction = ({ endpoint, title, description, buttonLabel }) => {
  const [years, setYears] = useState([]);
  const [year, setYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    axiosInstance.get('/accounting/fiscal-years/').then((r) => {
      const d = r.data;
      setYears(Array.isArray(d) ? d : d?.results || []);
    }).catch(() => {});
  }, []);

  const run = async () => {
    if (!year) { setError('سال مالی را انتخاب کنید'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await axiosInstance.post(endpoint, { fiscal_year: year.id });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'خطا در اجرای عملیات');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ ...glass, p: 2.5, mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={800} sx={{ color: COLOR_DARK, mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{description}</Typography>

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={6}>
          <Autocomplete
            size="small"
            options={years}
            getOptionLabel={(o) => o.name}
            value={year}
            onChange={(e, v) => setYear(v)}
            renderInput={(p) => <TextField {...p} label="سال مالی" />}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Button
            variant="contained"
            disabled={loading}
            onClick={run}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
            sx={{ background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, borderRadius: '12px', fontWeight: 700, textTransform: 'none' }}
          >
            {buttonLabel}
          </Button>
        </Grid>
      </Grid>

      {error && <Alert severity="error" sx={{ mt: 2, borderRadius: '12px', fontSize: 13 }}>{error}</Alert>}

      {result && (
        <Alert severity="success" sx={{ mt: 2, borderRadius: '12px', fontSize: 13 }}>
          سند با موفقیت ساخته و ثبت شد (شماره: {result.number || `#${result.id}`})
          {typeof result.total_debit === 'number' && (
            <div>جمع: {formatPersianNumber(result.total_debit)} / {formatPersianNumber(result.total_credit)}</div>
          )}
        </Alert>
      )}
    </Paper>
  );
};

export default YearAction;