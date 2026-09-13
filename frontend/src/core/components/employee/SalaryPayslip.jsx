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
  '1': 'ظپط±ظˆط±ط¯غŒظ†', '2': 'ط§ط±ط¯غŒط¨ظ‡ط´طھ', '3': 'ط®ط±ط¯ط§ط¯', '4': 'طھغŒط±',
  '5': 'ظ…ط±ط¯ط§ط¯', '6': 'ط´ظ‡ط±غŒظˆط±', '7': 'ظ…ظ‡ط±', '8': 'ط¢ط¨ط§ظ†',
  '9': 'ط¢ط°ط±', '10': 'ط¯غŒ', '11': 'ط¨ظ‡ظ…ظ†', '12': 'ط§ط³ظپظ†ط¯',
};

const EARNING_ITEMS = [
  { key: 'base_salary', label: 'ط­ظ‚ظˆظ‚ ظ¾ط§غŒظ‡', color: '#6366f1' },
  { key: 'overtime_pay', label: 'ط§ط¶ط§ظپظ‡â€Œع©ط§ط±غŒ', color: '#6366f1' },
  { key: 'night_shift', label: 'ط´ط¨â€Œع©ط§ط±غŒ', color: '#6366f1' },
  { key: 'shift_work', label: 'ظ†ظˆط¨طھâ€Œع©ط§ط±غŒ', color: '#6366f1' },
  { key: 'attraction_allowance', label: 'ط­ظ‚ ط¬ط°ط¨', color: '#6366f1' },
  { key: 'supervision_allowance', label: 'ط­ظ‚ ط³ط±ظ¾ط±ط³طھغŒ', color: '#6366f1' },
  { key: 'workshop_mission', label: 'ظ…ط§ظ…ظˆط±غŒطھ ع©ط§ط±ع¯ط§ظ‡غŒ', color: '#6366f1' },
  { key: 'seniority_base', label: 'ظ¾ط§غŒظ‡ ط³ظ†ظˆط§طھ', color: '#6366f1' },
  { key: 'job_allowance', label: 'ظپظˆظ‚â€Œط§ظ„ط¹ط§ط¯ظ‡ ط´ط؛ظ„', color: '#6366f1' },
  { key: 'hardship_allowance', label: 'ط³ط®طھغŒ ع©ط§ط±', color: '#6366f1' },
  { key: 'travel_cost', label: 'ظ‡ط²غŒظ†ظ‡ ط³ظپط±', color: '#6366f1' },
  { key: 'housing_allowance', label: 'ط­ظ‚ ظ…ط³ع©ظ†', color: '#6366f1' },
  { key: 'marriage_allowance', label: 'ط­ظ‚ طھط£ظ‡ظ„', color: '#6366f1' },
  { key: 'children_allowance', label: 'ط­ظ‚ ط§ظˆظ„ط§ط¯', color: '#6366f1' },
  { key: 'meal_voucher', label: 'ط¨ظ† ع©ط§ط±ع©ظ†ط§ظ†', color: '#6366f1' },
  { key: 'deferred_salary_1', label: 'ط­ظ‚ظˆظ‚ ظ…ط¹ظˆظ‚ظ‡ غ±', color: '#6366f1' },
  { key: 'deferred_salary_2', label: 'ط­ظ‚ظˆظ‚ ظ…ط¹ظˆظ‚ظ‡ غ²', color: '#6366f1' },
  { key: 'bonus_reserve', label: 'ط¹غŒط¯غŒ ظˆ ط°ط®غŒط±ظ‡', color: '#6366f1' },
  { key: 'other_benefits', label: 'ط³ط§غŒط± ظ…ط²ط§غŒط§', color: '#6366f1' },
  { key: 'mission_allowance', label: 'ط­ظ‚ ظ…ط£ظ…ظˆط±غŒطھ', color: '#6366f1' },
];

const DEDUCTION_ITEMS = [
  { key: 'employee_insurance', label: 'ط­ظ‚ ط¨غŒظ…ظ‡ ط³ظ‡ظ… ظ¾ط±ط³ظ†ظ„', color: '#ef4444' },
  { key: 'tax', label: 'ظ…ط§ظ„غŒط§طھ', color: '#ef4444' },
  { key: 'advance', label: 'ظ…ط³ط§ط¹ط¯ظ‡', color: '#ef4444' },
  { key: 'supplementary_insurance', label: 'ط¨غŒظ…ظ‡ طھع©ظ…غŒظ„غŒ', color: '#ef4444' },
  { key: 'employee_loan', label: 'ظˆط§ظ… ع©ط§ط±ع©ظ†ط§ظ†', color: '#ef4444' },
  { key: 'work_deduction', label: 'ع©ط³ط± ع©ط§ط±', color: '#ef4444' },
];

