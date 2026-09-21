import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Tabs, Tab, Button, CircularProgress,
  Stack, TextField, Autocomplete, Chip, IconButton, Tooltip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider,
} from '@mui/material';
import HubIcon from '@mui/icons-material/Hub';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import UndoIcon from '@mui/icons-material/Undo';
import PostAddIcon from '@mui/icons-material/PostAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
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

const STATUS = {
  pending: { label: 'در انتظار', color: '#f59e0b' },
  processed: { label: 'انجام‌شده', color: '#10b981' },
  failed: { label: 'خطا', color: '#ef4444' },
  duplicate: { label: 'تکراری', color: '#64748b' },
};

const ST_STATUS = {
  draft: { label: 'پیش‌نویس', color: '#64748b' },
  submitted: { label: 'ارسال به حسابداری', color: '#f59e0b' },
  approved: { label: 'تأیید حسابداری', color: '#10b981' },
  posted: { label: 'ثبت نهایی', color: '#3b82f6' },
  rejected: { label: 'برگشت خورده', color: '#ef4444' },
  edited: { label: 'ویرایش‌شده', color: '#8b5cf6' },
};

// ---------------------------------------------------------------------------
// Modular description builder
// ---------------------------------------------------------------------------
const TOKENS = [
  { value: 'invoice_number', label: 'شماره فاکتور' },
  { value: 'supplier', label: 'فروشنده' },
  { value: 'expense_date', label: 'تاریخ هزینه' },
  { value: 'description', label: 'شرح هزینه' },
  { value: 'account_code', label: 'کد معین' },
  { value: 'account_name', label: 'نام معین' },
  { value: 'aux1', label: 'تفصیل ۱' },
  { value: 'aux2', label: 'تفصیل ۲' },
  { value: 'aux3', label: 'تفصیل ۳' },
  { value: 'fund', label: 'نام تنخواه' },
  { value: 'custodian', label: 'تنخواه‌دار' },
];

