import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  TextField, FormControl, InputLabel, Select, MenuItem, Divider, Alert, IconButton, Tooltip,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DescriptionIcon from '@mui/icons-material/Description';
import LockIcon from '@mui/icons-material/Lock';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import BadgeIcon from '@mui/icons-material/Badge';
import { formatPersianNumber } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import MoneyInput from '../core/components/ui/MoneyInput';

const TYPE_LABELS = {
  construction: 'پیمانکاری / اجرا', purchase: 'خرید', tender: 'مناقصه',
  consulting: 'مشاوره', service: 'خدمات', other: 'سایر',
};

const STATUS_LABELS = {
  draft: 'پیش‌نویس', active: 'در حال اجرا', suspended: 'متوقف',
  completed: 'تکمیل شده', terminated: 'فسخ شده',
};

const GUARANTEE_TYPES = {
  performance: 'ضمانت حسن انجام کار',
  advance: 'ضمانت پیش‌پرداخت',
  bid: 'ضمانت شرکت در مناقصه',
  other: 'سایر',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.6)',
    transition: 'all 0.2s ease',
    '&:hover': { background: 'rgba(255,255,255,0.85)' },
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(245,158,11,0.12)' },
  },
};

const EMPTY = {
  number: '', subject: '', party: '', contract_type: 'purchase', contract_type_master: '',
  status: 'draft', amount: '', currency: '', start_date: '', end_date: '', signing_date: '',
  signatory: '', guarantee_amount: '', guarantee_type: '', category: '', project: '',
  project_name: '', project_location: '', tender_number: '', advance_payment: '',
  retention_percent: '', warranty_period: '',
  payment_terms: '', delivery_terms: '', penalty_terms: '', insurance_terms: '', description: '',
};

const SectionHeader = ({ icon, color, title, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 1.5 }}>
    <Avatar sx={{ width: 32, height: 32, background: `linear-gradient(135deg, ${color}, ${color}99)`, boxShadow: `0 3px 10px ${color}40` }}>
      {icon}
    </Avatar>
    <Typography variant="subtitle1" fontWeight={800} color={color}>{title}</Typography>
    <Divider sx={{ flex: 1 }} />
    {children}
  </Box>
);

