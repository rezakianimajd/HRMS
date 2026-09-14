import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Tabs, Tab, Button, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Chip, Stack, Grid,
} from '@mui/material';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import SaveIcon from '@mui/icons-material/Save';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import { BENEFIT_TYPES } from '../modules/dataEntry/config';

const MONTHS = [
  { value: '1', label: 'فروردین' }, { value: '2', label: 'اردیبهشت' },
  { value: '3', label: 'خرداد' }, { value: '4', label: 'تیر' },
  { value: '5', label: 'مرداد' }, { value: '6', label: 'شهریور' },
  { value: '7', label: 'مهر' }, { value: '8', label: 'آبان' },
  { value: '9', label: 'آذر' }, { value: '10', label: 'دی' },
  { value: '11', label: 'بهمن' }, { value: '12', label: 'اسفند' },
];

const ReportTab = ({ benefitType, year, month }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['benefits', benefitType, year, month],
    queryFn: () => axiosInstance.get('/benefits/', { params: { benefit_type: benefitType, year, month } }).then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];
  const grossTotal = list.reduce((s, r) => s + (Number(r.gross_amount) || 0), 0);
  const taxTotal = list.reduce((s, r) => s + (Number(r.reserved_tax) || 0), 0);
  const paidTotal = list.reduce((s, r) => s + (Number(r.paid_amount) || 0), 0);

  if (isLoading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;

  return (
    <Paper sx={{ p: 2.5 }}>
      <Typography variant="h6" fontWeight={800} sx={{ mb: 2, color: '#059669' }}>گزارش پرداخت مزایا</Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="caption" color="textSecondary">تعداد رکورد</Typography><Typography variant="h6" fontWeight={800}>{toPersianDigits(list.length)}</Typography></Paper></Grid>
        <Grid item xs={6} sm={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="caption" color="textSecondary">جمع ناخالص</Typography><Typography variant="h6" fontWeight={800}>{formatPersianNumber(grossTotal)}</Typography></Paper></Grid>
        <Grid item xs={6} sm={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="caption" color="textSecondary">جمع مالیات</Typography><Typography variant="h6" fontWeight={800}>{formatPersianNumber(taxTotal)}</Typography></Paper></Grid>
        <Grid item xs={6} sm={3}><Paper sx={{ p: 2, textAlign: 'center' }}><Typography variant="caption" color="textSecondary">جمع قابل پرداخت</Typography><Typography variant="h6" fontWeight={800} sx={{ color: '#059669' }}>{formatPersianNumber(paidTotal)}</Typography></Paper></Grid>
      </Grid>

      <TableContainer sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>کد پرسنلی</TableCell>
              <TableCell>نام و نام خانوادگی</TableCell>
              <TableCell>نوع مزایا</TableCell>
              <TableCell>ناخالص</TableCell>
              <TableCell>مالیات</TableCell>
              <TableCell>خالص قابل پرداخت</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>رکوردی ثبت نشده است</TableCell></TableRow>
            ) : (
              list.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell>{toPersianDigits(r.employee_code)}</TableCell>
                  <TableCell>{r.employee_name}</TableCell>
                  <TableCell>{r.benefit_type_display || r.benefit_type}</TableCell>
                  <TableCell>{formatPersianNumber(r.gross_amount)}</TableCell>
                  <TableCell>{formatPersianNumber(r.reserved_tax)}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#059669' }}>{formatPersianNumber(r.paid_amount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

const BenefitPaymentPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [benefitType, setBenefitType] = useState('');
  const [year, setYear] = useState(1404);
  const [month, setMonth] = useState('6');
  const [rows, setRows] = useState([]); // { id, employee_id, full_name, ..., gross, tax }
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // پرسنل فعال برای لیست ورود
  const { data: sheet, isLoading, refetch } = useQuery({
    queryKey: ['benefit-payment-sheet', benefitType],
    queryFn: () => axiosInstance.get('/benefits/payment_sheet/', { params: { benefit_type: benefitType } }).then(r => r.data),
    enabled: !!benefitType,
  });

  // وقتی لیست جدید می‌رسد، جدول ورود را مقداردهی اولیه می‌کنیم
  React.useEffect(() => {
    if (sheet && Array.isArray(sheet)) {
      setRows(sheet.map(e => ({
        id: e.id,
        employee_id: e.employee_id,
        full_name: e.full_name,
        national_id: e.national_id,
        birth_date: e.birth_date,
        mobile: e.mobile,
        card_number: e.card_number,
        card_expiry_date: e.card_expiry_date,
        benefit_type: e.benefit_type,
        gross: '',
        tax: '',
      })));
    }
  }, [sheet]);

  const saveMutation = useMutation({
    mutationFn: (payload) => axiosInstance.post('/benefits/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['benefits'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (e) => setError(e.response?.data?.error || 'خطا در ذخیره'),
  });

  const setCell = (index, field, value) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const netFor = (r) => {
    const gross = Number(r.gross) || 0;
    const tax = Number(r.tax) || 0;
    return gross - tax;
  };

  const totals = useMemo(() => {
    let gross = 0, tax = 0, net = 0;
    rows.forEach(r => {
      const g = Number(r.gross) || 0;
      const t = Number(r.tax) || 0;
      gross += g; tax += t; net += (g - t);
    });
    return { gross, tax, net };
  }, [rows]);

  const saveAll = () => {
    setError('');
    const valid = rows.filter(r => Number(r.gross) > 0);
    if (!benefitType) { setError('ابتدا نوع مزایا را انتخاب کنید'); return; }
    if (!year || !month) { setError('سال و ماه الزامی است'); return; }
    if (valid.length === 0) { setError('هیچ ردیفی با مبلغ وارد نشده است'); return; }
    let i = 0;
    const next = () => {
      if (i >= valid.length) return;
      const r = valid[i++];
      saveMutation.mutate({
        employee: r.id,
        year: Number(year),
        month,
        benefit_type: r.benefit_type || benefitType,
        gross_amount: Number(r.gross) || 0,
        reserved_tax: Number(r.tax) || 0,
        paid_amount: netFor(r),
      }, { onSettled: next });
    };
    next();
  };

  return (
    <Box>
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(16,185,129,0.12), rgba(14,165,233,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #10b981, #0ea5e9)', boxShadow: '0 8px 24px rgba(16,185,129,0.4)' }}>
          <CardGiftcardIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#059669">پرداخت مزایا</Typography>
          <Typography variant="body2" color="textSecondary">لیست ورود و گزارش پرداخت مزایای رفاهی بر اساس نوع مزایا</Typography>
        </Box>
      </Paper>

      <Paper sx={{ mb: 2, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(16,185,129,0.04)' }}>
          <Tab icon={<PlaylistAddIcon />} iconPosition="start" label="لیست ورود"
            sx={{ fontWeight: 600, color: tab === 0 ? '#059669' : undefined }} />
          <Tab icon={<AssessmentIcon />} iconPosition="start" label="گزارش"
            sx={{ fontWeight: 600, color: tab === 1 ? '#059669' : undefined }} />
        </Tabs>
      </Paper>

      {tab === 0 && (
        <Paper sx={{ p: 2.5 }}>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع مزایا</InputLabel>
                <Select value={benefitType} label="نوع مزایا" onChange={e => setBenefitType(e.target.value)}>
                  {BENEFIT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth size="small" label="سال" type="number" value={year} onChange={e => setYear(e.target.value)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>ماه</InputLabel>
                <Select value={month} label="ماه" onChange={e => setMonth(e.target.value)}>
                  {MONTHS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {error && <Box sx={{ mb: 1 }}><Chip label={error} color="error" size="small" /></Box>}
          {saved && <Box sx={{ mb: 1 }}><Chip label="ذخیره شد ✓" color="success" size="small" /></Box>}

          {!benefitType ? (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>
              برای مشاهدهٔ لیست ورود، ابتدا نوع مزایا را انتخاب کنید.
            </Typography>
          ) : isLoading ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : (
            <>
              <TableContainer sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', maxHeight: 520 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>ردیف</TableCell>
                      <TableCell>کد پرسنلی</TableCell>
                      <TableCell>نام و نام خانوادگی</TableCell>
                      <TableCell>کد ملی</TableCell>
                      <TableCell>تاریخ تولد</TableCell>
                      <TableCell>شماره تماس</TableCell>
                      <TableCell>شماره بن‌کارت</TableCell>
                      <TableCell>تاریخ انقضا</TableCell>
                      <TableCell>نوع مزایا</TableCell>
                      <TableCell>ناخالص (ریال)</TableCell>
                      <TableCell>مالیات (ریال)</TableCell>
                      <TableCell>خالص قابل پرداخت</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((r, idx) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{toPersianDigits(idx + 1)}</TableCell>
                        <TableCell>{toPersianDigits(r.employee_id)}</TableCell>
                        <TableCell>{r.full_name}</TableCell>
                        <TableCell>{toPersianDigits(r.national_id)}</TableCell>
                        <TableCell>{toJalali(r.birth_date)}</TableCell>
                        <TableCell>{toPersianDigits(r.mobile)}</TableCell>
                        <TableCell dir="ltr">{r.card_number || '—'}</TableCell>
                        <TableCell>{toJalali(r.card_expiry_date)}</TableCell>
                        <TableCell>{BENEFIT_TYPES.find(t => t.value === (r.benefit_type || benefitType))?.label || '—'}</TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={r.gross}
                            onChange={e => setCell(idx, 'gross', e.target.value)} sx={{ width: 120 }} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" type="number" value={r.tax}
                            onChange={e => setCell(idx, 'tax', e.target.value)} sx={{ width: 110 }} />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#059669' }}>
                          {formatPersianNumber(netFor(r))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Paper sx={{ p: 2, mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">جمع ناخالص: {formatPersianNumber(totals.gross)} ریال</Typography>
                  <Typography variant="body2">جمع مالیات: {formatPersianNumber(totals.tax)} ریال</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ color: '#059669' }}>جمع قابل پرداخت: {formatPersianNumber(totals.net)} ریال</Typography>
                </Box>
                <Button variant="contained" startIcon={<SaveIcon />} onClick={saveAll} disabled={saveMutation.isLoading}
                  sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  {saveMutation.isLoading ? <CircularProgress size={20} /> : 'ثبت مزایا'}
                </Button>
              </Paper>
            </>
          )}
        </Paper>
      )}

      {tab === 1 && <ReportTab benefitType={benefitType} year={year} month={month} />}
    </Box>
  );
};

export default BenefitPaymentPage;