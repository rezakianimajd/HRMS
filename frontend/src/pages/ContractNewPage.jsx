import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  TextField, FormControl, InputLabel, Select, MenuItem, Divider, Alert, LinearProgress,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { toPersianDigits, formatPersianNumber } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { toJalali } from '../core/utils/dateUtils';

const TYPE_LABELS = {
  construction: 'پیمانکاری / اجرا',
  purchase: 'خرید',
  tender: 'مناقصه',
  consulting: 'مشاوره',
  service: 'خدمات',
  other: 'سایر',
};

const STATUS_LABELS = {
  draft: 'پیش‌نویس',
  active: 'در حال اجرا',
  suspended: 'متوقف',
  completed: 'تکمیل شده',
  terminated: 'فسخ شده',
};

const EMPTY = {
  number: '', subject: '', party: '', contract_type: 'purchase', status: 'draft',
  amount: '', start_date: '', end_date: '', signing_date: '', signatory: '',
  guarantee_amount: '', category: '', project_name: '', project_location: '',
  tender_number: '', advance_payment: '', retention_percent: '', warranty_period: '',
  payment_terms: '', delivery_terms: '', penalty_terms: '', insurance_terms: '', description: '',
};

const ContractNewPage = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState(null);

  const { data: parties } = useQuery({ queryKey: ['contract-parties'], queryFn: () => axiosInstance.get('/contract-parties/').then(r => r.data) });
  const partyList = Array.isArray(parties) ? parties : parties?.results || [];

  const { data: signatories } = useQuery({ queryKey: ['signatories'], queryFn: () => axiosInstance.get('/signatories/').then(r => r.data) });
  const signatoryList = Array.isArray(signatories) ? signatories : signatories?.results || [];

  const create = useMutation({
    mutationFn: (payload) => axiosInstance.post('/external-contracts/', payload),
    onSuccess: () => {
      setMessage({ ok: true, text: 'قرارداد با موفقیت ثبت شد ✓' });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setTimeout(() => navigate('/external-contracts'), 1200);
    },
    onError: (e) => setMessage({ ok: false, text: e.response?.data?.error || 'خطا در ثبت قرارداد' }),
  });

  const num = (v) => (v === '' || v == null ? null : Number(v));

  const payload = () => ({
    number: form.number,
    subject: form.subject,
    party: form.party,
    contract_type: form.contract_type,
    status: form.status,
    amount: num(form.amount),
    start_date: form.start_date || null,
    end_date: form.end_date || null,
    signing_date: form.signing_date || null,
    signatory: form.signatory || null,
    guarantee_amount: num(form.guarantee_amount),
    category: form.category,
    project_name: form.project_name,
    project_location: form.project_location,
    tender_number: form.tender_number,
    advance_payment: num(form.advance_payment),
    retention_percent: num(form.retention_percent),
    warranty_period: form.warranty_period,
    payment_terms: form.payment_terms,
    delivery_terms: form.delivery_terms,
    penalty_terms: form.penalty_terms,
    insurance_terms: form.insurance_terms,
    description: form.description,
  });

  const section = (icon, title) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 1.5 }}>
      <Avatar sx={{ width: 30, height: 30, background: 'linear-gradient(135deg,#f59e0b,#f97316)' }}>{icon}</Avatar>
      <Typography variant="subtitle1" fontWeight={800} color="#b45309">{title}</Typography>
      <Divider sx={{ flex: 1 }} />
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(245,158,11,0.12), rgba(249,115,22,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.18)', borderRadius: 3 }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
          <HandshakeIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">قرارداد جدید</Typography>
          <Typography variant="body2" color="textSecondary">ثبت کامل قرارداد با جزئیات حقوقی، مالی و اجرایی — تاریخ‌ها شمسی</Typography>
        </Box>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/external-contracts')}>بازگشت</Button>
        <Button variant="contained" startIcon={<SaveIcon />} disabled={!form.subject || !form.party || create.isLoading}
          onClick={() => create.mutate(payload())}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: 2, px: 3 }}>
          ذخیره قرارداد
        </Button>
      </Paper>

      {message && <Alert severity={message.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {create.isLoading && <LinearProgress sx={{ mb: 2, borderRadius: 2 }} />}

      <Paper sx={{ p: 3, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
        {/* اطلاعات پایه */}
        <Typography variant="subtitle1" fontWeight={800} color="#b45309">اطلاعات پایه</Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شماره قرارداد" value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} /></Grid>
          <Grid item xs={12} md={8}><TextField size="small" fullWidth label="موضوع قرارداد *" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></Grid>
          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth><InputLabel>طرف قرارداد *</InputLabel>
              <Select value={form.party} label="طرف قرارداد *" onChange={e => setForm(p => ({ ...p, party: e.target.value }))}>
                {partyList.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth><InputLabel>نوع قرارداد</InputLabel>
              <Select value={form.contract_type} label="نوع قرارداد" onChange={e => setForm(p => ({ ...p, contract_type: e.target.value }))}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth><InputLabel>وضعیت</InputLabel>
              <Select value={form.status} label="وضعیت" onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* اطلاعات پروژه و دسته‌بندی */}
        <Grid container spacing={1.5} sx={{ mt: 1 }}>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth label="طبقه‌بندی قرارداد" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth label="نام پروژه / طرح" value={form.project_name} onChange={e => setForm(p => ({ ...p, project_name: e.target.value }))} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth label="محل اجرا / تحویل" value={form.project_location} onChange={e => setForm(p => ({ ...p, project_location: e.target.value }))} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شماره مناقصه / استعلام" value={form.tender_number} onChange={e => setForm(p => ({ ...p, tender_number: e.target.value }))} /></Grid>
        </Grid>

        {/* تاریخ‌ها — شمسی */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={800} color="#b45309">تاریخ‌ها (شمسی)</Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="تاریخ شروع" value={form.start_date} onChange={(g) => setForm(p => ({ ...p, start_date: g }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="تاریخ پایان" value={form.end_date} onChange={(g) => setForm(p => ({ ...p, end_date: g }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="تاریخ امضا" value={form.signing_date} onChange={(g) => setForm(p => ({ ...p, signing_date: g }))} />
            </Grid>
          </Grid>
        </Box>

        {/* مبالغ و تضمین */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={800} color="#b45309">مبالغ مالی و تضمین‌ها</Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={3}><TextField size="small" fullWidth label="مبلغ قرارداد (ریال)" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField size="small" fullWidth label="پیش‌پرداخت (ریال)" type="number" value={form.advance_payment} onChange={e => setForm(p => ({ ...p, advance_payment: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField size="small" fullWidth label="درصد حسن انجام کار" type="number" value={form.retention_percent} onChange={e => setForm(p => ({ ...p, retention_percent: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField size="small" fullWidth label="مبلغ تضمین (ریال)" type="number" value={form.guarantee_amount} onChange={e => setForm(p => ({ ...p, guarantee_amount: e.target.value }))} /></Grid>
          </Grid>
        </Box>

        {/* امضاکننده و کیفیت */}
        <Grid container spacing={1.5} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <FormControl size="small" fullWidth><InputLabel>امضاکنندهٔ مجاز</InputLabel>
              <Select value={form.signatory} label="امضاکنندهٔ مجاز" onChange={e => setForm(p => ({ ...p, signatory: e.target.value }))}>
                <MenuItem value="">—</MenuItem>
                {signatoryList.map(s => <MenuItem key={s.id} value={s.id}>{s.full_name}{s.position ? ` — ${s.position}` : ''}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}><TextField size="small" fullWidth label="دوره گارانتی / تضمین کیفیت" value={form.warranty_period} onChange={e => setForm(p => ({ ...p, warranty_period: e.target.value }))} /></Grid>
        </Grid>

        {/* شرایط و بندها */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={800} color="#b45309">شرایط و بندهای قرارداد</Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شرایط و نحوه پرداخت" multiline rows={3} value={form.payment_terms} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شرایط تحویل" multiline rows={3} value={form.delivery_terms} onChange={e => setForm(p => ({ ...p, delivery_terms: e.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شرایط وجه التزام / جریمه تأخیر" multiline rows={3} value={form.penalty_terms} onChange={e => setForm(p => ({ ...p, penalty_terms: e.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شرایط بیمه" multiline rows={3} value={form.insurance_terms} onChange={e => setForm(p => ({ ...p, insurance_terms: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField size="small" fullWidth label="توضیحات تکمیلی" multiline rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default ContractNewPage;