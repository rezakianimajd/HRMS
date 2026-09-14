import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, IconButton, TextField, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  Grid, Stack, Divider, Tabs, Tab, Autocomplete, ListItem, ListItemIcon,
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const glassCard = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.66), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: '0 12px 34px rgba(99,102,241,0.10)',
  borderRadius: '16px',
};

const flagUrl = (cc) => `https://flagcdn.com/w40/${(cc || '').toLowerCase()}.png`;

/* Preset traded currencies (mirrors backend seed). */
const PRESET_CURRENCIES = [
  { code: 'IRR', name: 'ریال ایران', symbol: '﷼', country_code: 'IR' },
  { code: 'USD', name: 'دلار آمریکا', symbol: '$', country_code: 'US' },
  { code: 'EUR', name: 'یورو', symbol: '€', country_code: 'EU' },
  { code: 'GBP', name: 'پوند بریتانیا', symbol: '£', country_code: 'GB' },
  { code: 'JPY', name: 'ین ژاپن', symbol: '¥', country_code: 'JP' },
  { code: 'CNY', name: 'یوآن چین', symbol: '¥', country_code: 'CN' },
  { code: 'CHF', name: 'فرانک سوئیس', symbol: 'CHF', country_code: 'CH' },
  { code: 'CAD', name: 'دلار کانادا', symbol: 'C$', country_code: 'CA' },
  { code: 'AUD', name: 'دلار استرالیا', symbol: 'A$', country_code: 'AU' },
  { code: 'NZD', name: 'دلار نیوزیلند', symbol: 'NZ$', country_code: 'NZ' },
  { code: 'AED', name: 'درهم امارات', symbol: 'د.إ', country_code: 'AE' },
  { code: 'SAR', name: 'ریال عربستان', symbol: '﷼', country_code: 'SA' },
  { code: 'TRY', name: 'لیر ترکیه', symbol: '₺', country_code: 'TR' },
  { code: 'RUB', name: 'روبل روسیه', symbol: '₽', country_code: 'RU' },
  { code: 'INR', name: 'روپیه هند', symbol: '₹', country_code: 'IN' },
  { code: 'PKR', name: 'روپیه پاکستان', symbol: '₨', country_code: 'PK' },
  { code: 'AFN', name: 'افغانی', symbol: '؋', country_code: 'AF' },
  { code: 'IQD', name: 'دینار عراق', symbol: 'ع.د', country_code: 'IQ' },
  { code: 'KWD', name: 'دینار کویت', symbol: 'د.ك', country_code: 'KW' },
  { code: 'QAR', name: 'ریال قطر', symbol: '﷼', country_code: 'QA' },
  { code: 'OMR', name: 'ریال عمان', symbol: '﷼', country_code: 'OM' },
  { code: 'BHD', name: 'دینار بحرین', symbol: 'د.ب', country_code: 'BH' },
  { code: 'MYR', name: 'رینگیت مالزی', symbol: 'RM', country_code: 'MY' },
  { code: 'SGD', name: 'دلار سنگاپور', symbol: 'S$', country_code: 'SG' },
  { code: 'KRW', name: 'وون کره جنوبی', symbol: '₩', country_code: 'KR' },
  { code: 'HKD', name: 'دلار هنگ کنگ', symbol: 'HK$', country_code: 'HK' },
  { code: 'SEK', name: 'کرون سوئد', symbol: 'kr', country_code: 'SE' },
  { code: 'NOK', name: 'کرون نروژ', symbol: 'kr', country_code: 'NO' },
];

const CardHeader = ({ color, icon, title, subtitle, action }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
    <Avatar sx={{ width: 40, height: 40, background: `linear-gradient(135deg, ${color}, ${color}99)`, boxShadow: `0 6px 16px ${color}55` }}>
      {icon}
    </Avatar>
    <Box sx={{ flex: 1, minWidth: 160 }}>
      <Typography variant="subtitle1" fontWeight={800} sx={{ color }}>{title}</Typography>
      <Typography variant="caption" color="textSecondary">{subtitle}</Typography>
    </Box>
    {action}
  </Box>
);

