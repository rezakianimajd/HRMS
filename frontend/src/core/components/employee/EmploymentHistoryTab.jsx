import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Paper, Grid, Chip, CircularProgress, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Avatar, Divider, Stack,
} from '@mui/material';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import DescriptionIcon from '@mui/icons-material/Description';
import AddIcon from '@mui/icons-material/Add';
import { toJalali } from '../../utils/dateUtils';
import { toPersianDigits, formatPersianNumber } from '../../utils/numberUtils';
import JalaliDatePicker from '../ui/JalaliDatePicker';

const CHANGE_TYPES = [
  { value: 'hire', label: 'ط§ط³طھط®ط¯ط§ظ…', color: '#6366f1' },
  { value: 'promotion', label: 'ط§ط±طھظ‚ط§ / طھط±ظپغŒط¹', color: '#10b981' },
  { value: 'demotion', label: 'طھظ†ط²ظ„ ظ…ظ‚ط§ظ…', color: '#ef4444' },
  { value: 'job_title_change', label: 'طھط؛غŒغŒط± ط¹ظ†ظˆط§ظ† ط´ط؛ظ„غŒ', color: '#3b82f6' },
  { value: 'department_change', label: 'طھط؛غŒغŒط± ط¯ظ¾ط§ط±طھظ…ط§ظ†', color: '#f59e0b' },
  { value: 'location_change', label: 'طھط؛غŒغŒط± ظ…ط­ظ„ ع©ط§ط±', color: '#06b6d4' },
  { value: 'salary_increase', label: 'ط§ظپط²ط§غŒط´ ط­ظ‚ظˆظ‚', color: '#10b981' },
  { value: 'salary_decrease', label: 'ع©ط§ظ‡ط´ ط­ظ‚ظˆظ‚', color: '#ef4444' },
  { value: 'contract_renewal', label: 'طھظ…ط¯غŒط¯ ظ‚ط±ط§ط±ط¯ط§ط¯', color: '#8b5cf6' },
  { value: 'contract_termination', label: 'ظ¾ط§غŒط§ظ† ظ‚ط±ط§ط±ط¯ط§ط¯', color: '#64748b' },
  { value: 'status_change', label: 'طھط؛غŒغŒط± ظˆط¶ط¹غŒطھ ط§ط³طھط®ط¯ط§ظ…غŒ', color: '#ec4899' },
  { value: 'other', label: 'ط³ط§غŒط±', color: '#94a3b8' },
];

const CONTRACT_TYPES = [
  { value: 'permanent', label: 'ط¯ط§ط¦ظ…' },
  { value: 'temporary', label: 'ظ…ظˆظ‚طھ' },
  { value: 'project', label: 'ظ¾ط±ظˆعکظ‡â€Œط§غŒ' },
  { value: 'contractor', label: 'ظ¾غŒظ…ط§ظ†غŒ' },
];

const CHANGE_TYPE_MAP = CHANGE_TYPES.reduce((a, t) => { a[t.value] = t; return a; }, {});

