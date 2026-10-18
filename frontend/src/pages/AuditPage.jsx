import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, CircularProgress, Chip, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { PageHeader, SURFACE, SOFT } from '../core/components/settings/settingsUi';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const formatStamp = (value) => {
  if (!value) return '—';
  const raw = String(value);
  const jalali = toJalali(raw.slice(0, 10));
  const time = raw.slice(11, 16);
  return time ? `${jalali} - ${toPersianDigits(time)}` : jalali;
};

/* P5: دفترچه فعالیت — نمایش لاگ‌های سیستم فعلی (Audit) */
const AuditPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => axiosInstance.get('/audit-logs/').then(r => r.data),
  });
  const logs = Array.isArray(data) ? data : data?.results || [];

  return (
    <Box>
      <PageHeader
        icon={<HistoryIcon />}
        title="دفترچه فعالیت"
        color={SOFT.slate}
      />

      <Paper sx={{ ...SURFACE, overflow: 'hidden' }}>
        <Box sx={{
          px: 1.75, py: 1.25,
          borderBottom: '1px solid', borderColor: 'divider',
          background: `linear-gradient(135deg, ${SOFT.slate}14, transparent)`,
        }}>
          <Stack direction="row" spacing={1.25} alignItems="center" useFlexGap>
            <Avatar variant="rounded" sx={{
              width: 30, height: 30, borderRadius: '9px',
              bgcolor: `${SOFT.slate}24`, color: SOFT.slate,
            }}>
              <HistoryIcon sx={{ fontSize: 17 }} />
            </Avatar>
            <Typography sx={{ fontSize: 16, fontWeight: 400 }}>فعالیت‌ها</Typography>
            <Chip
              size="small"
              label={`${formatPersianNumber(logs.length)} فعالیت`}
              sx={{
                height: 20, fontSize: 10, fontWeight: 800,
                bgcolor: `${SOFT.slate}1f`, color: SOFT.slate,
              }}
            />
          </Stack>
        </Box>

        {isLoading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        ) : logs.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>فعالیتی ثبت نشده است</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small" sx={{ '& td': { fontSize: 11, py: 1 } }}>
              <TableHead>
                <TableRow sx={{
                  '& th': {
                    bgcolor: 'rgba(100,116,139,0.05)', fontSize: 10.5,
                    fontWeight: 800, textAlign: 'center',
                  },
                }}>
                  <TableCell align="center" sx={{ fontWeight: 700, textAlign: 'center' }}>کاربر</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, textAlign: 'center' }}>اقدام</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, textAlign: 'center' }}>مدل</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, textAlign: 'center' }}>شرح</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, textAlign: 'center' }}>تاریخ</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((l, i) => (
                  <TableRow key={l.id || i} hover>
                    <TableCell>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
                        {l.user_full_name || l.user_username || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={l.action_display || l.action || '—'} variant="outlined"
                        sx={{ height: 20, fontSize: 10, fontWeight: 700, color: SOFT.slate, borderColor: `${SOFT.slate}55` }} />
                    </TableCell>
                    <TableCell align="center">
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }} noWrap>
                        {l.model_display || l.model_name || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 340 }}>
                      <Typography sx={{ fontSize: 11 }} noWrap>{l.description || ''}</Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                      <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                        {formatStamp(l.timestamp)}
                      </Typography>
                    </TableCell>
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