/* -------------------------- Additions / Deductions card -------------------------- */
const PercentCard = ({ endpoint, color, icon, title, subtitle, queryKey }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ code: '', description: '', default_percent: 0 });

  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: () => axiosInstance.get(endpoint).then((r) => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];

  const save = useMutation({
    mutationFn: (p) => (editing
      ? axiosInstance.patch(`${endpoint}${editing.id}/`, p)
      : axiosInstance.post(endpoint, p)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); setOpen(false); setEditing(null); setForm({ code: '', description: '', default_percent: 0 }); },
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`${endpoint}${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }),
  });

  const openNew = () => { setEditing(null); setForm({ code: '', description: '', default_percent: 0 }); setOpen(true); };
  const openEdit = (item) => { setEditing(item); setForm({ code: item.code, description: item.description, default_percent: Number(item.default_percent || 0) }); setOpen(true); };

  return (
    <Paper sx={{ ...glassCard, p: 2.5, height: '100%' }}>
      <CardHeader color={color} icon={icon} title={title} subtitle={subtitle}
        action={<Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}
          sx={{ background: `linear-gradient(135deg, ${color}, ${color}cc)`, borderRadius: '10px' }}>افزودن</Button>} />

      {isLoading ? <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>
        : list.length === 0 ? <Typography variant="caption" color="textSecondary">موردی ثبت نشده است.</Typography>
        : <Stack spacing={1}>
          {list.map((item) => (
            <Box key={item.id} sx={{ p: 1.5, borderRadius: '12px', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700}>{item.code}</Typography>
                <Typography variant="caption" color="textSecondary">{item.description}</Typography>
              </Box>
              <Chip size="small" label={`${Number(item.default_percent || 0).toLocaleString('fa-IR')}٪`}
                sx={{ bgcolor: `${color}18`, color, fontWeight: 700 }} />
              <IconButton size="small" onClick={() => openEdit(item)}><EditIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(item.id); }}><DeleteIcon fontSize="small" /></IconButton>
            </Box>
          ))}
        </Stack>}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'ویرایش' : 'افزودن'}</DialogTitle>
        <DialogContent>
          <TextField size="small" fullWidth label="کد" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} sx={{ mb: 1.5, mt: 1 }} />
          <TextField size="small" fullWidth label="شرح" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} sx={{ mb: 1.5 }} />
          <TextField size="small" fullWidth type="number" label="درصد پیش‌فرض" value={form.default_percent}
            onChange={(e) => setForm((p) => ({ ...p, default_percent: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => save.mutate({ ...form, default_percent: Number(form.default_percent || 0) })} disabled={save.isLoading}>
            {save.isLoading ? <CircularProgress size={20} /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

/* -------------------------- Currencies card -------------------------- */
const CurrencyCard = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => axiosInstance.get('/currencies/').then((r) => r.data),
  });
  const list = Array.isArray(data) ? data : data?.results || [];
  const existingCodes = list.map((c) => c.code);

  const add = useMutation({
    mutationFn: (cur) => axiosInstance.post('/currencies/', cur),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['currencies'] }); setOpen(false); setSelected(null); },
  });
  const del = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/currencies/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['currencies'] }),
  });
  const seed = useMutation({
    mutationFn: () => axiosInstance.post('/currencies/seed_defaults/'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['currencies'] }),
  });
  const updateRate = useMutation({
    mutationFn: ({ id, exchange_rate }) => axiosInstance.patch(`/currencies/${id}/`, { exchange_rate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['currencies'] }),
  });

  const available = PRESET_CURRENCIES.filter((c) => !existingCodes.includes(c.code));

  return (
    <Paper sx={{ ...glassCard, p: 2.5, height: '100%' }}>
      <CardHeader color="#0ea5e9" icon={<AttachMoneyIcon sx={{ color: '#fff', fontSize: 22 }} />} title="ارزها"
        subtitle="انتخاب از فهرست ارزهای رایج (با پرچم کشور)"
        action={
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} disabled={available.length === 0}
              sx={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', borderRadius: '10px' }}>افزودن ارز</Button>
            <Button size="small" variant="outlined" startIcon={seed.isLoading ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
              onClick={() => seed.mutate()} disabled={available.length === 0 || seed.isLoading}
              sx={{ borderRadius: '10px', color: '#0284c7', borderColor: '#0284c766' }}>افزودن همه</Button>
          </Stack>
        } />

      {isLoading ? <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} /></Box>
        : list.length === 0 ? <Typography variant="caption" color="textSecondary">ارزی ثبت نشده است.</Typography>
        : <Stack spacing={1}>
          {list.map((c) => (
            <Box key={c.id} sx={{ p: 1.25, borderRadius: '12px', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: 1.25 }}>
              <Box component="img" src={flagUrl(c.country_code)} alt={c.code}
                sx={{ width: 30, height: 22, objectFit: 'cover', borderRadius: '4px', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontWeight={700}>{c.name}</Typography>
                  <Chip size="small" label={c.code} sx={{ bgcolor: 'rgba(14,165,233,0.12)', color: '#0284c7', fontWeight: 700, height: 20 }} />
                </Stack>
                <Typography variant="caption" color="textSecondary">نماد: {c.symbol}</Typography>
              </Box>
              <TextField
                size="small" type="number" label="نرخ به ریال"
                defaultValue={c.exchange_rate}
                onBlur={(e) => { const v = Number(e.target.value); if (v && v !== Number(c.exchange_rate)) updateRate.mutate({ id: c.id, exchange_rate: v }); }}
                sx={{ width: 140 }}
              />
              <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف؟')) del.mutate(c.id); }}><DeleteIcon fontSize="small" /></IconButton>
            </Box>
          ))}
        </Stack>}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>انتخاب ارز</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Autocomplete
            value={selected}
            onChange={(e, v) => setSelected(v)}
            options={available}
            getOptionLabel={(o) => `${o.name} (${o.code})`}
            renderOption={(props, o) => (
              <ListItem {...props} key={o.code}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Box component="img" src={flagUrl(o.country_code)} alt={o.code} sx={{ width: 26, height: 18, objectFit: 'cover', borderRadius: '3px' }} />
                </ListItemIcon>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{o.name}</Typography>
                  <Typography variant="caption" color="textSecondary">{o.code} · {o.symbol}</Typography>
                </Box>
              </ListItem>
            )}
            renderInput={(params) => <TextField {...params} size="small" label="جستجوی ارز" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>انصراف</Button>
          <Button variant="contained" disabled={!selected} onClick={() => add.mutate(selected)}>
            {add.isLoading ? <CircularProgress size={20} /> : 'افزودن'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

const ContractDefinitionsPage = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const tabs = [
    { label: 'عمومی', key: 'general', color: '#6366f1', desc: 'تعاریف پایهٔ مالی قرارداد: اضافات، کسورات و ارزها' },
  ];
  const active = tabs[tabIndex];

  return (
    <Box>
      <Paper sx={{ ...glassCard, mb: 3, p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #6366f1, #ec4899)', boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}>
          <CategoryIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={800}>تعاریف اولیه</Typography>
          <Typography variant="body2" color="textSecondary">مدیریت داده‌های پایهٔ قراردادها</Typography>
        </Box>
      </Paper>

      <Paper sx={{ ...glassCard, overflow: 'hidden' }}>
        <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} sx={{ borderBottom: '1px solid rgba(255,255,255,0.5)', px: 2 }}>
          {tabs.map((t, i) => (
            <Tab key={t.key} label={t.label} sx={{ fontWeight: 600, color: tabIndex === i ? t.color : 'text.secondary' }} />
          ))}
        </Tabs>
        <Box sx={{ p: 3 }}>
          <Paper sx={{ mb: 2, px: 1.5, py: 1, background: `linear-gradient(135deg, ${active.color}0d, ${active.color}04)`, border: `1px solid ${active.color}20`, borderRadius: '10px' }}>
            <Typography variant="body2" sx={{ color: active.color, fontWeight: 600 }}>{active.desc}</Typography>
          </Paper>

          {tabIndex === 0 && (
            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <PercentCard endpoint="/additions/" color="#10b981" icon={<AddCircleOutlineIcon sx={{ color: '#fff', fontSize: 22 }} />}
                  title="اضافات" subtitle="اقلام افزودنی روی صورت‌وضعیت (مثلاً ارزش افزوده)" queryKey="additions" />
              </Grid>
              <Grid item xs={12} md={6}>
                <PercentCard endpoint="/deductions/" color="#ef4444" icon={<RemoveCircleOutlineIcon sx={{ color: '#fff', fontSize: 22 }} />}
                  title="کسورات" subtitle="اقلام کسور صورت‌وضعیت (بیمه، حسن انجام کار و ...)" queryKey="deductions" />
              </Grid>
              <Grid item xs={12}>
                <CurrencyCard />
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ContractDefinitionsPage;