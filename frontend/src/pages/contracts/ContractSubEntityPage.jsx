import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, CircularProgress, Stack, Grid,
  TextField, FormControl, InputLabel, Select, MenuItem, IconButton, Chip,
  FormControlLabel, Switch, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import StatementPreview from './StatementPreview';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: '10px',
};

// Richer frosted-glass surface used for the split data-entry panel.
const glassForm = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.74), rgba(255,255,255,0.4))',
  backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.65)',
  boxShadow: '0 18px 48px rgba(99,102,241,0.14)', borderRadius: '16px',
};

// Gradient backdrop so the frosted-glass effect is actually visible
// (a backdrop-filter is invisible against a plain white background).
// Only rendered in split-preview mode.
const GlassBackdrop = ({ color }) => (
  <Box aria-hidden sx={{
    position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
    background: `
      radial-gradient(60% 50% at 85% 10%, ${color}26, transparent 60%),
      radial-gradient(50% 45% at 12% 88%, ${color}1f, transparent 60%),
      radial-gradient(45% 55% at 50% 50%, rgba(236,72,153,0.08), transparent 65%),
      linear-gradient(135deg, #f6f8ff, #eef1ff)`,
  }} />
);

/**
 * Generic list + full-page (NOT dialog) create/edit page for a contract
 * sub-entity (invoices, statements, payments, addendums).
 *
 * config: {
 *   title, color, endpoint, queryKey,
 *   listColumns: [{ key, label, render? }],
 *   fields: [{ key, label, type: text|number|date|bool|textarea|select, span?, options? }],
 * }
 * extraOptions: { [fieldKey]: [{ value, label }] }
 */