const SalaryPayslip = ({ record, onClose }) => {
  const { data: profile } = useQuery({
    queryKey: ['company-profile-layout'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then(r => r.data).catch(() => null),
  });

  const companyName = profile?.legal_name || profile?.company_name || 'ط´ط±ع©طھ';
  const r = record || {};

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open fullWidth maxWidth="md" onClose={onClose}>
      {/* Print-only toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 1, borderBottom: '1px solid #eef2f7', '@media print': { display: 'none' } }}>
        <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint} size="small">
          ع†ط§ظ¾ / PDF
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
                <Typography variant="caption" color="textSecondary">ظپغŒط´ ط­ظ‚ظˆظ‚غŒ ظ…ط§ظ‡ط§ظ†ظ‡</Typography>
              </Box>
            </Box>
            <Box sx={{ textAlign: 'left' }}>
              <Typography variant="body1" fontWeight={700} color="primary.main">
                {toPersianDigits(r.year)} {MONTH_NAMES[r.month] || r.month}
              </Typography>
              <Typography variant="caption" color="textSecondary">ط³ط§ظ„ / ظ…ط§ظ‡</Typography>
            </Box>
          </Box>

          {/* Employee info strip */}
          <Grid container spacing={1.5} sx={{ mb: 2, p: 2, bgcolor: 'rgba(99,102,241,0.04)', borderRadius: '10px' }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary" display="block">ظ†ط§ظ… ظˆ ظ†ط§ظ… ط®ط§ظ†ظˆط§ط¯ع¯غŒ</Typography>
              <Typography variant="body2" fontWeight={700}>{r.employee_name}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary" display="block">ع©ط¯ ظ¾ط±ط³ظ†ظ„غŒ</Typography>
              <Typography variant="body2" fontWeight={700}>{toPersianDigits(r.employee_code)}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary" display="block">ع©ط§ط±ع©ط±ط¯ (ط±ظˆط²)</Typography>
              <Typography variant="body2" fontWeight={700}>{formatPersianNumber(r.work_days)}</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary" display="block">ط³ط§ط¹طھ ط§ط¶ط§ظپظ‡â€Œع©ط§ط±</Typography>
              <Typography variant="body2" fontWeight={700}>{formatPersianNumber(r.overtime_hours)}</Typography>
            </Grid>
          </Grid>

          {/* Earnings table */}
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#6366f1', mb: 1 }}>
            ط­ظ‚ظˆظ‚ ظˆ ظ…ط²ط§غŒط§
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: '10px' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(99,102,241,0.08)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>ط¹ظ†ظˆط§ظ†</TableCell>
                  <TableCell align="left" sx={{ fontWeight: 700 }}>ظ…ط¨ظ„ط؛ (ط±غŒط§ظ„)</TableCell>
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
                  <TableCell sx={{ fontWeight: 800 }}>ط¬ظ…ط¹ ط­ظ‚ظˆظ‚ ظˆ ظ…ط²ط§غŒط§</TableCell>
                  <TableCell align="left" sx={{ fontWeight: 800, color: '#6366f1' }}>{formatPersianNumber(r.total_benefits)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Insurance */}
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#10b981', mb: 1 }}>
            ط¨غŒظ…ظ‡
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: '10px' }}>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>ظ…ط´ظ…ظˆظ„ ط¨غŒظ…ظ‡</TableCell>
                  <TableCell align="left">{formatPersianNumber(r.insurance_subject)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>ط­ظ‚ ط¨غŒظ…ظ‡ ط³ظ‡ظ… ع©ط§ط±ظپط±ظ…ط§</TableCell>
                  <TableCell align="left">{formatPersianNumber(r.employer_insurance)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>ط­ظ‚ ط¨غŒظ…ظ‡ ط³ظ‡ظ… ظ¾ط±ط³ظ†ظ„</TableCell>
                  <TableCell align="left">{formatPersianNumber(r.employee_insurance)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Deductions table */}
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#ef4444', mb: 1 }}>
            ع©ط³ظˆط±ط§طھ
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, borderRadius: '10px' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(239,68,68,0.08)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>ط¹ظ†ظˆط§ظ†</TableCell>
                  <TableCell align="left" sx={{ fontWeight: 700 }}>ظ…ط¨ظ„ط؛ (ط±غŒط§ظ„)</TableCell>
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
                  <TableCell sx={{ fontWeight: 800 }}>ط¬ظ…ط¹ ع©ط³ظˆط±</TableCell>
                  <TableCell align="left" sx={{ fontWeight: 800, color: '#ef4444' }}>{formatPersianNumber(r.total_deductions)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Summary */}
          <Box sx={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            p: 2.5, borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'rgba(255,255,255,0.9)' }}>
              ظ…ط¨ظ„ط؛ ظ‚ط§ط¨ظ„ ظ¾ط±ط¯ط§ط®طھ
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#fff' }}>
              {formatPersianNumber(r.net_payable)} ط±غŒط§ظ„
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