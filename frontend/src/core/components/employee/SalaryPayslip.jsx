import React from 'react';
import {
  Box, Typography, Paper, Dialog, DialogContent, IconButton,
  Button, Grid, Divider, Avatar, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import BusinessIcon from '@mui/icons-material/Business';
import axiosInstance from '../../api/axiosConfig';
import { formatPersianNumber, toPersianDigits } from '../../utils/numberUtils';
import { useQuery } from '@tanstack/react-query';

const MONTH_NAMES = {
  '1': 'فروردین', '2': 'اردیبهشت', '3': 'خرداد', '4': 'تیر',
  '5': 'مرداد', '6': 'شهریور', '7': 'مهر', '8': 'آبان',
  '9': 'آذر', '10': 'دی', '11': 'بهمن', '12': 'اسفند',
};

const EARNING_ITEMS = [
  { key: 'base_salary', label: 'حقوق پایه', color: '#6366f1' },
  { key: 'overtime_pay', label: 'اضافه‌کاری', color: '#6366f1' },
  { key: 'night_shift', label: 'شب‌کاری', color: '#6366f1' },
  { key: 'shift_work', label: 'نوبت‌کاری', color: '#6366f1' },
  { key: 'attraction_allowance', label: 'حق جذب', color: '#6366f1' },
  { key: 'supervision_allowance', label: 'حق سرپرستی', color: '#6366f1' },
  { key: 'workshop_mission', label: 'ماموریت کارگاهی', color: '#6366f1' },
  { key: 'seniority_base', label: 'پایه سنوات', color: '#6366f1' },
  { key: 'job_allowance', label: 'فوق‌العاده شغل', color: '#6366f1' },
  { key: 'hardship_allowance', label: 'سختی کار', color: '#6366f1' },
  { key: 'travel_cost', label: 'هزینه سفر', color: '#6366f1' },
  { key: 'housing_allowance', label: 'حق مسکن', color: '#6366f1' },
  { key: 'marriage_allowance', label: 'حق تأهل', color: '#6366f1' },
  { key: 'children_allowance', label: 'حق اولاد', color: '#6366f1' },
  { key: 'meal_voucher', label: 'بن کارکنان', color: '#6366f1' },
  { key: 'deferred_salary_1', label: 'حقوق معوقه ۱', color: '#6366f1' },
  { key: 'deferred_salary_2', label: 'حقوق معوقه ۲', color: '#6366f1' },
  { key: 'bonus_reserve', label: 'عیدی و ذخیره', color: '#6366f1' },
  { key: 'other_benefits', label: 'سایر مزایا', color: '#6366f1' },
  { key: 'mission_allowance', label: 'حق مأموریت', color: '#6366f1' },
];

const DEDUCTION_ITEMS = [
  { key: 'employee_insurance', label: 'حق بیمه سهم پرسنل', color: '#ef4444' },
  { key: 'tax', label: 'مالیات', color: '#ef4444' },
  { key: 'advance', label: 'مساعده', color: '#ef4444' },
  { key: 'supplementary_insurance', label: 'بیمه تکمیلی', color: '#ef4444' },
  { key: 'employee_loan', label: 'وام کارکنان', color: '#ef4444' },
  { key: 'work_deduction', label: 'کسر کار', color: '#ef4444' },
];

const SalaryPayslip = ({ record, onClose }) => {
  const { data: profile } = useQuery({
    queryKey: ['company-profile-layout'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then(r => r.data).catch(() => null),
  });

  const companyName = profile?.legal_name || profile?.company_name || 'شرکت';
  const r = record || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open fullWidth maxWidth="md" onClose={onClose}>
      {/* Print-only toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 1, borderBottom: '1px solid #eef2f7', '@media print': { display: 'none' } }}>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint} size="small">
          چاپ / PDF
        </Button>
        <IconButton onClick={onClose} size="small"><CloseIcon fontSize="small" /></IconButton>
      </Box>

      <DialogContent sx={{ '@media print': { p: 0 } }}>
        {/* Payslip container */}
        <Box className="payslip-root" sx={{ mx: 'auto', maxWidth: 820 }}>
          {/* Header */}
          <Box sx={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            pb: 2, mb: 2, borderBottom: '3px solid #6366f1',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{
                width: 56, height: 56,
                background: 'linear-gradient(135deg, #6366f1, #ec4899)',
              }}>
                {profile?.logo_url ? (
                  <img src={profile.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <BusinessIcon sx={{ color: '#fff' }} />
                )}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={800}>{companyName}</Typography>
                <Typography variant="caption" color="textSecondary">فیش حقوقی ماهانه</Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="body1" fontWeight={700} color="primary.main">
                {toPersianDigits(r.year)} {MONTH_NAMES[r.month] || r.month}
              </Typography>
              <Typography variant="caption" color="textSecondary">سال / ماه</Typography>
            </Box>
          </Box>

          {/* Employee info strip */}
          <Grid container spacing={1.5} sx={{ mb: 2, p: 2, bgcolor: 'rgba(99,102,241,0.04)', borderRadius: 2 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary" display="block">نام و نام خانوادگی</Typography>
              <Typography variant="body2" fontWeight={700}>{r.employee_name}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary" display="block">کد پرسنلی</Typography>
              <Typography variant="body2" fontWeight={700}>{toPersianDigits(r.employee_code)}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary" display="block">کارکرد (روز)</Typography>
              <Typography variant="body2" fontWeight={700}>{formatPersianNumber(r.work_days)}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary" display="block">ساعت اضافه‌کار</Typography>
              <Typography variant="body2" fontWeight={700}>{formatPersianNumber(r.overtime_hours)}</Typography>
            </Grid>
          </Grid>

          {/* Earnings table */}
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#6366f1', mb: 1 }}>
            حقوق و مزایا
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(99,102,241,0.08)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>عنوان</TableCell>
                  <TableCell align="left" sx={{ fontWeight: 700 }}>مبلغ (ریال)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {EARNING_ITEMS.filter(item => Number(r[item.key]) > 0).map(item => (
                  <TableRow key={item.key} hover>
                    <TableCell>{item.label}</TableCell>
                    <TableCell align="left">{formatPersianNumber(r[item.key])}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'rgba(99,102,241,0.04)' }}>
                  <TableCell sx={{ fontWeight: 800 }}>جمع حقوق و مزایا</TableCell>
                  <TableCell align="left" sx={{ fontWeight: 800, color: '#6366f1' }}>{formatPersianNumber(r.total_benefits)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Insurance */}
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#10b981', mb: 1 }}>
            بیمه
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>مشمول بیمه</TableCell>
                  <TableCell align="left">{formatPersianNumber(r.insurance_subject)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>حق بیمه سهم کارفرما</TableCell>
                  <TableCell align="left">{formatPersianNumber(r.employer_insurance)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>حق بیمه سهم پرسنل</TableCell>
                  <TableCell align="left">{formatPersianNumber(r.employee_insurance)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Deductions table */}
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#ef4444', mb: 1 }}>
            کسورات
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(239,68,68,0.08)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>عنوان</TableCell>
                  <TableCell align="left" sx={{ fontWeight: 700 }}>مبلغ (ریال)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {DEDUCTION_ITEMS.filter(item => Number(r[item.key]) > 0).map(item => (
                  <TableRow key={item.key} hover>
                    <TableCell>{item.label}</TableCell>
                    <TableCell align="left">{formatPersianNumber(r[item.key])}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: 'rgba(239,68,68,0.04)' }}>
                  <TableCell sx={{ fontWeight: 800 }}>جمع کسور</TableCell>
                  <TableCell align="left" sx={{ fontWeight: 800, color: '#ef4444' }}>{formatPersianNumber(r.total_deductions)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Summary */}
          <Box sx={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            p: 2.5, borderRadius: 2,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'rgba(255,255,255,0.9)' }}>
              مبلغ قابل پرداخت
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#fff' }}>
              {formatPersianNumber(r.net_payable)} ریال
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .payslip-root, .payslip-root * { visibility: visible; }
          .payslip-root { position: absolute; right: 0; top: 0; width: 100%; }
        }
      `}</style>
    </Dialog>
  );
};

export default SalaryPayslip;