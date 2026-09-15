import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Tabs, Tab, Button, CircularProgress,
  Stack, TextField, Autocomplete, Chip, IconButton, Tooltip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import PreviewIcon from '@mui/icons-material/Preview';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const COLOR = '#10b981';
const COLOR_DARK = '#059669';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(16,185,129,0.12)',
  borderRadius: '16px',
};

const num = (v) => Number(v) || 0;

/* ----------------------- Posting templates ----------------------- */
const TemplatesPanel = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ lines: [] });
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['posting-templates'], queryFn: () => axiosInstance.get('/accounting/posting-templates/').then(r => r.data) });
  const { data: journals } = useQuery({ queryKey: ['pt-journals'], queryFn: () => axiosInstance.get('/accounting/journals/').then(r => r.data) });
  const { data: accounts } = useQuery({ queryKey: ['pt-accounts'], queryFn: () => axiosInstance.get('/accounting/accounts/').then(r => r.data) });

  const list = Array.isArray(data) ? data : data?.results || [];
  const journalList = Array.isArray(journals) ? journals : journals?.results || [];
  const accountList = Array.isArray(accounts) ? accounts : accounts?.results || [];

  const save = useMutation({
    mutationFn: (p) => editing ? axiosInstance.patch(`/accounting/posting-templates/${editing.id}/`, p) : axiosInstance.post('/accounting/posting-templates/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['posting-templates'] }); setForm({ lines: [] }); setEditing(null); },
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/accounting/posting-templates/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posting-templates'] }),
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setLine = (i, k, v) => setForm(p => {
    const lines = [...(p.lines || [])];
    lines[i] = { ...lines[i], [k]: v };
    return { ...p, lines };
  });
  const addLine = () => setForm(p => ({ ...p, lines: [...(p.lines || []), { account: '', side: 'debit', amount_expression: '' }] }));

  const submit = () => {
    const payload = {
      ...form,
      lines: (form.lines || []).map((l, i) => ({ account: l.account, side: l.side, amount_expression: l.amount_expression, line_no: i + 1 })),
    };
    save.mutate(payload);
  };

  return (
    <Paper sx={{ ...glass, p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK}>قالب‌های ثبت حسابداری</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setForm({ lines: [] }); }}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '10px' }}>
          قالب جدید
        </Button>
      </Stack>

      {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
        <Table size="small">
          <TableHead><TableRow><TableCell>کد</TableCell><TableCell>نام</TableCell><TableCell>ماژول منبع</TableCell><TableCell>عملیات</TableCell></TableRow></TableHead>
          <TableBody>
            {list.map(t => (
              <TableRow key={t.id} hover>
                <TableCell>{t.code}</TableCell>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.source_module || '—'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => { setEditing(t); setForm({ ...t, lines: Array.isArray(t.lines) ? t.lines : [] }); }}><SaveIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(t.id); }}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {form.code !== undefined || editing === null ? (
        <Box sx={{ mt: 3, borderTop: '1px dashed rgba(16,185,129,0.3)', pt: 2 }}>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
            <TextField size="small" label="کد قالب" value={form.code || ''} onChange={e => set('code', e.target.value)} sx={{ width: 140 }} />
            <TextField size="small" label="نام قالب" value={form.name || ''} onChange={e => set('name', e.target.value)} sx={{ width: 220 }} />
            <TextField size="small" label="ماژول منبع" value={form.source_module || ''} onChange={e => set('source_module', e.target.value)} sx={{ width: 160 }} />
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>دفتر روزنامه</InputLabel>
              <Select value={form.journal || ''} label="دفتر روزنامه" onChange={e => set('journal', e.target.value)}>
                {journalList.map(j => <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          <Table size="small">
            <TableHead><TableRow><TableCell>حساب</TableCell><TableCell>طرف</TableCell><TableCell>عبارت مبلغ</TableCell><TableCell></TableCell></TableRow></TableHead>
            <TableBody>
              {(form.lines || []).map((l, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Autocomplete size="small" options={accountList} getOptionLabel={o => `${o.code} - ${o.name}`}
                      value={accountList.find(a => a.id === l.account) || null}
                      onChange={(e, v) => setLine(i, 'account', v ? v.id : '')}
                      renderInput={p => <TextField {...p} placeholder="حساب" />} sx={{ minWidth: 200 }} />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 110 }}>
                      <Select value={l.side === 'credit' ? 'credit' : 'debit'} onChange={e => setLine(i, 'side', e.target.value)}>
                        <MenuItem value="debit">بدهکار</MenuItem>
                        <MenuItem value="credit">بستانکار</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell><TextField size="small" fullWidth value={l.amount_expression || ''} onChange={e => setLine(i, 'amount_expression', e.target.value)} placeholder="مثلاً gross_amount" /></TableCell>
                  <TableCell><IconButton size="small" color="error" onClick={() => setForm(p => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }))}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button size="small" startIcon={<AddIcon />} onClick={addLine} sx={{ mt: 1 }}>افزودن خط</Button>
          <Box sx={{ mt: 2 }}><Button variant="contained" startIcon={<SaveIcon />} onClick={submit} disabled={save.isLoading} sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})` }}>{save.isLoading ? <CircularProgress size={20} /> : 'ذخیره قالب'}</Button></Box>
        </Box>
      ) : null}
    </Paper>
  );
};

/* ----------------------- Source transactions ----------------------- */
const SourceTransactionsPanel = () => {
  const [preview, setPreview] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [year, setYear] = useState('');
  const [period, setPeriod] = useState('');
  const [msg, setMsg] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['source-transactions'], queryFn: () => axiosInstance.get('/accounting/source-transactions/').then(r => r.data) });
  const { data: templates } = useQuery({ queryKey: ['st-templates'], queryFn: () => axiosInstance.get('/accounting/posting-templates/').then(r => r.data) });
  const { data: years } = useQuery({ queryKey: ['st-years'], queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then(r => r.data) });
  const { data: periods } = useQuery({ queryKey: ['st-periods'], queryFn: () => axiosInstance.get('/accounting/fiscal-periods/').then(r => r.data) });

  const list = Array.isArray(data) ? data : data?.results || [];
  const templateList = Array.isArray(templates) ? templates : templates?.results || [];
  const yearList = Array.isArray(years) ? years : years?.results || [];
  const periodList = Array.isArray(periods) ? periods : periods?.results || [];

  const doPreview = (tx) => {
    if (!selectedTemplate) { setMsg({ ok: false, text: 'ابتدا قالب ثبت را انتخاب کنید' }); return; }
    axiosInstance.get(`/accounting/source-transactions/${tx.id}/preview/`, { params: { template_id: selectedTemplate.id } })
      .then(r => setPreview(r.data)).catch(e => setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }));
  };

  const doPost = (tx) => {
    if (!year || !period) { setMsg({ ok: false, text: 'سال مالی و دوره را انتخاب کنید' }); return; }
    axiosInstance.post(`/accounting/source-transactions/${tx.id}/post_from_template/`, { template_id: selectedTemplate.id, fiscal_year: year, period: period })
      .then(() => { setMsg({ ok: true, text: 'سند حسابداری ثبت شد' }); qc.invalidateQueries({ queryKey: ['source-transactions'] }); })
      .catch(e => setMsg({ ok: false, text: e.response?.data?.error || 'خطای ثبت' }));
  };

  return (
    <Paper sx={{ ...glass, p: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK} mb={2}>تراکنش‌های منبع (انتظار ثبت)</Typography>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2 }}>{msg.text}</Alert>}

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Autocomplete size="small" options={templateList} getOptionLabel={o => o.name}
          value={selectedTemplate} onChange={(e, v) => setSelectedTemplate(v)}
          renderInput={p => <TextField {...p} label="قالب ثبت" />} sx={{ minWidth: 220 }} />
        <Autocomplete size="small" options={yearList} getOptionLabel={o => o.name}
          value={yearList.find(y => y.id === year) || null} onChange={(e, v) => setYear(v ? v.id : '')}
          renderInput={p => <TextField {...p} label="سال مالی" />} sx={{ minWidth: 160 }} />
        <Autocomplete size="small" options={periodList} getOptionLabel={o => o.code}
          value={periodList.find(p => p.id === period) || null} onChange={(e, v) => setPeriod(v ? v.id : '')}
          renderInput={p => <TextField {...p} label="دوره" />} sx={{ minWidth: 130 }} />
      </Stack>

      {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
        <Table size="small">
          <TableHead><TableRow><TableCell>ماژول</TableCell><TableCell>نوع</TableCell><TableCell>شناسه</TableCell><TableCell>وضعیت</TableCell><TableCell>عملیات</TableCell></TableRow></TableHead>
          <TableBody>
            {list.filter(t => t.status !== 'processed').map(t => (
              <TableRow key={t.id} hover>
                <TableCell>{t.source_module}</TableCell>
                <TableCell>{t.source_type}</TableCell>
                <TableCell>{t.source_id}</TableCell>
                <TableCell><Chip size="small" label={t.status} /></TableCell>
                <TableCell>
                  <Tooltip title="پیش‌نمایش"><IconButton size="small" color="primary" onClick={() => doPreview(t)}><PreviewIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="ثبت سند"><IconButton size="small" color="success" onClick={() => doPost(t)}><PlayCircleIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {preview && (
        <Paper sx={{ mt: 2, p: 2, background: 'rgba(255,255,255,0.5)' }}>
          <Typography variant="subtitle2" fontWeight={800} mb={1}>پیش‌نمایش سطرها</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>حساب</TableCell><TableCell>طرف</TableCell><TableCell>مبلغ</TableCell></TableRow></TableHead>
            <TableBody>
              {(preview || []).map((l, i) => (
                <TableRow key={i}><TableCell>{l.account_code}</TableCell><TableCell>{l.side}</TableCell><TableCell>{formatPersianNumber(l.amount)}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Paper>
  );
};

const AccountingIntegrationPage = () => {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.3))`, border: `1px solid ${COLOR}30`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}55` }}>
          <HubIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>ارتباط با ماژول‌ها</Typography>
          <Typography variant="body2" color="textSecondary">قالب‌های ثبت، تراکنش‌های منبع و صف ثبت</Typography>
        </Box>
      </Paper>

      <Paper sx={{ ...glass, overflow: 'hidden', mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: '1px solid rgba(225,225,225,0.5)' }}>
          <Tab label="قالب‌های ثبت" sx={{ fontWeight: 600, color: tab === 0 ? COLOR_DARK : undefined }} />
          <Tab label="تراکنش‌های منبع" sx={{ fontWeight: 600, color: tab === 1 ? COLOR_DARK : undefined }} />
        </Tabs>
      </Paper>

      {tab === 0 && <TemplatesPanel />}
      {tab === 1 && <SourceTransactionsPanel />}
    </Box>
  );
};

export default AccountingIntegrationPage;