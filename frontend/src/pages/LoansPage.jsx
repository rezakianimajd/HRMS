import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Avatar, Alert,
  FormControl, InputLabel, Select, MenuItem, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { useEmployees } from '../core/hooks/useEmployees';
import { toPersianDigits, formatPersianNumber } from '../core/utils/numberUtils';

const emptyForm = {
  id: null,
  employee: '',
  loan_type: 'qarz',
  amount: 0,
  installment_count: 1,
  installment_amount: 0,
  grant_date: '',
  due_date: '',
  status: 'active',
  description: '',
};

const LOAN_TYPES = [
  { value: 'qarz', label: 'ظˆط§ظ… ظ‚ط±ط¶â€Œط§ظ„ط­ط³ظ†ظ‡' },
  { value: 'car', label: 'ظˆط§ظ… ط®ظˆط¯ط±ظˆ' },
  { value: 'housing', label: 'ظˆط§ظ… ظ…ط³ع©ظ†' },
  { value: 'urgent', label: 'ظˆط§ظ… ط¶ط±ظˆط±غŒ' },
  { value: 'other', label: 'ط³ط§غŒط±' },
];

const STATUS_COLORS = {
  active: '#10b981',
  paid: '#3b82f6',
  cancelled: '#ef4444',
};

const LoansPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data: employees } = useEmployees({ is_active: true });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  const { data, isLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: () => axiosInstance.get('/loans/').then(r => r.data),
  });
  const items = Array.isArray(data) ? data : data?.results || [];

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      payload.id
        ? axiosInstance.patch(`/loans/${payload.id}/`, payload)
        : axiosInstance.post('/loans/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setOpen(false); setError('');
    },
    onError: (e) => setError(e.response?.data?.detail || 'ط®ط·ط§ ط¯ط± ط°ط®غŒط±ظ‡'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/loans/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loans'] }),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      id: item.id,
      employee: item.employee,
      loan_type: item.loan_type || 'qarz',
      amount: Number(item.amount || 0),
      installment_count: Number(item.installment_count || 1),
      installment_amount: Number(item.installment_amount || 0),
      grant_date: item.grant_date || '',
      due_date: item.due_date || '',
      status: item.status || 'active',
      description: item.description || '',
    });
    setError('');
    setOpen(true);
  };

  const statusValue = (item) => {
    if (item.status === 'paid') return 'طھط³ظˆغŒظ‡â€Œط´ط¯ظ‡';
    if (item.status === 'cancelled') return 'ظ„ط؛ظˆ ط´ط¯ظ‡';
    if (item.loan_type === 'active') return 'ظپط¹ط§ظ„';
    return item.status_display || 'â€”';
  };

  const loanTypeLabel = (v) => (LOAN_TYPES.find(x => x.value === v)?.label || v);

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2, borderRadius: '10px', border: '1px solid rgba(16,185,129,0.18)',
        background: 'linear-gradient(120deg, rgba(16,185,129,0.07), rgba(255,255,255,0.3))' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 48, height: 48, background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <AccountBalanceWalletIcon sx={{ color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#10b981">ظˆط§ظ… ظˆ طھط³ظ‡غŒظ„ط§طھ</Typography>
              <Typography variant="body2" color="textSecondary">
                ظ…ط¯غŒط±غŒطھ ظˆط§ظ…ظ‡ط§غŒ ظ¾ط±ط¯ط§ط®طھâ€Œط´ط¯ظ‡ ط¨ظ‡ ظ¾ط±ط³ظ†ظ„ â€” ظ…ط¨ظ„ط؛طŒ ط§ظ‚ط³ط§ط·طŒ ط³ط±ط±ط³غŒط¯ ظˆ ظˆط¶ط¹غŒطھ
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '10px' }}>
            ط«ط¨طھ ظˆط§ظ… ط¬ط¯غŒط¯
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
        {isLoading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography color="textSecondary">ظˆط§ظ… غŒط§ طھط³ظ‡غŒظ„ط§طھغŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(16,185,129,0.06)' }}>
                <TableCell sx={{ fontWeight: 700 }}>ظ¾ط±ط³ظ†ظ„</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ظ†ظˆط¹ ظˆط§ظ…</TableCell>
                <TableCell align="left" sx={{ fontWeight: 700 }}>ظ…ط¨ظ„ط؛ ع©ظ„</TableCell>
                <TableCell align="left" sx={{ fontWeight: 700 }}>ط§ظ‚ط³ط§ط·</TableCell>
                <TableCell align="left" sx={{ fontWeight: 700 }}>ظ…ط¨ظ„ط؛ ظ‚ط³ط·</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>طھط§ط±غŒط® ط§ط¹ط·ط§</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ظˆط¶ط¹غŒطھ</TableCell>
                <TableCell align="left" width={100} sx={{ fontWeight: 700 }}>ط§ظ‚ط¯ط§ظ…ط§طھ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((loan) => (
                <TableRow key={loan.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: '#10b981', fontSize: 12 }}>
                        {(loan.employee_name || 'طں').charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{loan.employee_name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {toPersianDigits(loan.employee_code || '')}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {loan.loan_type_display || loanTypeLabel(loan.loan_type)}
                    </Typography>
                    {loan.description && (
                      <Typography variant="caption" color="textSecondary" display="block" noWrap>
                        {loan.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="body2" fontWeight={600}>{formatPersianNumber(loan.amount)}</Typography>
                  </TableCell>
                  <TableCell align="left">{toPersianDigits(loan.installment_count)} ظ‚ط³ط·</TableCell>
                  <TableCell align="left">{formatPersianNumber(loan.installment_amount)}</TableCell>
                  <TableCell><Typography variant="body2">{loan.grant_date || 'â€”'}</Typography></TableCell>
                  <TableCell>
                    <Chip size="small"
                      label={loan.status_display || statusValue(loan)}
                      sx={{
                        color: '#fff',
                        bgcolor: STATUS_COLORS[loan.status] || '#10b981',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={() => openEdit(loan)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error"
                      onClick={() => { if (window.confirm('ط­ط°ظپ ط§غŒظ† ظˆط§ظ…طں')) deleteMutation.mutate(loan.id); }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Add / Edit dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#10b981' }}>
          {editing ? 'ظˆغŒط±ط§غŒط´ ظˆط§ظ…' : 'ط«ط¨طھ ظˆط§ظ… ط¬ط¯غŒط¯'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>ظ¾ط±ط³ظ†ظ„ *</InputLabel>
            <Select value={form.employee || ''} label="ظ¾ط±ط³ظ†ظ„ *"
              onChange={e => setForm(p => ({ ...p, employee: e.target.value }))}>
              {empList.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel>ظ†ظˆط¹ ظˆط§ظ…</InputLabel>
            <Select value={form.loan_type} label="ظ†ظˆط¹ ظˆط§ظ…"
              onChange={e => setForm(p => ({ ...p, loan_type: e.target.value }))}>
              {LOAN_TYPES.map(lt => <MenuItem key={lt.value} value={lt.value}>{lt.label}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField fullWidth size="small" label="ظ…ط¨ظ„ط؛ ع©ظ„ ظˆط§ظ… (ط±غŒط§ظ„) *" type="number" required
            value={form.amount}
            onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} />

          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField fullWidth size="small" label="طھط¹ط¯ط§ط¯ ط§ظ‚ط³ط§ط·" type="number"
              value={form.installment_count}
              onChange={e => setForm(p => ({ ...p, installment_count: Number(e.target.value) }))} />
            <TextField fullWidth size="small" label="ظ…ط¨ظ„ط؛ ظ‡ط± ظ‚ط³ط· (ط±غŒط§ظ„)" type="number"
              value={form.installment_amount}
              onChange={e => setForm(p => ({ ...p, installment_amount: Number(e.target.value) }))} />
          </Box>

          <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ط§ط¹ط·ط§غŒ ظˆط§ظ…" value={form.grant_date}
            onChange={g => setForm(p => ({ ...p, grant_date: g }))} />
          <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ط³ط±ط±ط³غŒط¯ (ط§ط®طھغŒط§ط±غŒ)" value={form.due_date}
            onChange={g => setForm(p => ({ ...p, due_date: g }))} />

          <FormControl fullWidth size="small">
            <InputLabel>ظˆط¶ط¹غŒطھ</InputLabel>
            <Select value={form.status} label="ظˆط¶ط¹غŒطھ"
              onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <MenuItem value="active">ظپط¹ط§ظ„</MenuItem>
              <MenuItem value="paid">طھط³ظˆغŒظ‡â€Œط´ط¯ظ‡</MenuItem>
              <MenuItem value="cancelled">ظ„ط؛ظˆ ط´ط¯ظ‡</MenuItem>
            </Select>
          </FormControl>

          <TextField fullWidth size="small" label="ط´ط±ط­ / ع©ط§ط±ط¨ط±غŒ" multiline rows={2}
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" sx={{ background: '#10b981' }}
            disabled={!form.employee || !form.amount}
            onClick={() => saveMutation.mutate({ ...form, employee: Number(form.employee) })}>
            {editing ? 'ط°ط®غŒط±ظ‡ طھط؛غŒغŒط±ط§طھ' : 'ط«ط¨طھ ظˆط§ظ…'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoansPage;