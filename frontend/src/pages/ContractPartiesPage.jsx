import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Divider, IconButton,
  InputAdornment, Alert, LinearProgress,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { toJalali } from '../core/utils/dateUtils';

const PARTY_TYPES = {
  contractor: { label: 'پیمانکار', color: '#f97316' },
  supplier: { label: 'فروشنده / تأمین‌کننده', color: '#10b981' },
  consultant: { label: 'مشاور', color: '#6366f1' },
  other: { label: 'سایر', color: '#64748b' },
};

const PERSON_TYPES = {
  legal: { label: 'شخص حقوقی', color: '#0ea5e9' },
  natural: { label: 'شخص حقیقی', color: '#8b5cf6' },
};

const COMPANY_TYPES = {
  public_joint_stock: 'سهامی عام',
  private_joint_stock: 'سهامی خاص',
  llc: 'با مسئولیت محدود',
  cooperative: 'تعاونی',
  sole_proprietorship: 'مؤسسه انفرادی',
  branch: 'شعبه / نمایندگی',
  other: 'سایر',
};

const InfoCard = ({ title, color, icon: Icon, children }) => (
  <Box sx={{ borderRadius: '14px', overflow: 'hidden', border: `1px solid ${color}26`, background: '#fff', boxShadow: `0 6px 20px ${color}10` }}>
    <Box sx={{ px: 1.75, py: 1, background: `linear-gradient(120deg, ${color}18, ${color}08)`, borderBottom: `1px solid ${color}20`, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Icon sx={{ color, fontSize: 18 }} />
      <Typography variant="subtitle2" fontWeight={800} sx={{ color }}>{title}</Typography>
    </Box>
    <Box sx={{ p: 1.75 }}>{children}</Box>
  </Box>
);

const InfoRow = ({ label, value, ltr }) => value ? (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1.5, py: 0.55, borderBottom: '1px dashed rgba(0,0,0,0.07)' }}>
    <Typography variant="caption" color="textSecondary" sx={{ flexShrink: 0 }}>{label}</Typography>
    <Typography variant="body2" fontWeight={700} sx={{ textAlign: 'left', direction: ltr ? 'ltr' : 'inherit' }}>{value}</Typography>
  </Box>
) : null;


const EMPTY_FORM = {
  id: null, name: '', person_type: 'legal', party_type: 'contractor', national_id: '', economic_code: '',
  registration_number: '', establishment_date: '', company_type: '', registered_capital: '',
  phone: '', mobile: '', email: '', address: '',
  contact_person: '', bank_name: '', account_number: '', sheba_number: '', description: '',
  ceo_name: '', ceo_phone: '', finance_manager_name: '', finance_manager_phone: '',
  technical_contact_name: '', technical_contact_phone: '',
};

