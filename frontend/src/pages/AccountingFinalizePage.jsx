import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox,
} from '@mui/material';
import LockClockIcon from '@mui/icons-material/LockClock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const COLOR = '#f97316';
const COLOR_DARK = '#ea580c';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(249,115,22,0.12)', borderRadius: '16px',
};

const AccountingFinalizePage = () => {
  const qc = useQueryClient();
  const [selected, setSelected] = useState([]);
  const [msg, setMsg] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['acc-finalize-list'],
    queryFn: () => axiosInstance.get('/accounting/documents/', { params: { status: undefined } }).then(r => r.data),
  });
  const list = (Array.isArray(data) ? data : data?.results || []).filter(d => ['approved', 'submitted'].includes(d.status));

  const finalize = useMutation({
    mutationFn: (ids) => axiosInstance.post('/accounting/documents/bulk_post/', { ids }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['acc-finalize-list'] });
      qc.invalidateQueries({ queryKey: ['accounting-documents'] });
      setSelected([]);
      const errs = res.data?.errors?.length || 0;
      setMsg({ ok: errs === 0, text: errs === 0 ? `${res.data.posted} سند قطعی شد` : `${res.data.posted} قطعی شد، ${errs} خطا` });
      setTimeout(() => setMsg(null), 4000);
    },
    onError: (e) => { setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }); setTimeout(() => setMsg(null), 4000); },
  });

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const allSelected = list.length > 0 && list.every(d => selected.includes(d.id));

  const toggleAll = (e) => setSelected(e.target.checked ? list.map(d => d.id) : []);

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <LockClockIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>قطعی کردن اسناد</Typography>
          <Typography variant="body2" color="textSecondary">ثبت نهایی گروهی اسناد تأییدشده</Typography>
        </Box>
        <Button variant="contained" startIcon={<CheckCircleIcon />} disabled={selected.length === 0 || finalize.isLoading}
          onClick={() => finalize.mutate(selected)}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', px: 3 }}>
          {finalize.isLoading ? <CircularProgress size={20} /> : `قطعی کردن (${selected.length})`}
        </Button>
      </Paper>

      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Paper sx={{ ...glass, p: 2 }}>
        {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox"><Checkbox checked={allSelected} onChange={toggleAll} /></TableCell>
                  <TableCell>شماره</TableCell><TableCell>تاریخ</TableCell><TableCell>شرح</TableCell>
                  <TableCell>وضعیت</TableCell><TableCell>بدهکار/بستانکار</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.length === 0 ? <TableRow><TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>سند تأییدشده/در انتظاری برای قطعی شدن نیست</TableCell></TableRow> :
                list.map(d => (
                  <TableRow key={d.id} hover selected={selected.includes(d.id)}>
                    <TableCell padding="checkbox"><Checkbox checked={selected.includes(d.id)} onChange={() => toggle(d.id)} /></TableCell>
                    <TableCell>{d.number || `#${d.id}`}</TableCell>
                    <TableCell>{toJalali(d.date)}</TableCell>
                    <TableCell sx={{ maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.description}</TableCell>
                    <TableCell>
                      <Chip size="small" label={d.status === 'approved' ? 'تأییدشده' : 'در انتظار'} color={d.status === 'approved' ? 'success' : 'warning'} />
                    </TableCell>
                    <TableCell>{formatPersianNumber(d.total_debit)} / {formatPersianNumber(d.total_credit)}</TableCell>
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

export default AccountingFinalizePage;