import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Chip, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';

/* P5: دفترچه فعالیت — نمایش لاگهای سیستم فعلی (Audit) */
const AuditPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => axiosInstance.get('/audit-logs/').then(r => r.data),
  });
  const logs = Array.isArray(data) ? data : data?.results || [];

  return (
    <Box>
      <Paper sx={{
        p: 3, mb: 2.5, borderRadius: 3,
        background: 'linear-gradient(120deg, rgba(139,92,246,0.10), rgba(139,92,246,0.02), rgba(255,255,255,0.3))',
        border: '1px solid rgba(139,92,246,0.18)',
        display: 'flex', alignItems: 'center', gap: 2,
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
          <HistoryIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800}>دفترچه فعالیت (Audit)</Typography>
          <Typography variant="body2" color="textSecondary">
            پیگیری لاگ اقدامات کاربران در سیستم
          </Typography>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        ) : logs.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><Typography color="textSecondary">فعالیتی ثبت نشده است</Typography></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(139,92,246,0.06)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>کاربر</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>اقدام</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>مدل</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>شرح</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>تاریخ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((l, i) => (
                  <TableRow key={l.id || i} hover>
                    <TableCell>{l.user || '—'}</TableCell>
                    <TableCell><Chip size="small" label={l.action || '—'} variant="outlined" /></TableCell>
                    <TableCell>{l.model_name || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 340 }}>
                      <Typography variant="body2" noWrap>{l.description || ''}</Typography>
                    </TableCell>
                    <TableCell>{l.timestamp ? String(l.timestamp).slice(0, 16) : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
};

export default AuditPage;