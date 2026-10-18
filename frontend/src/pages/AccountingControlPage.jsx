import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Grid, Stack, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import WarningIcon from '@mui/icons-material/Warning';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import PageHeader from '../core/components/ui/PageHeader';
import InfoCard from '../core/components/ui/InfoCard';
import { toJalali } from '../core/utils/dateUtils';

const COLOR = '#14b8a6';
const COLOR_DARK = '#0d9488';

const glass = {
  background: '#ffffff',
  border: '1px solid rgba(15,23,42,0.07)',
  boxShadow: 'none',
  borderRadius: '16px',
};

const StatCard = ({ icon, label, value, color }) => (
  <InfoCard icon={icon} label={label} value={value} color={color} />
);

const DocTable = ({ title, rows, color, emptyText }) => (
  <Paper sx={{ ...glass, p: 2, mb: 2 }}>
    <Typography variant="subtitle2" fontWeight={800} sx={{ color: color || COLOR_DARK, mb: 1 }}>{title} ({rows.length})</Typography>
    {rows.length === 0 ? <Typography variant="body2" color="textSecondary">{emptyText}</Typography> : (
      <TableContainer>
        <Table size="small">
          <TableHead><TableRow><TableCell>شماره</TableCell><TableCell>تاریخ</TableCell><TableCell>شرح</TableCell><TableCell>بدهکار</TableCell><TableCell>بستانکار</TableCell><TableCell>تفاوت</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map(r => {
              const diff = Math.abs(Number(r.total_debit) - Number(r.total_credit));
              return (
                <TableRow key={r.id} hover>
                  <TableCell>{r.number}</TableCell>
                  <TableCell>{toJalali(r.date)}</TableCell>
                  <TableCell sx={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.description}</TableCell>
                  <TableCell>{formatPersianNumber(r.total_debit)}</TableCell>
                  <TableCell>{formatPersianNumber(r.total_credit)}</TableCell>
                  <TableCell>{diff > 0 ? <Chip size="small" color="error" label={formatPersianNumber(diff)} /> : <Chip size="small" color="success" label="✔" />}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </Paper>
);

const AccountingControlPage = () => {
  const { data, isLoading } = useQuery({ queryKey: ['acc-control'], queryFn: () => axiosInstance.get('/accounting/documents/control/').then(r => r.data) });
  const d = data || {};

  if (isLoading) return <Box textAlign="center" py={6}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader icon={<FactCheckIcon />} title="کنترل اسناد" />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}><StatCard icon={<WarningIcon />} label="نامتوازن" value={d.counts?.unbalanced || 0} color="#ef4444" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<PendingActionsIcon />} label="در انتظار تأیید" value={d.counts?.pending || 0} color="#f59e0b" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<CheckCircleIcon />} label="آمادهٔ ثبت" value={d.counts?.ready_to_post || 0} color="#10b981" /></Grid>
        <Grid item xs={6} sm={3}><StatCard icon={<FactCheckIcon />} label="قطعی‌شده" value={d.counts?.posted || 0} color="#3b82f6" /></Grid>
      </Grid>

      <DocTable title="اسناد نامتوازن" rows={d.unbalanced || []} color="#ef4444" emptyText="هیچ سند نامتوازنی وجود ندارد" />
      <DocTable title="در انتظار تأیید" rows={d.pending || []} color="#f59e0b" emptyText="سندی در انتظار تأیید نیست" />
      <DocTable title="آمادهٔ ثبت نهایی" rows={d.ready_to_post || []} color="#10b981" emptyText="سند آمادهٔ ثبتی نیست" />
    </Box>
  );
};

export default AccountingControlPage;