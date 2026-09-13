import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Avatar, Divider, Stack,
  FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import CloseIcon from '@mui/icons-material/Close';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { useEmployees } from '../core/hooks/useEmployees';
import { toPersianDigits } from '../core/utils/numberUtils';

/* Supplementary Insurance management: list all employees' insurances,
   with add/edit/delete + dependents. All editing lives here (not profile). */
const emptyForm = {
  id: null,
  employee: '',
  insurance_name: '',
  insurance_type: '',
  plan: '',
  start_date: '',
  end_date: '',
  monthly_amount: 0,
  total_amount: 0,
  dependents: [],
};

const SupplementaryInsurancePage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [depDialog, setDepDialog] = useState(false);
  const [depForm, setDepForm] = useState({ first_name: '', last_name: '', relation: 'spouse' });
  const { data: employees } = useEmployees({ is_active: true });

  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  const { data, isLoading } = useQuery({
    queryKey: ['all-supplementary-insurances'],
    queryFn: () => axiosInstance.get('/supplementary-insurances/').then(r => r.data),
  });
  const items = Array.isArray(data) ? data : data?.results || [];

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (payload.id) {
        return axiosInstance.patch(`/supplementary-insurances/${payload.id}/`, payload);
      }
      const res = await axiosInstance.post('/supplementary-insurances/', payload);
      // create dependents after insurance
      for (const dep of payload.dependents || []) {
        await axiosInstance.post('/supplementary-insurance-dependents/', {
          insurance: res.data.id,
          first_name: dep.first_name,
          last_name: dep.last_name,
          relation: dep.relation,
        });
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-supplementary-insurances'] });
      setOpen(false); setError('');
    },
    onError: (e) => setError(e.response?.data?.detail || 'ط®ط·ط§ ط¯ط± ط°ط®غŒط±ظ‡'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/supplementary-insurances/${id}/`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all-supplementary-insurances'] }),
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
      insurance_name: item.insurance_name || '',
      insurance_type: item.insurance_type || '',
      plan: item.plan || '',
      start_date: item.start_date || '',
      end_date: item.end_date || '',
      monthly_amount: item.monthly_amount ?? 0,
      total_amount: item.total_amount ?? 0,
      dependents: (item.dependents || []).map(d => ({
        id: d.id,
        first_name: d.first_name,
        last_name: d.last_name,
        relation: d.relation,
      })),
    });
    setError('');
    setOpen(true);
  };

  const employeeName = (id) => {
    const e = empList.find(x => x.id === id);
    return e?.full_name || 'â€”';
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2, borderRadius: '10px', border: '1px solid rgba(139,92,246,0.18)',
        background: 'linear-gradient(120deg, rgba(139,92,246,0.07), rgba(255,255,255,0.3))' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 48, height: 48, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}>
              <HealthAndSafetyIcon sx={{ color: '#fff' }} />
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#8b5cf6">ط¨غŒظ…ظ‡ طھع©ظ…غŒظ„غŒ</Typography>
              <Typography variant="body2" color="textSecondary">
                ظ…ط¯غŒط±غŒطھ ط¨غŒظ…ظ‡ظ‡ط§غŒ طھع©ظ…غŒظ„غŒ ع©ظ„غŒظ‡ ظ¾ط±ط³ظ†ظ„ â€” ط§ظپط²ظˆط¯ظ†طŒ ظˆغŒط±ط§غŒط´طŒ ط§ظپط±ط§ط¯ طھط­طھ طھع©ظپظ„
              </Typography>
            </Box>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={openAdd}
            sx={{ background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)', borderRadius: '10px' }}>
            ط§ظپط²ظˆط¯ظ† ط¨غŒظ…ظ‡ طھع©ظ…غŒظ„غŒ
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '10px' }}>
        {isLoading ? (
          <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography color="textSecondary">ط¨غŒظ…ظ‡ طھع©ظ…غŒظ„غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ</Typography>
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(139,92,246,0.06)' }}>
                <TableCell sx={{ fontWeight: 700 }}>ظ¾ط±ط³ظ†ظ„</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ط¨غŒظ…ظ‡</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ط·ط±ط­</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>ط§ط²</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>طھط§</TableCell>
                <TableCell align="left" sx={{ fontWeight: 700 }}>طھط­طھ طھع©ظپظ„</TableCell>
                <TableCell align="left" width={100} sx={{ fontWeight: 700 }}>ط§ظ‚ط¯ط§ظ…ط§طھ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((ins) => (
                <TableRow key={ins.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: '#8b5cf6', fontSize: 12 }}>
                        {(ins.employee_name || 'طں').charAt(0)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{ins.employee_name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {toPersianDigits(ins.employee_code || '')}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="body2">{ins.insurance_name}</Typography></TableCell>
                  <TableCell>
                    <Chip size="small" label={ins.plan || ins.insurance_type || 'â€”'} variant="outlined"
                      sx={{ color: '#8b5cf6', borderColor: '#8b5cf6' }} />
                  </TableCell>
                  <TableCell><Typography variant="body2">{ins.start_date || 'â€”'}</Typography></TableCell>
                  <TableCell><Typography variant="body2">{ins.end_date || 'â€”'}</Typography></TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {(ins.dependents || []).length > 0
                        ? ins.dependents.map(d => `${d.first_name} ${d.last_name}`).join('طŒ ')
                        : 'â€”'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={() => openEdit(ins)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error"
                      onClick={() => { if (window.confirm('ط­ط°ظپ ط§غŒظ† ط¨غŒظ…ظ‡ طھع©ظ…غŒظ„غŒطں')) deleteMutation.mutate(ins.id); }}>
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
        <DialogTitle sx={{ color: '#8b5cf6' }}>
          {editing ? 'ظˆغŒط±ط§غŒط´ ط¨غŒظ…ظ‡ طھع©ظ…غŒظ„غŒ' : 'ط§ظپط²ظˆط¯ظ† ط¨غŒظ…ظ‡ طھع©ظ…غŒظ„غŒ'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl fullWidth size="small">
            <InputLabel>ظ¾ط±ط³ظ†ظ„ *</InputLabel>
            <Select
              value={form.employee || ''}
              label="ظ¾ط±ط³ظ†ظ„ *"
              onChange={e => setForm(p => ({ ...p, employee: e.target.value }))}
            >
              {empList.map(e => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth size="small" label="ظ†ط§ظ… ط¨غŒظ…ظ‡ طھع©ظ…غŒظ„غŒ *" required
            value={form.insurance_name}
            onChange={e => setForm(p => ({ ...p, insurance_name: e.target.value }))} />
          <TextField fullWidth size="small" label="ظ†ظˆط¹ ط¨غŒظ…ظ‡" value={form.insurance_type}
            onChange={e => setForm(p => ({ ...p, insurance_type: e.target.value }))} />
          <TextField fullWidth size="small" label="ط·ط±ط­ ط§ظ†طھط®ط§ط¨غŒ" value={form.plan}
            onChange={e => setForm(p => ({ ...p, plan: e.target.value }))} />
          <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ط´ط±ظˆط¹" value={form.start_date}
            onChange={g => setForm(p => ({ ...p, start_date: g }))} />
          <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ط®ط§طھظ…ظ‡" value={form.end_date}
            onChange={g => setForm(p => ({ ...p, end_date: g }))} />
          <TextField fullWidth size="small" label="ظ…ط¨ظ„ط؛ ظ…ط§ظ‡ط§ظ†ظ‡ (ط±غŒط§ظ„)" type="number" value={form.monthly_amount}
            onChange={e => setForm(p => ({ ...p, monthly_amount: Number(e.target.value) }))} />
          <TextField fullWidth size="small" label="ظ…ط¨ظ„ط؛ ع©ظ„ (ط±غŒط§ظ„)" type="number" value={form.total_amount}
            onChange={e => setForm(p => ({ ...p, total_amount: Number(e.target.value) }))} />

          <Divider />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" color="#8b5cf6">ط§ظپط±ط§ط¯ طھط­طھ طھع©ظپظ„</Typography>
            <Button size="small" startIcon={<AddIcon />}
              onClick={() => { setDepForm({ first_name: '', last_name: '', relation: 'spouse' }); setDepDialog(true); }}>
              ط§ظپط²ظˆط¯ظ† ظپط±ط¯
            </Button>
          </Box>
          {(form.dependents || []).map((dep, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {dep.first_name} {dep.last_name} ({dep.relation})
              </Typography>
              <IconButton size="small" color="error"
                onClick={() => setForm(p => ({ ...p, dependents: p.dependents.filter((_, idx) => idx !== i) }))}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" sx={{ background: '#8b5cf6' }}
            disabled={!form.employee || !form.insurance_name}
            onClick={() => saveMutation.mutate({ ...form, employee: Number(form.employee), dependents: (form.dependents || []) })}>
            {editing ? 'ط°ط®غŒط±ظ‡ طھط؛غŒغŒط±ط§طھ' : 'ط§ظپط²ظˆط¯ظ†'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dependent dialog */}
      <Dialog open={depDialog} onClose={() => setDepDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#8b5cf6' }}>ظپط±ط¯ طھط­طھ طھع©ظپظ„</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="ظ†ط§ظ…" value={depForm.first_name}
            onChange={e => setDepForm(p => ({ ...p, first_name: e.target.value }))} />
          <TextField fullWidth size="small" label="ظ†ط§ظ… ط®ط§ظ†ظˆط§ط¯ع¯غŒ" value={depForm.last_name}
            onChange={e => setDepForm(p => ({ ...p, last_name: e.target.value }))} />
          <FormControl fullWidth size="small">
            <InputLabel>ظ†ط³ط¨طھ</InputLabel>
            <Select value={depForm.relation} label="ظ†ط³ط¨طھ" onChange={e => setDepForm(p => ({ ...p, relation: e.target.value }))}>
              <MenuItem value="spouse">ظ‡ظ…ط³ط±</MenuItem>
              <MenuItem value="child">ظپط±ط²ظ†ط¯</MenuItem>
              <MenuItem value="father">ظ¾ط¯ط±</MenuItem>
              <MenuItem value="mother">ظ…ط§ط¯ط±</MenuItem>
              <MenuItem value="other">ط³ط§غŒط±</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" sx={{ background: '#8b5cf6' }}
            onClick={() => {
              if (!depForm.first_name || !depForm.last_name) return;
              setForm(p => ({ ...p, dependents: [...(p.dependents || []), depForm] }));
              setDepDialog(false);
            }}>
            ط§ظپط²ظˆط¯ظ†
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SupplementaryInsurancePage;