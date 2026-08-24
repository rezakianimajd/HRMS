import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, CircularProgress, Chip, Grid, Card, CardContent,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { formatPersianNumber, toPersianDigits } from '../../utils/numberUtils';

const MONTH_NAMES = {
  '1': 'فروردین', '2': 'اردیبهشت', '3': 'خرداد', '4': 'تیر',
  '5': 'مرداد', '6': 'شهریور', '7': 'مهر', '8': 'آبان',
  '9': 'آذر', '10': 'دی', '11': 'بهمن', '12': 'اسفند',
};

const SalaryRecordsTab = ({ employeeId }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['employee-salary-records', employeeId],
    queryFn: () => axiosInstance.get(`/salaries/by_employee/?employee_id=${employeeId}`).then(r => r.data),
  });

  const records = Array.isArray(data) ? data : [];

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>;

  if (!records.length) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography color="textSecondary">فیش حقوقی برای این پرسنل ثبت نشده است</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={2}>
        {records.map(rec => (
          <Grid item xs={12} sm={6} key={rec.id}>
            <Card variant="outlined" sx={{ background: 'rgba(245,158,11,0.04)', border: '1px solid #f59e0b30' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {toPersianDigits(rec.year)} {MONTH_NAMES[rec.month] || rec.month}
                  </Typography>
                  <Chip size="small" label={toPersianDigits(rec.work_days) + ' روز'} variant="outlined" />
                </Box>
                <Grid container spacing={1}>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">پایه</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatPersianNumber(rec.base_salary)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">جمع مزایا</Typography>
                    <Typography variant="body2" fontWeight={600} color="success.main">{formatPersianNumber(rec.total_benefits)}</Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="caption" color="textSecondary">جمع کسور</Typography>
                    <Typography variant="body2" fontWeight={600} color="error.main">{formatPersianNumber(rec.total_deductions)}</Typography>
                  </Grid>
                </Grid>
                <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eef2f7' }}>
                  <Typography variant="caption" color="textSecondary">قابل پرداخت</Typography>
                  <Typography variant="h6" fontWeight={800} color="primary.main">{formatPersianNumber(rec.net_payable)}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SalaryRecordsTab;