const ContractSubEntityPage = ({ config, extraOptions = {} }) => {
  const qc = useQueryClient();
  const [contractId, setContractId] = useState('');
  const [mode, setMode] = useState('list'); // list | form
  const [form, setForm] = useState({});

  const { data: contracts } = useQuery({
    queryKey: ['contracts-sub', config.endpoint],
    queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data, isLoading } = useQuery({
    queryKey: [config.queryKey, contractId],
    queryFn: () => axiosInstance.get(config.endpoint, { params: { contract: contractId } }).then(r => r.data),
    enabled: !!contractId,
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const save = useMutation({
    mutationFn: (p) => p.id
      ? axiosInstance.patch(`${config.endpoint}${p.id}/`, p)
      : axiosInstance.post(config.endpoint, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [config.queryKey] }); setMode('list'); setForm({}); },
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`${config.endpoint}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [config.queryKey] }),
  });

  const openNew = () => { setForm({ contract: contractId }); setMode('form'); };
  const openEdit = (row) => { setForm({ ...row }); setMode('form'); };

  const num = (v) => (v === '' || v == null ? null : Number(v));

  const submit = () => {
    const payload = { ...form, contract: contractId };
    config.fields.forEach(f => {
      if (f.type === 'number') payload[f.key] = num(payload[f.key]) || 0;
    });
    save.mutate(payload);
  };

  const renderField = (f) => {
    const value = form[f.key];
    const onChange = (v) => setForm(p => ({ ...p, [f.key]: v }));
    const span = f.span || 6;
    let control;
    if (f.type === 'date') {
      control = <JalaliDatePicker fullWidth label={f.label} value={value || ''} onChange={onChange} />;
    } else if (f.type === 'bool') {
      control = (
        <FormControlLabel control={<Switch checked={!!value} onChange={e => onChange(e.target.checked)} />} label={f.label} />
      );
    } else if (f.type === 'textarea') {
      control = <TextField size="small" fullWidth label={f.label} multiline rows={3} value={value || ''} onChange={e => onChange(e.target.value)} />;
    } else if (f.type === 'select') {
      const opts = f.options || extraOptions[f.key] || [];
      control = (
        <FormControl size="small" fullWidth>
          <InputLabel>{f.label}</InputLabel>
          <Select value={value || ''} label={f.label} onChange={e => onChange(e.target.value)}>
            <MenuItem value="">—</MenuItem>
            {opts.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
      );
    } else {
      control = <TextField size="small" fullWidth type={f.type === 'number' ? 'number' : 'text'} label={f.label} value={value ?? ''} onChange={e => onChange(e.target.value)} />;
    }
    return <Grid item xs={12} md={span} key={f.key}>{control}</Grid>;
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${config.color}1a, rgba(255,255,255,0.3))`,
        border: `1px solid ${config.color}2e`, borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: `linear-gradient(135deg,${config.color},${config.color}99)`, boxShadow: `0 8px 24px ${config.color}66` }}>
          {config.icon}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} sx={{ color: config.color }}>{config.title}</Typography>
          <Typography variant="body2" color="textSecondary">{config.subtitle}</Typography>
        </Box>
        {mode === 'form' ? (
          <Button startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => { setMode('list'); setForm({}); }}>بازگشت به لیست</Button>
        ) : (
          <Button startIcon={<AddIcon />} variant="contained" disabled={!contractId} onClick={openNew}
            sx={{ background: `linear-gradient(135deg,${config.color},${config.color}cc)`, borderRadius: '10px' }}>
            {config.addLabel}
          </Button>
        )}
      </Paper>

      {mode === 'form' ? (
        config.splitPreview ? (
          <>
            <GlassBackdrop color={config.color} />
            <Grid container spacing={2.5} sx={{ position: 'relative', zIndex: 1 }}>
              {/* ستون راست: فرم ورود اطلاعات (طراحی شیشه‌ای) */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ ...glassForm, p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{
                      width: 6, height: 22, borderRadius: '10px',
                      background: `linear-gradient(180deg,${config.color},${config.color}55)`,
                    }} />
                    <Typography variant="subtitle1" fontWeight={800} sx={{ color: config.color }}>
                      {form.id ? config.editLabel : config.addLabel}
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    {config.fields.map(renderField)}
                  </Grid>
                  <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                    <Button variant="contained" onClick={submit} disabled={save.isLoading}
                      sx={{ background: `linear-gradient(135deg,${config.color},${config.color}cc)`, px: 4, borderRadius: '12px', boxShadow: `0 10px 26px ${config.color}55` }}>
                      {save.isLoading ? <CircularProgress size={20} color="inherit" /> : 'ذخیره'}
                    </Button>
                    <Button variant="outlined" onClick={() => { setMode('list'); setForm({}); }} sx={{ borderRadius: '12px' }}>انصراف</Button>
                  </Stack>
                </Paper>
              </Grid>

              {/* ستون چپ: پیش‌نمایش زندهٔ صورت‌وضعیت */}
              <Grid item xs={12} md={6}>
                <Box sx={{ position: 'sticky', top: 16 }}>
                  <Typography variant="caption" color="textSecondary" sx={{ px: 1, mb: 1, display: 'block' }}>
                    {config.previewTitle || 'پیش‌نمایش زنده'}
                  </Typography>
                  <StatementPreview
                    form={form}
                    color={config.color}
                    contract={contractList.find(c => String(c.id) === String(contractId))}
                  />
                </Box>
              </Grid>
            </Grid>
          </>
        ) : (
          <Paper sx={{ ...glassPaper, p: 3 }}>
            <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, color: config.color }}>
              {form.id ? `${config.editLabel}` : `${config.addLabel}`}
            </Typography>
            <Grid container spacing={2}>
              {config.fields.map(renderField)}
            </Grid>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button variant="contained" onClick={submit} disabled={save.isLoading}
                sx={{ background: `linear-gradient(135deg,${config.color},${config.color}cc)`, px: 4 }}>
                {save.isLoading ? <CircularProgress size={20} color="inherit" /> : 'ذخیره'}
              </Button>
              <Button variant="outlined" onClick={() => { setMode('list'); setForm({}); }}>انصراف</Button>
            </Stack>
          </Paper>
        )
      ) : (
        <Paper sx={{ ...glassPaper, p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 280 }}>
              <InputLabel>قرارداد</InputLabel>
              <Select value={contractId || ''} label="قرارداد" onChange={e => setContractId(e.target.value)}>
                {contractList.map(c => <MenuItem key={c.id} value={c.id}>{c.subject || c.number}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          {!contractId ? (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>برای مشاهدهٔ لیست، یک قرارداد انتخاب کنید.</Typography>
          ) : isLoading ? (
            <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress /></Box>
          ) : list.length === 0 ? (
            <Typography variant="body2" color="textSecondary" textAlign="center" py={4}>موردی ثبت نشده است.</Typography>
          ) : (
            <Stack spacing={1}>
              {list.map(row => (
                <Paper key={row.id} variant="outlined" sx={{ p: 1.5, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box sx={{ flex: 1, minWidth: 0, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {config.listColumns.map(col => (
                      <Box key={col.key}>
                        <Typography variant="caption" color="textSecondary" display="block">{col.label}</Typography>
                        <Typography variant="body2" fontWeight={700}>
                          {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(row.id); }}><DeleteIcon fontSize="small" /></IconButton>
                </Paper>
              ))}
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default ContractSubEntityPage;