const SectionHeader = ({ title, icon, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
    <Avatar sx={{ width: 34, height: 34, background: `linear-gradient(135deg, ${color}, ${color}90)`, boxShadow: `0 2px 8px ${color}40` }}>
      {icon}
    </Avatar>
    <Typography variant="subtitle1" fontWeight={700} sx={{ color }}>{title}</Typography>
  </Box>
);

const EmploymentHistoryTab = ({ employeeId }) => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ change_type: 'job_title_change', year: 1404 });
  const [error, setError] = useState('');

  const { data: changes, isLoading: changesLoading } = useQuery({
    queryKey: ['employment-changes', employeeId],
    queryFn: () => axiosInstance.get(`/employment-changes/?employee_id=${employeeId}`).then(r => r.data),
  });

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['contract-versions', employeeId],
    queryFn: () => axiosInstance.get(`/contract-versions/?employee_id=${employeeId}`).then(r => r.data),
  });

  const saveChangeMutation = useMutation({
    mutationFn: (payload) => axiosInstance.post('/employment-changes/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employment-changes', employeeId] });
      setOpen(false);
      setForm({ change_type: 'job_title_change', year: 1404 });
      setError('');
    },
    onError: (e) => setError(e.response?.data?.error || 'ط®ط·ط§ ط¯ط± ط°ط®غŒط±ظ‡'),
  });

  const saveContractMutation = useMutation({
    mutationFn: (payload) => axiosInstance.post('/contract-versions/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-versions', employeeId] });
      setOpen(false);
      setForm({ contract_type: 'permanent', year: 1404, version: 1 });
      setError('');
    },
    onError: (e) => setError(e.response?.data?.error || 'ط®ط·ط§ ط¯ط± ط°ط®غŒط±ظ‡'),
  });

  const handleOpenChange = () => {
    setOpen(true);
    setForm({ change_type: 'job_title_change', year: 1404 });
  };

  const handleSave = () => {
    if (!form.effective_date) { setError('طھط§ط±غŒط® ط§ط¹ظ…ط§ظ„ ط§ظ„ط²ط§ظ…غŒ ط§ط³طھ'); return; }
    const payload = {
      employee: employeeId,
      change_type: form.change_type,
      effective_date: form.effective_date,
      year: Number(form.year) || 1404,
      old_value: form.old_value || '',
      new_value: form.new_value || '',
      amount: form.amount ? Number(form.amount) : null,
      description: form.description || '',
    };
    saveChangeMutation.mutate(payload);
  };

  const isLoading = changesLoading || contractsLoading;
  if (isLoading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>;

  const changeList = Array.isArray(changes) ? changes : changes?.results || [];
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" onClick={handleOpenChange}>
          ط§ظپط²ظˆط¯ظ† طھط؛غŒغŒط± ط´ط؛ظ„غŒ
        </Button>
      </Box>

      {/* Change history */}
      <SectionHeader title="طھط§ط±غŒط®ع†ظ‡ طھط؛غŒغŒط±ط§طھ ط´ط؛ظ„غŒ" icon={<WorkHistoryIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#6366f1" />
      {changeList.length === 0 ? (
        <Typography color="textSecondary" variant="body2" sx={{ p: 2, textAlign: 'center' }}>
          ظ‡غŒع† طھط؛غŒغŒط± ط´ط؛ظ„غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ
        </Typography>
      ) : (
        <Stack spacing={1}>
          {changeList.map(change => {
            const meta = CHANGE_TYPE_MAP[change.change_type] || { label: change.change_type, color: '#94a3b8' };
            return (
              <Paper key={change.id} sx={{
                p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
                background: `linear-gradient(135deg, ${meta.color}10, ${meta.color}04)`,
                border: `1px solid ${meta.color}20`,
                borderRadius: '10px',
              }}>
                <Avatar sx={{ width: 36, height: 36, background: `linear-gradient(135deg, ${meta.color}, ${meta.color}90)`, fontSize: 14 }}>
                  <WorkHistoryIcon sx={{ fontSize: 18, color: '#fff' }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={700}>{change.change_type_display}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {change.old_value && `${change.old_value} â†گ `}{change.new_value || 'â€”'}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    {toJalali(change.effective_date)}
                  </Typography>
                  {change.amount > 0 && (
                    <Typography variant="caption" fontWeight={700} color={meta.color}>
                      {formatPersianNumber(change.amount)} ط±غŒط§ظ„
                    </Typography>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Stack>
      )}

      {/* Contract versions */}
      <Box sx={{ mt: 4, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" fontWeight={700} color="#8b5cf6">ظ†ط³ط®ظ‡â€Œظ‡ط§غŒ ظ‚ط±ط§ط±ط¯ط§ط¯</Typography>
        <Button
          variant="outlined"
          onClick={() => {
            setOpen(true);
            setForm({ contract_type: 'permanent', year: 1404, version: 1 });
          }}
        >
          ط§ظپط²ظˆط¯ظ† ظ†ط³ط®ظ‡ ظ‚ط±ط§ط±ط¯ط§ط¯
        </Button>
      </Box>
      {contractList.length === 0 ? (
        <Typography color="textSecondary" variant="body2" sx={{ p: 2, textAlign: 'center' }}>
          ظ‡غŒع† ظ†ط³ط®ظ‡ ظ‚ط±ط§ط±ط¯ط§ط¯غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ
        </Typography>
      ) : (
        <Grid container spacing={1.5}>
          {contractList.map(contract => (
            <Grid item xs={12} sm={6} md={4} key={contract.id}>
              <Paper sx={{
                p: 1.5, background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px',
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={700}>ظ†ط³ط®ظ‡ {toPersianDigits(contract.version)}</Typography>
                  <Chip label={toPersianDigits(contract.year)} size="small" color="primary" variant="outlined" />
                </Box>
                <Typography variant="caption" color="textSecondary">
                  ظ†ظˆط¹: {contract.contract_type_display}
                </Typography>
                <Typography variant="caption" display="block" color="textSecondary">
                  {toJalali(contract.start_date)} â†گ {toJalali(contract.end_date)}
                </Typography>
                {contract.base_salary > 0 && (
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, color: '#8b5cf6' }}>
                    {formatPersianNumber(contract.base_salary)} ط±غŒط§ظ„
                  </Typography>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog - change type based on form content */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {form.change_type ? 'ط§ظپط²ظˆط¯ظ† طھط؛غŒغŒط± ط´ط؛ظ„غŒ' : 'ط§ظپط²ظˆط¯ظ† ظ†ط³ط®ظ‡ ظ‚ط±ط§ط±ط¯ط§ط¯'}
        </DialogTitle>
        <DialogContent>
          {error && <Typography color="error" variant="body2" sx={{ mb: 1 }}>{error}</Typography>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {form.change_type ? (
              <>
                <FormControl fullWidth size="small">
                  <InputLabel>ظ†ظˆط¹ طھط؛غŒغŒط±</InputLabel>
                  <Select value={form.change_type} label="ظ†ظˆط¹ طھط؛غŒغŒط±"
                    onChange={e => setForm(p => ({ ...p, change_type: e.target.value }))}>
                    {CHANGE_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ط§ط¹ظ…ط§ظ„" value={form.effective_date}
                  onChange={g => setForm(p => ({ ...p, effective_date: g }))} />
                <TextField fullWidth size="small" label="ط³ط§ظ„" type="number" value={form.year || ''}
                  onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
                <Grid container spacing={1}>
                  <Grid item xs={6}><TextField fullWidth size="small" label="ظ…ظ‚ط¯ط§ط± ظ‚ط¨ظ„غŒ" value={form.old_value || ''} onChange={e => setForm(p => ({ ...p, old_value: e.target.value }))} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="ظ…ظ‚ط¯ط§ط± ط¬ط¯غŒط¯" value={form.new_value || ''} onChange={e => setForm(p => ({ ...p, new_value: e.target.value }))} /></Grid>
                </Grid>
                <TextField fullWidth size="small" label="ظ…ط¨ظ„ط؛ طھط؛غŒغŒط± (ط±غŒط§ظ„)" type="number" value={form.amount || ''}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                <TextField fullWidth size="small" label="طھظˆط¶غŒط­ط§طھ" multiline rows={2} value={form.description || ''}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </>
            ) : (
              <>
                <TextField fullWidth size="small" label="ط³ط§ظ„" type="number" value={form.year || ''}
                  onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
                <TextField fullWidth size="small" label="ظ†ط³ط®ظ‡" type="number" value={form.version || ''}
                  onChange={e => setForm(p => ({ ...p, version: Number(e.target.value) }))} />
                <FormControl fullWidth size="small">
                  <InputLabel>ظ†ظˆط¹ ظ‚ط±ط§ط±ط¯ط§ط¯</InputLabel>
                  <Select value={form.contract_type || ''} label="ظ†ظˆط¹ ظ‚ط±ط§ط±ط¯ط§ط¯"
                    onChange={e => setForm(p => ({ ...p, contract_type: e.target.value }))}>
                    {CONTRACT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ط´ط±ظˆط¹" value={form.start_date}
                  onChange={g => setForm(p => ({ ...p, start_date: g }))} />
                <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ظ¾ط§غŒط§ظ†" value={form.end_date}
                  onChange={g => setForm(p => ({ ...p, end_date: g }))} />
                <TextField fullWidth size="small" label="ط­ظ‚ظˆظ‚ ظ¾ط§غŒظ‡ (ط±غŒط§ظ„)" type="number" value={form.base_salary || ''}
                  onChange={e => setForm(p => ({ ...p, base_salary: e.target.value }))} />
                <TextField fullWidth size="small" label="طھظˆط¶غŒط­ط§طھ" multiline rows={2} value={form.description || ''}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" onClick={() => {
            if (form.change_type) {
              handleSave();
            } else {
              const payload = {
                employee: employeeId,
                version: Number(form.version) || 1,
                year: Number(form.year) || 1404,
                contract_type: form.contract_type || 'permanent',
                start_date: form.start_date,
                end_date: form.end_date || null,
                base_salary: form.base_salary ? Number(form.base_salary) : null,
                description: form.description || '',
              };
              saveContractMutation.mutate(payload);
            }
          }} disabled={saveChangeMutation.isLoading || saveContractMutation.isLoading}>
            {saveChangeMutation.isLoading || saveContractMutation.isLoading ? <CircularProgress size={20} /> : 'ط°ط®غŒط±ظ‡'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmploymentHistoryTab;