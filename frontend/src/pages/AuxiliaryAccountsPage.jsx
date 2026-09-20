import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, IconButton, Tooltip, Alert, InputAdornment, Autocomplete,
  Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import DeleteIcon from '@mui/icons-material/Delete';
import ClearIcon from '@mui/icons-material/Clear';
import SearchIcon from '@mui/icons-material/Search';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

const COLOR = '#f59e0b';
const COLOR_DARK = '#d97706';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.42))',
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 18px 50px rgba(245,158,11,0.14)',
  borderRadius: '20px',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.6)',
    transition: 'all 0.2s ease',
    '&:hover': { background: 'rgba(255,255,255,0.85)' },
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(245,158,11,0.12)' },
  },
};

const AuxiliaryAccountsPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', category: '', project: '', contract: '', employee: '', party: '' });
  const [msg, setMsg] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['auxiliary-accounts'], queryFn: () => axiosInstance.get('/accounting/auxiliary-accounts/').then(r => r.data) });
  const { data: categories } = useQuery({ queryKey: ['aux-categories'], queryFn: () => axiosInstance.get('/accounting/auxiliary-categories/').then(r => r.data) });
  const { data: projects } = useQuery({ queryKey: ['acc-projects'], queryFn: () => axiosInstance.get('/projects/').then(r => r.data) });
  const { data: contracts } = useQuery({ queryKey: ['acc-contracts'], queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data) });
  const { data: employees } = useQuery({ queryKey: ['acc-employees'], queryFn: () => axiosInstance.get('/employees/').then(r => r.data) });
  const { data: suggested } = useQuery({ queryKey: ['suggest-aux'], queryFn: () => axiosInstance.get('/accounting/coding-configs/suggest/', { params: { level: 'auxiliary' } }).then(r => r.data) });

  const list = Array.isArray(data) ? data : data?.results || [];
  const categoryList = Array.isArray(categories) ? categories : categories?.results || [];
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];
  const employeeList = Array.isArray(employees) ? employees : employees?.results || [];

  const selectedCategory = categoryList.find(c => c.id === form.category);
  const source = selectedCategory?.source;

  useEffect(() => {
    if (!editing && suggested?.code) setForm(p => ({ ...p, code: suggested.code }));
  }, [suggested?.code]);

  const resetForm = () => {
    setEditing(null);
    setForm({ code: suggested?.code || '', name: '', category: '', project: '', contract: '', employee: '', party: '' });
    setMsg(null);
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setMsg(null);
    const payload = {
      code: form.code,
      name: form.name,
      category: form.category || null,
      project: form.project || null,
      contract: form.contract || null,
      employee: form.employee || null,
      party: form.party || null,
    };
    try {
      if (editing) await axiosInstance.patch(`/accounting/auxiliary-accounts/${editing.id}/`, payload);
      else await axiosInstance.post('/accounting/auxiliary-accounts/', payload);
      qc.invalidateQueries({ queryKey: ['auxiliary-accounts'] });
      resetForm();
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'خطا در ذخیره' });
    }
  };

  const del = async (id) => {
    try { await axiosInstance.delete(`/accounting/auxiliary-accounts/${id}/`); qc.invalidateQueries({ queryKey: ['auxiliary-accounts'] }); }
    catch (e) { setMsg({ ok: false, text: e.response?.data?.error || 'حذف ممکن نیست' }); }
  };

  const filtered = useMemo(() => {
    const q = search.trim();
    return list.filter(a => !q || `${a.code} ${a.name}`.includes(q));
  }, [list, search]);

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '20px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 10px 28px ${COLOR}55` }}>
          <AccountTreeIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>حساب‌های تفصیلی</Typography>
          <Typography variant="body2" color="textSecondary">شناور و دسته‌بندی‌شده (پرسنل، اشخاص، پروژه، قرارداد و ...)</Typography>
        </Box>
        <Chip label={`${list.length} تفصیل`} sx={{ fontWeight: 700, bgcolor: 'rgba(245,158,11,0.1)', color: COLOR_DARK }} />
      </Paper>

      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '14px' }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Paper sx={{ ...glass, p: 1.5, mb: 2 }}>
        <TextField placeholder="جستجوی حساب تفصیلی…" size="small" fullWidth value={search} onChange={e => setSearch(e.target.value)} sx={fieldSx}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
      </Paper>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...glass, p: 2.5, position: 'sticky', top: 16 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK}>{editing ? 'ویرایش تفصیل' : 'ثبت تفصیل جدید'}</Typography>
              <Tooltip title="لغو"><IconButton size="small" onClick={resetForm}><ClearIcon fontSize="small" /></IconButton></Tooltip>
            </Stack>
            <Stack spacing={1.5}>
              <TextField size="small" fullWidth label="کد تفصیلی" value={form.code} onChange={e => set('code', e.target.value)} sx={fieldSx}
                InputProps={{ endAdornment: <InputAdornment position="end"><Tooltip title="پیشنهاد کد"><IconButton size="small" onClick={() => set('code', suggested?.code || '')}><BoltIcon fontSize="small" color="primary" /></IconButton></Tooltip></InputAdornment> }} />
              <TextField size="small" fullWidth label="نام تفصیلی" value={form.name} onChange={e => set('name', e.target.value)} sx={fieldSx} />

              <Autocomplete size="small" options={categoryList} getOptionLabel={o => o.name}
                value={categoryList.find(c => c.id === form.category) || null}
                onChange={(e, v) => set('category', v ? v.id : '')}
                renderInput={p => <TextField {...p} label="دسته‌بندی" sx={fieldSx} />} />

              {/* منبع داده بر اساس دسته */}
              {source === 'project' && (
                <Autocomplete size="small" options={projectList} getOptionLabel={o => `${o.code || ''} ${o.name}`}
                  value={projectList.find(p => p.id === form.project) || null}
                  onChange={(e, v) => set('project', v ? v.id : '')}
                  renderInput={p => <TextField {...p} label="پروژه (از مدیریت پروژه‌ها)" sx={fieldSx} />} />
              )}
              {source === 'contract' && (
                <Autocomplete size="small" options={contractList} getOptionLabel={o => `${o.number || ''} - ${o.subject || o.name || ''}`}
                  value={contractList.find(c => c.id === form.contract) || null}
                  onChange={(e, v) => set('contract', v ? v.id : '')}
                  renderInput={p => <TextField {...p} label="قرارداد (از مدیریت قراردادها)" sx={fieldSx} />} />
              )}
              {source === 'employee' && (
                <Autocomplete size="small" options={employeeList} getOptionLabel={o => `${o.employee_id || ''} ${o.full_name || o.first_name || ''}`}
                  value={employeeList.find(e => e.id === form.employee) || null}
                  onChange={(e, v) => set('employee', v ? v.id : '')}
                  renderInput={p => <TextField {...p} label="پرسنل" sx={fieldSx} />} />
              )}

              <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={submit} disabled={!form.code || !form.name}
                sx={{ mt: 0.5, py: 1.1, borderRadius: '14px', background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 10px 24px ${COLOR}44` }}>
                {editing ? 'ذخیره تغییرات' : 'افزودن تفصیلی'}
              </Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ ...glass, p: 2.5 }}>
            {isLoading ? <Box textAlign="center" py={6}><CircularProgress /></Box>
              : filtered.length === 0 ? <Box textAlign="center" py={6}><AccountTreeIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} /><Typography color="textSecondary">تفصیلی ثبت نشده است.</Typography></Box>
              : <Stack spacing={1.25}>
                  {filtered.map(a => {
                    const active = editing?.id === a.id;
                    const catName = a.category_name || '';
                    const refName = a.project_name || a.contract_name || a.employee_name || a.party_name || '';
                    return (
                      <Paper key={a.id} onClick={() => { setEditing(a); setForm({ code: a.code, name: a.name, category: a.category, project: a.project, contract: a.contract, employee: a.employee, party: a.party }); }}
                        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.75, borderRadius: '14px', cursor: 'pointer',
                          background: active ? 'rgba(245,158,11,0.10)' : 'rgba(255,255,255,0.55)', border: active ? `1px solid ${COLOR}66` : '1px solid rgba(255,255,255,0.8)',
                          transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 10px 26px rgba(245,158,11,0.12)' } }}>
                        <Box sx={{ width: 44, height: 44, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 6px 14px ${COLOR}40`, flexShrink: 0 }}>
                          <AccountTreeIcon sx={{ fontSize: 22, color: '#fff' }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Chip size="small" label={a.code} sx={{ fontWeight: 800, bgcolor: 'rgba(245,158,11,0.1)', color: COLOR_DARK, fontSize: 11 }} />
                            <Typography variant="body2" fontWeight={700} noWrap>{a.name}</Typography>
                          </Stack>
                          <Typography variant="caption" color="textSecondary">{catName}{refName ? ` · ${refName}` : ''}</Typography>
                        </Box>
                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); if (window.confirm('حذف این تفصیل؟')) del(a.id); }} title="حذف">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    );
                  })}
                </Stack>
            }
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AuxiliaryAccountsPage;