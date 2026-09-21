import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack,
  TextField, IconButton, Tooltip, Alert, Autocomplete, Chip,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SaveIcon from '@mui/icons-material/Save';
import DescriptionIcon from '@mui/icons-material/Description';
import BoltIcon from '@mui/icons-material/Bolt';
import { formatPersianNumber } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import CodePickerDialog from '../core/components/ui/CodePickerDialog';

const COLOR = '#10b981';
const COLOR_DARK = '#059669';
const ROWS = 10;

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.72), rgba(255,255,255,0.36))',
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 18px 50px rgba(16,185,129,0.13)',
  borderRadius: '20px',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px', background: 'rgba(255,255,255,0.5)',
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(16,185,129,0.10)' },
  },
};

const today = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const empty = (date) => ({ account: '', aux1: '', aux2: '', aux3: '', desc: '', ref: '', date, debit: '', credit: '' });

const AccountingDocumentNewPage = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [header, setHeader] = useState({ number: '', ref_no: '', date: today(), description: '', journal: '', fiscal_year: '' });
  const [lines, setLines] = useState(() => Array.from({ length: ROWS }, () => empty(today())));
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeRow, setActiveRow] = useState(0);
  const [picker, setPicker] = useState(null);

  const { data: journals } = useQuery({ queryKey: ['doc-journals'], queryFn: () => axiosInstance.get('/accounting/journals/').then(r => r.data) });
  const { data: years } = useQuery({ queryKey: ['doc-years'], queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then(r => r.data) });
  const { data: accounts } = useQuery({ queryKey: ['doc-accounts'], queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'subsidiary' } }).then(r => r.data) });
  const { data: auxiliaries } = useQuery({ queryKey: ['doc-aux'], queryFn: () => axiosInstance.get('/accounting/auxiliary-accounts/').then(r => r.data) });
  const { data: docs } = useQuery({ queryKey: ['doc-list-number'], queryFn: () => axiosInstance.get('/accounting/documents/').then(r => r.data) });

  const journalList = Array.isArray(journals) ? journals : journals?.results || [];
  const yearList = Array.isArray(years) ? years : years?.results || [];
  const accountList = Array.isArray(accounts) ? accounts : accounts?.results || [];
  const auxList = Array.isArray(auxiliaries) ? auxiliaries : auxiliaries?.results || [];
  const docList = Array.isArray(docs) ? docs : docs?.results || [];

  // auto suggested document number
  useEffect(() => {
    if (header.number) return;
    const nums = docList.map(d => parseInt(d.number) || d.id || 0).filter(n => n);
    const next = (Math.max(0, ...nums) + 1);
    setHeader(p => ({ ...p, number: String(next).padStart(5, '0') }));
  }, [docList]);

  const setHeaderField = (k, v) => setHeader(p => ({ ...p, [k]: v }));
  const setLine = (i, k, v) => setLines(p => { const l = [...p]; l[i] = { ...l[i], [k]: v }; return l; });
  const addRow = () => setLines(p => [...p, empty(today())]);
  const removeRow = (i) => setLines(p => p.length > ROWS ? p.filter((_, idx) => idx !== i) : p.map((r, idx) => idx === i ? empty(today()) : r));

  const openPicker = (row, slot) => setPicker({ row, slot });
  const pickerOptions = () => {
    if (!picker) return [];
    if (picker.slot === 'account') return accountList;
    const acc = accountList.find(a => a.id === lines[picker.row].account);
    const catKey = { aux1: 'auxiliary_category_1', aux2: 'auxiliary_category_2', aux3: 'auxiliary_category_3' }[picker.slot];
    const catId = acc ? acc[catKey] : null;
    return catId ? auxList.filter(a => a.category === catId) : [];
  };

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const diff = totalDebit - totalCredit;

  // ردیف فعال برای نوار شرح
  const active = lines[activeRow] || {};
  const activeAccount = accountList.find(a => a.id === active.account);
  const activeAuxs = ['aux1', 'aux2', 'aux3'].map(k => auxList.find(a => a.id === active[k]));

  const totalBalanceOk = Math.abs(diff) < 0.001;

  const submit = async () => {
    setMsg(null);
    const payloadLines = lines
      .filter(l => l.account || l.desc || l.debit || l.credit || l.aux1 || l.aux2 || l.aux3 || l.ref)
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
    if (!totalBalanceOk) { setMsg({ ok: false, text: 'سند توازن ندارد (اختلاف بدهکار/بستانکار)' }); return; }

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
      navigate('/accounting/documents');
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || 'خطا در ذخیره سند' });
      setSaving(false);
    }
  };

  return (
    <Box>
      {/* هدر */}
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '20px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 10px 28px ${COLOR}55` }}>
          <DescriptionIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>سند جدید</Typography>
          <Typography variant="body2" color="textSecondary">ثبت آرتیکل به آرتیکل با توازن خودکار</Typography>
        </Box>
      </Paper>

      {msg && <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '14px' }} onClose={() => setMsg(null)}>{msg.text}</Alert>}

      {/* هدر سند */}
      <Paper sx={{ ...glass, p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField size="small" label="شماره سند" value={header.number} onChange={e => setHeaderField('number', e.target.value)} sx={{ width: 130, ...fieldSx }}
            InputProps={{ endAdornment: <Tooltip title="شماره خودکار"><IconButton size="small" onClick={() => setHeaderField('number', String((Math.max(0, ...docList.map(d => parseInt(d.number) || 0)) + 1)).padStart(5, '0'))}><BoltIcon fontSize="small" color="primary" /></IconButton></Tooltip> }} />
          <TextField size="small" label="شماره عطف" value={header.ref_no} onChange={e => setHeaderField('ref_no', e.target.value)} sx={{ width: 130, ...fieldSx }} />
          <JalaliDatePicker noHelper label="تاریخ سند" value={header.date} onChange={v => setHeaderField('date', v)} sx={{ width: 150 }} />
          <Autocomplete size="small" options={yearList} getOptionLabel={o => o.name} value={yearList.find(y => y.id === header.fiscal_year) || null} onChange={(e, v) => setHeaderField('fiscal_year', v ? v.id : '')} renderInput={p => <TextField {...p} label="سال مالی" />} sx={{ width: 170 }} />
          <Autocomplete size="small" options={journalList} getOptionLabel={o => o.name} value={journalList.find(j => j.id === header.journal) || null} onChange={(e, v) => setHeaderField('journal', v ? v.id : '')} renderInput={p => <TextField {...p} label="دفتر روزنامه" />} sx={{ width: 170 }} />
          <TextField size="small" label="شرح سند" value={header.description} onChange={e => setHeaderField('description', e.target.value)} sx={{ flex: 1, minWidth: 260, ...fieldSx }} />
        </Stack>
      </Paper>

      {/* جدول */}
      <Paper sx={{ ...glass, overflow: 'auto', mb: 1.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '44px 0.9fr 1fr 1fr 1fr 1.6fr 0.9fr 0.8fr 1fr 1fr', minWidth: 1180 }}>
          {['ردیف', 'کد معین', 'تفصیل ۱', 'تفصیل ۲', 'تفصیل ۳', 'شرح آرتیکل', 'شماره چک/مقدار', 'تاریخ', 'بدهکار', 'بستانکار'].map((h, i) => (
            <Box key={i} sx={{ px: 1.5, py: 1.4, fontWeight: 800, fontSize: 12.5, color: COLOR_DARK, borderBottom: '1px solid rgba(16,185,129,0.15)', borderLeft: i ? '1px solid rgba(0,0,0,0.04)' : 'none', bgcolor: 'rgba(16,185,129,0.05)' }}>{h}</Box>
          ))}
        </Box>

        {lines.map((l, i) => {
          const selectedAccount = accountList.find(a => a.id === l.account);
          // سه شکاف تفصیل بر اساس دسته‌های مرتبط با معین
          const slots = [
            { key: 'aux1', catId: selectedAccount?.auxiliary_category_1 },
            { key: 'aux2', catId: selectedAccount?.auxiliary_category_2 },
            { key: 'aux3', catId: selectedAccount?.auxiliary_category_3 },
          ];
          return (
            <Box key={i} onClick={() => setActiveRow(i)}
              sx={{ display: 'grid', gridTemplateColumns: '44px 0.9fr 1fr 1fr 1fr 1.6fr 0.9fr 0.8fr 1fr 1fr', borderBottom: '1px solid rgba(0,0,0,0.05)', bgcolor: activeRow === i ? 'rgba(16,185,129,0.05)' : 'transparent', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1 }}><Typography variant="body2" color="textSecondary">{i + 1}</Typography></Box>

              {/* کد معین */}
              <Box sx={{ p: 0.5 }}>
                <CodeCell label={selectedAccount?.code || ''} onClick={() => openPicker(i, 'account')} />
              </Box>

              {/* تفصیل‌ها */}
              {slots.map((slot) => {
                const aux = auxList.find(a => a.id === l[slot.key]);
                return (
                  <Box key={slot.key} sx={{ p: 0.5 }}>
                    <CodeCell label={aux?.code || ''} onClick={() => slot.catId && openPicker(i, slot.key)} disabled={!slot.catId} />
                  </Box>
                );
              })}

              <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth variant="standard" value={l.desc} onChange={e => setLine(i, 'desc', e.target.value)} placeholder="" /></Box>
              <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth variant="standard" value={l.ref} onChange={e => setLine(i, 'ref', e.target.value)} placeholder="—" /></Box>
              <Box sx={{ p: 0.5 }}><JalaliDatePicker noHelper value={l.date} onChange={v => setLine(i, 'date', v)} /></Box>
              <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth type="number" variant="standard" value={l.debit} onChange={e => setLine(i, 'debit', e.target.value)} /></Box>
              <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth type="number" variant="standard" value={l.credit} onChange={e => setLine(i, 'credit', e.target.value)} /></Box>
            </Box>
          );
        })}

        {/* جمع */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '44px 0.9fr 1fr 1fr 1fr 1.6fr 0.9fr 0.8fr 1fr 1fr', borderTop: '2px solid rgba(16,185,129,0.3)', bgcolor: 'rgba(16,185,129,0.06)', fontWeight: 800 }}>
          <Box sx={{ p: 1.5 }} />
          <Box sx={{ p: 1.5, color: COLOR_DARK }}>جمع کل</Box>
          <Box /><Box /><Box />
          <Box sx={{ p: 1.5, color: totalBalanceOk ? COLOR_DARK : '#ef4444' }}>{totalBalanceOk ? 'متوازن ✓' : `مغایرت ${formatPersianNumber(diff)}`}</Box>
          <Box /><Box />
          <Box sx={{ p: 1.5, color: '#2563eb' }}>{formatPersianNumber(totalDebit)}</Box>
          <Box sx={{ p: 1.5, color: '#2563eb' }}>{formatPersianNumber(totalCredit)}</Box>
        </Box>
      </Paper>

      {/* نوار شرح کدها — چارچوب‌بندی‌شده و تفکیک‌شده */}
      <Paper sx={{ ...glass, p: 1.5, mb: 1.5 }}>
        <Typography variant="caption" color={COLOR_DARK} fontWeight={800}>شرح کدهای ردیف انتخاب‌شده</Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          <Paper sx={{ px: 2, py: 1, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(16,185,129,0.2)', minWidth: 160 }}>
            <Typography variant="caption" color="textSecondary">معین</Typography>
            <Typography variant="body2" fontWeight={700}>{activeAccount ? `${activeAccount.code} - ${activeAccount.name}` : '—'}</Typography>
          </Paper>
          {['تفصیل ۱', 'تفصیل ۲', 'تفصیل ۳'].map((label, idx) => (
            <Paper key={label} sx={{ px: 2, py: 1, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(16,185,129,0.2)', minWidth: 150 }}>
              <Typography variant="caption" color="textSecondary">{label}</Typography>
              <Typography variant="body2" fontWeight={700}>{activeAuxs[idx] ? `${activeAuxs[idx].code} - ${activeAuxs[idx].name}` : '—'}</Typography>
            </Paper>
          ))}
        </Stack>
      </Paper>

      {/* کنترل */}
      <Stack direction="row" spacing={1.5}>
        <Button startIcon={<AddCircleIcon />} onClick={addRow} variant="outlined" color="primary" sx={{ borderRadius: '12px' }}>افزودن ردیف</Button>
        <Button startIcon={<RemoveCircleIcon />} onClick={() => removeRow(lines.length - 1)} variant="outlined" color="error" sx={{ borderRadius: '12px' }}>حذف ردیف</Button>
      </Stack>

      <CodePickerDialog
        open={!!picker}
        title={picker?.slot === 'account' ? 'انتخاب کد معین' : 'انتخاب تفصیل'}
        options={pickerOptions()}
        color={COLOR_DARK}
        onClose={() => setPicker(null)}
        onSelect={(o) => { if (picker) setLine(picker.row, picker.slot, o.id); }}
      />

      {/* دکمه‌ها */}
      <Stack direction="row" spacing={1.5} justifyContent="flex-end" sx={{ mt: 2.5 }}>
        <Button startIcon={<ArrowForwardIcon />} onClick={() => navigate('/accounting/documents')} variant="outlined" sx={{ borderRadius: '12px' }}>خروج</Button>
        <Button startIcon={<SaveIcon />} onClick={submit} variant="contained" disabled={saving || !totalBalanceOk}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', px: 3, boxShadow: `0 10px 24px ${COLOR}44` }}>
          {saving ? <CircularProgress size={20} /> : 'ذخیره سند'}
        </Button>
      </Stack>
    </Box>
  );
};

const CodeCell = ({ label, onClick, disabled }) => (
  <Box sx={{ p: 0.5 }}>
    <Button
      fullWidth variant="text" size="small" onClick={onClick} disabled={disabled}
      sx={{ justifyContent: 'flex-start', color: label ? 'text.primary' : 'text.disabled', textTransform: 'none', borderRadius: '8px', '&:hover': { background: 'rgba(16,185,129,0.08)' } }}>
      <Chip size="small" label={label || 'جستجو'} sx={{ fontWeight: 700, bgcolor: label ? 'rgba(16,185,129,0.12)' : 'transparent', color: label ? COLOR_DARK : 'text.disabled' }} />
    </Button>
  </Box>
);

export default AccountingDocumentNewPage;