const DescriptionBuilder = ({ value = [], onChange }) => {
  const segs = Array.isArray(value) ? value : [];
  const [freeText, setFreeText] = useState('');

  const addToken = (token) => onChange([...segs, { type: 'token', value: token }]);
  const addText = () => {
    if (!freeText.trim()) return;
    onChange([...segs, { type: 'text', value: freeText.trim() }]);
    setFreeText('');
  };
  const remove = (i) => onChange(segs.filter((_, idx) => idx !== i));

  return (
    <Box sx={{ border: '1px dashed rgba(16,185,129,0.4)', borderRadius: '12px', p: 1.5 }}>
      <Typography variant="caption" fontWeight={700} color={COLOR_DARK} mb={1} display="block">
        الگوی شرح (ماژولار)
      </Typography>

      {/* پیش‌نمایش شرح */}
      <Box sx={{ minHeight: 48, p: 1.25, mb: 1.5, borderRadius: '10px', background: 'rgba(255,255,255,0.6)', display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
        {segs.length === 0 ? <Typography variant="caption" color="textSecondary">هنوز بخشی اضافه نشده</Typography> :
          segs.map((s, i) => (
            <Chip
              key={i}
              size="small"
              onDelete={() => remove(i)}
              label={s.type === 'token' ? `⟨${TOKENS.find(t => t.value === s.value)?.label || s.value}⟩` : s.value}
              sx={{ bgcolor: s.type === 'token' ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.1)', color: s.type === 'token' ? COLOR_DARK : '#475569', fontWeight: 600 }}
            />
          ))}
      </Box>

      {/* توکن‌های قابل انتخاب */}
      <Typography variant="caption" color="textSecondary" mb={0.75} display="block">افزودن فیلد (توکن):</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
        {TOKENS.map(t => (
          <Chip key={t.value} size="small" label={t.label} onClick={() => addToken(t.value)} sx={{ cursor: 'pointer' }} />
        ))}
      </Box>

      {/* متن آزاد */}
      <Stack direction="row" spacing={1}>
        <TextField size="small" placeholder="متن آزاد (مثلاً - فاکتور)" value={freeText} onChange={e => setFreeText(e.target.value)} sx={{ flex: 1 }} />
        <Button size="small" variant="outlined" onClick={addText}>افزودن متن</Button>
      </Stack>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Templates panel
// ---------------------------------------------------------------------------
const TemplatesPanel = () => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ lines: [], description_template: [] });
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['posting-templates'], queryFn: () => axiosInstance.get('/accounting/posting-templates/').then(r => r.data) });
  const { data: journals } = useQuery({ queryKey: ['pt-journals'], queryFn: () => axiosInstance.get('/accounting/journals/').then(r => r.data) });
  const { data: accounts } = useQuery({ queryKey: ['pt-accounts'], queryFn: () => axiosInstance.get('/accounting/accounts/').then(r => r.data) });

  const list = Array.isArray(data) ? data : data?.results || [];
  const journalList = Array.isArray(journals) ? journals : journals?.results || [];
  const accountList = Array.isArray(accounts) ? accounts : accounts?.results || [];

  const save = useMutation({
    mutationFn: (p) => editing ? axiosInstance.patch(`/accounting/posting-templates/${editing.id}/`, p) : axiosInstance.post('/accounting/posting-templates/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['posting-templates'] }); setForm({ lines: [], description_template: [] }); setEditing(null); },
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/accounting/posting-templates/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posting-templates'] }),
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setLine = (i, k, v) => setForm(p => { const lines = [...(p.lines || [])]; lines[i] = { ...lines[i], [k]: v }; return { ...p, lines }; });
  const addLine = () => setForm(p => ({ ...p, lines: [...(p.lines || []), { account: '', side: 'debit', amount_expression: '' }] }));

  const submit = () => {
    const payload = {
      ...form,
      lines: (form.lines || []).map((l, i) => ({ account: l.account, side: l.side, amount_expression: l.amount_expression, line_no: i + 1 })),
      description_template: form.description_template || [],
    };
    save.mutate(payload);
  };

  const openNew = () => { setEditing(null); setForm({ lines: [], description_template: [] }); };
  const openEdit = (t) => { setEditing(t); setForm({ ...t, lines: Array.isArray(t.lines) ? t.lines : [], description_template: Array.isArray(t.description_template) ? t.description_template : [] }); };

  return (
    <Paper sx={{ ...glass, p: 2.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK}>قالب‌های ثبت حسابداری</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '10px' }}>قالب جدید</Button>
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
                  <IconButton size="small" color="primary" onClick={() => openEdit(t)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(t.id); }}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!editing && form.name === undefined && form.code === undefined ? null : (
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

          <DescriptionBuilder value={form.description_template} onChange={(v) => set('description_template', v)} />

          <Typography variant="subtitle2" fontWeight={700} sx={{ mt: 2, mb: 1, color: COLOR_DARK }}>آرتیکل‌ها</Typography>
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
                  <TableCell><TextField size="small" fullWidth value={l.amount_expression || ''} onChange={e => setLine(i, 'amount_expression', e.target.value)} placeholder="مثلاً total" /></TableCell>
                  <TableCell><IconButton size="small" color="error" onClick={() => setForm(p => ({ ...p, lines: p.lines.filter((_, idx) => idx !== i) }))}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button size="small" startIcon={<AddIcon />} onClick={addLine} sx={{ mt: 1 }}>افزودن خط</Button>
          <Box sx={{ mt: 2 }}><Button variant="contained" startIcon={<SaveIcon />} onClick={submit} disabled={save.isLoading} sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})` }}>{save.isLoading ? <CircularProgress size={20} /> : (editing ? 'به‌روزرسانی قالب' : 'ذخیره قالب')}</Button></Box>
        </Box>
      )}
    </Paper>
  );
};

// ---------------------------------------------------------------------------
// Source transactions inbox
// ---------------------------------------------------------------------------
const SourceTransactionsPanel = () => {
  const qc = useQueryClient();
  const [msg, setMsg] = useState(null);
  const [detail, setDetail] = useState(null); // expanded tx detail with statement

  const { data, isLoading } = useQuery({ queryKey: ['source-transactions'], queryFn: () => axiosInstance.get('/accounting/source-transactions/').then(r => r.data) });
  const list = Array.isArray(data) ? data : data?.results || [];

  const decide = useMutation({
    mutationFn: ({ id, decision, note }) => axiosInstance.post(`/accounting/source-transactions/${id}/decide/`, { decision, note }),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['source-transactions'] }); setMsg({ ok: true, text: 'تصمیم ثبت شد' }); setDetail(null); },
    onError: (e) => setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }),
  });

  const openDetail = (tx) => {
    axiosInstance.get(`/accounting/source-transactions/${tx.id}/detail/`)
      .then(r => setDetail(r.data)).catch(e => setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }));
  };

  return (
    <Paper sx={{ ...glass, p: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK} mb={2}>کارتابل تراکنش‌های منبع (انتظار بررسی)</Typography>
      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {isLoading ? <Box textAlign="center" py={4}><CircularProgress /></Box> : (
        <Table size="small">
          <TableHead><TableRow><TableCell>ماژول</TableCell><TableCell>نوع</TableCell><TableCell>شناسه</TableCell><TableCell>وضعیت</TableCell><TableCell>عملیات</TableCell></TableRow></TableHead>
          <TableBody>
            {list.filter(t => t.status !== 'processed').length === 0
              ? <TableRow><TableCell colSpan={5} align="center">موردی در کارتابل نیست</TableCell></TableRow>
              : list.filter(t => t.status !== 'processed').map(t => (
                <TableRow key={t.id} hover>
                  <TableCell>{t.source_module}</TableCell>
                  <TableCell>{t.source_type}</TableCell>
                  <TableCell>{t.source_id}</TableCell>
                  <TableCell><Chip size="small" label={STATUS[t.status]?.label || t.status} sx={{ bgcolor: `${STATUS[t.status]?.color || '#64748b'}18`, color: STATUS[t.status]?.color || '#64748b', fontWeight: 700 }} /></TableCell>
                  <TableCell>
                    <Tooltip title="مشاهده و بررسی"><IconButton size="small" color="primary" onClick={() => openDetail(t)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}

      {/* دیالوگ بررسی صورت */}
      <Dialog open={!!detail} onClose={() => setDetail(null)} fullWidth maxWidth="md"
        slotProps={{ paper: { sx: { borderRadius: '20px', background: 'linear-gradient(150deg, #fff, #f8fafc)' } } }}>
        <DialogTitle sx={{ color: COLOR_DARK, fontWeight: 800 }}>بررسی صورت هزینهٔ تنخواه</DialogTitle>
        <DialogContent>
          {detail?.statement && (
            <Box>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={1.5}>
                <Chip label={detail.statement.fund_title} sx={{ fontWeight: 700 }} />
                <Chip label={detail.statement.custodian_name} />
                <Chip label={`تاریخ: ${toJalali(detail.statement.date)}`} />
                <Chip label={ST_STATUS[detail.statement.status]?.label || detail.statement.status} sx={{ bgcolor: `${ST_STATUS[detail.statement.status]?.color || '#64748b'}18`, color: ST_STATUS[detail.statement.status]?.color, fontWeight: 700 }} />
                <Chip label={`جمع: ${formatPersianNumber(detail.statement.total)} ریال`} color="success" sx={{ fontWeight: 800 }} />
              </Stack>

              {detail.statement.description && <Typography variant="body2" color="textSecondary" mb={1.5}>{detail.statement.description}</Typography>}

              <Table size="small">
                <TableHead><TableRow><TableCell>ردیف</TableCell><TableCell>کد معین</TableCell><TableCell>شرح معین</TableCell><TableCell>تفصیل ۱</TableCell><TableCell>تفصیل ۲</TableCell><TableCell>تفصیل ۳</TableCell><TableCell>شماره فاکتور</TableCell><TableCell>فروشنده</TableCell><TableCell>شرح هزینه</TableCell><TableCell>مبلغ</TableCell></TableRow></TableHead>
                <TableBody>
                  {(detail.statement.lines || []).map((l, i) => (
                    <TableRow key={l.id}>
                      <TableCell>{l.line_no || i + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{l.account_code}</TableCell>
                      <TableCell>{l.account_name}</TableCell>
                      <TableCell>{l.auxiliary_1 || '—'}</TableCell>
                      <TableCell>{l.auxiliary_2 || '—'}</TableCell>
                      <TableCell>{l.auxiliary_3 || '—'}</TableCell>
                      <TableCell>{l.invoice_number || '—'}</TableCell>
                      <TableCell>{l.supplier || '—'}</TableCell>
                      <TableCell>{l.description}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{formatPersianNumber(l.debit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {detail.statement.history?.length > 0 && (
                <Box mt={2}>
                  <Typography variant="caption" color="textSecondary" fontWeight={700}>تاریخچهٔ چرخه:</Typography>
                  <Stack spacing={0.5} mt={0.5}>
                    {detail.statement.history.map((h, i) => (
                      <Typography key={i} variant="caption" color="textSecondary">{h.step} {h.note ? `· ${h.note}` : ''} - {h.by}</Typography>
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button startIcon={<UndoIcon />} color="error" onClick={() => decide.mutate({ id: detail.id, decision: 'reject', note: 'برگشت برای اصلاح' })}>برگشت برای اصلاح</Button>
          <Button startIcon={<EditIcon />} color="warning" onClick={() => decide.mutate({ id: detail.id, decision: 'edit', note: 'نیاز به ویرایش' })}>علامت ویرایش</Button>
          <Button startIcon={<CheckCircleIcon />} color="success" onClick={() => decide.mutate({ id: detail.id, decision: 'approve' })}>تأیید</Button>
          <Button startIcon={<PostAddIcon />} variant="contained" onClick={() => decide.mutate({ id: detail.id, decision: 'post' })}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})` }}>ثبت در سند</Button>
        </DialogActions>
      </Dialog>
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
          <Typography variant="body2" color="textSecondary">قالب‌های ثبت و کارتابل تراکنش‌های منبع</Typography>
        </Box>
      </Paper>

      <Paper sx={{ ...glass, overflow: 'hidden', mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: '1px solid rgba(225,225,225,0.5)' }}>
          <Tab label="قالب‌های ثبت" sx={{ fontWeight: 600, color: tab === 0 ? COLOR_DARK : undefined }} />
          <Tab label="تراکنش‌های منبع (کارتابل)" sx={{ fontWeight: 600, color: tab === 1 ? COLOR_DARK : undefined }} />
        </Tabs>
      </Paper>

      {tab === 0 && <TemplatesPanel />}
      {tab === 1 && <SourceTransactionsPanel />}
    </Box>
  );
};

export default AccountingIntegrationPage;