const ContractNewPage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState(EMPTY);
  const [advancePayments, setAdvancePayments] = useState([]);
  const [message, setMessage] = useState(null);
  const isEdit = Boolean(id);

  const { data: existing } = useQuery({
    queryKey: ['external-contract-edit', id],
    queryFn: () => axiosInstance.get(`/external-contracts/${id}/`).then(r => r.data),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        number: existing.number || '',
        subject: existing.subject || '',
        party: existing.party || '',
        contract_type: existing.contract_type || 'purchase',
        contract_type_master: existing.contract_type_master || '',
        status: existing.status || 'draft',
        amount: existing.amount ?? '',
        currency: existing.currency || '',
        start_date: existing.start_date || '',
        end_date: existing.end_date || '',
        signing_date: existing.signing_date || '',
        signatory: existing.signatory || '',
        guarantee_amount: existing.guarantee_amount ?? '',
        guarantee_type: existing.guarantee_type || '',
        category: existing.category || '',
        project: existing.project || '',
        project_name: existing.project_name || '',
        project_location: existing.project_location || '',
        tender_number: existing.tender_number || '',
        advance_payment: existing.advance_payment ?? '',
        retention_percent: existing.retention_percent ?? '',
        warranty_period: existing.warranty_period || '',
        payment_terms: existing.payment_terms || '',
        delivery_terms: existing.delivery_terms || '',
        penalty_terms: existing.penalty_terms || '',
        insurance_terms: existing.insurance_terms || '',
        description: existing.description || '',
      });
      setAdvancePayments(Array.isArray(existing.advance_payments) ? existing.advance_payments : []);
    }
  }, [existing]);

  const { data: parties } = useQuery({ queryKey: ['contract-parties'], queryFn: () => axiosInstance.get('/contract-parties/', { params: { page_size: 1000 } }).then(r => r.data) });
  const partyList = Array.isArray(parties) ? parties : parties?.results || [];

  const { data: signatories } = useQuery({ queryKey: ['signatories'], queryFn: () => axiosInstance.get('/signatories/').then(r => r.data) });
  const signatoryList = Array.isArray(signatories) ? signatories : signatories?.results || [];

  const { data: currencies } = useQuery({ queryKey: ['currencies'], queryFn: () => axiosInstance.get('/currencies/').then(r => r.data) });
  const currencyList = Array.isArray(currencies) ? currencies : currencies?.results || [];

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => axiosInstance.get('/projects/').then(r => r.data) });
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];

  const { data: typeMasters } = useQuery({ queryKey: ['contract-types-master'], queryFn: () => axiosInstance.get('/contract-types-master/').then(r => r.data) });
  const typeMasterList = Array.isArray(typeMasters) ? typeMasters : typeMasters?.results || [];

  const create = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? axiosInstance.patch(`/external-contracts/${id}/`, payload)
        : axiosInstance.post('/external-contracts/', payload),
    onSuccess: () => {
      setMessage({ ok: true, text: isEdit ? 'قرارداد با موفقیت ویرایش شد ✓' : 'قرارداد با موفقیت ثبت شد ✓' });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setTimeout(() => navigate(isEdit ? `/external-contracts/${id}` : '/external-contracts'), 1200);
    },
    onError: (e) => setMessage({ ok: false, text: e.response?.data?.error || 'خطا در ثبت قرارداد' }),
  });

  const num = (v) => (v === '' || v == null ? null : Number(v));

  const payload = () => ({
    number: form.number,
    subject: form.subject,
    party: form.party,
    contract_type: form.contract_type,
    contract_type_master: form.contract_type_master || null,
    status: form.status,
    amount: num(form.amount),
    currency: form.currency || null,
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    signing_date: form.signing_date || null,
    signatory: form.signatory || null,
    guarantee_amount: num(form.guarantee_amount),
    guarantee_type: form.guarantee_type || null,
    category: form.category,
    project: form.project || null,
    project_name: form.project_name,
    project_location: form.project_location,
    tender_number: form.tender_number,
    advance_payment: num(form.advance_payment),
    advance_payments: advancePayments,
    retention_percent: num(form.retention_percent),
    warranty_period: form.warranty_period,
    payment_terms: form.payment_terms,
    delivery_terms: form.delivery_terms,
    penalty_terms: form.penalty_terms,
    insurance_terms: form.insurance_terms,
    description: form.description,
  });

  const addAdvance = () => {
    setAdvancePayments(prev => [...prev, { step: `مرحله ${prev.length + 1}`, amount: '', due_date: '', note: '' }]);
  };

  const updateAdvance = (idx, key, value) => {
    setAdvancePayments(prev => prev.map((a, i) => (i === idx ? { ...a, [key]: value } : a)));
  };

  const removeAdvance = (idx) => {
    setAdvancePayments(prev => prev.filter((_, i) => i !== idx));
  };

  const selCurrency = currencyList.find(c => String(c.id) === String(form.currency));
  const currencyLabel = selCurrency ? selCurrency.name : 'ریال';

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(245,158,11,0.12), rgba(249,115,22,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.18)', borderRadius: '12px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
          <HandshakeIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">{isEdit ? 'ویرایش قرارداد' : 'قرارداد جدید'}</Typography>
          <Typography variant="body2" color="textSecondary">ثبت کامل قرارداد با جزئیات حقوقی، مالی و اجرایی — تاریخ‌ها شمسی</Typography>
        </Box>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/external-contracts')}>بازگشت</Button>
        <Button variant="contained" startIcon={<SaveIcon />} disabled={!form.subject || !form.party} onClick={() => create.mutate(payload())}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: '10px', px: 3, whiteSpace: 'nowrap' }}>
          {isEdit ? 'ذخیره تغییرات' : 'ثبت قرارداد'}
        </Button>
      </Paper>

      {message && (
        <Alert severity={message.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>
      )}

      <Paper sx={{ p: 2.5, borderRadius: '12px', background: 'linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.3))', border: '1px solid rgba(245,158,11,0.14)' }}>
        {/* اطلاعات پایه */}
        <SectionHeader icon={<HandshakeIcon sx={{ color: '#fff', fontSize: 16 }} />} color="#f59e0b" title="اطلاعات پایه" />
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شماره قرارداد" value={form.number} sx={fieldSx} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} /></Grid>
          <Grid item xs={12} md={8}><TextField size="small" fullWidth label="موضوع قرارداد *" value={form.subject} sx={fieldSx} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></Grid>
          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth sx={fieldSx}><InputLabel>طرف قرارداد *</InputLabel>
              <Select value={form.party} label="طرف قرارداد *" onChange={e => setForm(p => ({ ...p, party: e.target.value }))}>
                {partyList.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth sx={fieldSx}><InputLabel>نوع قرارداد (پیکربندی)</InputLabel>
              <Select value={form.contract_type_master || ''} label="نوع قرارداد (پیکربندی)" onChange={e => setForm(p => ({ ...p, contract_type_master: e.target.value }))}>
                <MenuItem value="">—</MenuItem>
                {typeMasterList.map(t => <MenuItem key={t.id} value={t.id}>{t.name} {t.code ? `(${t.code})` : ''}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth sx={fieldSx}><InputLabel>وضعیت</InputLabel>
              <Select value={form.status} label="وضعیت" onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}><TextField size="small" fullWidth label="طبقه‌بندی قرارداد" value={form.category} sx={fieldSx} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} /></Grid>
          <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شماره مناقصه / استعلام" value={form.tender_number} sx={fieldSx} onChange={e => setForm(p => ({ ...p, tender_number: e.target.value }))} /></Grid>
        </Grid>

        {/* پروژه و محل */}
        <SectionHeader icon={<BusinessIcon sx={{ color: '#fff', fontSize: 16 }} />} color="#3b82f6" title="پروژه و محل اجرا" />
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth sx={fieldSx}><InputLabel>پروژه (از مدیریت پروژه‌ها)</InputLabel>
              <Select value={form.project || ''} label="پروژه (از مدیریت پروژه‌ها)" onChange={e => setForm(p => ({ ...p, project: e.target.value }))}>
                <MenuItem value="">—</MenuItem>
                {projectList.map(pr => <MenuItem key={pr.id} value={pr.id}>{pr.name || pr.title || `پروژه #${pr.id}`}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth label="نام پروژه / طرح" value={form.project_name} sx={fieldSx} onChange={e => setForm(p => ({ ...p, project_name: e.target.value }))} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth label="محل اجرا / تحویل" value={form.project_location} sx={fieldSx} onChange={e => setForm(p => ({ ...p, project_location: e.target.value }))} /></Grid>
        </Grid>

        {/* تاریخ‌ها */}
        <SectionHeader icon={<CalendarMonthIcon sx={{ color: '#fff', fontSize: 16 }} />} color="#ec4899" title="تاریخ‌ها (شمسی)" />
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}><JalaliDatePicker fullWidth label="تاریخ شروع" value={form.start_date} onChange={(g) => setForm(p => ({ ...p, start_date: g }))} /></Grid>
          <Grid item xs={12} md={4}><JalaliDatePicker fullWidth label="تاریخ پایان" value={form.end_date} onChange={(g) => setForm(p => ({ ...p, end_date: g }))} /></Grid>
          <Grid item xs={12} md={4}><JalaliDatePicker fullWidth label="تاریخ امضا" value={form.signing_date} onChange={(g) => setForm(p => ({ ...p, signing_date: g }))} /></Grid>
        </Grid>

        {/* مبالغ مالی و تضمین */}
        <SectionHeader icon={<AttachMoneyIcon sx={{ color: '#fff', fontSize: 16 }} />} color="#10b981" title="مبالغ مالی و تضمین" />
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={3}><MoneyInput size="small" fullWidth label={`مبلغ قرارداد (${currencyLabel})`} value={form.amount} sx={fieldSx} onChange={(v) => setForm(p => ({ ...p, amount: v }))} /></Grid>
          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth sx={fieldSx}><InputLabel>واحد ارز</InputLabel>
              <Select value={form.currency || ''} label="واحد ارز" onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                <MenuItem value="">—</MenuItem>
                {currencyList.map(c => <MenuItem key={c.id} value={c.id}>{c.name} ({c.code})</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}><MoneyInput size="small" fullWidth label={`پیش‌پرداخت (${currencyLabel})`} value={form.advance_payment} sx={fieldSx} onChange={(v) => setForm(p => ({ ...p, advance_payment: v }))} /></Grid>
          <Grid item xs={12} md={3}><TextField size="small" fullWidth label="درصد حسن انجام کار" type="number" value={form.retention_percent} sx={fieldSx} onChange={e => setForm(p => ({ ...p, retention_percent: e.target.value }))} /></Grid>
          <Grid item xs={12} md={3}><MoneyInput size="small" fullWidth label={`مبلغ تضمین (${currencyLabel})`} value={form.guarantee_amount} sx={fieldSx} onChange={(v) => setForm(p => ({ ...p, guarantee_amount: v }))} /></Grid>
          <Grid item xs={12} md={3}>
            <FormControl size="small" fullWidth sx={fieldSx}><InputLabel>نوع ضمانت</InputLabel>
              <Select value={form.guarantee_type || ''} label="نوع ضمانت" onChange={e => setForm(p => ({ ...p, guarantee_type: e.target.value }))}>
                <MenuItem value="">—</MenuItem>
                {Object.entries(GUARANTEE_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}><TextField size="small" fullWidth label="دوره گارانتی / تضمین کیفیت" value={form.warranty_period} sx={fieldSx} onChange={e => setForm(p => ({ ...p, warranty_period: e.target.value }))} /></Grid>
        </Grid>

        {/* پیش‌پرداخت‌های مرحله‌ای */}
        <SectionHeader icon={<AddCircleIcon sx={{ color: '#fff', fontSize: 16 }} />} color="#8b5cf6" title="پیش‌پرداخت‌های مرحله‌ای">
          <Button size="small" startIcon={<AddCircleIcon />} onClick={addAdvance} sx={{ color: '#8b5cf6', textTransform: 'none' }}>افزودن مرحله</Button>
        </SectionHeader>
        {advancePayments.length === 0 ? (
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>هیچ مرحله‌ای تعریف نشده است.</Typography>
        ) : (
          <Stack spacing={1} sx={{ mb: 1 }}>
            {advancePayments.map((ap, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 1, borderRadius: '10px', background: 'rgba(139,92,246,0.04)', borderColor: 'rgba(139,92,246,0.25)' }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid item xs={12} sm={3}><TextField size="small" fullWidth label="عنوان مرحله" value={ap.step} sx={fieldSx} onChange={e => updateAdvance(idx, 'step', e.target.value)} /></Grid>
                  <Grid item xs={12} sm={3}><MoneyInput size="small" fullWidth label={`مبلغ (${currencyLabel})`} value={ap.amount} sx={fieldSx} onChange={(v) => updateAdvance(idx, 'amount', v)} /></Grid>
                  <Grid item xs={12} sm={3}><JalaliDatePicker fullWidth label="تاریخ سررسید" value={ap.due_date} onChange={(g) => updateAdvance(idx, 'due_date', g)} /></Grid>
                  <Grid item xs={12} sm={2.5}><TextField size="small" fullWidth label="یادداشت" value={ap.note} sx={fieldSx} onChange={e => updateAdvance(idx, 'note', e.target.value)} /></Grid>
                  <Grid item xs={12} sm={0.5}>
                    <Tooltip title="حذف مرحله">
                      <IconButton size="small" color="error" onClick={() => removeAdvance(idx)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </Grid>
                </Grid>
              </Paper>
            ))}
          </Stack>
        )}

        {/* امضاکننده */}
        <SectionHeader icon={<BadgeIcon sx={{ color: '#fff', fontSize: 16 }} />} color="#0ea5e9" title="امضاکننده مجاز" />
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            <FormControl size="small" fullWidth sx={fieldSx}><InputLabel>امضاکنندهٔ مجاز</InputLabel>
              <Select value={form.signatory || ''} label="امضاکنندهٔ مجاز" onChange={e => setForm(p => ({ ...p, signatory: e.target.value }))}>
                <MenuItem value="">—</MenuItem>
                {signatoryList.map(s => <MenuItem key={s.id} value={s.id}>{s.full_name}{s.position ? ` — ${s.position}` : ''}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* شرایط و بندها */}
        <SectionHeader icon={<DescriptionIcon sx={{ color: '#fff', fontSize: 16 }} />} color="#64748b" title="شرایط و بندهای قرارداد" />
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شرایط و نحوه پرداخت" multiline rows={3} value={form.payment_terms} sx={fieldSx} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))} /></Grid>
          <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شرایط تحویل" multiline rows={3} value={form.delivery_terms} sx={fieldSx} onChange={e => setForm(p => ({ ...p, delivery_terms: e.target.value }))} /></Grid>
          <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شرایط وجه التزام / جریمه تأخیر" multiline rows={3} value={form.penalty_terms} sx={fieldSx} onChange={e => setForm(p => ({ ...p, penalty_terms: e.target.value }))} /></Grid>
          <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شرایط بیمه" multiline rows={3} value={form.insurance_terms} sx={fieldSx} onChange={e => setForm(p => ({ ...p, insurance_terms: e.target.value }))} /></Grid>
          <Grid item xs={12}><TextField size="small" fullWidth label="توضیحات تکمیلی" multiline rows={3} value={form.description} sx={fieldSx} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ContractNewPage;




