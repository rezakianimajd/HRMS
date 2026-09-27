import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack,
  TextField, IconButton, Tooltip, Alert, Autocomplete, Checkbox,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SaveIcon from '@mui/icons-material/Save';
import DescriptionIcon from '@mui/icons-material/Description';
import BoltIcon from '@mui/icons-material/Bolt';
import { formatPersianNumber, toPersianDigits, toEnglishDigits } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import CodePickerDialog from '../core/components/ui/CodePickerDialog';

const COLOR = '#10b981';
const COLOR_DARK = '#059669';
const ROWS = 8;
const FONT = 'Vazirmatn, IRANSans, sans-serif';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.48))',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 16px 44px rgba(16,185,129,0.12)',
  borderRadius: '16px',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px', background: 'rgba(255,255,255,0.6)',
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 3px rgba(16,185,129,0.10)' },
  },
};

const today = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const empty = (date) => ({
  account: '', aux1: '', aux2: '', aux3: '',
  invoice_number: '', vat_amount: '', desc: '', date, debit: '', credit: '',
  season_flag: false,
});

const Cell = ({ children, center = false }) => (
  <Box sx={{ px: 0.25, py: 0.25, display: 'flex', alignItems: 'center', justifyContent: center ? 'center' : 'flex-start', minWidth: 0 }}>
    {children}
  </Box>
);

const faSep = (v) => {
  if (v == null || v === '') return '';
  const num = String(v);
  const neg = num.startsWith('-');
  const [int, dec] = num.replace('-', '').split('.');
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  return toPersianDigits((neg ? '-' : '') + withSep + (dec != null ? '.' + dec : ''));
};

const FaField = ({ value, onChange, placeholder = '', numeric = false, center = false }) => (
  <TextField
    size="small" fullWidth type="text" inputMode={numeric ? 'decimal' : 'text'} variant="standard"
    value={numeric ? faSep(value) : toPersianDigits(value == null ? '' : String(value))}
    onChange={(e) => {
      const eng = toEnglishDigits(e.target.value);
      onChange(numeric ? eng.replace(/[^0-9.-]/g, '') : eng);
    }}
    placeholder={placeholder}
    InputProps={{ disableUnderline: true, sx: { fontSize: 13.5, fontFamily: FONT } }}
    inputProps={{ style: { textAlign: center ? 'center' : 'right', fontFamily: FONT } }}
  />
);

// سلول کد قابل تایپ دستی + باز کردن دیالوگ با Space
const CodeInput = ({ code, options, onMatch, onOpenPicker, placeholder = '…' }) => {
  const [draft, setDraft] = useState('');
  useEffect(() => { setDraft(code ? String(code) : ''); }, [code]);

  const commit = () => {
    const eng = toEnglishDigits(draft);
    if (!eng) { setDraft(code ? String(code) : ''); return; }
    const opt = options.find(o => String(o.code) === eng);
    if (opt) onMatch(opt.id);
    else setDraft(code ? String(code) : '');
  };

  return (
    <TextField
      size="small" fullWidth variant="standard"
      value={toPersianDigits(draft)}
      onChange={(e) => setDraft(toEnglishDigits(e.target.value))}
      onKeyDown={(e) => {
        if (e.key === ' ') { e.preventDefault(); onOpenPicker(); }
        else if (e.key === 'Enter') { e.preventDefault(); commit(); e.target.blur(); }
      }}
      onBlur={commit}
      placeholder={placeholder}
      InputProps={{ disableUnderline: true, sx: { fontSize: 13.5, fontFamily: FONT } }}
      inputProps={{ style: { textAlign: 'center', fontFamily: FONT } }}
    />
  );
};

const AccountingDocumentNewPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
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
  const { data: existingDoc } = useQuery({
    queryKey: ['accounting-document', id],
    queryFn: () => axiosInstance.get(`/accounting/documents/${id}/`).then(r => r.data),
    enabled: isEdit,
  });

  const list = (d) => Array.isArray(d) ? d : d?.results || [];
  const journalList = list(journals);
  const yearList = list(years);
  const accountList = list(accounts);
  const auxList = list(auxiliaries);
  const docList = list(docs);

  useEffect(() => {
    if (isEdit || header.number) return;
    const nums = docList.map(d => parseInt(d.number) || d.id || 0).filter(n => n);
    const next = (Math.max(0, ...nums) + 1);
    setHeader(p => ({ ...p, number: String(next).padStart(5, '0') }));
  }, [docList, isEdit]);

  useEffect(() => {
    if (existingDoc) {
      setHeader({
        number: existingDoc.number || '',
        ref_no: existingDoc.reference || '',
        date: existingDoc.date,
        description: existingDoc.description || '',
        journal: existingDoc.journal || '',
        fiscal_year: existingDoc.fiscal_year || '',
      });
      const loaded = (existingDoc.lines || []).map(l => ({
        account: l.account || '',
        aux1: l.auxiliary_1 || '',
        aux2: l.auxiliary_2 || '',
        aux3: l.auxiliary_3 || '',
        invoice_number: l.invoice_number || '',
        vat_amount: l.vat_amount || '',
        desc: l.description || '',
        date: l.maturity_date || existingDoc.date,
        debit: l.debit,
        credit: l.credit,
        season_flag: !!l.season_flag,
      }));
      setLines(loaded.length ? loaded : Array.from({ length: ROWS }, () => empty(today())));
      setActiveRow(0);
    }
  }, [existingDoc]);

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

  let totalDebit = 0;
  let totalCredit = 0;
  lines.forEach((l) => {
    const d = Number(l.debit) || 0;
    const c = Number(l.credit) || 0;
    const v = Number(l.vat_amount) || 0;
    if (d && !c) totalDebit += d + v;
    else if (c && !d) totalCredit += c + v;
    else { totalDebit += d; totalCredit += c; }
  });
  const diff = totalDebit - totalCredit;
  const totalBalanceOk = Math.abs(diff) < 0.001;

  const active = lines[activeRow] || {};
  const activeAccount = accountList.find(a => a.id === active.account);
  const activeAuxs = ['aux1', 'aux2', 'aux3'].map(k => auxList.find(a => a.id === active[k]));

  const fillBalance = () => {
    const i = activeRow;
    const othersDebit = lines.filter((_, idx) => idx !== i).reduce((s, x) => s + (Number(x.debit) || 0) + (Number(x.debit) && !Number(x.credit) ? (Number(x.vat_amount) || 0) : 0), 0);
    const othersCredit = lines.filter((_, idx) => idx !== i).reduce((s, x) => s + (Number(x.credit) || 0) + (Number(x.credit) && !Number(x.debit) ? (Number(x.vat_amount) || 0) : 0), 0);
    if (othersDebit > othersCredit) {
      setLine(i, 'credit', String(othersDebit - othersCredit));
      setLine(i, 'debit', '');
      setLine(i, 'vat_amount', '');
    } else {
      setLine(i, 'debit', String(othersCredit - othersDebit));
      setLine(i, 'credit', '');
      setLine(i, 'vat_amount', '');
    }
  };

  const copyRow = () => {
    const src = { ...lines[activeRow], account: '', aux1: '', aux2: '', aux3: '' };
    setLines(p => [...p, src]);
  };

  useEffect(() => {
    const h = (e) => {
      if (!e.target || !e.target.tagName) return;
      const tag = e.target.tagName.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea';
      if (e.ctrlKey && e.key.toLowerCase() === 'd') { e.preventDefault(); copyRow(); }
      else if (e.key === 'F2') { e.preventDefault(); setPicker({ row: activeRow, slot: 'account' }); }
      else if (e.key === 'F3') { e.preventDefault(); setPicker({ row: activeRow, slot: 'aux1' }); }
      else if (e.key === 'Enter' && isInput) { e.preventDefault(); setActiveRow(p => Math.min(p + 1, lines.length - 1)); }
      else if (e.key === 'F9') { e.preventDefault(); fillBalance(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [activeRow, lines]);

  const rowWarnings = (i) => {
    const l = lines[i];
    const acc = accountList.find(a => a.id === l.account);
    if (!acc) return [];
    const warns = [];
    if (acc.requires_party && !l.aux1) warns.push('طرف/تفصیلی الزامی');
    return warns;
  };

  const submit = async () => {
    setMsg(null);
    const payloadLines = lines
      .filter(l => l.account || l.desc || l.debit || l.credit || l.aux1 || l.aux2 || l.aux3 || l.invoice_number || l.vat_amount)
      .map(l => ({
        account: l.account || null,
        auxiliary_1: l.aux1 || null,
        auxiliary_2: l.aux2 || null,
        auxiliary_3: l.aux3 || null,
        description: l.desc || '',
        maturity_date: l.date || null,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        invoice_number: l.invoice_number || '',
        vat_amount: Number(l.vat_amount) || 0,
        season_flag: !!l.season_flag,
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
      if (isEdit) await axiosInstance.patch(`/accounting/documents/${id}/`, payload);
      else await axiosInstance.post('/accounting/documents/', payload);
      qc.invalidateQueries({ queryKey: ['accounting-documents'] });
      navigate('/accounting/documents');
    } catch (e) {
      const d = e.response?.data;
      let text = d?.error || d?.detail;
      if (!text && d && typeof d === 'object') {
        const parts = [];
        const walk = (obj, path = '') => {
          Object.entries(obj || {}).forEach(([k, v]) => {
            const label = path ? `${path}.${k}` : k;
            if (Array.isArray(v)) parts.push(`${label}: ${v.map(String).join('، ')}`);
            else if (v && typeof v === 'object') walk(v, label);
            else if (v !== null && v !== undefined && v !== '') parts.push(`${label}: ${v}`);
          });
        };
        walk(d);
        text = parts.join(' | ');
      }
      setMsg({ ok: false, text: text || 'خطا در ذخیره سند' });
      setSaving(false);
    }
  };

  const gridCols = '36px 36px 0.7fr 0.6fr 0.6fr 0.6fr 0.9fr 1.8fr 0.9fr 0.9fr 0.9fr';
  const HEADERS = ['ردیف', 'شمول', 'معین', 'تفصیل۱', 'تفصیل۲', 'تفصیل۳', 'شماره فاکتور', 'شرح', 'بدهکار', 'ارزش افزوده', 'بستانکار'];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Paper sx={{ p: 1.5, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', flexShrink: 0,
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '16px' }}>
        <Avatar sx={{ width: 44, height: 44, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 20px ${COLOR}55` }}>
          <DescriptionIcon sx={{ fontSize: 24, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <Typography variant="subtitle1" fontWeight={800} color={COLOR_DARK} sx={{ fontFamily: FONT }}>{isEdit ? 'ویرایش سند' : 'سند جدید'}</Typography>
        </Box>
        <Button size="small" startIcon={<AddCircleIcon />} onClick={addRow} variant="outlined" color="primary" sx={{ borderRadius: '10px', fontFamily: FONT }}>افزودن ردیف</Button>
        <Button size="small" startIcon={<RemoveCircleIcon />} onClick={() => removeRow(lines.length - 1)} variant="outlined" color="error" sx={{ borderRadius: '10px', fontFamily: FONT }}>حذف ردیف</Button>
        <Button size="small" startIcon={<ArrowForwardIcon />} onClick={() => navigate('/accounting/documents')} variant="outlined" sx={{ borderRadius: '10px', fontFamily: FONT }}>خروج</Button>
        <Button size="small" startIcon={<SaveIcon />} onClick={submit} variant="contained" disabled={saving || !totalBalanceOk}
          sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '10px', px: 2.5, boxShadow: `0 8px 20px ${COLOR}44`, fontFamily: FONT }}>
          {saving ? <CircularProgress size={16} /> : (isEdit ? 'به‌روزرسانی' : 'ذخیره سند')}
        </Button>
      </Paper>

      {msg && <Alert severity={msg.ok ? 'success' : 'error'} onClose={() => setMsg(null)} sx={{ mb: 1, borderRadius: '10px', fontSize: 13, flexShrink: 0 }}>{msg.text}</Alert>}

      <Paper sx={{ ...glass, p: 1.5, mb: 1.5, flexShrink: 0 }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
          <TextField size="small" label="شماره سند" value={header.number} onChange={e => setHeaderField('number', e.target.value)} sx={{ width: 120, ...fieldSx }}
            InputProps={{ endAdornment: <Tooltip title="شماره خودکار"><IconButton size="small" onClick={() => setHeaderField('number', String((Math.max(0, ...docList.map(d => parseInt(d.number) || 0)) + 1)).padStart(5, '0'))}><BoltIcon fontSize="small" color="primary" /></IconButton></Tooltip> }} />
          <TextField size="small" label="شماره عطف" value={header.ref_no} onChange={e => setHeaderField('ref_no', e.target.value)} sx={{ width: 120, ...fieldSx }} />
          <JalaliDatePicker noHelper label="تاریخ سند" value={header.date} onChange={v => setHeaderField('date', v)} sx={{ width: 145 }} />
          <Autocomplete size="small" options={yearList} getOptionLabel={o => o.name} value={yearList.find(y => y.id === header.fiscal_year) || null} onChange={(e, v) => setHeaderField('fiscal_year', v ? v.id : '')} renderInput={p => <TextField {...p} label="سال مالی" />} sx={{ width: 160 }} />
          <Autocomplete size="small" options={journalList} getOptionLabel={o => o.name} value={journalList.find(j => j.id === header.journal) || null} onChange={(e, v) => setHeaderField('journal', v ? v.id : '')} renderInput={p => <TextField {...p} label="دفتر روزنامه" />} sx={{ width: 160 }} />
          <TextField size="small" label="شرح سند" value={header.description} onChange={e => setHeaderField('description', e.target.value)} sx={{ flex: 1, minWidth: 200, ...fieldSx }} />
        </Stack>
      </Paper>

      <Paper sx={{ ...glass, p: 1, mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: totalBalanceOk ? COLOR : '#ef4444', boxShadow: `0 0 8px ${totalBalanceOk ? COLOR : '#ef4444'}` }} />
          <Typography variant="body2" fontWeight={800} sx={{ color: totalBalanceOk ? COLOR_DARK : '#ef4444', fontFamily: FONT }}>
            {totalBalanceOk ? 'سند متوازن است' : `مغایرت: ${formatPersianNumber(diff)}`}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, border: `1px solid ${COLOR}30`, borderRadius: '10px', px: 1.5, py: 0.5, bgcolor: 'rgba(16,185,129,0.06)' }}>
            <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>جمع بدهکار</Typography>
            <Typography variant="body2" fontWeight={900} sx={{ color: '#2563eb', fontFamily: FONT }}>{formatPersianNumber(totalDebit)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, border: `1px solid ${COLOR}30`, borderRadius: '10px', px: 1.5, py: 0.5, bgcolor: 'rgba(16,185,129,0.06)' }}>
            <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>جمع بستانکار</Typography>
            <Typography variant="body2" fontWeight={900} sx={{ color: '#059669', fontFamily: FONT }}>{formatPersianNumber(totalCredit)}</Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ ...glass, overflow: 'hidden', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: gridCols, minWidth: 1000, flexShrink: 0 }}>
          {HEADERS.map((h, i) => (
            <Box key={i} sx={{ px: 1, py: 0.8, fontWeight: 700, fontSize: 11.5, color: COLOR_DARK, borderBottom: '1px solid rgba(16,185,129,0.15)', borderLeft: i ? '1px solid rgba(0,0,0,0.04)' : 'none', bgcolor: 'rgba(16,185,129,0.05)', whiteSpace: 'nowrap', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>{h}</Box>
          ))}
        </Box>

        <Box sx={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {lines.map((l, i) => {
            const selectedAccount = accountList.find(a => a.id === l.account);
            const slots = [
              { key: 'aux1', catId: selectedAccount?.auxiliary_category_1 },
              { key: 'aux2', catId: selectedAccount?.auxiliary_category_2 },
              { key: 'aux3', catId: selectedAccount?.auxiliary_category_3 },
            ];
            const warns = rowWarnings(i);
            return (
              <Box key={i} onClick={() => setActiveRow(i)}
                sx={{ display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center', borderBottom: '1px solid rgba(0,0,0,0.05)', bgcolor: activeRow === i ? 'rgba(16,185,129,0.06)' : 'transparent', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }, minHeight: 48 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>{toPersianDigits(i + 1)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Tooltip title="شامل معاملات فصلی و ارزش افزوده">
                    <Checkbox size="small" sx={{ p: 0.15, '& .MuiSvgIcon-root': { fontSize: 15 } }} checked={l.season_flag} onChange={e => setLine(i, 'season_flag', e.target.checked)} />
                  </Tooltip>
                </Box>
                <Cell>
                  <CodeInput
                    code={selectedAccount?.code || ''}
                    options={accountList}
                    onMatch={(id) => setLine(i, 'account', id)}
                    onOpenPicker={() => openPicker(i, 'account')}
                  />
                </Cell>
                {slots.map((slot) => {
                  const aux = auxList.find(a => a.id === l[slot.key]);
                  const auxOptions = slot.catId ? auxList.filter(a => a.category === slot.catId) : [];
                  return (
                    <Cell key={slot.key}>
                      <CodeInput
                        code={aux?.code || ''}
                        options={auxOptions}
                        onMatch={(id) => setLine(i, slot.key, id)}
                        onOpenPicker={() => slot.catId && openPicker(i, slot.key)}
                        placeholder={l.account ? (slot.catId ? '…' : '—') : '…'}
                      />
                    </Cell>
                  );
                })}
                <Cell center><FaField center value={l.invoice_number} onChange={(v) => setLine(i, 'invoice_number', v)} /></Cell>
                <Cell><TextField size="small" fullWidth variant="standard" value={l.desc} onChange={e => setLine(i, 'desc', e.target.value)} placeholder="" InputProps={{ disableUnderline: true, sx: { fontSize: 13.5, fontFamily: FONT } }} inputProps={{ style: { textAlign: 'right', fontFamily: FONT } }} /></Cell>
                <Cell center><FaField numeric center value={l.debit} onChange={(v) => setLine(i, 'debit', v)} /></Cell>
                <Cell center><FaField numeric center value={l.vat_amount} onChange={(v) => setLine(i, 'vat_amount', v)} /></Cell>
                <Cell center><FaField numeric center value={l.credit} onChange={(v) => setLine(i, 'credit', v)} /></Cell>
              </Box>
            );
          })}
        </Box>
      </Paper>

      <Paper sx={{ ...glass, p: 1, mt: 1.5, flexShrink: 0, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', px: 1.5, py: 0.5 }}>
          <Typography variant="caption" sx={{ color: COLOR_DARK, fontWeight: 800, fontFamily: FONT }}>معین:</Typography>
          <Typography variant="body2" fontWeight={700} sx={{ fontFamily: FONT }}>{activeAccount ? `${activeAccount.code} - ${activeAccount.name}` : '—'}</Typography>
        </Box>
        {['تفصیل ۱', 'تفصیل ۲', 'تفصیل ۳'].map((label, idx) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', px: 1.5, py: 0.5 }}>
            <Typography variant="caption" sx={{ color: COLOR_DARK, fontWeight: 800, fontFamily: FONT }}>{label}:</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ fontFamily: FONT }}>{activeAuxs[idx] ? `${activeAuxs[idx].code} - ${activeAuxs[idx].name}` : '—'}</Typography>
          </Box>
        ))}
      </Paper>

      <CodePickerDialog
        open={!!picker}
        title={picker?.slot === 'account' ? 'انتخاب کد معین' : 'انتخاب تفصیل'}
        options={pickerOptions()}
        color={COLOR_DARK}
        onClose={() => setPicker(null)}
        onSelect={(o) => { if (picker) setLine(picker.row, picker.slot, o.id); }}
      />
    </Box>
  );
};

export default AccountingDocumentNewPage;