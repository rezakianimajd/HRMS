import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Chip, CircularProgress, Table, TableHead, TableRow,
  TableCell, TableBody, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { formatPersianNumber, toPersianDigits } from '../../utils/numberUtils';
import { toJalali } from '../../utils/dateUtils';

const BaleHistoryPanel = () => {
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['bale-send-logs', statusFilter],
    queryFn: () =>
      axiosInstance.get('/bale-send-logs/', { params: statusFilter ? { status: statusFilter } : {} }).then(r => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  const sentCount = list.filter(x => x.status === 'sent').length;
  const failedCount = list.filter(x => x.status === 'failed').length;

  return (
    <Box>
      {/* Summary */}
      <Paper sx={{ p: 2, borderRadius: 3, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', background: 'rgba(255,255,255,0.6)' }}>
        <Box>
          <Typography variant="caption" color="textSecondary">کل ارسال‌ها</Typography>
          <Typography variant="h5" fontWeight={800}>{formatPersianNumber(list.length)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="textSecondary">موفق</Typography>
          <Typography variant="h5" fontWeight={800} color="success.main">{formatPersianNumber(sentCount)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="textSecondary">ناموفق</Typography>
          <Typography variant="h5" fontWeight={800} color="error.main">{formatPersianNumber(failedCount)}</Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.6)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="subtitle1" fontWeight={800}>تاریخچهٔ ارسال</Typography>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>وضعیت</InputLabel>
            <Select value={statusFilter} label="وضعیت" onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value="">همه</MenuItem>
              <MenuItem value="sent">موفق</MenuItem>
              <MenuItem value="failed">ناموفق</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {list.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
            هنوز ارسالی ثبت نشده است.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, color: '#475569' } }}>
                  <TableCell>گیرنده</TableCell>
                  <TableCell>chat_id</TableCell>
                  <TableCell>قالب</TableCell>
                  <TableCell>متن</TableCell>
                  <TableCell>وضعیت</TableCell>
                  <TableCell>زمان</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.slice(0, 50).map(l => (
                  <TableRow key={l.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{l.recipient_name || '—'}</TableCell>
                    <TableCell>{toPersianDigits(l.chat_id)}</TableCell>
                    <TableCell>{l.template_title || '—'}</TableCell>
                    <TableCell sx={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.text}</TableCell>
                    <TableCell>
                      {l.status === 'sent' ? (
                        <Chip size="small" color="success" icon={<CheckCircleIcon />} label="موفق" />
                      ) : (
                        <Chip size="small" color="error" icon={<CancelIcon />} label="ناموفق" />
                      )}
                    </TableCell>
                    <TableCell>{toJalali(l.created_at?.slice(0, 10))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default BaleHistoryPanel;