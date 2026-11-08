/**
 * تأمین‌کنندگان — عین چیدمان صفحهٔ «طرف حساب‌ها» در مدیریت قراردادها:
 * سرصفحه + نوار جست‌وجو + ستون فهرست (۵) و ستون جزئیات با کارت‌های اطلاعاتی (۷)
 * + دیالوگ ثبت/ویرایش بخش‌بندی‌شده. دادهٔ خلاصه از
 * `GET /api/procurement/suppliers/{id}/profile/` می‌آید (یک درخواست).
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, Grid, IconButton, InputAdornment, InputLabel, LinearProgress,
  MenuItem, Paper, Select, Stack, TextField, Typography,
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import LaunchIcon from '@mui/icons-material/Launch';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import PageHeader from '../../core/components/ui/PageHeader';
import axiosInstance from '../../core/api/axiosConfig';

const ACCENT = '#0369a1';

const SUPPLIER_STATUS = {
  active: { label: 'فعال', color: '#10b981' },
  inactive: { label: 'غیرفعال', color: '#64748b' },
  blacklisted: { label: 'لیست سیاه', color: '#be123c' },
};

const EMPTY_FORM = {
  code: '', name: '', category: '', status: 'active',
  national_id: '', economic_code: '', registration_number: '', tax_id: '',
  credit_limit: '', rating: '0', phone: '', mobile: '', email: '',
  contact_person: '', address: '', postal_code: '',
  bank_name: '', account_number: '', sheba_number: '',
  payment_terms: '', description: '',
};

const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : null);
const money = (value) => `${formatPersianNumber(Math.round(Number(value) || 0))} ریال`;

/* کارت اطلاعاتی — همان ظاهر صفحهٔ طرف حساب‌ها (توکن‌محور) */
const InfoCard = ({ title, color, icon: Icon, children }) => (
  <Box className="hrms-info-card" sx={{
    borderRadius: 'var(--hrms-info-card-radius, 14px)', overflow: 'hidden',
    border: 'var(--hrms-info-card-border, 1px solid #e8edf4)',
    background: 'var(--hrms-info-card-bg, #fff)',
    boxShadow: 'var(--hrms-info-card-shadow, none)',
  }}>
    <Box sx={{
      px: 1.75, py: 1, display: 'flex', alignItems: 'center', gap: 1,
      background: `linear-gradient(120deg, ${color}18, ${color}08)`,
      borderBottom: `1px solid ${color}20`,
    }}>
      <Icon sx={{ color, fontSize: 18 }} />
      <Typography variant="subtitle2" fontWeight={800} sx={{ color }}>{title}</Typography>
    </Box>
    <Box sx={{ p: 1.75 }}>{children}</Box>
  </Box>
);

const InfoRow = ({ label, value, ltr }) => (value ? (
  <Box sx={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1.5,
    py: 0.55, borderBottom: '1px dashed rgba(0,0,0,0.07)',
  }}>
    <Typography variant="caption" color="textSecondary" sx={{ flexShrink: 0 }}>{label}</Typography>
    <Typography variant="body2" fontWeight={700}
      sx={{ textAlign: 'left', direction: ltr ? 'ltr' : 'inherit' }}>
      {value}
    </Typography>
  </Box>
) : null);

