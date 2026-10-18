import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, InputAdornment, IconButton, Tooltip, Snackbar, Alert,
  Divider, Autocomplete, AlertTitle, Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TuneIcon from '@mui/icons-material/Tune';
import ChangeCircleIcon from '@mui/icons-material/ChangeCircle';
import { formatPersianNumber, normalizeCurrencyLabel } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import ContractPicker from '../core/components/ui/ContractPicker';
import MoneyInput from '../core/components/ui/MoneyInput';
import { glassPaper } from '../core/theme/tokens';
import {
  ADDENDUM_SCHEMA, ADDENDUM_GROUPS, CONTRACT_TARGET_LABELS,
  addendumSubject, addendumSubjectLabel,
} from '../core/constants/addendumSubjects';

const EMPTY = {
  id: null, contract: '', number: '', subject: '', date: '', currency: '',
  change_description: '', provisions: [], subjects: [],
};

const GROUP_COLORS = {
  financial: '#059669', time: '#2563eb', scope: '#7c3aed',
  parties: '#db2777', legal: '#b45309', close: '#0891b2', other: '#64748b',
};

/** فیلدهای آینه‌ای (اثرگذار بر پروندهٔ قرارداد) که همراه موضوع‌ها ذخیره می‌شوند. */
const MIRROR_KEYS = Object.values(ADDENDUM_SCHEMA.subjects)
  .flatMap((subject) => subject.fields)
  .filter((field) => field.effect)
  .map((field) => field.key);

/** جمع‌بندی مقادیر آینه‌ای از موضوع‌های انتخاب‌شده (برای ذخیره در ستون‌های مدل). */
const collectMirrors = (subjects) => {
  const mirrors = {};
  MIRROR_KEYS.forEach((key) => { mirrors[key] = null; });
  (subjects || []).forEach((item) => {
    Object.entries(item.fields || {}).forEach(([key, value]) => {
      if (MIRROR_KEYS.includes(key) && value !== '' && value != null) mirrors[key] = value;
    });
  });
  return mirrors;
};

/* -------------------------------------------------- انتخاب چند موضوع */
const SubjectPicker = ({ value, onChange, options }) => {
  const selected = (value || [])
    .map((item) => options.find((option) => option.value === item.type))
    .filter(Boolean);
  return (
    <Autocomplete
      multiple
      size="small"
      fullWidth
      options={options}
      value={selected}
      disableCloseOnSelect
      groupBy={(option) => option.group_label || 'سایر'}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      filterSelectedOptions
      onChange={(_event, next) => {
        onChange((next || []).map((option) => {
          const previous = (value || []).find((item) => item.type === option.value);
          return { type: option.value, fields: previous?.fields || {} };
        }));
      }}
      renderTags={(items, getTagProps) => items.map((option, index) => (
        <Chip
          {...getTagProps({ index })}
          key={option.value}
          label={option.label}
          size="small"
          sx={{
            fontWeight: 700,
            bgcolor: `${GROUP_COLORS[option.group] || '#64748b'}18`,
            color: GROUP_COLORS[option.group] || '#64748b',
          }}
        />
      ))}
      renderInput={(params) => (
        <TextField
          {...params}
          label="موضوع‌های الحاقیه (چند موضوع قابل انتخاب است)"
          placeholder="جست‌وجو در موضوع‌ها..."
        />
      )}
    />
  );
};

