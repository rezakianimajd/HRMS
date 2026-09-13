import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  construction: 'ظ¾غŒظ…ط§ظ†ع©ط§ط±غŒ / ط§ط¬ط±ط§',
  purchase: 'ط®ط±غŒط¯',
  tender: 'ظ…ظ†ط§ظ‚طµظ‡',
  consulting: 'ظ…ط´ط§ظˆط±ظ‡',
  service: 'ط®ط¯ظ…ط§طھ',
  other: 'ط³ط§غŒط±',
};

const STATUS_LABELS = {
  draft: 'ظ¾غŒط´â€Œظ†ظˆغŒط³',
  active: 'ط¯ط± ط­ط§ظ„ ط§ط¬ط±ط§',
  suspended: 'ظ…طھظˆظ‚ظپ',
  completed: 'طھع©ظ…غŒظ„ ط´ط¯ظ‡',
  terminated: 'ظپط³ط® ط´ط¯ظ‡',
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
  const { id } = useParams();
  const [form, setForm] = useState(EMPTY);
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
        status: existing.status || 'draft',
        amount: existing.amount ?? '',
        start_date: existing.start_date || '',
        end_date: existing.end_date || '',
        signing_date: existing.signing_date || '',
        signatory: existing.signatory || '',
        guarantee_amount: existing.guarantee_amount ?? '',
        category: existing.category || '',
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
    }
  }, [existing]);

  const { data: parties } = useQuery({ queryKey: ['contract-parties'], queryFn: () => axiosInstance.get('/contract-parties/').then(r => r.data) });
  const partyList = Array.isArray(parties) ? parties : parties?.results || [];

  const { data: signatories } = useQuery({ queryKey: ['signatories'], queryFn: () => axiosInstance.get('/signatories/').then(r => r.data) });
  const signatoryList = Array.isArray(signatories) ? signatories : signatories?.results || [];

  const create = useMutation({
    mutationFn: (payload) =>
      isEdit
        ? axiosInstance.patch(`/external-contracts/${id}/`, payload)
        : axiosInstance.post('/external-contracts/', payload),
    onSuccess: () => {
      setMessage({ ok: true, text: isEdit ? 'ظ‚ط±ط§ط±ط¯ط§ط¯ ط¨ط§ ظ…ظˆظپظ‚غŒطھ ظˆغŒط±ط§غŒط´ ط´ط¯ âœ“' : 'ظ‚ط±ط§ط±ط¯ط§ط¯ ط¨ط§ ظ…ظˆظپظ‚غŒطھ ط«ط¨طھ ط´ط¯ âœ“' });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setTimeout(() => navigate(isEdit ? `/external-contracts/${id}` : '/external-contracts'), 1200);
    },
    onError: (e) => setMessage({ ok: false, text: e.response?.data?.error || 'ط®ط·ط§ ط¯ط± ط«ط¨طھ ظ‚ط±ط§ط±ط¯ط§ط¯' }),
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
        border: '1px solid rgba(245,158,11,0.18)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
          <HandshakeIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">{isEdit ? 'ظˆغŒط±ط§غŒط´ ظ‚ط±ط§ط±ط¯ط§ط¯' : 'ظ‚ط±ط§ط±ط¯ط§ط¯ ط¬ط¯غŒط¯'}</Typography>
          <Typography variant="body2" color="textSecondary">ط«ط¨طھ ع©ط§ظ…ظ„ ظ‚ط±ط§ط±ط¯ط§ط¯ ط¨ط§ ط¬ط²ط¦غŒط§طھ ط­ظ‚ظˆظ‚غŒطŒ ظ…ط§ظ„غŒ ظˆ ط§ط¬ط±ط§غŒغŒ â€” طھط§ط±غŒط®â€Œظ‡ط§ ط´ظ…ط³غŒ</Typography>
        </Box>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/external-contracts')}>ط¨ط§ط²ع¯ط´طھ</Button>
        <Button variant="contained" startIcon={<SaveIcon />} disabled={!form.subject || !form.party || create.isLoading}
          onClick={() => create.mutate(payload())}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: '10px', px: 3 }}>
          ط°ط®غŒط±ظ‡ ظ‚ط±ط§ط±ط¯ط§ط¯
        </Button>
      </Paper>

      {message && <Alert severity={message.ok ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {create.isLoading && <LinearProgress sx={{ mb: 2, borderRadius: '10px' }} />}

      <Paper sx={{ p: 3, borderRadius: '10px', background: 'rgba(255,255,255,0.65)' }}>
        {/* ط§ط·ظ„ط§ط¹ط§طھ ظ¾ط§غŒظ‡ */}
        <Typography variant="subtitle1" fontWeight={800} color="#b45309">ط§ط·ظ„ط§ط¹ط§طھ ظ¾ط§غŒظ‡</Typography>
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth label="ط´ظ…ط§ط±ظ‡ ظ‚ط±ط§ط±ط¯ط§ط¯" value={form.number} onChange={e => setForm(p => ({ ...p, number: e.target.value }))} /></Grid>
          <Grid item xs={12} md={8}><TextField size="small" fullWidth label="ظ…ظˆط¶ظˆط¹ ظ‚ط±ط§ط±ط¯ط§ط¯ *" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} /></Grid>
          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth><InputLabel>ط·ط±ظپ ظ‚ط±ط§ط±ط¯ط§ط¯ *</InputLabel>
              <Select value={form.party} label="ط·ط±ظپ ظ‚ط±ط§ط±ط¯ط§ط¯ *" onChange={e => setForm(p => ({ ...p, party: e.target.value }))}>
                {partyList.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth><InputLabel>ظ†ظˆط¹ ظ‚ط±ط§ط±ط¯ط§ط¯</InputLabel>
              <Select value={form.contract_type} label="ظ†ظˆط¹ ظ‚ط±ط§ط±ط¯ط§ط¯" onChange={e => setForm(p => ({ ...p, contract_type: e.target.value }))}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl size="small" fullWidth><InputLabel>ظˆط¶ط¹غŒطھ</InputLabel>
              <Select value={form.status} label="ظˆط¶ط¹غŒطھ" onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* ط§ط·ظ„ط§ط¹ط§طھ ظ¾ط±ظˆعکظ‡ ظˆ ط¯ط³طھظ‡â€Œط¨ظ†ط¯غŒ */}
        <Grid container spacing={1.5} sx={{ mt: 1 }}>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth label="ط·ط¨ظ‚ظ‡â€Œط¨ظ†ط¯غŒ ظ‚ط±ط§ط±ط¯ط§ط¯" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth label="ظ†ط§ظ… ظ¾ط±ظˆعکظ‡ / ط·ط±ط­" value={form.project_name} onChange={e => setForm(p => ({ ...p, project_name: e.target.value }))} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth label="ظ…ط­ظ„ ط§ط¬ط±ط§ / طھط­ظˆغŒظ„" value={form.project_location} onChange={e => setForm(p => ({ ...p, project_location: e.target.value }))} /></Grid>
          <Grid item xs={12} md={4}><TextField size="small" fullWidth label="ط´ظ…ط§ط±ظ‡ ظ…ظ†ط§ظ‚طµظ‡ / ط§ط³طھط¹ظ„ط§ظ…" value={form.tender_number} onChange={e => setForm(p => ({ ...p, tender_number: e.target.value }))} /></Grid>
        </Grid>

        {/* طھط§ط±غŒط®â€Œظ‡ط§ â€” ط´ظ…ط³غŒ */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={800} color="#b45309">طھط§ط±غŒط®â€Œظ‡ط§ (ط´ظ…ط³غŒ)</Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ط´ط±ظˆط¹" value={form.start_date} onChange={(g) => setForm(p => ({ ...p, start_date: g }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ظ¾ط§غŒط§ظ†" value={form.end_date} onChange={(g) => setForm(p => ({ ...p, end_date: g }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ط§ظ…ط¶ط§" value={form.signing_date} onChange={(g) => setForm(p => ({ ...p, signing_date: g }))} />
            </Grid>
          </Grid>
        </Box>

        {/* ظ…ط¨ط§ظ„ط؛ ظˆ طھط¶ظ…غŒظ† */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={800} color="#b45309">ظ…ط¨ط§ظ„ط؛ ظ…ط§ظ„غŒ ظˆ طھط¶ظ…غŒظ†â€Œظ‡ط§</Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={3}><TextField size="small" fullWidth label="ظ…ط¨ظ„ط؛ ظ‚ط±ط§ط±ط¯ط§ط¯ (ط±غŒط§ظ„)" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField size="small" fullWidth label="ظ¾غŒط´â€Œظ¾ط±ط¯ط§ط®طھ (ط±غŒط§ظ„)" type="number" value={form.advance_payment} onChange={e => setForm(p => ({ ...p, advance_payment: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField size="small" fullWidth label="ط¯ط±طµط¯ ط­ط³ظ† ط§ظ†ط¬ط§ظ… ع©ط§ط±" type="number" value={form.retention_percent} onChange={e => setForm(p => ({ ...p, retention_percent: e.target.value }))} /></Grid>
            <Grid item xs={12} md={3}><TextField size="small" fullWidth label="ظ…ط¨ظ„ط؛ طھط¶ظ…غŒظ† (ط±غŒط§ظ„)" type="number" value={form.guarantee_amount} onChange={e => setForm(p => ({ ...p, guarantee_amount: e.target.value }))} /></Grid>
          </Grid>
        </Box>

        {/* ط§ظ…ط¶ط§ع©ظ†ظ†ط¯ظ‡ ظˆ ع©غŒظپغŒطھ */}
        <Grid container spacing={1.5} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <FormControl size="small" fullWidth><InputLabel>ط§ظ…ط¶ط§ع©ظ†ظ†ط¯ظ‡ظ” ظ…ط¬ط§ط²</InputLabel>
              <Select value={form.signatory} label="ط§ظ…ط¶ط§ع©ظ†ظ†ط¯ظ‡ظ” ظ…ط¬ط§ط²" onChange={e => setForm(p => ({ ...p, signatory: e.target.value }))}>
                <MenuItem value="">â€”</MenuItem>
                {signatoryList.map(s => <MenuItem key={s.id} value={s.id}>{s.full_name}{s.position ? ` â€” ${s.position}` : ''}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={6}><TextField size="small" fullWidth label="ط¯ظˆط±ظ‡ ع¯ط§ط±ط§ظ†طھغŒ / طھط¶ظ…غŒظ† ع©غŒظپغŒطھ" value={form.warranty_period} onChange={e => setForm(p => ({ ...p, warranty_period: e.target.value }))} /></Grid>
        </Grid>

        {/* ط´ط±ط§غŒط· ظˆ ط¨ظ†ط¯ظ‡ط§ */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" fontWeight={800} color="#b45309">ط´ط±ط§غŒط· ظˆ ط¨ظ†ط¯ظ‡ط§غŒ ظ‚ط±ط§ط±ط¯ط§ط¯</Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={6}><TextField size="small" fullWidth label="ط´ط±ط§غŒط· ظˆ ظ†ط­ظˆظ‡ ظ¾ط±ط¯ط§ط®طھ" multiline rows={3} value={form.payment_terms} onChange={e => setForm(p => ({ ...p, payment_terms: e.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" fullWidth label="ط´ط±ط§غŒط· طھط­ظˆغŒظ„" multiline rows={3} value={form.delivery_terms} onChange={e => setForm(p => ({ ...p, delivery_terms: e.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" fullWidth label="ط´ط±ط§غŒط· ظˆط¬ظ‡ ط§ظ„طھط²ط§ظ… / ط¬ط±غŒظ…ظ‡ طھط£ط®غŒط±" multiline rows={3} value={form.penalty_terms} onChange={e => setForm(p => ({ ...p, penalty_terms: e.target.value }))} /></Grid>
            <Grid item xs={12} md={6}><TextField size="small" fullWidth label="ط´ط±ط§غŒط· ط¨غŒظ…ظ‡" multiline rows={3} value={form.insurance_terms} onChange={e => setForm(p => ({ ...p, insurance_terms: e.target.value }))} /></Grid>
            <Grid item xs={12}><TextField size="small" fullWidth label="طھظˆط¶غŒط­ط§طھ طھع©ظ…غŒظ„غŒ" multiline rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Grid>
          </Grid>
        </Box>
      </Paper>
    </Box>
  );
};

export default ContractNewPage;