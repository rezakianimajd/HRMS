import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Alert,
  TextField, Autocomplete, Chip, IconButton, Tooltip,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import SaveIcon from '@mui/icons-material/Save';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatPersianNumber } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import CodePickerDialog from '../core/components/ui/CodePickerDialog';

const COLOR = '#10b981';
const COLOR_DARK = '#059669';
const ROWS = 5;
const ALLOWED_CATEGORIES = ['asset', 'expense', 'cost_of_sales'];

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 14px 40px rgba(16,185,129,0.12)', borderRadius: '16px',
};

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const empty = () => ({ account: '', aux1: '', aux2: '', aux3: '', invoice: '', supplier: '', date: today(), desc: '', debit: '', attachment: null });

const PettyCashExpenseNewPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [fund, setFund] = useState('');
  const [date, setDate] = useState(today());
  const [desc, setDesc] = useState('');
  const [lines, setLines] = useState(() => Array.from({ length: ROWS }, empty));
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  // پیکر انتخاب کد
  const [picker, setPicker] = useState(null); // { row, slot }

  const { data: funds } = useQuery({ queryKey: ['pc-funds'], queryFn: () => axiosInstance.get('/petty-cash-funds/').then(r => r.data) });
  const { data: accounts } = useQuery({ queryKey: ['pc-accounts'], queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'subsidiary' } }).then(r => r.data) });
  const { data: auxs } = useQuery({ queryKey: ['pc-aux'], queryFn: () => axiosInstance.get('/accounting/auxiliary-accounts/').then(r => r.data) });

  const fundList = Array.isArray(funds) ? funds : funds?.results || [];
  const accList = (Array.isArray(accounts) ? accounts : accounts?.results || []).filter(a => ALLOWED_CATEGORIES.includes(a.account_type_category));
  const auxList = Array.isArray(auxs) ? auxs : auxs?.results || [];

  const setLine = (i, k, v) => setLines(p => { const l = [...p]; l[i] = { ...l[i], [k]: v }; return l; });
  const addRow = () => setLines(p => [...p, empty()]);
  const total = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);

  const openPicker = (row, slot) => setPicker({ row, slot });
  const pickerOptions = () => {
    if (!picker) return [];
    if (picker.slot === 'account') return accList;
    const acc = accList.find(a => a.id === lines[picker.row].account);
    const catKey = { aux1: 'auxiliary_category_1', aux2: 'auxiliary_category_2', aux3: 'auxiliary_category_3' }[picker.slot];
    const catId = acc ? acc[catKey] : null;
    return catId ? auxList.filter(a => a.category === catId) : [];
  };

  const submit = async () => {
    const activeLines = lines.filter(l => l.account || l.debit || l.desc || l.invoice || l.supplier || l.attachment);
    if (!fund || activeLines.length === 0 || total <= 0) { setMsg({ ok: false, text: 'تنخواه و حداقل یک سطر با مبلغ معتبر وارد کنید' }); return; }

    // استفاده از FormData برای ارسال فایل پیوست
    const fd = new FormData();
    fd.append('fund', fund);
    fd.append('date', date);
    fd.append('description', desc);
    activeLines.forEach((l, idx) => {
      fd.append(`lines[${idx}].account`, l.account || '');
      fd.append(`lines[${idx}].auxiliary_1`, l.aux1 || '');
      fd.append(`lines[${idx}].auxiliary_2`, l.aux2 || '');
      fd.append(`lines[${idx}].auxiliary_3`, l.aux3 || '');
      fd.append(`lines[${idx}].invoice_number`, l.invoice || '');
      fd.append(`lines[${idx}].supplier`, l.supplier || '');
      fd.append(`lines[${idx}].expense_date`, l.date || '');
      fd.append(`lines[${idx}].description`, l.desc || '');
      fd.append(`lines[${idx}].debit`, Number(l.debit) || 0);
      if (l.attachment) fd.append(`lines[${idx}].attachment`, l.attachment);
    });

    setSaving(true);
    try {
      await axiosInstance.post('/petty-cash-expense-statements/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      qc.invalidateQueries({ queryKey: ['petty-expenses'] });
      navigate('/petty-cash/expenses');
    } catch (e) { setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }); setSaving(false); }
  };

  const header = ['ردیف', 'کد معین', 'تفصیل ۱', 'تفصیل ۲', 'تفصیل ۳', 'شماره فاکتور', 'تاریخ', 'فروشنده', 'شرح هزینه', 'مبلغ (ریال)', 'پیوست'];
  const cols = '44px 0.9fr 0.9fr 0.9fr 0.9fr 0.9fr 0.8fr 0.9fr 1.3fr 0.9fr 44px';

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})` }}>
          <ReceiptIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}><Typography variant="h6" fontWeight={800} color={COLOR_DARK}>صورت ریز هزینه تنخواه</Typography>
        <Typography variant="body2" color="textSecondary">کدینگ هزینه‌ها و شارژ تنخواه</Typography></Box>
      </Paper>

      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Paper sx={{ ...glass, p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <Autocomplete size="small" options={fundList} getOptionLabel={o => `${o.code} - ${o.title}`}
            value={fundList.find(f => f.id === fund) || null} onChange={(e, v) => setFund(v ? v.id : '')}
            renderInput={p => <TextField {...p} label="تنخواه" />} sx={{ minWidth: 240 }} />
          <JalaliDatePicker noHelper label="تاریخ" value={date} onChange={setDate} sx={{ width: 150 }} />
          <TextField size="small" label="شرح صورت" value={desc} onChange={e => setDesc(e.target.value)} sx={{ flex: 1, minWidth: 240 }} />
        </Stack>
      </Paper>

      <Paper sx={{ ...glass, overflow: 'auto', mb: 1.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: cols, minWidth: 1050, bgcolor: 'rgba(16,185,129,0.06)' }}>
          {header.map((h, i) => (
            <Box key={i} sx={{ p: 1.2, fontWeight: 800, fontSize: 12, color: COLOR_DARK, borderBottom: '1px solid rgba(16,185,129,0.15)', borderLeft: i ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>{h}</Box>
          ))}
        </Box>
        {lines.map((l, i) => {
          const acc = accList.find(a => a.id === l.account);
          const slots = [
            { key: 'aux1', cat: acc?.auxiliary_category_1 },
            { key: 'aux2', cat: acc?.auxiliary_category_2 },
            { key: 'aux3', cat: acc?.auxiliary_category_3 },
          ];
          return (
            <Box key={i} sx={{ display: 'grid', gridTemplateColumns: cols, borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</Box>
              <CellPicker label={acc ? acc.code : ''} onClick={() => openPicker(i, 'account')} placeholder="جستجو" />
              {slots.map(s => {
                const aux = auxList.find(a => a.id === l[s.key]);
                return <CellPicker key={s.key} label={aux ? aux.code : ''} onClick={() => s.cat && openPicker(i, s.key)} disabled={!s.cat} placeholder={s.cat ? 'جستجو' : '—'} />;
              })}
              <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth variant="standard" value={l.invoice} onChange={e => setLine(i, 'invoice', e.target.value)} /></Box>
              <Box sx={{ p: 0.5 }}><JalaliDatePicker noHelper value={l.date} onChange={v => setLine(i, 'date', v)} /></Box>
              <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth variant="standard" value={l.supplier} onChange={e => setLine(i, 'supplier', e.target.value)} /></Box>
              <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth variant="standard" value={l.desc} onChange={e => setLine(i, 'desc', e.target.value)} /></Box>
              <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth type="number" variant="standard" value={l.debit} onChange={e => setLine(i, 'debit', e.target.value)} /></Box>
              <Box sx={{ p: 0.5, display: 'flex', alignItems: 'center' }}>
                <input type="file" id={`attach-${i}`} hidden onChange={e => setLine(i, 'attachment', e.target.files[0])} />
                <Tooltip title={l.attachment ? l.attachment.name : 'پیوست فاکتور/رسید'}>
                  <IconButton size="small" color={l.attachment ? 'success' : 'inherit'} component="label" htmlFor={`attach-${i}`}>
                    <AttachFileIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          );
        })}
        <Box sx={{ p: 1.5, fontWeight: 800, color: COLOR_DARK, bgcolor: 'rgba(16,185,129,0.06)', borderTop: '2px solid rgba(16,185,129,0.3)' }}>
          جمع کل: {formatPersianNumber(total)} ریال
        </Box>
      </Paper>

      <Button size="small" startIcon={<AddCircleIcon />} onClick={addRow} variant="outlined" sx={{ mb: 2 }}>افزودن ردیف</Button>

      <Stack direction="row" spacing={1.5} justifyContent="flex-end">
        <Button startIcon={<ArrowForwardIcon />} onClick={() => navigate('/petty-cash/expenses')} variant="outlined">انصراف</Button>
        <Button startIcon={<SaveIcon />} onClick={submit} variant="contained" disabled={saving}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', px: 3 }}>
          {saving ? <CircularProgress size={20} /> : 'ذخیره صورت'}
        </Button>
      </Stack>

      <CodePickerDialog
        open={!!picker}
        title={picker?.slot === 'account' ? 'انتخاب کد معین' : 'انتخاب تفصیل'}
        options={pickerOptions()}
        color={COLOR_DARK}
        onClose={() => setPicker(null)}
        onSelect={(o) => { if (picker) setLine(picker.row, picker.slot === 'account' ? 'account' : picker.slot, o.id); }}
      />
    </Box>
  );
};

const CellPicker = ({ label, onClick, disabled, placeholder }) => (
  <Box sx={{ p: 0.5 }}>
    <Button
      fullWidth variant="text" size="small" onClick={onClick} disabled={disabled}
      sx={{ justifyContent: 'flex-start', color: label ? 'text.primary' : 'text.disabled', textTransform: 'none', borderRadius: '8px', '&:hover': { background: 'rgba(16,185,129,0.08)' } }}>
      <Chip size="small" label={label || placeholder} sx={{ fontWeight: 700, bgcolor: label ? 'rgba(16,185,129,0.12)' : 'transparent', color: label ? COLOR_DARK : 'text.disabled' }} />
    </Button>
  </Box>
);

export default PettyCashExpenseNewPage;
