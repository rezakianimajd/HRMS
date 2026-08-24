import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, CircularProgress, Grid, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem, Chip, Divider,
} from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { formatPersianNumber, toPersianDigits } from '../../utils/numberUtils';

const MONTH_NAMES = {
  '1': 'فروردین', '2': 'اردیبهشت', '3': 'خرداد', '4': 'تیر',
  '5': 'مرداد', '6': 'شهریور', '7': 'مهر', '8': 'آبان',
  '9': 'آذر', '10': 'دی', '11': 'بهمن', '12': 'اسفند',
};

const WorkRecordTab = ({ employeeId }) => {
  const [year, setYear] = useState('');

  const { data: salaryData, isLoading: salaryLoading } = useQuery({
    queryKey: ['employee-salary-records', employeeId],
    queryFn: () => axiosInstance.get(`/salaries/by_employee/?employee_id=${employeeId}`).then(r => r.data),
  });

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['employee-transactions', employeeId],
    queryFn: () => axiosInstance.get(`/transactions/by_employee/?employee_id=${employeeId}`).then(r => r.data),
  });

  if (salaryLoading || txLoading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>;
  }

  const salaries = Array.isArray(salaryData) ? salaryData : [];
  const transactions = Array.isArray(txData) ? txData : [];

  const agg = {};
  transactions.forEach(tx => {
    if (!tx.date) return;
    const key = tx.date.slice(0, 7);
    if (!agg[key]) agg[key] = { leave: 0, absence: 0 };
    if (tx.transaction_type === 'leave') agg[key].leave += Number(tx.quantity) || 0;
    if (tx.transaction_type === 'absence') agg[key].absence += Number(tx.quantity) || 0;
  });

  const monthly = salaries.map(s => {
    const key = `${s.year}-${String(s.month).padStart(2, '0')}`;
    return {
      id: s.id, year: s.year, month: s.month,
      work_days: Number(s.work_days) || 0,
      overtime_hours: Number(s.overtime_hours) || 0,
      leave: (agg[key] && agg[key].leave) || 0,
      absence: (agg[key] && agg[key].absence) || 0,
      net_payable: Number(s.net_payable) || 0,
    };
  });

  const salaryKeys = new Set(monthly.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`));
  Object.entries(agg).forEach(([key, v]) => {
    if (!salaryKeys.has(key)) {
      const [y, m] = key.split('-');
      monthly.push({
        id: key, year: Number(y), month: m.replace(/^0/, ''), work_days: 0,
        overtime_hours: 0, leave: v.leave, absence: v.absence, net_payable: 0,
      });
    }
  });

  monthly.sort((a, b) => b.year - a.year || Number(b.month) - Number(a.month));

  const years = [...new Set(monthly.map(m => m.year))].sort((a, b) => b - a);
  const filtered = year ? monthly.filter(m => String(m.year) === String(year)) : monthly;

  return (
    <Box>
      {years.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 120, mb: 2 }}>
          <InputLabel>سال</InputLabel>
          <Select value={year} label="سال" onChange={e => setYear(e.target.value)}>
            <MenuItem value="">همه سال‌ها</MenuItem>
            {years.map(y => <MenuItem key={y} value={y}>{toPersianDigits(y)}</MenuItem>)}
          </Select>
        </FormControl>
      )}

      {filtered.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <WorkIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="textSecondary">اطلاعات کارکرد برای این پرسنل ثبت نشده است</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(m => (
            <Grid item xs={12} sm={6} md={4} key={m.id}>
              <Card variant="outlined" sx={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(59,130,246,0.02))',
                border: '1px solid #3b82f630',
              }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#3b82f6' }}>
                      {toPersianDigits(m.year)} {MONTH_NAMES[m.month] || m.month}
                    </Typography>
                  </Box>
                  <Divider sx={{ mb: 1.5 }} />
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <WorkIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                        <Typography variant="body2">کارکرد (روز)</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700}>{formatPersianNumber(m.work_days)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EventBusyIcon sx={{ fontSize: 16, color: '#6366f1' }} />
                        <Typography variant="body2">مرخصی (روز)</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700} color="#6366f1">{formatPersianNumber(m.leave)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PersonOffIcon sx={{ fontSize: 16, color: '#ef4444' }} />
                        <Typography variant="body2">غیبت (روز)</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700} color="#ef4444">{formatPersianNumber(m.absence)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <ScheduleIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                        <Typography variant="body2">اضافه‌کار (ساعت)</Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={700} color="#f59e0b">{formatPersianNumber(m.overtime_hours)}</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default WorkRecordTab;