import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, CircularProgress, Stack, Grid,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton,
  FormControlLabel, Switch, Chip, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import DescriptionIcon from '@mui/icons-material/Description';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import useCompany from '../../core/hooks/useCompany';

const COLOR = '#6366f1';
const COLOR_DARK = '#4f46e5';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.70), rgba(255,255,255,0.34))',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 16px 44px rgba(99,102,241,0.14)',
  borderRadius: '16px',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.55)',
    transition: 'all .2s ease',
    '&:hover': { background: 'rgba(255,255,255,0.84)' },
    '&.Mui-focused': { background: 'rgba(255,255,255,0.95)', boxShadow: `0 0 0 3px ${COLOR}22` },
  },
};

const readonlyFieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    background: 'rgba(99,102,241,0.07)',
    '& .MuiOutlinedInput-input': { fontWeight: 800, color: COLOR_DARK },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(99,102,241,0.25)' },
  },
};

const labelSx = { fontWeight: 700, color: COLOR_DARK, mb: 0.5, display: 'block', fontSize: 12 };

const num = (v) => Math.max(0, Number(v) || 0);

/* ------------------------------------------------------------------ */
/* A4-style statement preview                                          */
/* ------------------------------------------------------------------ */
const StatementPreview = ({ form, contract, company, currencies }) => {
  const addendums = contract?.addendums || [];
  const baseAmount = num(contract?.amount);
  const totalAddendumChange = addendums.reduce((s, a) => s + num(a.amount_change), 0);
  const contractAmount = baseAmount + totalAddendumChange;
  const lastAddendum = addendums.length
    ? addendums.reduce((m, a) => (a.date > m.date ? a : m), addendums[0])
    : null;
  const endDateWithAddendum = lastAddendum?.new_end_date || contract?.end_date;

  const additions = Array.isArray(form.additions) ? form.additions : [];
  const deductions = Array.isArray(form.deductions) ? form.deductions : [];
  const additionsTotal = additions.reduce((s, a) => s + num(a.amount), 0);
  const deductionsTotal = deductions.reduce((s, d) => s + num(d?.amount), 0);
  const cumulativeThis = num(form.amount);
  const cumulativePrev = num(form.cumulative_previous_amount);
  const workDone = cumulativeThis - cumulativePrev;
  const netAmount = workDone + additionsTotal - deductionsTotal;

  const cur = currencies.find((c) => String(c.id) === String(form.currency)) || null;

  return (
    <Box dir="rtl" sx={{
      background: '#ffffff', borderRadius: '16px', p: 3, minHeight: 620,
      boxShadow: '0 20px 54px rgba(15,23,42,0.16)', border: '1px solid rgba(15,23,42,0.06)',
      position: 'relative', overflow: 'hidden',
      '&::before': { content: '""', position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% -10%, ${COLOR}1f, transparent 55%)`, pointerEvents: 'none' },
    }}>
      {/* Top-centered logo + company title (from primary definitions) */}
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', pb: 1.5 }}>
        {company?.logo_url ? (
          <Box component="img" src={company.logo_url} alt="logo"
            sx={{ width: 72, height: 72, borderRadius: '16px', objectFit: 'contain', background: '#fff', border: `1px solid ${COLOR}22`, boxShadow: `0 8px 20px ${COLOR}1f` }} />
        ) : (
          <Box sx={{ width: 72, height: 72, borderRadius: '16px', background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 22px ${COLOR}55` }}>
            <Typography fontWeight={900} color="#fff" fontSize={32}>{company?.name?.[0] || 'ش'}</Typography>
          </Box>
        )}
        <Typography variant="h6" fontWeight={900} sx={{ color: '#1e293b', mt: 0.8, textAlign: 'center' }}>
          {company?.name || 'نام شرکت'}
        </Typography>
      </Box>

      <Divider sx={{ borderStyle: 'dashed', borderColor: `${COLOR}44`, my: 1.5 }} />

      {/* Section 1: statement number + date + currency */}
      <Grid container spacing={1.5}>
        <Grid item xs={4}>
          <Typography variant="caption" color="textSecondary">شماره صورت‌وضعیت</Typography>
          <Typography variant="body1" fontWeight={800} sx={{ color: '#1e293b' }}>{form.number || '—'}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="caption" color="textSecondary">تاریخ</Typography>
          <Typography variant="body1" fontWeight={800} sx={{ color: '#1e293b' }}>{form.date ? toJalali(form.date) : '—'}</Typography>
        </Grid>
        <Grid item xs={4}>
          <Typography variant="caption" color="textSecondary">واحد ارز</Typography>
          <Typography variant="body1" fontWeight={800} sx={{ color: '#1e293b' }}>{cur?.name || '—'}</Typography>
        </Grid>
      </Grid>

      <Divider sx={{ borderStyle: 'dashed', borderColor: `${COLOR}44`, my: 1.5 }} />

      {/* Section 2: contract / party info */}
      <Grid container spacing={1.5}>
        <Grid item xs={6}><Typography variant="caption" color="textSecondary">نام پیمانکار</Typography><Typography variant="body2" fontWeight={700}>{contract?.party_name || '—'}</Typography></Grid>
        <Grid item xs={6}><Typography variant="caption" color="textSecondary">شماره قرارداد</Typography><Typography variant="body2" fontWeight={700}>{contract?.number || '—'}</Typography></Grid>
        <Grid item xs={12}><Typography variant="caption" color="textSecondary">موضوع قرارداد</Typography><Typography variant="body2" fontWeight={700}>{contract?.subject || '—'}</Typography></Grid>
        <Grid item xs={6}><Typography variant="caption" color="textSecondary">تاریخ شروع</Typography><Typography variant="body2">{contract?.start_date ? toJalali(contract.start_date) : '—'}</Typography></Grid>
        <Grid item xs={6}><Typography variant="caption" color="textSecondary">تاریخ پایان (با الحاقیه)</Typography><Typography variant="body2">{endDateWithAddendum ? toJalali(endDateWithAddendum) : '—'}</Typography></Grid>
        <Grid item xs={6}><Typography variant="caption" color="textSecondary">آخرین الحاقیه</Typography><Typography variant="body2">{lastAddendum?.date ? toJalali(lastAddendum.date) : '—'}</Typography></Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="textSecondary">مبلغ قرارداد (با الحاقیه)</Typography>
          <Typography variant="body2" fontWeight={900} sx={{ color: COLOR_DARK }}>{formatPersianNumber(contractAmount)} {cur?.symbol || 'ریال'}</Typography>
        </Grid>
      </Grid>

      <Divider sx={{ borderStyle: 'dashed', borderColor: `${COLOR}44`, my: 1.5 }} />

      {/* Section 3: financial breakdown */}
      <Box sx={{ borderRadius: '12px', p: 2, background: `linear-gradient(135deg, ${COLOR}0e, ${COLOR}05)`, border: `1px solid ${COLOR}22` }}>
        <Row label="مبلغ تجمعی این صورت‌وضعیت" value={cumulativeThis} strong />
        <Row label="مبلغ تجمعی صورت‌وضعیت قبلی" value={cumulativePrev} />
        <Row label="کارکرد دوره" value={workDone} highlight />
      </Box>

      {/* Additions */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#059669', mb: 0.5 }}>اضافات</Typography>
        {additions.length === 0 ? (
          <Typography variant="caption" color="textSecondary">افزودنی ثبت نشده</Typography>
        ) : (
          additions.map((a, i) => <Row key={i} label={a.description || 'اضافه'} value={num(a.amount)} />)
        )}
        <Box sx={{ borderTop: '1px solid #34d39933', mt: 0.5, pt: 0.5 }}>
          <Row label="جمع اضافات" value={additionsTotal} green strong />
        </Box>
      </Box>

      {/* Deductions */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#b91c1c', mb: 0.5 }}>کسورات</Typography>
        {deductions.length === 0 ? (
          <Typography variant="caption" color="textSecondary">کسوری ثبت نشده</Typography>
        ) : (
          deductions.map((d, i) => <Row key={i} label={d.title || 'کسور'} value={num(d.amount)} />)
        )}
        <Box sx={{ borderTop: '1px solid #fca5a533', mt: 0.5, pt: 0.5 }}>
          <Row label="جمع کسورات" value={deductionsTotal} red strong />
        </Box>
      </Box>

      <Divider sx={{ my: 1.5, borderStyle: 'dashed', borderColor: `${COLOR}44` }} />

      {/* Net payable */}
      <Box sx={{ borderRadius: '12px', p: 2, background: '#10b98114', border: '1px solid #10b98133', textAlign: 'center' }}>
        <Typography variant="caption" color="textSecondary">مبلغ قابل پرداخت این دوره</Typography>
        <Typography variant="h5" fontWeight={900} sx={{ color: '#059669', direction: 'rtl' }}>{formatPersianNumber(netAmount)} <Typography component="span" variant="caption" color="textSecondary">{cur?.symbol || 'ریال'}</Typography></Typography>
      </Box>

      {/* Signatures */}
      <Grid container spacing={2} sx={{ mt: 3 }}>
        {['تهیه‌کننده', 'تأییدکننده', 'مدیر مالی'].map((s) => (
          <Grid item xs={4} key={s}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ height: 34, borderBottom: `1px dashed ${COLOR}55`, mb: 0.5 }} />
              <Typography variant="caption" color="textSecondary">{s}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const Row = ({ label, value, strong, red, green, highlight }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2, py: 0.45 }}>
    <Typography variant="caption" color="textSecondary">{label}</Typography>
    <Typography variant={strong ? 'body1' : 'body2'} fontWeight={strong || highlight ? 900 : 700}
      sx={{ direction: 'rtl', color: red ? '#b91c1c' : green ? '#059669' : highlight ? '#0ea5e9' : strong ? COLOR_DARK : 'text.primary' }}>
      {formatPersianNumber(value)}
    </Typography>
  </Box>
);

/* ------------------------------------------------------------------ */
/* Main editor page                                                    */
/* ------------------------------------------------------------------ */
const StatementEditorPage = () => {
  const qc = useQueryClient();
  const { currentCompany } = useCompany();
  const [contractId, setContractId] = useState('');
  const [mode, setMode] = useState('list');
  const [form, setForm] = useState({});

  const { data: companyProfile } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then((r) => r.data),
  });
  const company = {
    name: companyProfile?.company_name || companyProfile?.legal_name || currentCompany?.name || '',
    code: currentCompany?.code || '',
    logo_url: companyProfile?.logo_url || currentCompany?.logo_url || null,
  };

  const { data: contracts } = useQuery({
    queryKey: ['external-contracts', 'statement-editor'],
    queryFn: () => axiosInstance.get('/external-contracts/').then((r) => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];
  const currentContract = contractList.find((c) => String(c.id) === String(contractId));

  // تعاریف اولیه: اضافات، کسورات، ارزها
  const { data: additionsDef } = useQuery({ queryKey: ['additions'], queryFn: () => axiosInstance.get('/additions/').then((r) => r.data) });
  const { data: deductionsDef } = useQuery({ queryKey: ['deductions'], queryFn: () => axiosInstance.get('/deductions/').then((r) => r.data) });
  const { data: currencies } = useQuery({ queryKey: ['currencies'], queryFn: () => axiosInstance.get('/currencies/').then((r) => r.data) });
  const additionList = Array.isArray(additionsDef) ? additionsDef : additionsDef?.results || [];
  const deductionList = Array.isArray(deductionsDef) ? deductionsDef : deductionsDef?.results || [];
  const currencyList = Array.isArray(currencies) ? currencies : currencies?.results || [];

  const { data, isLoading } = useQuery({
    queryKey: ['statements', contractId],
    queryFn: () => axiosInstance.get('/contract-statements/', { params: { contract: contractId } }).then((r) => r.data),
    enabled: !!contractId,
  });
  const list = Array.isArray(data) ? data : data?.results || [];
  const prevStatement = list.length ? [...list].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] : null;

  const save = useMutation({
    mutationFn: (p) => (p.id
      ? axiosInstance.patch(`/contract-statements/${p.id}/`, p)
      : axiosInstance.post('/contract-statements/', p)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['statements'] }); setMode('list'); setForm({}); },
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-statements/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['statements'] }),
  });

  const setField = (key, value) => setForm((p) => ({ ...p, [key]: value }));

  const additions = Array.isArray(form.additions) ? form.additions : [];
  const deductions = Array.isArray(form.deductions) ? form.deductions : [];
  const additionsTotal = additions.reduce((s, a) => s + num(a.amount), 0);
  const deductionsTotal = deductions.reduce((s, d) => s + num(d?.amount), 0);
  const cumulativePrev = num(form.cumulative_previous_amount);
  const cumulativeThis = num(form.amount);
  const workDone = cumulativeThis - cumulativePrev;
  const netAmount = workDone + additionsTotal - deductionsTotal;

  // نرخ ارز انتخاب‌شده
  const selCurrency = currencyList.find((c) => String(c.id) === String(form.currency)) || null;
  const rate = num(selCurrency?.exchange_rate || 1);

  const openNew = () => {
    setForm({
      contract: contractId,
      is_approved: false,
      amount: 0,
      cumulative_previous_amount: prevStatement ? Number(prevStatement.amount || 0) : 0,
      currency: currentContract?.currency || '',
      additions: [],
      deductions: [],
    });
    setMode('form');
  };
  const openEdit = (row) => {
    setForm({
      ...row,
      is_approved: !!row.is_approved,
      amount: Number(row.amount || 0),
      cumulative_previous_amount: Number(row.cumulative_previous_amount || 0),
      additions: Array.isArray(row.additions) ? row.additions : [],
      deductions: Array.isArray(row.deductions) ? row.deductions : [],
    });
    setMode('form');
  };
  const closeForm = () => { setMode('list'); setForm({}); };

  const submit = () => {
    const payload = {
      ...form,
      contract: contractId,
      amount: cumulativeThis,
      cumulative_previous_amount: cumulativePrev,
      work_done: workDone,
      additions: additions,
      additions_total: additionsTotal,
      deductions: deductions,
      deductions_total: deductionsTotal,
      net_amount: netAmount,
    };
    save.mutate(payload);
  };

  /* کسورات */
  const addDeduction = () => setField('deductions', [...deductions, { title: '', amount: 0, percent: 0 }]);
  const removeDeduction = (i) => setField('deductions', deductions.filter((_, idx) => idx !== i));
  const updateDeduction = (i, key, val) => {
    const next = deductions.map((d, idx) => (idx === i ? { ...d, [key]: val } : d));
    setField('deductions', next);
  };
  const chooseDeduction = (def) => {
    const item = { title: def.description || def.code, percent: Number(def.default_percent || 0), amount: Math.round((cumulativeThis * num(def.default_percent)) / 100) };
    setField('deductions', [...deductions, item]);
  };

  /* اضافات */
  const addAddition = () => setField('additions', [...additions, { code: '', description: '', percent: 0, amount: 0 }]);
  const removeAddition = (i) => setField('additions', additions.filter((_, idx) => idx !== i));
  const updateAddition = (i, key, val) => {
    const next = additions.map((a, idx) => (idx === i ? { ...a, [key]: val } : a));
    setField('additions', next);
  };
  const chooseAddition = (def) => {
    setField('additions', [...additions, { code: def.code, description: def.description, percent: Number(def.default_percent || 0), amount: Math.round((cumulativeThis * num(def.default_percent)) / 100) }]);
  };

  if (mode === 'list') {
    return (
      <Box>
        <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', ...glass }}>
          <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}66` }}>
            <ReceiptLongIcon sx={{ color: '#fff' }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h6" fontWeight={800} sx={{ color: COLOR_DARK }}>صورت‌وضعیت‌های قرارداد</Typography>
            <Typography variant="body2" color="textSecondary">ثبت صورت‌وضعیت با تفکیک کامل مالی و پیش‌نمایش زنده</Typography>
          </Box>
          <Button startIcon={<AddIcon />} variant="contained" disabled={!contractId} onClick={openNew}
            sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', px: 3 }}>
            صورت‌وضعیت جدید
          </Button>
        </Paper>

        <Paper sx={{ p: 2, ...glass }}>
          <FormControl size="small" sx={{ minWidth: 300, mb: 2 }}>
            <InputLabel>قرارداد</InputLabel>
            <Select value={contractId || ''} label="قرارداد" onChange={(e) => setContractId(e.target.value)} sx={{ borderRadius: '12px' }}>
              {contractList.map((c) => <MenuItem key={c.id} value={c.id}>{c.subject || c.number}</MenuItem>)}
            </Select>
          </FormControl>

          {!contractId ? (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>برای مشاهدهٔ لیست، یک قرارداد انتخاب کنید.</Typography>
          ) : isLoading ? (
            <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress /></Box>
          ) : list.length === 0 ? (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>موردی ثبت نشده است.</Typography>
          ) : (
            <Stack spacing={1.25}>
              {list.map((row) => (
                <Paper key={row.id} variant="outlined" sx={{ p: 1.6, borderRadius: '14px', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', background: 'rgba(255,255,255,0.55)' }}>
                  <Box sx={{ flex: 1, minWidth: 0, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box><Typography variant="caption" color="textSecondary" display="block">شماره</Typography><Typography variant="body2" fontWeight={700}>{row.number || '—'}</Typography></Box>
                    <Box><Typography variant="caption" color="textSecondary" display="block">تاریخ</Typography><Typography variant="body2" fontWeight={700}>{toJalali(row.date)}</Typography></Box>
                    <Box><Typography variant="caption" color="textSecondary" display="block">کارکرد دوره</Typography><Typography variant="body2" fontWeight={700}>{formatPersianNumber(row.work_done || 0)}</Typography></Box>
                    <Box><Typography variant="caption" color="textSecondary" display="block">قابل پرداخت</Typography><Typography variant="body2" fontWeight={700} sx={{ color: '#059669' }}>{formatPersianNumber(row.net_amount || 0)}</Typography></Box>
                    <Box><Typography variant="caption" color="textSecondary" display="block">تأیید</Typography><Chip size="small" label={row.is_approved ? 'تأیید شده' : 'در انتظار'} sx={{ fontWeight: 700, bgcolor: row.is_approved ? '#10b98122' : '#f59e0b22', color: row.is_approved ? '#059669' : '#b45309' }} /></Box>
                  </Box>
                  <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(row.id); }}><DeleteIcon fontSize="small" /></IconButton>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Box aria-hidden sx={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(60% 50% at 85% 10%, ${COLOR}26, transparent 60%), radial-gradient(50% 45% at 12% 88%, ${COLOR}1f, transparent 60%), linear-gradient(135deg, #f6f8ff, #eef1ff)` }} />

      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Paper sx={{ p: 2, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', ...glass }}>
          <Avatar sx={{ width: 52, height: 52, background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, boxShadow: `0 8px 24px ${COLOR}66` }}>
            <DescriptionIcon sx={{ color: '#fff' }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="h6" fontWeight={800} sx={{ color: COLOR_DARK }}>{form.id ? 'ویرایش صورت‌وضعیت' : 'صورت‌وضعیت جدید'}</Typography>
            <Typography variant="body2" color="textSecondary">{currentContract?.subject || ''}</Typography>
          </Box>
          <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={closeForm} sx={{ borderRadius: '12px' }}>بازگشت به لیست</Button>
        </Paper>

        <Grid container spacing={2.5}>
          {/* RIGHT: form */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, ...glass }}>
              <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2.5, color: COLOR_DARK }}>ورود اطلاعات</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={labelSx}>شماره صورت‌وضعیت</Typography>
                  <TextField size="small" fullWidth value={form.number || ''} onChange={(e) => setField('number', e.target.value)} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={labelSx}>تاریخ</Typography>
                  <JalaliDatePicker fullWidth value={form.date || ''} onChange={(v) => setField('date', v)} />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={labelSx}>واحد ارز</Typography>
                  <FormControl size="small" fullWidth>
                    <Select value={form.currency || ''} onChange={(e) => setField('currency', e.target.value)} sx={{ borderRadius: '12px', background: 'rgba(255,255,255,0.55)' }}>
                      {currencyList.map((c) => <MenuItem key={c.id} value={c.id}>{c.name} ({c.code}) — {c.symbol}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={labelSx}>نرخ تبدیل به ریال</Typography>
                  <TextField size="small" fullWidth value={formatPersianNumber(rate)} InputProps={{ readOnly: true }} sx={readonlyFieldSx} />
                </Grid>

                <Grid item xs={12}><Divider sx={{ my: 0.5 }}><Chip size="small" label="کارکرد" /></Divider></Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={labelSx}>مبلغ تجمعی این صورت‌وضعیت</Typography>
                  <TextField type="number" size="small" fullWidth value={form.amount ?? 0} onChange={(e) => setField('amount', e.target.value)} sx={fieldSx} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={labelSx}>مبلغ تجمعی صورت‌وضعیت قبلی</Typography>
                  <TextField type="number" size="small" fullWidth value={cumulativePrev} InputProps={{ readOnly: true }} sx={readonlyFieldSx} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={labelSx}>کارکرد دوره (محاسبهٔ خودکار)</Typography>
                  <TextField type="number" size="small" fullWidth value={workDone} InputProps={{ readOnly: true }} sx={readonlyFieldSx} />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={labelSx}>معادل ریال (کارکرد)</Typography>
                  <TextField type="number" size="small" fullWidth value={workDone * rate} InputProps={{ readOnly: true }} sx={readonlyFieldSx} />
                </Grid>

                <Grid item xs={12}><Divider sx={{ my: 0.5 }}><Chip size="small" label="اضافات و کسورات (از تعاریف اولیه)" /></Divider></Grid>

                {/* اضافات */}
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ ...labelSx, color: '#059669' }}>اضافات</Typography>
                  {additions.map((a, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <TextField size="small" placeholder="شرح" value={a.description || ''} onChange={(e) => updateAddition(i, 'description', e.target.value)} sx={{ flex: 1, ...fieldSx }} />
                      <TextField size="small" type="number" placeholder="٪" value={a.percent ?? 0} onChange={(e) => updateAddition(i, 'percent', e.target.value)} sx={{ width: 80, ...fieldSx }} />
                      <TextField size="small" type="number" placeholder="مبلغ" value={a.amount ?? 0} onChange={(e) => updateAddition(i, 'amount', e.target.value)} sx={{ width: 130, ...fieldSx }} />
                      <IconButton size="small" color="error" onClick={() => removeAddition(i)}><RemoveCircleIcon /></IconButton>
                    </Stack>
                  ))}
                  {additionList.length > 0 && (
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                      {additionList.map((d) => (
                        <Chip key={d.id} size="small" label={d.description} onClick={() => chooseAddition(d)} sx={{ bgcolor: '#10b98118', color: '#059669' }} />
                      ))}
                    </Stack>
                  )}
                  <Button size="small" startIcon={<AddCircleIcon />} onClick={addAddition} sx={{ color: '#059669' }}>افزودن اضافه</Button>
                </Grid>

                {/* کسورات */}
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ ...labelSx, color: '#b91c1c' }}>کسورات</Typography>
                  {deductions.map((d, i) => (
                    <Stack key={i} direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                      <TextField size="small" placeholder="عنوان کسور" value={d.title || ''} onChange={(e) => updateDeduction(i, 'title', e.target.value)} sx={{ flex: 1, ...fieldSx }} />
                      <TextField size="small" type="number" placeholder="٪" value={d.percent ?? 0} onChange={(e) => updateDeduction(i, 'percent', e.target.value)} sx={{ width: 80, ...fieldSx }} />
                      <TextField size="small" type="number" placeholder="مبلغ" value={d.amount ?? 0} onChange={(e) => updateDeduction(i, 'amount', e.target.value)} sx={{ width: 130, ...fieldSx }} />
                      <IconButton size="small" color="error" onClick={() => removeDeduction(i)}><RemoveCircleIcon /></IconButton>
                    </Stack>
                  ))}
                  {deductionList.length > 0 && (
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                      {deductionList.map((d) => (
                        <Chip key={d.id} size="small" label={d.description} onClick={() => chooseDeduction(d)} sx={{ bgcolor: '#ef444418', color: '#b91c1c' }} />
                      ))}
                    </Stack>
                  )}
                  <Button size="small" startIcon={<AddCircleIcon />} onClick={addDeduction} sx={{ color: '#b91c1c' }}>افزودن کسور</Button>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel control={<Switch checked={!!form.is_approved} onChange={(e) => setField('is_approved', e.target.checked)} />} label={<Typography variant="body2" fontWeight={700}>تأیید شده</Typography>} />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={labelSx}>توضیحات</Typography>
                  <TextField size="small" fullWidth multiline rows={3} value={form.description || ''} onChange={(e) => setField('description', e.target.value)} sx={fieldSx} />
                </Grid>
              </Grid>

              <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                <Button variant="contained" startIcon={save.isLoading ? null : <SaveIcon />} onClick={submit} disabled={save.isLoading} sx={{ background: `linear-gradient(135deg,${COLOR},${COLOR_DARK})`, borderRadius: '12px', px: 4 }}>
                  {save.isLoading ? <CircularProgress size={20} color="inherit" /> : 'ذخیره'}
                </Button>
                <Button variant="outlined" onClick={closeForm} sx={{ borderRadius: '12px' }}>انصراف</Button>
              </Stack>
            </Paper>
          </Grid>

          {/* LEFT: live preview */}
          <Grid item xs={12} md={6}>
            <Box sx={{ position: { md: 'sticky' }, top: { md: 16 } }}>
              <StatementPreview
                form={{ ...form, amount: cumulativeThis, cumulative_previous_amount: cumulativePrev, work_done: workDone, additions, deductions }}
                contract={currentContract}
                company={company}
                currencies={currencyList}
              />
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default StatementEditorPage;