const ContractPartiesPage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selected, setSelected] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contract-parties'],
    queryFn: () => axiosInstance.get('/contract-parties/', { params: { page_size: 1000 } }).then(r => r.data),
  });
  const parties = Array.isArray(data) ? data : data?.results || [];

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['contract-parties-summary', selected?.id],
    queryFn: () => axiosInstance.get(`/contract-parties/${selected.id}/summary/`).then(r => r.data),
    enabled: !!selected?.id,
  });

  const [error, setError] = useState('');

  const sanitize = (p) => ({
    ...p,
    registered_capital: p.registered_capital === '' || p.registered_capital == null ? null : Number(p.registered_capital),
    establishment_date: p.establishment_date || null,
  });

  const save = useMutation({
    mutationFn: (payload) => {
      const clean = sanitize(payload);
      return clean.id
        ? axiosInstance.patch(`/contract-parties/${clean.id}/`, clean)
        : axiosInstance.post('/contract-parties/', clean);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-parties'] });
      qc.invalidateQueries({ queryKey: ['contract-parties-summary'] });
      setDialog(false);
      setForm(EMPTY_FORM);
      setError('');
    },
    onError: (e) => {
      const data = e.response?.data;
      let msg = 'خطا در ذخیره';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (Array.isArray(data)) msg = data[0];
        else if (data.detail) msg = data.detail;
        else if (data.error) msg = data.error;
        else if (data.non_field_errors) msg = data.non_field_errors[0];
        else {
          const first = Object.values(data).flat()[0];
          if (first) msg = first;
        }
      }
      setError(msg);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-parties/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-parties'] });
      setSelected(null);
    },
  });

  const toggle = useMutation({
    mutationFn: (id) => axiosInstance.post(`/contract-parties/${id}/toggle_status/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-parties'] }),
  });

  const filtered = useMemo(() => {
    if (!search) return parties;
    const s = search.trim();
    return parties.filter(p =>
      (p.name || '').includes(s) || (p.mobile || '').includes(s) ||
      (p.national_id || '').includes(s) || (p.contact_person || '').includes(s) ||
      (p.economic_code || '').includes(s) || (p.registration_number || '').includes(s)
    );
  }, [parties, search]);

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(14,165,233,0.10), rgba(99,102,241,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(14,165,233,0.16)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', boxShadow: '0 8px 24px rgba(14,165,233,0.4)' }}>
          <StorefrontIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#0369a1">پیمانکاران و فروشندگان</Typography>
          <Typography variant="body2" color="textSecondary">پروندهٔ کامل طرف‌های قرارداد با جزئیات حقوقی، بانکی و سوابق</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setForm(EMPTY_FORM); setError(''); setDialog(true); }}
          sx={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', borderRadius: '10px' }}>
          افزودن طرف
        </Button>
      </Paper>

      {/* Search */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.65)' }}>
        <TextField size="small" fullWidth placeholder="جستجو: نام، شناسه ملی، کد اقتصادی، موبایل، شخص رابط..." value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#0ea5e9' }} /></InputAdornment>,
            endAdornment: search ? <IconButton size="small" onClick={() => setSearch('')}><DeleteIcon fontSize="small" /></IconButton> : null,
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', background: '#fff' } }} />
      </Paper>

      <Grid container spacing={2.5} sx={{ alignItems: 'stretch' }}>
        {/* List (right) — scrolls inside its own card */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 1.5, borderRadius: '14px', background: 'rgba(255,255,255,0.65)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle2" fontWeight={800} color="#0369a1" sx={{ px: 1, pb: 1 }}>
              طرف‌های قرارداد ({filtered.length})
            </Typography>
            <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 260px)', pr: 0.5, '&::-webkit-scrollbar': { width: 8 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(14,165,233,0.35)', borderRadius: 8 } }}>
              {filtered.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>طرف قراردادی ثبت نشده است.</Typography>
              ) : (
                <Stack spacing={1}>
                  {filtered.map(p => {
                    const type = PARTY_TYPES[p.party_type] || PARTY_TYPES.other;
                    const active = p.is_active !== false;
                    return (
                      <Paper
                        key={p.id}
                        onClick={() => setSelected(p)}
                        sx={{
                          p: 1.5, cursor: 'pointer', borderRadius: '12px',
                          border: selected?.id === p.id ? `1.5px solid ${type.color}` : '1px solid rgba(0,0,0,0.07)',
                          background: selected?.id === p.id ? `${type.color}12` : 'rgba(255,255,255,0.7)',
                          '&:hover': { borderColor: type.color, boxShadow: `0 6px 18px ${type.color}22` },
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Avatar sx={{ width: 40, height: 40, background: `linear-gradient(135deg, ${type.color}, ${type.color}cc)`, flexShrink: 0 }}>
                            <StorefrontIcon sx={{ color: '#fff', fontSize: 20 }} />
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={800} noWrap>{p.name}</Typography>
                            <Typography variant="caption" color="textSecondary" noWrap>
                              {type.label} · {PERSON_TYPES[p.person_type]?.label || '—'}
                            </Typography>
                            {p.mobile && <Typography variant="caption" color="textSecondary" noWrap>{toPersianDigits(p.mobile)}</Typography>}
                          </Box>
                          <Box sx={{ textAlign: 'left', flexShrink: 0 }}>
                            <Chip size="small" label={active ? 'فعال' : 'غیرفعال'} color={active ? 'success' : 'default'} variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                            <Typography variant="caption" fontWeight={800} display="block" sx={{ mt: 0.5, fontSize: 10 }}>{p.contracts_count || 0} قرارداد</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Detail panel (left) — colorful cards */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, borderRadius: '14px', background: 'rgba(255,255,255,0.65)', height: '100%', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
            {!selected ? (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <StorefrontIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1.5 }} />
                <Typography variant="body1" color="textSecondary">یک طرف را برای مشاهدهٔ جزئیات انتخاب کنید.</Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {/* Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={900}>{selected.name}</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip size="small" label={PARTY_TYPES[selected.party_type]?.label}
                        sx={{ bgcolor: PARTY_TYPES[selected.party_type]?.color || '#64748b', color: '#fff', fontWeight: 800, height: 22 }} />
                      <Chip size="small" label={PERSON_TYPES[selected.person_type]?.label} variant="outlined" sx={{ height: 22 }} />
                    </Stack>
                  </Box>
                  <Box sx={{ display: 'flex', flexShrink: 0 }}>
                    <IconButton size="small" color="primary" onClick={() => { setForm(selected); setError(''); setDialog(true); }}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" color={selected.is_active !== false ? 'error' : 'success'} onClick={() => toggle.mutate(selected.id)}>
                      {selected.is_active !== false ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => { if (window.confirm('حذف این طرف؟')) remove.mutate(selected.id); }}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>

                {/* Financial summary */}
                <Grid container spacing={1.5}>
                  <Grid item xs={6}><Paper sx={{ p: 1.5, textAlign: 'center', borderRadius: '12px', background: 'linear-gradient(135deg,#0ea5e914,#0ea5e908)', border: '1px solid #0ea5e928' }}><Typography variant="h5" fontWeight={900} color="#0ea5e9">{summaryLoading ? '...' : formatPersianNumber(summary?.contracts_count || 0)}</Typography><Typography variant="caption" color="textSecondary">قراردادها</Typography></Paper></Grid>
                  <Grid item xs={6}><Paper sx={{ p: 1.5, textAlign: 'center', borderRadius: '12px', background: 'linear-gradient(135deg,#10b98114,#10b98108)', border: '1px solid #10b98128' }}><Typography variant="h5" fontWeight={900} color="#10b981">{summaryLoading ? '...' : formatPersianNumber(summary?.active_count || 0)}</Typography><Typography variant="caption" color="textSecondary">قرارداد فعال</Typography></Paper></Grid>
                  <Grid item xs={12}><Paper sx={{ p: 1.5, textAlign: 'center', borderRadius: '12px', background: 'linear-gradient(135deg,#8b5cf614,#8b5cf608)', border: '1px solid #8b5cf628' }}><Typography variant="h6" fontWeight={900} color="#8b5cf6">{summaryLoading ? '...' : `${formatPersianNumber(summary?.total_amount || 0)} ریال`}</Typography><Typography variant="caption" color="textSecondary">جمع مبالغ قراردادها</Typography></Paper></Grid>
                </Grid>

                {/* Legal */}
                <InfoCard title="اطلاعات حقوقی" color="#f97316" icon={BusinessIcon}>
                  <InfoRow label="شناسه ملی / کد ثبت" value={selected.national_id} ltr />
                  <InfoRow label="کد اقتصادی" value={selected.economic_code} ltr />
                  <InfoRow label="شماره ثبت" value={selected.registration_number} ltr />
                  <InfoRow label="تاریخ تأسیس" value={selected.establishment_date ? toJalali(selected.establishment_date) : null} />
                  <InfoRow label="نوع شرکت" value={selected.company_type_display} />
                  <InfoRow label="سرمایه ثبتی" value={selected.registered_capital ? `${formatPersianNumber(selected.registered_capital)} ریال` : null} />
                </InfoCard>

                {/* Contact */}
                <InfoCard title="اطلاعات تماس" color="#0ea5e9" icon={PhoneIcon}>
                  <InfoRow label="تلفن" value={toPersianDigits(selected.phone)} ltr />
                  <InfoRow label="موبایل" value={toPersianDigits(selected.mobile)} ltr />
                  <InfoRow label="ایمیل" value={selected.email} ltr />
                  <InfoRow label="شخص رابط" value={selected.contact_person} />
                  <InfoRow label="آدرس" value={selected.address} />
                </InfoCard>

                {/* Management */}
                <InfoCard title="مدیریت و ارتباطات کلیدی" color="#10b981" icon={PersonIcon}>
                  <InfoRow label="مدیر عامل" value={selected.ceo_name} />
                  <InfoRow label="تلفن مدیر عامل" value={selected.ceo_phone ? toPersianDigits(selected.ceo_phone) : null} ltr />
                  <InfoRow label="مدیر مالی" value={selected.finance_manager_name} />
                  <InfoRow label="تلفن مدیر مالی" value={selected.finance_manager_phone ? toPersianDigits(selected.finance_manager_phone) : null} ltr />
                  <InfoRow label="رابط فنی" value={selected.technical_contact_name} />
                  <InfoRow label="تلفن رابط فنی" value={selected.technical_contact_phone ? toPersianDigits(selected.technical_contact_phone) : null} ltr />
                </InfoCard>

                {/* Bank */}
                <InfoCard title="اطلاعات بانکی" color="#8b5cf6" icon={AccountBalanceIcon}>
                  <InfoRow label="بانک" value={selected.bank_name} />
                  <InfoRow label="شماره حساب" value={selected.account_number} ltr />
                  <InfoRow label="شماره شبا" value={selected.sheba_number} ltr />
                </InfoCard>
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Party dialog */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#0369a1', borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
          {form.id ? 'ویرایش طرف قرارداد' : 'افزودن طرف قرارداد'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="#0369a1" mb={1}>مشخصات پایه</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="نام / عنوان *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Grid>
                <Grid item xs={12} md={3}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>نوع شخص</InputLabel>
                    <Select value={form.person_type} label="نوع شخص" onChange={e => setForm(p => ({ ...p, person_type: e.target.value }))}>
                      {Object.entries(PERSON_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>نوع طرف</InputLabel>
                    <Select value={form.party_type} label="نوع طرف" onChange={e => setForm(p => ({ ...p, party_type: e.target.value }))}>
                      {Object.entries(PARTY_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شناسه ملی / کد ثبت" value={form.national_id} onChange={e => setForm(p => ({ ...p, national_id: e.target.value }))} /></Grid>
                <Grid item xs={12} md={4}><TextField size="small" fullWidth label="کد اقتصادی" value={form.economic_code} onChange={e => setForm(p => ({ ...p, economic_code: e.target.value }))} /></Grid>
                <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شماره ثبت" value={form.registration_number} onChange={e => setForm(p => ({ ...p, registration_number: e.target.value }))} /></Grid>
                <Grid item xs={12} md={4}>
                  <JalaliDatePicker fullWidth label="تاریخ تأسیس" value={form.establishment_date} onChange={(g) => setForm(p => ({ ...p, establishment_date: g }))} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>نوع شرکت</InputLabel>
                    <Select value={form.company_type || ''} label="نوع شرکت" onChange={e => setForm(p => ({ ...p, company_type: e.target.value }))}>
                      <MenuItem value="">—</MenuItem>
                      {Object.entries(COMPANY_TYPES).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}><TextField size="small" fullWidth label="سرمایه ثبتی (ریال)" type="number" value={form.registered_capital} onChange={e => setForm(p => ({ ...p, registered_capital: e.target.value }))} /></Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="#0369a1" mb={1}>اطلاعات تماس</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="تلفن" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></Grid>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="موبایل" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} /></Grid>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="ایمیل" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></Grid>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شخص رابط" value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></Grid>
                <Grid item xs={12}><TextField size="small" fullWidth label="آدرس" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="#0369a1" mb={1}>اطلاعات بانکی</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={4}><TextField size="small" fullWidth label="بانک" value={form.bank_name} onChange={e => setForm(p => ({ ...p, bank_name: e.target.value }))} /></Grid>
                <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شماره حساب" value={form.account_number} onChange={e => setForm(p => ({ ...p, account_number: e.target.value }))} /></Grid>
                <Grid item xs={12} md={4}><TextField size="small" fullWidth label="شماره شبا" value={form.sheba_number} onChange={e => setForm(p => ({ ...p, sheba_number: e.target.value }))} /></Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={800} color="#0369a1" mb={1}>مدیریت و ارتباطات کلیدی</Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="مدیر عامل" value={form.ceo_name} onChange={e => setForm(p => ({ ...p, ceo_name: e.target.value }))} /></Grid>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شماره تماس مدیر عامل" value={form.ceo_phone} onChange={e => setForm(p => ({ ...p, ceo_phone: e.target.value }))} /></Grid>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="مدیر مالی" value={form.finance_manager_name} onChange={e => setForm(p => ({ ...p, finance_manager_name: e.target.value }))} /></Grid>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شماره تماس مدیر مالی" value={form.finance_manager_phone} onChange={e => setForm(p => ({ ...p, finance_manager_phone: e.target.value }))} /></Grid>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="رابط فنی و مهندسی" value={form.technical_contact_name} onChange={e => setForm(p => ({ ...p, technical_contact_name: e.target.value }))} /></Grid>
                <Grid item xs={12} md={6}><TextField size="small" fullWidth label="شماره تماس رابط فنی" value={form.technical_contact_phone} onChange={e => setForm(p => ({ ...p, technical_contact_phone: e.target.value }))} /></Grid>
              </Grid>
            </Box>

            <Divider />

            <TextField size="small" fullWidth label="توضیحات" multiline rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </Stack>
          {save.isLoading && <LinearProgress sx={{ borderRadius: '10px', mt: 1.5 }} />}
          {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.name} onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', borderRadius: '10px', px: 3 }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractPartiesPage;