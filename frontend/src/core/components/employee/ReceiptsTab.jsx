import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, CircularProgress, Chip, Grid, Card, CardContent,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab, Avatar,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { formatPersianNumber, toPersianDigits } from '../../utils/numberUtils';
import SalaryPayslip from './SalaryPayslip';

const MONTH_NAMES = {
  '1': 'فروردین', '2': 'اردیبهشت', '3': 'خرداد', '4': 'تیر',
  '5': 'مرداد', '6': 'شهریور', '7': 'مهر', '8': 'آبان',
  '9': 'آذر', '10': 'دی', '11': 'بهمن', '12': 'اسفند',
};

const BENEFIT_LABELS = {
  performance: 'کارانه', eid_fitr: 'عید فطر', eid_adha: 'عید قربان',
  eid_ghadir: 'غدیر خم', imam_reza_birthday: 'تولد امام رضا (ع)',
  sports_allowance: 'کمک هزینه ورزش', yalda_night: 'شب یلدا',
  bahman_22: '۲۲ بهمن', eid_mabath: 'عید مبعث', nowruz_basket: 'سبد نوروزی',
  fatima_birthday: 'روز زن', ali_birthday: 'روز مرد', allowance: 'کمک هزینه',
  birthday: 'زادروز', ramadan_basket: 'سبد رمضان',
};

const ReceiptsTab = ({ employeeId }) => {
  const [subTab, setSubTab] = useState(0);
  const [year, setYear] = useState('');
  const [selectedSalary, setSelectedSalary] = useState(null);

  const { data: salaryData, isLoading: salaryLoading } = useQuery({
    queryKey: ['employee-salary-records', employeeId],
    queryFn: () => axiosInstance.get(`/salaries/by_employee/?employee_id=${employeeId}`).then(r => r.data),
  });
  const { data: benefitData, isLoading: benefitLoading } = useQuery({
    queryKey: ['employee-benefit-records', employeeId],
    queryFn: () => axiosInstance.get(`/benefits/by_employee/?employee_id=${employeeId}`).then(r => r.data),
  });

  const salaries = Array.isArray(salaryData) ? salaryData : [];
  const benefits = Array.isArray(benefitData) ? benefitData : [];

  // Extract available years
  const years = [...new Set([
    ...salaries.map(s => s.year),
    ...benefits.map(b => b.year),
  ])].sort((a, b) => b - a);

  const filteredSalaries = year ? salaries.filter(s => String(s.year) === String(year)) : salaries;
  const filteredBenefits = year ? benefits.filter(b => String(b.year) === String(year)) : benefits;

  if (salaryLoading || benefitLoading) {
    return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>;
  }

  return (
    <Box>
      {/* Year filter */}
      {years.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 120, mb: 2 }}>
          <InputLabel>سال</InputLabel>
          <Select value={year} label="سال" onChange={e => setYear(e.target.value)}>
            <MenuItem value="">همه سال‌ها</MenuItem>
            {years.map(y => <MenuItem key={y} value={y}>{toPersianDigits(y)}</MenuItem>)}
          </Select>
        </FormControl>
      )}

      <Tabs value={subTab} onChange={(e, v) => setSubTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<PaymentsIcon />} iconPosition="start" label={`فیش حقوقی (${filteredSalaries.length})`} />
        <Tab icon={<CardGiftcardIcon />} iconPosition="start" label={`مزایا (${filteredBenefits.length})`} />
      </Tabs>

      {subTab === 0 ? (
        <Grid container spacing={2}>
          {filteredSalaries.length === 0 ? (
            <Grid item xs={12}><Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>فیش حقوقی ثبت نشده است</Typography></Grid>
          ) : (
            filteredSalaries.map(rec => (
              <Grid item xs={12} sm={6} key={rec.id}>
                <Card variant="outlined" onClick={() => setSelectedSalary(rec)}
                  sx={{ background: 'rgba(245,158,11,0.04)', border: '1px solid #f59e0b30', cursor: 'pointer',
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(245,158,11,0.2)' }, transition: 'all 0.2s' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {toPersianDigits(rec.year)} {MONTH_NAMES[rec.month] || rec.month}
                      </Typography>
                      <Chip size="small" label={`${toPersianDigits(rec.work_days)} روز کارکرد`} variant="outlined" />
                    </Box>
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">حقوق پایه</Typography>
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
            ))
          )}
        </Grid>
      ) : (
        <Grid container spacing={2}>
          {filteredBenefits.length === 0 ? (
            <Grid item xs={12}><Typography color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>مزایایی ثبت نشده است</Typography></Grid>
          ) : (
            filteredBenefits.map(rec => (
              <Grid item xs={12} sm={6} key={rec.id}>
                <Card variant="outlined" sx={{ background: 'rgba(16,185,129,0.04)', border: '1px solid #10b98130' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {BENEFIT_LABELS[rec.benefit_type] || rec.benefit_type_display}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {toPersianDigits(rec.year)} {MONTH_NAMES[rec.month] || rec.month}
                      </Typography>
                    </Box>
                    <Grid container spacing={1}>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">ناخالص</Typography>
                        <Typography variant="body2" fontWeight={600}>{formatPersianNumber(rec.gross_amount)}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">مالیات</Typography>
                        <Typography variant="body2" fontWeight={600} color="error.main">{formatPersianNumber(rec.reserved_tax)}</Typography>
                      </Grid>
                      <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">پرداختی</Typography>
                        <Typography variant="body2" fontWeight={700} color="primary.main">{formatPersianNumber(rec.paid_amount)}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}

      {selectedSalary && (
        <SalaryPayslip record={selectedSalary} onClose={() => setSelectedSalary(null)} />
      )}
    </Box>
  );
};

export default ReceiptsTab;