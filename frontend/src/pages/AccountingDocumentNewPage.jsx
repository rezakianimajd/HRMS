import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack,
  TextField, IconButton, Tooltip, Alert, Autocomplete, Chip, FormControlLabel, Switch,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SaveIcon from '@mui/icons-material/Save';
import DescriptionIcon from '@mui/icons-material/Description';
import BoltIcon from '@mui/icons-material/Bolt';
import BalanceIcon from '@mui/icons-material/Balance';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import CodePickerDialog from '../core/components/ui/CodePickerDialog';

const COLOR = '#10b981';
const COLOR_DARK = '#059669';
const ROWS = 10;
const VAT_RATE = 10; // نرخ ارزش افزوده سال ۱۴۰۵ (۱۰٪)

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

const empty = (date) => ({
  account: '', aux1: '', aux2: '', aux3: '', cost_center: '', project: '', contract: '', employee: '',
  desc: '', ref: '', date, debit: '', credit: '',
  invoice_type: 'none', invoice_number: '', vat_rate: '', vat_amount: '',
  party_tax_id: '', party_national_id: '', party_postal_code: '', season_flag: false,
});

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
  const { data: costCenters } = useQuery({ queryKey: ['doc-cost-centers'], queryFn: () => axiosInstance.get('/accounting/cost-centers/').then(r => r.data) });
  const { data: projects } = useQuery({ queryKey: ['doc-projects'], queryFn: () => axiosInstance.get('/projects/').then(r => r.data) });
  const { data: contracts } = useQuery({ queryKey: ['doc-contracts'], queryFn: () => axiosInstance.get('/contracts/').then(r => r.data) });
  const { data: employees } = useQuery({ queryKey: ['doc-employees'], queryFn: () => axiosInstance.get('/employees/').then(r => r.data) });
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
  const costCenterList = list(costCenters);
  const projectList = list(projects);
  const contractList = list(contracts);
  const employeeList = list(employees);
  const docList = list(docs);

  // auto suggested document number
  useEffect(() => {
    if (isEdit || header.number) return;
    const nums = docList.map(d => parseInt(d.number) || d.id || 0).filter(n => n);
    const next = (Math.max(0, ...nums) + 1);
    setHeader(p => ({ ...p, number: String(next).padStart(5, '0') }));
  }, [docList, isEdit]);

  // بارگذاری سند موجود در حالت ویرایش
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
        cost_center: l.cost_center || '',
        project: l.project || '',
        contract: l.contract || '',
        employee: l.employee || '',
        desc: l.description || '',
        ref: l.reference || '',
        date: l.maturity_date || existingDoc.date,
        debit: l.debit,
        credit: l.credit,
        invoice_type: l.invoice_type || 'none',
        invoice_number: l.invoice_number || '',
        vat_rate: l.vat_rate || '',
        vat_amount: l.vat_amount || '',
        party_tax_id: l.party_tax_id || '',
        party_national_id: l.party_national_id || '',
        party_postal_code: l.party_postal_code || '',
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
    if (picker.slot === 'cost_center') return costCenterList;
    if (picker.slot === 'project') return projectList.map(p => ({ id: p.id, code: p.code, name: p.name }));
    if (picker.slot === 'contract') return contractList.map(c => ({ id: c.id, code: c.number || '', name: c.subject || '' }));
    if (picker.slot === 'employee') return employeeList.map(e => ({ id: e.id, code: e.employee_id || e.personnel_code || '', name: e.full_name || '' }));
    const acc = accountList.find(a => a.id === lines[picker.row].account);
    const catKey = { aux1: 'auxiliary_category_1', aux2: 'auxiliary_category_2', aux3: 'auxiliary_category_3' }[picker.slot];
    const catId = acc ? acc[catKey] : null;
    return catId ? auxList.filter(a => a.category === catId) : [];
  };

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const diff = totalDebit - totalCredit;
  const totalBalanceOk = Math.abs(diff) < 0.001;

  // ردیف فعال
  const active = lines[activeRow] || {};
  const activeAccount = accountList.find(a => a.id === active.account);
  const activeAuxs = ['aux1', 'aux2', 'aux3'].map(k => auxList.find(a => a.id === active[k]));

  // محاسبهٔ خودکار ارزش افزوده هنگام تغییر مبلغ/نرخ
  const autoVat = (i) => {
    const l = lines[i];
    const baseVal = Math.abs(Number(l.debit) || 0) || Math.abs(Number(l.credit) || 0);
    const rate = Number(l.vat_rate) || VAT_RATE;
    const vat = baseVal * rate / 100;
    setLine(i, 'vat_amount', vat ? String(Math.round(vat)) : '');
  };

  // تکمیل خودکار توازن در ردیف فعال
  const fillBalance = () => {
    const i = activeRow;
    const l = lines[i];
    const othersDebit = lines.filter((_, idx) => idx !== i).reduce((s, x) => s + (Number(x.debit) || 0), 0);
    const othersCredit = lines.filter((_, idx) => idx !== i).reduce((s, x) => s + (Number(x.credit) || 0), 0);
    if (othersDebit > othersCredit) {
      setLine(i, 'credit', String(othersDebit - othersCredit));
      setLine(i, 'debit', '');
    } else {
      setLine(i, 'debit', String(othersCredit - othersDebit));
      setLine(i, 'credit', '');
    }
  };

  // کپی ردیف
  const copyRow = () => {
    const src = { ...lines[activeRow], account: '', aux1: '', aux2: '', aux3: '' };
    setLines(p => [...p, src]);
  };

  // میانبرهای صفحه‌کلید
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

  // اعتبارسنجی بلادرنگ
  const rowWarnings = (i) => {
    const l = lines[i];
    const acc = accountList.find(a => a.id === l.account);
    if (!acc) return [];
    const warns = [];
    if (acc.requires_cost_center && !l.cost_center) warns.push('مرکز هزینه الزامی');
    if (acc.requires_project && !l.project) warns.push('پروژه الزامی');
    if (acc.requires_contract && !l.contract) warns.push('قرارداد الزامی');
    if (acc.requires_party && !l.aux1) warns.push('طرف/تفصیلی الزامی');
    if (acc.requires_employee && !l.employee) warns.push('پرسنل الزامی');
    return warns;
  };

  const submit = async () => {
    setMsg(null);
    const payloadLines = lines
      .filter(l => l.account || l.desc || l.debit || l.credit || l.aux1 || l.aux2 || l.aux3 || l.ref || l.invoice_number || l.party_tax_id)
      .map(l => ({
        account: l.account || null,
        auxiliary_1: l.aux1 || null,
        auxiliary_2: l.aux2 || null,
        auxiliary_3: l.aux3 || null,
        cost_center: l.cost_center || null,
        project: l.project || null,
        contract: l.contract || null,
        employee: l.employee || null,
        description: l.desc || '',
        reference: l.ref || '',
        maturity_date: l.date || null,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        invoice_type: l.invoice_type || 'none',
        invoice_number: l.invoice_number || '',
        vat_rate: Number(l.vat_rate) || 0,
        vat_amount: Number(l.vat_amount) || 0,
        party_tax_id: l.party_tax_id || '',
        party_national_id: l.party_national_id || '',
        party_postal_code: l.party_postal_code || '',
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
      if (isEdit) {
        await axiosInstance.patch(`/accounting/documents/${id}/`, payload);
      } else {
        await axiosInstance.post('/accounting/documents/', payload);
      }
      qc.invalidateQueries({ queryKey: ['accounting-documents'] });
      navigate('/accounting/documents');
    } catch (e) {
      setMsg({ ok: false, text: e.response?.data?.error || e.response?.data?.detail || 'خطا در ذخیره سند' });
      setSaving(false);
    }
  };

  const gridCols = '44px 0.8fr 0.85fr 0.85fr 0.85fr 0.8fr 0.8fr 0.8fr 0.8fr 1.4fr 0.8fr 0.7fr 0.9fr 0.9fr';

  return (
    <Box>
      {/* هدر */}
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1a, rgba(255,255,255,0.35))`, border: `1px solid ${COLOR}28`, borderRadius: '20px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 10px 28px ${COLOR}55` }}>
          <DescriptionIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>{isEdit ? 'ویرایش سند' : 'سند جدید'}</Typography>
          <Typography variant="body2" color="textSecondary">ثبت آرتیکل با توازن خودکار، مالیات و ابعاد تحلیلی</Typography>
        </Box>
        <Chip size="small" label="F2 معین · F3 تفصیل · F9 توازن · Ctrl+D کپی ردیف" sx={{ bgcolor: 'rgba(16,185,129,0.08)', color: COLOR_DARK, fontWeight: 700 }} />
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
        <Box sx={{ display: 'grid', gridTemplateColumns: gridCols, minWidth: 1500 }}>
          {['ردیف', 'معین', 'تفصیل۱', 'تفصیل۲', 'تفصیل۳', 'مرکز', 'پروژه', 'قرارداد', 'پرسنل', 'شرح', 'ارجاع', 'نوع', 'بدهکار', 'بستانکار'].map((h, i) => (
            <Box key={i} sx={{ px: 1, py: 1.2, fontWeight: 800, fontSize: 11.5, color: COLOR_DARK, borderBottom: '1px solid rgba(16,185,129,0.15)', borderLeft: i ? '1px solid rgba(0,0,0,0.04)' : 'none', bgcolor: 'rgba(16,185,129,0.05)', whiteSpace: 'nowrap' }}>{h}</Box>
          ))}
        </Box>

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
              sx={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '1px solid rgba(0,0,0,0.05)', bgcolor: activeRow === i ? 'rgba(16,185,129,0.06)' : 'transparent', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 1, flexDirection: 'column', gap: 0.25 }}>
                <Typography variant="body2" color="textSecondary">{toPersianDigits(i + 1)}</Typography>
                {warns.length > 0 && <Tooltip title={warns.join('، ')}><Chip size="small" label="!" sx={{ height: 16, width: 16, fontSize: 10, color: '#b45309', bgcolor: 'rgba(245,158,11,0.15)' }} /></Tooltip>}
              </Box>
              <Box sx={{ p: 0.5 }}><CodeCell label={selectedAccount?.code || ''} onClick={() => openPicker(i, 'account')} /></Box>
              {slots.map((slot) => {
                const aux = auxList.find(a => a.id === l[slot.key]);
                return <Box key={slot.key} sx={{ p: 0.5 }}><CodeCell label={aux?.code || ''} onClick={() => slot.catId && openPicker(i, slot.key)} disabled={!slot.catId} /></Box>;
              })}
              <Box sx={{ p: 0.5 }}><CodeCell label={costCenterList.find(c => c.id === l.cost_center)?.code || ''} onClick={() => openPicker(i, 'cost_center')} /></Box>
              <Box sx={{ p: 0.5 }}><CodeCell label={projectList.find(p => p.id === l.project)?.code || ''} onClick={() => openPicker(i, 'project')} /></Box>
              <Box sx={{ p: 0.5 }}><CodeCell label={contractList.find(c => c.id === l.contract)?.number || ''} onClick={() => openPicker(i, 'contract')} /></Box>
              <Box sx={{ p: 0.5 }}><CodeCell label={employeeList.find(e => e.id === l.employee)?.employee_id || ''} onClick={() => openPicker(i, 'employee')} /></Box>
              <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth variant="standard" value={l.desc} onChange={e => setLine(i, 'desc', e.target.value)} placeholder="" /></Box>
              <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth variant="standard" value={l.ref} onChange={e => setLine(i, 'ref', e.target.value)} onBlur={() => autoVat(i)} placeholder="—" /></Box>
              <Box sx={{ p: 0.5 }}>
                <FormControl size="small" fullWidth>
                  <Select value={l.invoice_type} onChange={e => setLine(i, 'invoice_type', e.target.value)} sx={{ fontSize: 12 }}>
                    <MenuItem value="none">—</MenuItem>
                    <MenuItem value="sale">فروش</MenuItem>
                    <MenuItem value="purchase">خرید</MenuItem>
                    <MenuItem value="import">واردات</MenuItem>
                    <MenuItem value="export">صادرات</MenuItem>
                    <MenuItem value="service">خدمت</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth type="number" variant="standard" value={l.debit} onChange={e => { setLine(i, 'debit', e.target.value); }} onBlur={() => autoVat(i)} /></Box>
              <Box sx={{ p: 0.5 }}><TextField size="small" fullWidth type="number" variant="standard" value={l.credit} onChange={e => setLine(i, 'credit', e.target.value)} onBlur={() => autoVat(i)} /></Box>
            </Box>
          );
        })}

        {/* جمع */}
        <Box sx={{ display: 'grid', gridTemplateColumns: gridCols, borderTop: '2px solid rgba(16,185,129,0.3)', bgcolor: 'rgba(16,185,129,0.06)', fontWeight: 800 }}>
          <Box sx={{ p: 1.4 }} />
          <Box sx={{ p: 1.4, color: COLOR_DARK }}>جمع</Box>
          {Array.from({ length: 10 }).map((_, k) => <Box key={k} />)}
          <Box sx={{ p: 1.4, color: '#2563eb' }}>{formatPersianNumber(totalDebit)}</Box>
          <Box sx={{ p: 1.4, color: '#2563eb' }}>{formatPersianNumber(totalCredit)}</Box>
        </Box>
      </Paper>

      {/* جزئیات مالیاتی ردیف فعال */}
      <Paper sx={{ ...glass, p: 1.5, mb: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color={COLOR_DARK} fontWeight={800}>جزئیات مالیاتی ردیف {toPersianDigits(activeRow + 1)}</Typography>
          <TextField size="small" label="شماره فاکتور" value={active.invoice_number} onChange={e => setLine(activeRow, 'invoice_number', e.target.value)} sx={{ width: 140, ...fieldSx }} />
          <TextField size="small" label="نرخ مالیات (٪)" type="number" value={active.vat_rate} onChange={e => setLine(activeRow, 'vat_rate', e.target.value)} onBlur={() => autoVat(activeRow)} sx={{ width: 110, ...fieldSx }} />
          <TextField size="small" label="مبلغ مالیات" type="number" value={active.vat_amount} onChange={e => setLine(activeRow, 'vat_amount', e.target.value)} sx={{ width: 140, ...fieldSx }} />
          <TextField size="small" label="شماره اقتصادی طرف" value={active.party_tax_id} onChange={e => setLine(activeRow, 'party_tax_id', e.target.value)} sx={{ width: 160, ...fieldSx }} />
          <TextField size="small" label="شناسه ملی طرف" value={active.party_national_id} onChange={e => setLine(activeRow, 'party_national_id', e.target.value)} sx={{ width: 150, ...fieldSx }} />
          <TextField size="small" label="کد پستی طرف" value={active.party_postal_code} onChange={e => setLine(activeRow, 'party_postal_code', e.target.value)} sx={{ width: 130, ...fieldSx }} />
          <FormControlLabel control={<Switch size="small" checked={active.season_flag} onChange={e => setLine(activeRow, 'season_flag', e.target.checked)} />} label="مشمول معاملات فصلی" />
        </Stack>
      </Paper>

      {/* نوار شرح کدها */}
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
          <Typography variant="body2" color="textSecondary" sx={{ alignSelf: 'center', color: totalBalanceOk ? COLOR_DARK : '#ef4444', fontWeight: 800 }}>
            {totalBalanceOk ? 'متوازن ✓' : `مغایرت ${formatPersianNumber(diff)}`}
          </Typography>
        </Stack>
      </Paper>

      {/* کنترل */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        <Button startIcon={<AddCircleIcon />} onClick={addRow} variant="outlined" color="primary" sx={{ borderRadius: '12px' }}>افزودن ردیف</Button>
        <Button startIcon={<ContentCopyIcon />} onClick={copyRow} variant="outlined" sx={{ borderRadius: '12px' }}>کپی ردیف (Ctrl+D)</Button>
        <Button startIcon={<BalanceIcon />} onClick={fillBalance} variant="outlined" color="success" sx={{ borderRadius: '12px' }}>تکمیل توازن (F9)</Button>
        <Button startIcon={<RemoveCircleIcon />} onClick={() => removeRow(lines.length - 1)} variant="outlined" color="error" sx={{ borderRadius: '12px' }}>حذف ردیف</Button>
      </Stack>

      <CodePickerDialog
        open={!!picker}
        title={picker?.slot === 'account' ? 'انتخاب کد معین' : picker?.slot === 'cost_center' ? 'انتخاب مرکز هزینه' : picker?.slot === 'project' ? 'انتخاب پروژه' : picker?.slot === 'contract' ? 'انتخاب قرارداد' : picker?.slot === 'employee' ? 'انتخاب پرسنل' : 'انتخاب تفصیل'}
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
          {saving ? <CircularProgress size={20} /> : (isEdit ? 'به‌روزرسانی سند' : 'ذخیره سند')}
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
      <Chip size="small" label={label || '…'} sx={{ fontWeight: 700, bgcolor: label ? 'rgba(16,185,129,0.12)' : 'transparent', color: label ? COLOR_DARK : 'text.disabled' }} />
    </Button>
  </Box>
);

export default AccountingDocumentNewPage;