import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Alert,
  TextField, IconButton, Tooltip, Autocomplete, Grid, InputAdornment,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import SaveIcon from '@mui/icons-material/Save';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { formatPersianNumber } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const COLOR = '#10b981';
const COLOR_DARK = '#059669';
const ROWS = 5;

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 14px 40px rgba(16,185,129,0.12)', borderRadius: '16px',
};

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const empty = () => ({ account: '', aux1: '', aux2: '', aux3: '', desc: '', debit: '' });

const PettyCashExpenseNewPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [fund, setFund] = useState('');
  const [date, setDate] = useState(today());
  const [desc, setDesc] = useState('');
  const [lines, setLines] = useState(() => Array.from({ length: ROWS }, empty));
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: funds } = useQuery({ queryKey: ['pc-funds'], queryFn: () => axiosInstance.get('/petty-cash-funds/').then(r => r.data) });
  const { data: accounts } = useQuery({ queryKey: ['pc-accounts'], queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'subsidiary' } }).then(r => r.data) });
  const { data: auxs } = useQuery({ queryKey: ['pc-aux'], queryFn: () => axiosInstance.get('/accounting/auxiliary-accounts/').then(r => r.data) });

  const fundList = Array.isArray(funds) ? funds : funds?.results || [];
  const accList = Array.isArray(accounts) ? accounts : accounts?.results || [];
  const auxList = Array.isArray(auxs) ? auxs : auxs?.results || [];

  const setLine = (i, k, v) => setLines(p => { const l = [...p]; l[i] = { ...l[i], [k]: v }; return l; });
  const addRow = () => setLines(p => [...p, empty()]);
  const total = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);

  const submit = async () => {
    const payloadLines = lines.filter(l => l.account || l.debit || l.desc).map(l => ({
      account: l.account || null, auxiliary_1: l.aux1 || null, auxiliary_2: l.aux2 || null,
      auxiliary_3: l.aux3 || null, description: l.desc || '', debit: Number(l.debit) || 0,
    }));
    if (!fund || payloadLines.length === 0 || total <= 0) { setMsg({ ok: false, text: 'تنخواه و حداقل یک سطر با مبلغ معتبر وارد کنید' }); return; }
    setSaving(true);
    try {
      await axiosInstance.post('/petty-cash-expense-statements/', { fund, date, description: desc, lines: payloadLines });
      qc.invalidateQueries({ queryKey: ['petty-expenses'] });
      navigate('/petty-cash/expenses');
    } catch (e) { setMsg({ ok: false, text: e.response?.data?.error || 'خطا' }); setSaving(false); }
  };

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
            renderInput={p => <TextField {...p} label="تنخواه" />} sx={{ minWidth: 220 }} />
          <JalaliDatePicker noHelper label="تاریخ" value={date} onChange={setDate} sx={{ width: 150 }} />
          <TextField size="small" label="شرح صورت" value={desc} onChange={e => setDesc(e.target.value)} sx={{ flex: 1, minWidth: 240 }} />
        </Stack>
      </Paper>

      <Paper sx={{ ...glass, overflow: 'auto', mb: 1.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '44px 1.2fr 1fr 1fr 1fr 1.6fr 1fr', minWidth: 900, bgcolor: 'rgba(16,185,129,0.06)' }}>
          {['ردیف', 'کد معین', 'تفصیل ۱', 'تفصیل ۲', 'تفصیل ۳', 'شرح', 'مبلغ (ریال)'].map((h, i) => (
            <Box key={i} sx={{ p: 1.4, fontWeight: 800, fontSize: 12.5, color: COLOR_DARK, borderBottom: '1px solid rgba(16,185,129,0.15)', borderLeft: i ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>{h}</Box>
          ))}
        </Box>
        {lines.map((l, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '44px 1.2fr 1fr 1fr 1fr 1.6fr 1fr', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</Box>
            <Box sx={{ p: 0.5 }}>
              <Autocomplete size="small" options={accList} getOptionLabel={o => o.code} filterOptions={(opts, { inputValue }) => opts.filter(o => o.code.includes(inputValue) || o.name.includes(inputValue))}
                renderOption={(props, o) => <li {...props}><b style={{ marginInlineEnd: 8 }}>{o.code}</b>{o.name}</li>}
                value={accList.find(a => a.id === l.account) || null} onChange={(e, v) => setLine(i, 'account', v ? v.id : '')}
                renderInput={p => <TextField {...p} variant="standard" placeholder="جستجو" />} />
            </Box>
            {['aux1', 'aux2', 'aux3'].map(k => (
              <Box key={k} sx={{ p: 0.5 }}>
                <Autocomplete size="small" options={auxList} getOptionLabel={o => o.code}
                  value={auxList.find(a => a.id === l[k]) || null} onChange={(e, v) => setLine(i, k, v ? v.id : '')}
                  renderInput={p => <TextField {...p} variant="standard" placeholder="—" />} />
              </Box>
            ))}
            <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth variant="standard" value={l.desc} onChange={e => setLine(i, 'desc', e.target.value)} /></Box>
            <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth type="number" variant="standard" value={l.debit} onChange={e => setLine(i, 'debit', e.target.value)} /></Box>
          </Box>
        ))}
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
    </Box>
  );
};

export default PettyCashExpenseNewPage;