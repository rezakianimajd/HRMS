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
  { value: 'hire', label: 'استخدام', color: '#6366f1' },
  { value: 'promotion', label: 'ارتقا / ترفیع', color: '#10b981' },
  { value: 'demotion', label: 'تنزل مقام', color: '#ef4444' },
  { value: 'job_title_change', label: 'تغییر عنوان شغلی', color: '#3b82f6' },
  { value: 'department_change', label: 'تغییر دپارتمان', color: '#f59e0b' },
  { value: 'location_change', label: 'تغییر محل کار', color: '#06b6d4' },
  { value: 'salary_increase', label: 'افزایش حقوق', color: '#10b981' },
  { value: 'salary_decrease', label: 'کاهش حقوق', color: '#ef4444' },
  { value: 'contract_renewal', label: 'تمدید قرارداد', color: '#8b5cf6' },
  { value: 'contract_termination', label: 'پایان قرارداد', color: '#64748b' },
  { value: 'status_change', label: 'تغییر وضعیت استخدامی', color: '#ec4899' },
  { value: 'other', label: 'سایر', color: '#94a3b8' },
];

const CONTRACT_TYPES = [
  { value: 'permanent', label: 'دائم' },
  { value: 'temporary', label: 'موقت' },
  { value: 'project', label: 'پروژه‌ای' },
  { value: 'contractor', label: 'پیمانی' },
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
    onError: (e) => setError(e.response?.data?.error || 'خطا در ذخیره'),
  });

  const saveContractMutation = useMutation({
    mutationFn: (payload) => axiosInstance.post('/contract-versions/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-versions', employeeId] });
      setOpen(false);
      setForm({ contract_type: 'permanent', year: 1404, version: 1 });
      setError('');
    },
    onError: (e) => setError(e.response?.data?.error || 'خطا در ذخیره'),
  });

  const handleOpenChange = () => {
    setOpen(true);
    setForm({ change_type: 'job_title_change', year: 1404 });
  };

  const handleSave = () => {
    if (!form.effective_date) { setError('تاریخ اعمال الزامی است'); return; }
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
          افزودن تغییر شغلی
        </Button>
      </Box>

      {/* Change history */}
      <SectionHeader title="تاریخچه تغییرات شغلی" icon={<WorkHistoryIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#6366f1" />
      {changeList.length === 0 ? (
        <Typography color="textSecondary" variant="body2" sx={{ p: 2, textAlign: 'center' }}>
          هیچ تغییر شغلی ثبت نشده است
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
                borderRadius: 2,
              }}>
                <Avatar sx={{ width: 36, height: 36, background: `linear-gradient(135deg, ${meta.color}, ${meta.color}90)`, fontSize: 14 }}>
                  <WorkHistoryIcon sx={{ fontSize: 18, color: '#fff' }} />
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={700}>{change.change_type_display}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {change.old_value && `${change.old_value} ← `}{change.new_value || '—'}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    {toJalali(change.effective_date)}
                  </Typography>
                  {change.amount > 0 && (
                    <Typography variant="caption" fontWeight={700} color={meta.color}>
                      {formatPersianNumber(change.amount)} ریال
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
        <Typography variant="subtitle1" fontWeight={700} color="#8b5cf6">نسخه‌های قرارداد</Typography>
        <Button
          variant="outlined"
          onClick={() => {
            setOpen(true);
            setForm({ contract_type: 'permanent', year: 1404, version: 1 });
          }}
        >
          افزودن نسخه قرارداد
        </Button>
      </Box>
      {contractList.length === 0 ? (
        <Typography color="textSecondary" variant="body2" sx={{ p: 2, textAlign: 'center' }}>
          هیچ نسخه قراردادی ثبت نشده است
        </Typography>
      ) : (
        <Grid container spacing={1.5}>
          {contractList.map(contract => (
            <Grid item xs={12} sm={6} md={4} key={contract.id}>
              <Paper sx={{
                p: 1.5, background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 2,
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" fontWeight={700}>نسخه {toPersianDigits(contract.version)}</Typography>
                  <Chip label={toPersianDigits(contract.year)} size="small" color="primary" variant="outlined" />
                </Box>
                <Typography variant="caption" color="textSecondary">
                  نوع: {contract.contract_type_display}
                </Typography>
                <Typography variant="caption" display="block" color="textSecondary">
                  {toJalali(contract.start_date)} ← {toJalali(contract.end_date)}
                </Typography>
                {contract.base_salary > 0 && (
                  <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, color: '#8b5cf6' }}>
                    {formatPersianNumber(contract.base_salary)} ریال
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
          {form.change_type ? 'افزودن تغییر شغلی' : 'افزودن نسخه قرارداد'}
        </DialogTitle>
        <DialogContent>
          {error && <Typography color="error" variant="body2" sx={{ mb: 1 }}>{error}</Typography>}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {form.change_type ? (
              <>
                <FormControl fullWidth size="small">
                  <InputLabel>نوع تغییر</InputLabel>
                  <Select value={form.change_type} label="نوع تغییر"
                    onChange={e => setForm(p => ({ ...p, change_type: e.target.value }))}>
                    {CHANGE_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <JalaliDatePicker fullWidth label="تاریخ اعمال" value={form.effective_date}
                  onChange={g => setForm(p => ({ ...p, effective_date: g }))} />
                <TextField fullWidth size="small" label="سال" type="number" value={form.year || ''}
                  onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
                <Grid container spacing={1}>
                  <Grid item xs={6}><TextField fullWidth size="small" label="مقدار قبلی" value={form.old_value || ''} onChange={e => setForm(p => ({ ...p, old_value: e.target.value }))} /></Grid>
                  <Grid item xs={6}><TextField fullWidth size="small" label="مقدار جدید" value={form.new_value || ''} onChange={e => setForm(p => ({ ...p, new_value: e.target.value }))} /></Grid>
                </Grid>
                <TextField fullWidth size="small" label="مبلغ تغییر (ریال)" type="number" value={form.amount || ''}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
                <TextField fullWidth size="small" label="توضیحات" multiline rows={2} value={form.description || ''}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </>
            ) : (
              <>
                <TextField fullWidth size="small" label="سال" type="number" value={form.year || ''}
                  onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
                <TextField fullWidth size="small" label="نسخه" type="number" value={form.version || ''}
                  onChange={e => setForm(p => ({ ...p, version: Number(e.target.value) }))} />
                <FormControl fullWidth size="small">
                  <InputLabel>نوع قرارداد</InputLabel>
                  <Select value={form.contract_type || ''} label="نوع قرارداد"
                    onChange={e => setForm(p => ({ ...p, contract_type: e.target.value }))}>
                    {CONTRACT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </Select>
                </FormControl>
                <JalaliDatePicker fullWidth label="تاریخ شروع" value={form.start_date}
                  onChange={g => setForm(p => ({ ...p, start_date: g }))} />
                <JalaliDatePicker fullWidth label="تاریخ پایان" value={form.end_date}
                  onChange={g => setForm(p => ({ ...p, end_date: g }))} />
                <TextField fullWidth size="small" label="حقوق پایه (ریال)" type="number" value={form.base_salary || ''}
                  onChange={e => setForm(p => ({ ...p, base_salary: e.target.value }))} />
                <TextField fullWidth size="small" label="توضیحات" multiline rows={2} value={form.description || ''}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
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
            {saveChangeMutation.isLoading || saveContractMutation.isLoading ? <CircularProgress size={20} /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmploymentHistoryTab;