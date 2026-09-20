import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, IconButton, Tooltip, Alert, Autocomplete, Grid, InputAdornment,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SaveIcon from '@mui/icons-material/Save';
import DescriptionIcon from '@mui/icons-material/Description';
import { formatPersianNumber } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const COLOR = '#10b981';
const COLOR_DARK = '#059669';
const ROWS = 10;

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.7), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.65)',
  boxShadow: '0 16px 46px rgba(16,185,129,0.12)',
  borderRadius: '18px',
};

const cellSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '0px', background: 'transparent',
    '&.Mui-focused': { background: '#fff', boxShadow: 'inset 0 0 0 1.5px #10b98155' },
  },
};

const empty = () => ({ account: '', account_q: '', aux1: '', aux2: '', aux3: '', desc: '', ref: '', date: '', debit: '', credit: '' });

const AccountingDocumentNewPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [header, setHeader] = useState({ number: '', ref_no: '', date: '', description: '', status: 'draft' });
  const [lines, setLines] = useState(Array.from({ length: ROWS }, empty));
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: journals } = useQuery({ queryKey: ['doc-journals'], queryFn: () => axiosInstance.get('/accounting/journals/').then(r => r.data) });
  const { data: years } = useQuery({ queryKey: ['doc-years'], queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then(r => r.data) });
  const { data: accounts } = useQuery({ queryKey: ['doc-accounts'], queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'subsidiary' } }).then(r => r.data) });
  const { data: auxiliaries } = useQuery({ queryKey: ['doc-aux'], queryFn: () => axiosInstance.get('/accounting/auxiliary-accounts/').then(r => r.data) });

  const journalList = Array.isArray(journals) ? journals : journals?.results || [];
  const yearList = Array.isArray(years) ? years : years?.results || [];
  const accountList = Array.isArray(accounts) ? accounts : accounts?.results || [];
  const auxList = Array.isArray(auxiliaries) ? auxiliaries : auxiliaries?.results || [];

  const setHeaderField = (k, v) => setHeader(p => ({ ...p, [k]: v }));
  const setLine = (i, k, v) => setLines(p => { const l = [...p]; l[i] = { ...l[i], [k]: v }; return l; });
  const addRow = () => setLines(p => [...p, empty()]);
  const removeRow = (i) => setLines(p => p.length > ROWS ? p.filter((_, idx) => idx !== i) : p.map((r, idx) => idx === i ? empty() : r));

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const diff = totalDebit - totalCredit;

  const numberedLines = useMemo(() => lines.map((l, i) => {
    const filled = l.account || l.desc || l.debit || l.credit || l.aux1 || l.aux2 || l.aux3 || l.ref || l.date;
    return { ...l, rowNo: filled ? i + 1 : '' };
  }), [lines]);

  const submit = async () => {
    setMsg(null);
    const payloadLines = lines
      .filter(l => l.account || l.desc || l.debit || l.credit || l.aux1 || l.aux2 || l.aux3 || l.ref || l.date)
      .map(l => ({
        account: l.account || null,
        auxiliary_1: l.aux1 || null,
        auxiliary_2: l.aux2 || null,
        auxiliary_3: l.aux3 || null,
        description: l.desc || '',
        reference: l.ref || '',
        maturity_date: l.date || null,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
      }));

    if (payloadLines.length === 0) { setMsg({ ok: false, text: 'حداقل یک آرتیکل وارد کنید' }); return; }
    if (Math.abs(diff) > 0.001) { setMsg({ ok: false, text: 'سند توازن ندارد (اختلاف بدهکار/بستانکار)' }); return; }

    const payload = {
      number: header.number || null,
      description: header.description || '',
      status: 'draft',
      date: header.date,
      fiscal_year: header.fiscal_year || null,
      journal: header.journal || null,
      reference: header.ref_no || '',
      lines: payloadLines,
    };

    setSaving(true);
    try {
      await axiosInstance.post('/accounting/documents/', payload);
      qc.invalidateQueries({ queryKey: ['accounting-documents'] });
      setMsg({ ok: true, text: 'سند ثبت شد' });
      setTimeout(() => navigate('/accounting/documents'), 600);
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'خطا در ذخیره سند' });
    } finally { setSaving(false); }
  };

  return (
    <Box>
      {/* هدر صفحه */}
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '18px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 10px 28px ${COLOR}55` }}>
          <DescriptionIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>سند جدید</Typography>
          <Typography variant="body2" color="textSecondary">ثبت آرتیکل به آرتیکل با توازن خودکار بدهکار/بستانکار</Typography>
        </Box>
      </Paper>

      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '14px' }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {/* هدر سند */}
      <Paper sx={{ ...glass, p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}><TextField size="small" fullWidth label="شماره سند" value={header.number} onChange={e => setHeaderField('number', e.target.value)} sx={cellSx} /></Grid>
          <Grid item xs={6} sm={3}><TextField size="small" fullWidth label="شماره عطف" value={header.ref_no} onChange={e => setHeaderField('ref_no', e.target.value)} sx={cellSx} /></Grid>
          <Grid item xs={6} sm={3}><JalaliDatePicker fullWidth label="تاریخ سند" value={header.date} onChange={v => setHeaderField('date', v)} /></Grid>
          <Grid item xs={6} sm={3}>
            <Autocomplete size="small" options={yearList} getOptionLabel={o => o.name}
              value={yearList.find(y => y.id === header.fiscal_year) || null}
              onChange={(e, v) => setHeaderField('fiscal_year', v ? v.id : '')}
              renderInput={p => <TextField {...p} label="سال مالی" />} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <Autocomplete size="small" options={journalList} getOptionLabel={o => o.name}
              value={journalList.find(j => j.id === header.journal) || null}
              onChange={(e, v) => setHeaderField('journal', v ? v.id : '')}
              renderInput={p => <TextField {...p} label="دفتر روزنامه" />} />
          </Grid>
          <Grid item xs={12} sm={9}><TextField size="small" fullWidth label="شرح سند" value={header.description} onChange={e => setHeaderField('description', e.target.value)} sx={cellSx} /></Grid>
        </Grid>
      </Paper>

      {/* جدول آرتیکل‌ها */}
      <Paper sx={{ ...glass, overflow: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '50px 180px 150px 150px 150px 1fr 140px 120px 140px 140px', minWidth: 1200, borderBottom: '1px solid rgba(0,0,0,0.08)', bgcolor: 'rgba(16,185,129,0.06)' }}>
          {['ردیف', 'کد معین', 'تفصیل ۱', 'تفصیل ۲', 'تفصیل ۳', 'شرح آرتیکل', 'شماره چک/مقدار', 'تاریخ', 'بدهکار', 'بستانکار'].map((h, i) => (
            <Box key={i} sx={{ p: 1.25, fontWeight: 800, fontSize: 12, color: COLOR_DARK, borderInlineStart: i ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>{h}</Box>
          ))}
        </Box>

        {numberedLines.map((l, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '50px 180px 150px 150px 150px 1fr 140px 120px 140px 140px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <Box sx={{ p: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>{l.rowNo}</Box>

            {/* کد معین (searchable) */}
            <Box sx={{ p: 0.5 }}>
              <Autocomplete size="small" options={accountList} getOptionLabel={o => `${o.code} - ${o.name}`} filterOptions={(opts, { inputValue }) => opts.filter(o => o.code.includes(inputValue) || o.name.includes(inputValue))}
                value={accountList.find(a => a.id === l.account) || null}
                onChange={(e, v) => setLine(i, 'account', v ? v.id : '')}
                renderInput={p => <TextField {...p} placeholder="جستجوی کد یا نام" />} />
            </Box>

            {/* تفصیل‌ها */}
            {[['aux1', 'تفصیل ۱'], ['aux2', 'تفصیل ۲'], ['aux3', 'تفصیل ۳']].map(([key, ph]) => (
              <Box key={key} sx={{ p: 0.5 }}>
                <Autocomplete size="small" options={auxList} getOptionLabel={o => `${o.code} - ${o.name}`}
                  value={auxList.find(a => a.id === l[key]) || null}
                  onChange={(e, v) => setLine(i, key, v ? v.id : '')}
                  renderInput={p => <TextField {...p} placeholder={ph} />} />
              </Box>
            ))}

            <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth variant="standard" value={l.desc} onChange={e => setLine(i, 'desc', e.target.value)} placeholder="شرح" /></Box>
            <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth variant="standard" value={l.ref} onChange={e => setLine(i, 'ref', e.target.value)} placeholder="—" /></Box>
            <Box sx={{ p: 0.5 }}><JalaliDatePicker small fullWidth value={l.date} onChange={v => setLine(i, 'date', v)} /></Box>
            <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth type="number" variant="standard" value={l.debit} onChange={e => setLine(i, 'debit', e.target.value)} placeholder="0" /></Box>
            <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth type="number" variant="standard" value={l.credit} onChange={e => setLine(i, 'credit', e.target.value)} placeholder="0" /></Box>
          </Box>
        ))}

        {/* Footer: جمع + مغایرت */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '50px 180px 150px 150px 150px 1fr 140px 120px 140px 140px', borderTop: '2px solid rgba(16,185,129,0.3)', bgcolor: 'rgba(16,185,129,0.05)', fontWeight: 800 }}>
          <Box sx={{ p: 1.25 }}></Box>
          <Box sx={{ p: 1.25 }}>جمع کل</Box>
          <Box /><Box /><Box />
          <Box sx={{ p: 1.25 }}>{Math.abs(diff) < 0.001 ? 'متوازن ✓' : `مغایرت ${formatPersianNumber(diff)}`}</Box>
          <Box />
          <Box />
          <Box sx={{ p: 1.25, color: '#2563eb' }}>{formatPersianNumber(totalDebit)}</Box>
          <Box sx={{ p: 1.25, color: '#2563eb' }}>{formatPersianNumber(totalCredit)}</Box>
        </Box>
      </Paper>

      {/* کنترل ردیف‌ها */}
      <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
        <Button startIcon={<AddCircleIcon />} onClick={addRow} variant="outlined" color="primary">افزودن ردیف</Button>
        <Button startIcon={<RemoveCircleIcon />} onClick={() => removeRow(lines.length - 1)} variant="outlined" color="error">حذف ردیف</Button>
      </Stack>

      {/* دکمه‌ها */}
      <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 2.5 }}>
        <Button startIcon={<ArrowForwardIcon />} onClick={() => navigate('/accounting/documents')} variant="outlined">خروج</Button>
        <Button startIcon={<SaveIcon />} onClick={submit} variant="contained" disabled={saving || Math.abs(diff) > 0.001}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', px: 3 }}>
          {saving ? <CircularProgress size={20} /> : 'ذخیره سند'}
        </Button>
      </Stack>
    </Box>
  );
};

export default AccountingDocumentNewPage;