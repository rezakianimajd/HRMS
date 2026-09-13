import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Chip, CircularProgress, Table, TableHead, TableRow,
  TableCell, TableBody, FormControl, InputLabel, Select, MenuItem, Button, Alert, IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ReplayIcon from '@mui/icons-material/Replay';
import { formatPersianNumber, toPersianDigits } from '../../utils/numberUtils';
import { toJalali } from '../../utils/dateUtils';

const BaleHistoryPanel = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [resendResult, setResendResult] = useState(null);

  const resend = useMutation({
    mutationFn: () => axiosInstance.post('/notifications/bale-resend-failed/', {}),
    onSuccess: (res) => {
      setResendResult({ ok: true, message: `ط§ط±ط³ط§ظ„ ظ…ط¬ط¯ط¯: ${formatPersianNumber(res.data.sent)} ظ…ظˆظپظ‚طŒ ${formatPersianNumber(res.data.failed)} ظ†ط§ظ…ظˆظپظ‚` });
      qc.invalidateQueries({ queryKey: ['bale-send-logs'] });
    },
    onError: (e) => setResendResult({ ok: false, message: e.response?.data?.error || 'ط®ط·ط§' }),
  });

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
      <Paper sx={{ p: 2, borderRadius: '10px', mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', background: 'rgba(255,255,255,0.6)' }}>
        <Box>
          <Typography variant="caption" color="textSecondary">ع©ظ„ ط§ط±ط³ط§ظ„â€Œظ‡ط§</Typography>
          <Typography variant="h5" fontWeight={800}>{formatPersianNumber(list.length)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="textSecondary">ظ…ظˆظپظ‚</Typography>
          <Typography variant="h5" fontWeight={800} color="success.main">{formatPersianNumber(sentCount)}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="textSecondary">ظ†ط§ظ…ظˆظپظ‚</Typography>
          <Typography variant="h5" fontWeight={800} color="error.main">{formatPersianNumber(failedCount)}</Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle1" fontWeight={800}>طھط§ط±غŒط®ع†ظ‡ظ” ط§ط±ط³ط§ظ„</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" startIcon={<ReplayIcon />} variant="outlined" color="warning"
              onClick={() => resend.mutate()} disabled={resend.isLoading || failedCount === 0}>
              ط§ط±ط³ط§ظ„ ظ…ط¬ط¯ط¯ ظ†ط§ظ…ظˆظپظ‚â€Œظ‡ط§
            </Button>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>ظˆط¶ط¹غŒطھ</InputLabel>
              <Select value={statusFilter} label="ظˆط¶ط¹غŒطھ" onChange={e => setStatusFilter(e.target.value)}>
                <MenuItem value="">ظ‡ظ…ظ‡</MenuItem>
                <MenuItem value="sent">ظ…ظˆظپظ‚</MenuItem>
                <MenuItem value="failed">ظ†ط§ظ…ظˆظپظ‚</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        {resendResult && (
          <Alert severity={resendResult.ok ? 'success' : 'error'} sx={{ mb: 1.5 }} onClose={() => setResendResult(null)}>
            {resendResult.message}
          </Alert>
        )}

        {list.length === 0 ? (
          <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 3 }}>
            ظ‡ظ†ظˆط² ط§ط±ط³ط§ظ„غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ.
          </Typography>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, color: '#475569' } }}>
                  <TableCell>ع¯غŒط±ظ†ط¯ظ‡</TableCell>
                  <TableCell>chat_id</TableCell>
                  <TableCell>ظ‚ط§ظ„ط¨</TableCell>
                  <TableCell>ظ…طھظ†</TableCell>
                  <TableCell>ظˆط¶ط¹غŒطھ</TableCell>
                  <TableCell>ط²ظ…ط§ظ†</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.slice(0, 50).map(l => (
                  <TableRow key={l.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{l.recipient_name || 'â€”'}</TableCell>
                    <TableCell>{toPersianDigits(l.chat_id)}</TableCell>
                    <TableCell>{l.template_title || 'â€”'}</TableCell>
                    <TableCell sx={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.text}</TableCell>
                    <TableCell>
                      {l.status === 'sent' ? (
                        <Chip size="small" color="success" icon={<CheckCircleIcon />} label="ظ…ظˆظپظ‚" />
                      ) : (
                        <Chip size="small" color="error" icon={<CancelIcon />} label="ظ†ط§ظ…ظˆظپظ‚" />
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