/* ----------------------------------------- فیلدهای تخصصی هر موضوع انتخاب‌شده */
const SubjectField = ({ spec, value, onChange }) => {
  if (spec.type === 'date') {
    return <JalaliDatePicker fullWidth label={spec.label} value={value || ''} onChange={onChange} />;
  }
  if (spec.type === 'money') {
    return (
      <MoneyInput size="small" fullWidth label={spec.label} value={value ?? ''} onChange={onChange} />
    );
  }
  if (spec.type === 'percent') {
    return (
      <TextField size="small" fullWidth type="number" label={spec.label} value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        InputProps={{ endAdornment: <InputAdornment position="end">٪</InputAdornment> }} />
    );
  }
  if (spec.type === 'select') {
    return (
      <FormControl size="small" fullWidth>
        <InputLabel>{spec.label}</InputLabel>
        <Select value={value ?? ''} label={spec.label}
          onChange={(event) => onChange(event.target.value)}>
          <MenuItem value="">—</MenuItem>
          {(spec.choices || []).map((choice) => (
            <MenuItem key={choice.value} value={choice.value}>{choice.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }
  if (spec.type === 'textarea') {
    return (
      <TextField size="small" fullWidth multiline rows={2} label={spec.label} value={value ?? ''}
        onChange={(event) => onChange(event.target.value)} />
    );
  }
  const numeric = spec.type === 'number' || spec.type === 'int';
  return (
    <TextField size="small" fullWidth type={numeric ? 'number' : 'text'} label={spec.label}
      value={value ?? ''} onChange={(event) => onChange(event.target.value)}
      helperText={spec.help || ''} />
  );
};

const SubjectFields = ({ item, onChange }) => {
  const subject = addendumSubject(item.type);
  if (!subject) return null;
  const color = GROUP_COLORS[subject.group] || '#64748b';
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', borderColor: `${color}44`,
      background: `${color}08` }}>
      <Stack direction="row" alignItems="center" gap={1} mb={1.5} flexWrap="wrap">
        <Chip size="small" label={subject.group_label}
          sx={{ bgcolor: `${color}22`, color, fontWeight: 800 }} />
        <Typography variant="subtitle2" fontWeight={800} sx={{ flex: 1, color }}>
          {subject.label}
        </Typography>
        {subject.fields.some((field) => field.effect) ? (
          <Tooltip title="این موضوع می‌تواند مقدار پروندهٔ قرارداد را تغییر دهد">
            <Chip size="small" icon={<ChangeCircleIcon />} label="اثرگذار بر پروندهٔ قرارداد"
              variant="outlined" sx={{ color }} />
          </Tooltip>
        ) : null}
      </Stack>
      <Grid container spacing={1.5}>
        {subject.fields.map((spec) => (
          <Grid item xs={12} sm={6} md={4} key={`${item.type}-${spec.key}`}>
            <SubjectField
              spec={spec}
              value={(item.fields || {})[spec.key]}
              onChange={(next) => onChange({ ...(item.fields || {}), [spec.key]: next })} />
          </Grid>
        ))}
      </Grid>
      {subject.fields.some((field) => field.effect) ? (
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          فیلدهای نشان‌دار روی پروندهٔ قرارداد اثر می‌گذارند:
          {' '}
          {subject.fields.filter((field) => field.effect)
            .map((field) => `${field.label} → ${CONTRACT_TARGET_LABELS[field.effect[0]] || field.effect[0]}`)
            .join(' · ')}
        </Typography>
      ) : null}
    </Paper>
  );
};


/* -------------------------------------- پیش‌نمایش اثر بر پروندهٔ قرارداد */
const EffectPreview = ({ effect, loading }) => {
  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', textAlign: 'center' }}>
        <CircularProgress size={20} />
      </Paper>
    );
  }
  if (!effect) return null;
  const base = effect.base || {};
  const effective = effect.effective || {};
  const deltas = effect.deltas || {};
  const isMoney = (field) => ['amount', 'advance_payment', 'guarantee_amount'].includes(field);
  const show = (value, field) => (
    field === 'end_date'
      ? (value ? toJalali(value) : '—')
      : `${formatPersianNumber(value || 0)}`
  );
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: '12px', background: 'rgba(5,150,105,0.04)',
      borderColor: 'rgba(5,150,105,0.25)' }}>
      <Stack direction="row" alignItems="center" gap={1} mb={1} flexWrap="wrap">
        <Avatar sx={{ width: 28, height: 28, bgcolor: '#059669', fontSize: 13 }}>
          <TuneIcon sx={{ fontSize: 16 }} />
        </Avatar>
        <Typography variant="subtitle2" fontWeight={800} color="#047857">
          اثر این الحاقیه بر پروندهٔ قرارداد
        </Typography>
        <Chip size="small" variant="outlined" label={`${formatPersianNumber(effect.addendum_count || 0)} الحاقیه`} />
        {(effect.changed || []).map((field) => (
          <Chip key={field} size="small" color="success"
            label={CONTRACT_TARGET_LABELS[field] || field} sx={{ fontWeight: 700 }} />
        ))}
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 800 }}>مورد</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>مقدار پایه</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>پس از الحاقیه</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>تغییر</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(CONTRACT_TARGET_LABELS).map(([field, label]) => {
            const delta = deltas[field];
            const changed = field === 'end_date'
              ? base[field] !== effective[field]
              : Math.abs(Number(delta || 0)) > 0;
            return (
              <TableRow key={field} sx={{ bgcolor: changed ? 'rgba(5,150,105,0.06)' : 'transparent' }}>
                <TableCell>{label}</TableCell>
                <TableCell>{show(base[field], field)}</TableCell>
                <TableCell sx={{ fontWeight: changed ? 800 : 400 }}>
                  {show(effective[field], field)}
                </TableCell>
                <TableCell sx={{ color: changed ? '#047857' : 'text.secondary' }}>
                  {field === 'end_date'
                    ? (changed ? 'تغییر یافته' : '—')
                    : (delta ? `${isMoney(field) ? formatPersianNumber(delta) : formatPersianNumber(delta)}` : '—')}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {(effect.warnings || []).map((warning) => (
        <Alert key={warning} severity="warning" sx={{ mt: 1, borderRadius: '10px', py: 0 }}>
          <Typography variant="caption">{warning}</Typography>
        </Alert>
      ))}
    </Paper>
  );
};



/* ------------------------------------------------------------ صفحهٔ اصلی */
const ContractAddendumsPage = () => {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const urlContract = searchParams.get('contract') || '';
  const [contractId, setContractId] = useState(urlContract);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [preview, setPreview] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const { data: contracts } = useQuery({
    queryKey: ['ext-contracts-addendum'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then((r) => r.data),
  });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: currencies } = useQuery({
    queryKey: ['currencies-addendum'],
    queryFn: () => axiosInstance.get('/currencies/', { params: { page_size: 100 } }).then((r) => r.data),
  });
  const currencyList = Array.isArray(currencies) ? currencies : currencies?.results || [];

  // طرح موضوع‌ها از سرور؛ در نبود سرویس، فهرست محلی هم‌تراز استفاده می‌شود
  const { data: schemaData } = useQuery({
    queryKey: ['addendum-subject-schema'],
    queryFn: () => axiosInstance.get('/contract-addendums/subject-types/').then((r) => r.data),
  });
  const subjectOptions = useMemo(() => {
    if (Array.isArray(schemaData)) return schemaData;          // حالت compact
    if (schemaData?.subjects?.length) return schemaData.subjects;
    return ADDENDUM_SCHEMA.subjects;
  }, [schemaData]);

  const { data, isLoading } = useQuery({
    queryKey: ['contract-addendums', contractId],
    queryFn: () => axiosInstance.get('/contract-addendums/', {
      params: { contract: contractId, page_size: 500 },
    }).then((r) => r.data),
    enabled: !!contractId,
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const { data: contractEffects } = useQuery({
    queryKey: ['contract-effects', contractId],
    queryFn: () => axiosInstance.get(`/external-contracts/${contractId}/effective/`).then((r) => r.data),
    enabled: !!contractId,
  });

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) =>
      (row.number || '').toLowerCase().includes(q) ||
      (row.subject || '').toLowerCase().includes(q) ||
      (row.subjects_display || '').toLowerCase().includes(q) ||
      (row.change_description || '').toLowerCase().includes(q));
  }, [list, search]);

  const sanitize = (payload) => ({
    ...payload,
    contract: payload.contract || null,
    date: payload.date || null,
    new_end_date: payload.new_end_date || null,
    currency: payload.currency || null,
    provisions: Array.isArray(payload.provisions) ? payload.provisions : [],
    subjects: (payload.subjects || []).map((item) => ({
      type: item.type,
      fields: Object.fromEntries(
        Object.entries(item.fields || {}).filter(([, value]) => value !== '' && value != null),
      ),
    })),
    ...collectMirrors(payload.subjects),
    subject_type: payload.subjects?.[0]?.type || '',
  });

  const previewEffect = useMutation({
    mutationFn: () => axiosInstance.post('/contract-addendums/effect-preview/', {
      contract: contractId,
      subjects: form.subjects,
      ...collectMirrors(form.subjects),
      ignore: form.id || undefined,
    }).then((r) => r.data),
    onSuccess: (data) => setPreview(data),
  });

  // پیش‌نمایش زندهٔ اثر الحاقیه (با تأخیر کوتاه پس از آخرین تغییر موضوع‌ها/فیلدها)
  useEffect(() => {
    if (!dialog || !contractId) return undefined;
    const timer = setTimeout(() => previewEffect.mutate(), 400);
    return () => clearTimeout(timer);
  }, [dialog, contractId, form.subjects, form.id]);

  const save = useMutation({
    mutationFn: (payload) => {
      const clean = sanitize(payload);
      return clean.id
        ? axiosInstance.patch(`/contract-addendums/${clean.id}/`, clean)
        : axiosInstance.post('/contract-addendums/', clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-addendums'] });
      qc.invalidateQueries({ queryKey: ['contract-effects'] });
      qc.invalidateQueries({ queryKey: ['external-contracts'] });
      setDialog(false);
      setForm(EMPTY);
      setPreview(null);
      setToast('الحاقیه ذخیره شد');
    },
    onError: (e) => {
      const d = e.response?.data;
      let msg = 'خطا در ذخیره';
      if (d) {
        if (typeof d === 'string') msg = d;
        else if (Array.isArray(d)) msg = d[0];
        else if (d.detail) msg = d.detail;
        else if (d.error) msg = d.error;
        else if (d.non_field_errors) msg = d.non_field_errors[0];
        else if (Array.isArray(d.subjects)) msg = d.subjects[0];
        else { const first = Object.values(d).flat()[0]; if (first) msg = first; }
      }
      setError(msg);
    },
  });

  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-addendums/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-addendums'] });
      qc.invalidateQueries({ queryKey: ['contract-effects'] });
      setToast('حذف شد');
    },
  });

  const openNew = () => {
    setForm({ ...EMPTY, contract: contractId });
    setPreview(null);
    setError('');
    setDialog(true);
  };

  const openEdit = (row) => {
    setForm({
      id: row.id,
      contract: row.contract || contractId,
      number: row.number || '',
      subject: row.subject || '',
      date: row.date || '',
      currency: row.currency || '',
      change_description: row.change_description || '',
      provisions: row.provisions || [],
      subjects: (row.subjects || []).map((item) => ({
        type: item.type, fields: { ...(item.fields || {}) },
      })),
    });
    setPreview(null);
    setError('');
    setDialog(true);
  };

  const updateSubjectFields = (type, fields) => setForm((prev) => ({
    ...prev,
    subjects: (prev.subjects || []).map((item) => (
      item.type === type ? { type, fields } : item
    )),
  }));

  const addProvision = () => setForm((prev) => ({
    ...prev, provisions: [...(prev.provisions || []), { title: '', text: '' }],
  }));
  const updateProvision = (index, key, value) => setForm((prev) => ({
    ...prev,
    provisions: (prev.provisions || []).map((row, idx) => (
      idx === index ? { ...row, [key]: value } : row
    )),
  }));
  const removeProvision = (index) => setForm((prev) => ({
    ...prev, provisions: (prev.provisions || []).filter((_, idx) => idx !== index),
  }));

  const selCurrency = currencyList.find((c) => String(c.id) === String(form.currency));
  const currencyLabel = normalizeCurrencyLabel(
    selCurrency?.name || contractList.find((c) => String(c.id) === String(contractId))?.currency_name
  );
  const effective = contractEffects?.effective || {};
  const baseContract = contractEffects?.base || {};

  const summaryChip = (label, value, field, isDate) => {
    const changed = (contractEffects?.changed || []).includes(field);
    return (
      <Chip
        key={field}
        size="small"
        icon={changed ? <ChangeCircleIcon /> : undefined}
        label={`${label}: ${isDate
          ? (value ? toJalali(value) : '—')
          : formatPersianNumber(value || 0)}${changed ? ' (با الحاقیه)' : ''}`}
        sx={{
          fontWeight: 700,
          bgcolor: changed ? 'rgba(5,150,105,0.12)' : 'rgba(100,116,139,0.08)',
          color: changed ? '#047857' : '#475569',
        }}
      />
    );
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(236,72,153,0.12), rgba(139,92,246,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(236,72,153,0.18)', borderRadius: '12px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', boxShadow: '0 8px 24px rgba(236,72,153,0.4)' }}>
          <EditNoteIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#be185d">الحاقیه‌های قرارداد</Typography>
          <Typography variant="body2" color="textSecondary">
            چند موضوع در هر الحاقیه + فیلدهای تخصصی هر موضوع؛ اثر آن‌ها روی پروندهٔ قرارداد (مبلغ،
            پیش‌پرداخت، مدت، تضمین و ...) به‌صورت زنده محاسبه می‌شود.
          </Typography>
        </Box>
      </Paper>

      {!contractId ? (
        <Paper sx={{ ...glassPaper, p: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
            انتخاب قرارداد ({formatPersianNumber(contractList.length)})
          </Typography>
          <ContractPicker contracts={contractList} onSelect={(c) => setContractId(String(c.id))} height={520} />
        </Paper>
      ) : (
        <>
          <Paper sx={{ ...glassPaper, p: 1.5, mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button size="small" startIcon={<ArrowBackIcon />} variant="outlined" onClick={() => setContractId('')}>تغییر قرارداد</Button>
            <Typography variant="body2" fontWeight={800} sx={{ flex: 1, minWidth: 160 }}>
              {contractList.find((c) => String(c.id) === String(contractId))?.subject || 'قرارداد'}
            </Typography>
            <TextField size="small" placeholder="جست‌وجو در الحاقیه‌ها..." value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ minWidth: 220 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}
              sx={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', borderRadius: '10px' }}>
              الحاقیه جدید
            </Button>
          </Paper>

          {/* خلاصهٔ پروندهٔ مؤثر قرارداد (اثر الحاقیه‌ها) */}
          <Paper sx={{ ...glassPaper, p: 1.5, mb: 2 }}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" alignItems="center">
              <Chip size="small" label="پروندهٔ مؤثر قرارداد"
                sx={{ fontWeight: 800, bgcolor: 'rgba(5,150,105,0.14)', color: '#047857' }} />
              {summaryChip('مبلغ', effective.amount, 'amount')}
              {summaryChip('پیش‌پرداخت', effective.advance_payment, 'advance_payment')}
              {summaryChip('پایان', effective.end_date, 'end_date', true)}
              {summaryChip('تضمین', effective.guarantee_amount, 'guarantee_amount')}
              {summaryChip('حسن انجام کار', effective.retention_percent, 'retention_percent')}
              {baseContract.amount ? (
                <Typography variant="caption" color="textSecondary">
                  (پایه: مبلغ {formatPersianNumber(baseContract.amount)} · پیش‌پرداخت {formatPersianNumber(baseContract.advance_payment || 0)})
                </Typography>
              ) : null}
            </Stack>
            {(contractEffects?.warnings || []).map((warning) => (
              <Alert key={warning} severity="warning" sx={{ mt: 1, borderRadius: '10px', py: 0 }}>
                <Typography variant="caption">{warning}</Typography>
              </Alert>
            ))}
          </Paper>

          {isLoading ? (
            <Box sx={{ py: 5, textAlign: 'center' }}><CircularProgress /></Box>
          ) : filtered.length === 0 ? (
            <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
              <EditNoteIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography variant="body2" color="textSecondary">الحاقیه‌ای ثبت نشده است.</Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {filtered.map((row) => (
                <Grid item xs={12} md={6} key={row.id}>
                  <Paper sx={{ ...glassPaper, p: 2, position: 'relative', overflow: 'hidden' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                      <Avatar sx={{ width: 44, height: 44, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)' }}>
                        <EditNoteIcon sx={{ color: '#fff' }} />
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" fontWeight={800}>
                          {row.subjects_display || row.subject || row.number || 'الحاقیه'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {row.number ? `شماره: ${row.number} · ` : ''}{toJalali(row.date)}
                          {row.subject ? ` · ${row.subject}` : ''}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton size="small" onClick={() => openEdit(row)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error"
                          onClick={() => { if (window.confirm('حذف این الحاقیه؟')) del.mutate(row.id); }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
                      {(row.subjects_detail || []).map((item) => (
                        <Chip key={item.type} size="small" label={item.label}
                          sx={{ bgcolor: `${GROUP_COLORS[item.group] || '#64748b'}18`,
                            color: GROUP_COLORS[item.group] || '#64748b', fontWeight: 700 }} />
                      ))}
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}


      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, py: 2,
          background: 'linear-gradient(120deg, rgba(236,72,153,0.12), rgba(139,92,246,0.08), rgba(255,255,255,0.4))',
          borderBottom: '1px solid rgba(236,72,153,0.15)' }}>
          <Avatar sx={{ width: 44, height: 44, background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', boxShadow: '0 6px 18px rgba(236,72,153,0.4)' }}>
            <EditNoteIcon sx={{ color: '#fff' }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={800}>{form.id ? 'ویرایش الحاقیه' : 'الحاقیه جدید'}</Typography>
            <Typography variant="caption" color="textSecondary">
              موضوع‌ها را (چند مورد) انتخاب کنید؛ فیلدهای تخصصی هر موضوع نمایش داده می‌شود.
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" fontWeight={700} color="#be185d" sx={{ mb: 1, display: 'block' }}>
              اطلاعات پایه
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="شماره الحاقیه" value={form.number || ''}
                  onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <JalaliDatePicker fullWidth label="تاریخ الحاقیه" value={form.date}
                  onChange={(value) => setForm((p) => ({ ...p, date: value }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl size="small" fullWidth>
                  <InputLabel>واحد ارز</InputLabel>
                  <Select value={form.currency || ''} label="واحد ارز"
                    onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}>
                    <MenuItem value="">—</MenuItem>
                    {currencyList.map((c) => <MenuItem key={c.id} value={c.id}>{normalizeCurrencyLabel(c.name || c.symbol)} ({c.code})</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField size="small" fullWidth label="شرح موضوع (اختیاری)" value={form.subject || ''}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" fontWeight={700} color="#7c3aed" sx={{ mb: 1, display: 'block' }}>
              موضوع‌های الحاقیه (چندگانه)
            </Typography>
            <SubjectPicker value={form.subjects} options={subjectOptions}
              onChange={(subjects) => setForm((p) => ({ ...p, subjects }))} />
            {(form.subjects || []).length === 0 ? (
              <Alert severity="info" sx={{ mt: 1.5, borderRadius: '10px', py: 0 }}>
                <Typography variant="caption">
                  با انتخاب موضوع‌ها، فیلدهای تخصصی همان موضوع‌ها (و اثرشان روی پروندهٔ قرارداد) نمایان می‌شود.
                </Typography>
              </Alert>
            ) : (
              <Stack spacing={1.5} sx={{ mt: 1.5 }}>
                {(form.subjects || []).map((item) => (
                  <SubjectFields key={item.type} item={item}
                    onChange={(fields) => updateSubjectFields(item.type, fields)} />
                ))}
              </Stack>
            )}
          </Box>

          <Divider />

          <EffectPreview effect={preview} loading={previewEffect.isLoading} />

          <Divider />

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" fontWeight={700} color="#7c3aed">مفاد / بندهای الحاقیه</Typography>
              <Button size="small" startIcon={<AddCircleIcon />} onClick={addProvision} sx={{ color: '#7c3aed' }}>
                افزودن بند
              </Button>
            </Box>
            {(form.provisions || []).length === 0 ? (
              <Typography variant="caption" color="textSecondary">بندی تعریف نشده است.</Typography>
            ) : (
              <Stack spacing={1}>
                {(form.provisions || []).map((item, index) => (
                  <Paper key={index} variant="outlined" sx={{ p: 1.25, borderRadius: '10px',
                    background: 'rgba(139,92,246,0.04)', borderColor: 'rgba(139,92,246,0.25)' }}>
                    <Grid container spacing={1} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <TextField size="small" fullWidth label="عنوان بند" value={item.title || ''}
                          onChange={(e) => updateProvision(index, 'title', e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={7}>
                        <TextField size="small" fullWidth label="متن بند" value={item.text || ''}
                          onChange={(e) => updateProvision(index, 'text', e.target.value)} />
                      </Grid>
                      <Grid item xs={12} sm={1}>
                        <IconButton size="small" color="error" onClick={() => removeProvision(index)}>
                          <RemoveCircleIcon fontSize="small" />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </Stack>
            )}
          </Box>

          <Divider />

          <TextField size="small" fullWidth label="شرح تغییرات" multiline rows={3}
            value={form.change_description || ''}
            onChange={(e) => setForm((p) => ({ ...p, change_description: e.target.value }))} />

          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              <AlertTitle>ذخیره نشد</AlertTitle>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(236,72,153,0.12)' }}>
          <Button onClick={() => setDialog(false)} sx={{ borderRadius: '10px' }}>انصراف</Button>
          <Button variant="contained" onClick={() => save.mutate(form)} disabled={save.isLoading}
            sx={{ background: 'linear-gradient(135deg,#ec4899,#8b5cf6)', borderRadius: '10px', px: 3,
              boxShadow: '0 8px 22px rgba(236,72,153,0.35)' }}>
            {save.isLoading ? <CircularProgress size={20} color="inherit" /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ContractAddendumsPage;