export const ProcurementSuppliersStudio = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['procurement-suppliers'],
    queryFn: () => axiosInstance.get('/procurement/suppliers/', { params: { page_size: 500 } })
      .then((response) => (Array.isArray(response.data) ? response.data : response.data?.results || [])),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['procurement-supplier-categories'],
    queryFn: () => axiosInstance.get('/procurement/supplier-categories/', { params: { page_size: 200 } })
      .then((response) => (Array.isArray(response.data) ? response.data : response.data?.results || [])),
    staleTime: 5 * 60 * 1000,
  });

  const { data: profile, isFetching: profileLoading } = useQuery({
    queryKey: ['procurement-supplier-profile', selected?.id],
    queryFn: () => axiosInstance.get(`/procurement/suppliers/${selected.id}/profile/`)
      .then((response) => response.data),
    enabled: Boolean(selected?.id),
    staleTime: 30 * 1000,
  });

  const summary = profile?.summary || {};
  const orderStats = summary.orders || {};
  const invoiceStats = summary.invoices || {};
  const guaranteeStats = summary.guarantees || {};
  const recentOrders = (profile?.orders || []).slice(0, 4);
  const guarantees = (profile?.guarantees || []).slice(0, 3);

  const save = useMutation({
    mutationFn: (payload) => {
      const body = {
        ...payload,
        category: payload.category || null,
        credit_limit: payload.credit_limit === '' ? null : payload.credit_limit,
        rating: payload.rating === '' ? 0 : payload.rating,
      };
      return payload.id
        ? axiosInstance.put(`/procurement/suppliers/${payload.id}/`, body)
        : axiosInstance.post('/procurement/suppliers/', body);
    },
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['procurement-suppliers'] });
      qc.invalidateQueries({ queryKey: ['procurement-supplier-profile'] });
      qc.invalidateQueries({ queryKey: ['procurement-suppliers-lookup'] });
      setSelected(response?.data || null);
      setDialog(false);
      setForm(EMPTY_FORM);
      setError('');
    },
    onError: (e) => {
      const data = e.response?.data;
      let message = 'خطا در ذخیره';
      if (data) {
        if (typeof data === 'string') message = data;
        else if (Array.isArray(data)) message = data[0];
        else if (data.detail) message = data.detail;
        else if (data.error) message = data.error;
        else if (data.non_field_errors) message = data.non_field_errors[0];
        else {
          const first = Object.values(data).flat()[0];
          if (first) message = String(first);
        }
      }
      setError(message);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/procurement/suppliers/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurement-suppliers'] });
      qc.invalidateQueries({ queryKey: ['procurement-suppliers-lookup'] });
      setSelected(null);
    },
    onError: (e) => setError(e?.response?.data?.detail || 'حذف تأمین‌کننده ممکن نشد (وابستگی اسناد).'),
  });

  const toggle = useMutation({
    mutationFn: (row) => axiosInstance.patch(`/procurement/suppliers/${row.id}/`, {
      status: row.status === 'active' ? 'inactive' : 'active',
    }),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ['procurement-suppliers'] });
      setSelected((previous) => (previous && previous.id === response?.data?.id
        ? { ...previous, ...response.data } : previous));
    },
    onError: (e) => setError(e?.response?.data?.detail || 'تغییر وضعیت ممکن نشد.'),
  });

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    const term = search.trim();
    return suppliers.filter((row) => (
      (row.name || '').includes(term)
      || (row.code || '').includes(term)
      || (row.mobile || '').includes(term)
      || (row.phone || '').includes(term)
      || (row.national_id || '').includes(term)
      || (row.economic_code || '').includes(term)
      || (row.registration_number || '').includes(term)
      || (row.contact_person || '').includes(term)
    ));
  }, [suppliers, search]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, code: `SUP-${Date.now().toString().slice(-6)}` });
    setError('');
    setDialog(true);
  };

  const openEdit = (row) => {
    setForm({
      ...EMPTY_FORM,
      ...row,
      category: row.category || '',
      credit_limit: row.credit_limit ?? '',
      rating: row.rating ?? '0',
    });
    setError('');
    setDialog(true);
  };

  const categoryName = (id) => (categories.find((row) => String(row.id) === String(id)) || {}).name || '';

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <PageHeader
        icon={<StorefrontIcon />}
        title="تأمین‌کنندگان"
        actions={(
          <>
            <Button variant="outlined" startIcon={<FolderSharedIcon />}
              onClick={() => { window.location.assign('/procurement/profiles'); }}>
              پرونده‌های خرید
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              افزودن تأمین‌کننده
            </Button>
          </>
        )}
      />

      {error ? (
        <Alert severity="error" sx={{ mb: 1.5, borderRadius: '12px', fontSize: 12 }}
          onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      {/* جست‌وجو */}
      <Paper sx={{ p: 1.5, mb: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.65)' }}>
        <TextField size="small" fullWidth
          placeholder="جستجو: نام، کد، شناسه ملی، کد اقتصادی، شماره ثبت، موبایل، شخص رابط…"
          value={search} onChange={(event) => setSearch(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: '#0ea5e9' }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <IconButton size="small" onClick={() => setSearch('')} aria-label="پاک کردن جست‌وجو">
                <DeleteIcon fontSize="small" />
              </IconButton>
            ) : null,
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', background: '#fff' } }} />
      </Paper>

      <Grid container spacing={2.5} sx={{ alignItems: 'stretch' }}>
        {/* فهرست (ستون راست) */}
        <Grid item xs={12} md={5}>
          <Paper sx={{
            p: 1.5, borderRadius: '14px', background: 'rgba(255,255,255,0.65)',
            height: '100%', display: 'flex', flexDirection: 'column',
          }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ px: 1, pb: 1, color: ACCENT }}>
              {`تأمین‌کنندگان (${formatPersianNumber(filtered.length)})`}
            </Typography>
            <Box sx={{
              flex: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 300px)', pr: 0.5,
              '&::-webkit-scrollbar': { width: 8 },
              '&::-webkit-scrollbar-thumb': { background: 'rgba(14,165,233,0.35)', borderRadius: 8 },
            }}>
              {filtered.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                  تأمین‌کننده‌ای ثبت نشده است.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {filtered.map((row) => {
                    const status = SUPPLIER_STATUS[row.status] || SUPPLIER_STATUS.active;
                    const active = selected?.id === row.id;
                    return (
                      <Paper
                        key={row.id}
                        onClick={() => setSelected(row)}
                        elevation={0}
                        sx={{
                          p: 1.1, cursor: 'pointer', borderRadius: '12px',
                          border: '1px solid',
                          borderColor: active ? status.color : 'rgba(15,23,42,0.08)',
                          background: active ? `${status.color}12` : '#fff',
                          transition: 'all 0.18s ease',
                          '&:hover': { borderColor: `${status.color}66` },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Avatar sx={{
                            width: 40, height: 40, flexShrink: 0,
                            background: `linear-gradient(135deg, ${status.color}, ${status.color}cc)`,
                          }}>
                            <StorefrontIcon sx={{ color: '#fff', fontSize: 20 }} />
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={800} noWrap title={row.name}>
                              {row.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" noWrap component="div">
                              {`کد ${toPersianDigits(row.code || '—')}`
                                + (row.category ? ` · ${categoryName(row.category)}` : '')}
                            </Typography>
                            {row.mobile || row.phone ? (
                              <Typography variant="caption" color="textSecondary" noWrap component="div">
                                {toPersianDigits(row.mobile || row.phone)}
                              </Typography>
                            ) : null}
                          </Box>
                          <Box sx={{ textAlign: 'left', flexShrink: 0 }}>
                            <Chip size="small" label={status.label} variant="outlined"
                              sx={{
                                height: 20, fontSize: 11.5, fontWeight: 800,
                                color: status.color, borderColor: `${status.color}66`,
                              }} />
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


        {/* جزئیات (ستون چپ) */}
        <Grid item xs={12} md={7}>
          <Paper sx={{
            p: 2, borderRadius: '14px', background: 'rgba(255,255,255,0.65)',
            height: '100%', overflowY: 'auto', maxHeight: 'calc(100vh - 240px)',
          }}>
            {!selected ? (
              <Box sx={{ textAlign: 'center', py: 10 }}>
                <StorefrontIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1.5 }} />
                <Typography variant="body1" color="textSecondary">
                  یک تأمین‌کننده را برای مشاهدهٔ جزئیات انتخاب کنید.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={900}>{selected.name}</Typography>
                    <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                      <Chip size="small"
                        label={(SUPPLIER_STATUS[selected.status] || SUPPLIER_STATUS.active).label}
                        sx={{
                          height: 22, fontWeight: 800, color: '#fff',
                          bgcolor: (SUPPLIER_STATUS[selected.status] || SUPPLIER_STATUS.active).color,
                        }} />
                      <Chip size="small" variant="outlined" sx={{ height: 22 }}
                        label={`کد ${toPersianDigits(selected.code || '—')}`} />
                      {selected.category ? (
                        <Chip size="small" variant="outlined" sx={{ height: 22 }}
                          label={categoryName(selected.category)} />
                      ) : null}
                    </Stack>
                  </Box>
                  <Box sx={{ display: 'flex', flexShrink: 0 }}>
                    <IconButton size="small" color="primary" aria-label="ویرایش تأمین‌کننده"
                      onClick={() => openEdit(selected)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" aria-label="تغییر وضعیت"
                      color={selected.status === 'active' ? 'error' : 'success'}
                      onClick={() => toggle.mutate(selected)}>
                      {selected.status === 'active'
                        ? <BlockIcon fontSize="small" />
                        : <CheckCircleIcon fontSize="small" />}
                    </IconButton>
                    <IconButton size="small" color="error" aria-label="حذف تأمین‌کننده"
                      onClick={() => {
                        if (window.confirm(`تأمین‌کننده «${selected.name}» حذف شود؟`)) {
                          remove.mutate(selected.id);
                        }
                      }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                {/* آمار خرید */}
                <InfoCard title="آمار خرید" color="#8b5cf6" icon={AssessmentIcon}>
                  <InfoRow label="تعداد سفارش" ltr
                    value={profileLoading ? '...' : formatPersianNumber(orderStats.count || 0)} />
                  <InfoRow label="ارزش سفارش‌ها"
                    value={profileLoading ? '...' : money(orderStats.amount)} />
                  <InfoRow label="صورتحساب‌شده"
                    value={profileLoading ? '...' : money(invoiceStats.invoiced)} />
                  <InfoRow label="پرداخت‌شده"
                    value={profileLoading ? '...' : money(invoiceStats.paid)} />
                  <InfoRow label="ماندهٔ تسویه"
                    value={profileLoading ? '...' : money(invoiceStats.balance)} />
                  <InfoRow label="تضامین فعال"
                    value={profileLoading ? '...' : `${formatPersianNumber(guaranteeStats.active_count || 0)} فقره`} />
                  <InfoRow label="آخرین فعالیت"
                    value={profileLoading ? '...' : dateLabel(summary.last_activity)} />
                </InfoCard>


                {/* سفارش‌های اخیر */}
                <InfoCard title="سفارش‌های اخیر" color="#f59e0b" icon={ReceiptLongIcon}>
                  {profileLoading ? (
                    <Typography variant="caption" color="textSecondary">در حال بارگذاری…</Typography>
                  ) : recentOrders.length === 0 ? (
                    <Typography variant="caption" color="textSecondary">سفارشی ثبت نشده است.</Typography>
                  ) : (
                    <Stack spacing={0.75}>
                      {recentOrders.map((order) => (
                        <Box key={order.id}
                          onClick={() => navigate('/procurement/orders')}
                          sx={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
                            p: 0.9, borderRadius: '10px', background: 'rgba(245,158,11,0.05)',
                            cursor: 'pointer', '&:hover': { background: 'rgba(245,158,11,0.12)' },
                            transition: 'background 0.15s ease',
                          }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {order.number ? toPersianDigits(order.number) : `#${toPersianDigits(order.id)}`}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {`${dateLabel(order.date) || '—'} · ${order.status_label || '—'}`}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                            <Typography variant="body2" fontWeight={800} sx={{ color: '#b45309' }}>
                              {order.group === 'foreign'
                                ? `${money(order.amount)} ${order.currency || ''}`.trim()
                                : money(order.amount)}
                            </Typography>
                            <LaunchIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </InfoCard>

                {/* تضامین */}
                <InfoCard title="تضامین خرید" color="#10b981" icon={VerifiedUserIcon}>
                  {profileLoading ? (
                    <Typography variant="caption" color="textSecondary">در حال بارگذاری…</Typography>
                  ) : guarantees.length === 0 ? (
                    <Typography variant="caption" color="textSecondary">تضمینی ثبت نشده است.</Typography>
                  ) : (
                    <Stack spacing={0.75}>
                      {guarantees.map((row) => (
                        <Box key={row.id} sx={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 1, p: 0.9, borderRadius: '10px', background: 'rgba(16,185,129,0.05)',
                        }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={700} noWrap>
                              {`${row.kind_label || 'تضمین'}${row.number ? ` · ${toPersianDigits(row.number)}` : ''}`}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {`اعتبار تا ${dateLabel(row.valid_until) || '—'}`}
                            </Typography>
                          </Box>
                          <Chip size="small" variant="outlined" sx={{ height: 21, fontSize: 11 }}
                            color={row.is_expired ? 'error' : (row.is_released ? 'default' : 'success')}
                            label={row.is_released ? 'آزادشده' : (row.is_expired ? 'منقضی' : 'معتبر')} />
                        </Box>
                      ))}
                    </Stack>
                  )}
                </InfoCard>


                {/* حقوقی + تماس */}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <InfoCard title="اطلاعات حقوقی" color="#f97316" icon={BusinessIcon}>
                      <InfoRow label="شناسه ملی / کد ثبت" ltr
                        value={selected.national_id ? toPersianDigits(selected.national_id) : null} />
                      <InfoRow label="کد اقتصادی" ltr
                        value={selected.economic_code ? toPersianDigits(selected.economic_code) : null} />
                      <InfoRow label="شماره ثبت" ltr
                        value={selected.registration_number ? toPersianDigits(selected.registration_number) : null} />
                      <InfoRow label="شناسه مالیاتی" ltr
                        value={selected.tax_id ? toPersianDigits(selected.tax_id) : null} />
                      <InfoRow label="سقف اعتبار"
                        value={selected.credit_limit ? money(selected.credit_limit) : null} />
                      <InfoRow label="امتیاز"
                        value={`${formatPersianNumber(selected.rating || 0)} / ۵`} />
                    </InfoCard>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InfoCard title="اطلاعات تماس" color="#0ea5e9" icon={PhoneIcon}>
                      <InfoRow label="تلفن" ltr
                        value={selected.phone ? toPersianDigits(selected.phone) : null} />
                      <InfoRow label="موبایل" ltr
                        value={selected.mobile ? toPersianDigits(selected.mobile) : null} />
                      <InfoRow label="ایمیل" ltr value={selected.email} />
                      <InfoRow label="شخص رابط" value={selected.contact_person} />
                      <InfoRow label="شرایط پرداخت" value={selected.payment_terms} />
                      <InfoRow label="کد پستی" ltr
                        value={selected.postal_code ? toPersianDigits(selected.postal_code) : null} />
                    </InfoCard>
                  </Grid>
                </Grid>

                {/* بانکی + آدرس */}
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <InfoCard title="اطلاعات بانکی" color="#8b5cf6" icon={AccountBalanceIcon}>
                      <InfoRow label="بانک" value={selected.bank_name} />
                      <InfoRow label="شماره حساب" ltr
                        value={selected.account_number ? toPersianDigits(selected.account_number) : null} />
                      <InfoRow label="شماره شبا" ltr
                        value={selected.sheba_number
                          ? `IR${toPersianDigits(String(selected.sheba_number).replace(/^IR/i, ''))}` : null} />
                    </InfoCard>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <InfoCard title="آدرس و توضیحات" color="#64748b" icon={PersonIcon}>
                      <InfoRow label="آدرس" value={selected.address} />
                      <InfoRow label="توضیحات" value={selected.description} />
                    </InfoCard>
                  </Grid>
                </Grid>

                <Button size="small" variant="outlined" startIcon={<FolderSharedIcon />}
                  onClick={() => navigate(`/procurement/supplier-profile?supplier=${selected.id}`)}>
                  باز کردن پروندهٔ خرید
                </Button>
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>


      {/* دیالوگ ثبت/ویرایش تأمین‌کننده */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: ACCENT, borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
          {form.id ? 'ویرایش تأمین‌کننده' : 'افزودن تأمین‌کننده'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: ACCENT, mb: 1 }}>
                مشخصات پایه
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={3}>
                  <TextField size="small" fullWidth label="کد تأمین‌کننده *" value={form.code}
                    onChange={(event) => setForm((previous) => ({ ...previous, code: event.target.value }))} />
                </Grid>
                <Grid item xs={12} md={5}>
                  <TextField size="small" fullWidth label="نام / عنوان *" value={form.name}
                    onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>دسته</InputLabel>
                    <Select value={form.category} label="دسته"
                      onChange={(event) => setForm((previous) => ({ ...previous, category: event.target.value }))}>
                      <MenuItem value="">بدون دسته</MenuItem>
                      {categories.map((row) => (
                        <MenuItem key={row.id} value={row.id}>{row.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl size="small" fullWidth>
                    <InputLabel>وضعیت</InputLabel>
                    <Select value={form.status} label="وضعیت"
                      onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}>
                      {Object.entries(SUPPLIER_STATUS).map(([key, value]) => (
                        <MenuItem key={key} value={key}>{value.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField size="small" fullWidth label="سقف اعتبار (ریال)" type="number"
                    value={form.credit_limit}
                    onChange={(event) => setForm((previous) => ({ ...previous, credit_limit: event.target.value }))} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField size="small" fullWidth label="امتیاز (۰ تا ۵)" type="number"
                    inputProps={{ step: '0.1', min: 0, max: 5 }} value={form.rating}
                    onChange={(event) => setForm((previous) => ({ ...previous, rating: event.target.value }))} />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#f97316', mb: 1 }}>
                اطلاعات حقوقی
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={3}>
                  <TextField size="small" fullWidth label="شناسه ملی / کد ثبت" value={form.national_id}
                    onChange={(event) => setForm((previous) => ({ ...previous, national_id: event.target.value }))} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField size="small" fullWidth label="کد اقتصادی" value={form.economic_code}
                    onChange={(event) => setForm((previous) => ({ ...previous, economic_code: event.target.value }))} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField size="small" fullWidth label="شماره ثبت" value={form.registration_number}
                    onChange={(event) => setForm((previous) => ({ ...previous, registration_number: event.target.value }))} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField size="small" fullWidth label="شناسه مالیاتی" value={form.tax_id}
                    onChange={(event) => setForm((previous) => ({ ...previous, tax_id: event.target.value }))} />
                </Grid>
              </Grid>
            </Box>


            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#0ea5e9', mb: 1 }}>
                اطلاعات تماس
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={3}>
                  <TextField size="small" fullWidth label="تلفن" value={form.phone}
                    onChange={(event) => setForm((previous) => ({ ...previous, phone: event.target.value }))} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField size="small" fullWidth label="موبایل" value={form.mobile}
                    onChange={(event) => setForm((previous) => ({ ...previous, mobile: event.target.value }))} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField size="small" fullWidth label="ایمیل" value={form.email}
                    onChange={(event) => setForm((previous) => ({ ...previous, email: event.target.value }))} />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField size="small" fullWidth label="کد پستی" value={form.postal_code}
                    onChange={(event) => setForm((previous) => ({ ...previous, postal_code: event.target.value }))} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField size="small" fullWidth label="شخص رابط" value={form.contact_person}
                    onChange={(event) => setForm((previous) => ({ ...previous, contact_person: event.target.value }))} />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField size="small" fullWidth label="شرایط پرداخت" value={form.payment_terms}
                    onChange={(event) => setForm((previous) => ({ ...previous, payment_terms: event.target.value }))} />
                </Grid>
                <Grid item xs={12}>
                  <TextField size="small" fullWidth label="آدرس" value={form.address}
                    onChange={(event) => setForm((previous) => ({ ...previous, address: event.target.value }))} />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#8b5cf6', mb: 1 }}>
                اطلاعات بانکی
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} md={4}>
                  <TextField size="small" fullWidth label="بانک" value={form.bank_name}
                    onChange={(event) => setForm((previous) => ({ ...previous, bank_name: event.target.value }))} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField size="small" fullWidth label="شماره حساب" value={form.account_number}
                    onChange={(event) => setForm((previous) => ({ ...previous, account_number: event.target.value }))} />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField size="small" fullWidth label="شماره شبا" value={form.sheba_number}
                    onChange={(event) => setForm((previous) => ({ ...previous, sheba_number: event.target.value }))} />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            <TextField size="small" fullWidth label="توضیحات" multiline rows={2} value={form.description}
              onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} />
          </Stack>
          {save.isPending ? <LinearProgress sx={{ borderRadius: '10px', mt: 1.5 }} /> : null}
          {error ? <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert> : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" disabled={!form.name || !form.code || save.isPending}
            onClick={() => save.mutate(form)}
            sx={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', borderRadius: '10px', px: 3 }}>
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProcurementSuppliersStudio;

