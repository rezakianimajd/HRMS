import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Tabs, Tab, Button, CircularProgress,
  Chip, Divider, Grid, Avatar, Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HandshakeIcon from '@mui/icons-material/Handshake';
import TimelineIcon from '@mui/icons-material/Timeline';
import DescriptionIcon from '@mui/icons-material/Description';
import PaymentsIcon from '@mui/icons-material/Payments';
import GavelIcon from '@mui/icons-material/Gavel';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LockIcon from '@mui/icons-material/Lock';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BusinessIcon from '@mui/icons-material/Business';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import { glassPaper, CONTRACT_STATUS_LABELS as STATUS_LABELS, CONTRACT_STATUS_COLORS as STATUS_COLORS, CONTRACT_TYPE_LABELS as TYPE_LABELS } from '../core/theme/tokens';

const InfoItem = ({ icon, color, label, value }) => (
  <Grid item xs={6} sm={4} md={3}>
    <Paper sx={{
      p: 1.5, height: '100%',
      background: `linear-gradient(135deg, ${color}12, ${color}05)`,
      border: `1px solid ${color}28`,
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: '10px',
      transition: 'all 0.2s ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 20px ${color}20` },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, ${color}99)`,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 2px 8px ${color}40`,
        }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="caption" color="textSecondary" display="block">{label}</Typography>
          <Typography variant="body2" fontWeight={700}>{value}</Typography>
        </Box>
      </Box>
    </Paper>
  </Grid>
);

const AmountCard = ({ icon, color, label, value, currency }) => (
  <Grid item xs={6} sm={4} md={3}>
    <Paper sx={{
      p: 2, height: '100%', textAlign: 'center',
      background: `linear-gradient(160deg, ${color}1c, ${color}08)`,
      border: `1px solid ${color}30`,
      borderRadius: '14px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.5,
      transition: 'all 0.2s ease',
      '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 12px 28px ${color}28` },
    }}>
      <Box sx={{ width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}99)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 3px 12px ${color}45`, mb: 0.5 }}>
        {icon}
      </Box>
      <Typography variant="caption" color="textSecondary">{label}</Typography>
      <Typography variant="h6" fontWeight={800} sx={{ color, lineHeight: 1.2 }}>{value}</Typography>
      <Typography variant="caption" color="textSecondary">{currency}</Typography>
    </Paper>
  </Grid>
);

const SectionTitle = ({ color, icon, children }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, mt: 1 }}>
    <Box sx={{
      width: 32, height: 32, borderRadius: '50%',
      background: `linear-gradient(135deg, ${color}, ${color}99)`, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </Box>
    <Typography variant="subtitle1" fontWeight={800}>{children}</Typography>
  </Box>
);

const ContractProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);

  const { data: c, isLoading } = useQuery({
    queryKey: ['external-contract', id],
    queryFn: () => axiosInstance.get(`/external-contracts/${id}/`).then(r => r.data),
  });

  const timeline = useMemo(() => {
    if (!c) return [];
    const events = [];
    const push = (date, type, title, extra) => { if (date) events.push({ date, type, title, extra }); };
    push(c.created_at?.slice(0, 10), 'created', 'ایجاد قرارداد', `شماره ${c.number || '—'}`);
    push(c.signing_date, 'signing', 'امضای قرارداد', c.signatory_name);
    push(c.start_date, 'start', 'شروع قرارداد', '');
    push(c.end_date, 'end', 'پایان / انقضای قرارداد', '');
    (c.invoices || []).forEach(x => push(x.date, 'invoice', 'ثبت فاکتور', `${x.number || '—'} · ${formatPersianNumber(x.total || 0)} ریال`));
    (c.statements || []).forEach(x => push(x.date, 'statement', 'ثبت صورت‌وضعیت', `${x.number || '—'} · ${formatPersianNumber(x.amount || 0)} ریال`));
    (c.addendums || []).forEach(x => push(x.date, 'addendum', 'ثبت الحاقیه', x.number || x.change_description?.slice(0, 40)));
    (c.guarantees || []).forEach(x => push(x.issue_date, 'guarantee', 'صدور تضمین', `${x.guarantee_type_display} · ${formatPersianNumber(x.amount || 0)} ریال`));
    (c.guarantees || []).forEach(x => push(x.expiry_date, 'guarantee-expiry', 'انقضای تضمین', x.number || ''));
    (c.payments || []).forEach(x => push(x.date, 'payment', 'پرداخت', `${formatPersianNumber(x.amount || 0)} ریال`));
    (c.documents || []).forEach(x => push(x.uploaded_at?.slice(0, 10), 'document', 'بارگذاری سند', x.title));
    (c.audit_logs || []).forEach(x => push(x.created_at?.slice(0, 10), 'audit', `${x.action_display}${x.field ? ` · ${x.field}` : ''}`, x.user ? `توسط ${x.user}` : ''));
    return events.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [c]);

  if (isLoading) return <Box sx={{ textAlign: 'center', p: 8 }}><CircularProgress /></Box>;
  if (!c) return (
    <Box sx={{ textAlign: 'center', p: 6 }}>
      <Typography color="error" variant="h5">قرارداد یافت نشد</Typography>
      <Button onClick={() => navigate('/external-contracts')} sx={{ mt: 2 }}>بازگشت</Button>
    </Box>
  );

  const totalPaid = (c.payments || []).reduce((s, x) => s + Number(x.amount || 0), 0);
  const totalInvoices = (c.invoices || []).reduce((s, x) => s + Number(x.total || 0), 0);
  const remaining = Math.max(0, Number(c.amount || 0) - totalPaid);

  const currencyLabel = c.currency_name || 'ریال';
  const currencySymbol = c.currency_symbol || '﷼';

  const timelineColor = {
    created: '#64748b', signing: '#10b981', start: '#3b82f6', end: '#ef4444',
    invoice: '#8b5cf6', statement: '#6366f1', addendum: '#ec4899',
    guarantee: '#f59e0b', 'guarantee-expiry': '#ef4444', payment: '#10b981', document: '#06b6d4',
    audit: '#94a3b8',
  };

  const renderMini = (list, empty, render) => (
    <Stack spacing={1}>
      {(list || []).length === 0
        ? <Typography variant="caption" color="textSecondary">{empty}</Typography>
        : (list || []).map(render)}
    </Stack>
  );

  return (
    <Box>
      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button variant="text" onClick={() => navigate('/external-contracts')}>بازگشت</Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={() => navigate(`/contracts/${id}/edit`)}>ویرایش</Button>
          <Button variant="contained" onClick={() => navigate('/contracts/new')}>قرارداد جدید</Button>
        </Box>
      </Box>

      {/* Quick actions — 360° one-stop operations */}
      <Paper sx={{ ...glassPaper, p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" fontWeight={800} color="textSecondary" sx={{ mr: 0.5 }}>عملیات سریع:</Typography>
        {[
          { label: 'فاکتور', path: '/contracts-invoices', icon: <ReceiptIcon fontSize="small" />, color: '#8b5cf6' },
          { label: 'صورت‌وضعیت', path: '/contracts-statements', icon: <ReceiptLongIcon fontSize="small" />, color: '#6366f1' },
          { label: 'پرداخت', path: '/contracts-payments', icon: <PaymentsIcon fontSize="small" />, color: '#10b981' },
          { label: 'الحاقیه', path: '/contracts-addendums', icon: <EditNoteIcon fontSize="small" />, color: '#ec4899' },
          { label: 'تضمین', path: '/contracts-guarantees', icon: <LockIcon fontSize="small" />, color: '#3b82f6' },
          { label: 'اختلاف', path: '/contracts-disputes', icon: <GavelIcon fontSize="small" />, color: '#ef4444' },
          { label: 'اسناد', path: '/contracts-documents', icon: <FolderOpenIcon fontSize="small" />, color: '#f97316' },
        ].map(a => (
          <Button key={a.label} size="small" variant="outlined" startIcon={a.icon}
            onClick={() => navigate(`${a.path}?contract=${id}`)}
            sx={{ color: a.color, borderColor: `${a.color}66`, borderRadius: '10px', textTransform: 'none' }}>
            ثبت {a.label}
          </Button>
        ))}
      </Paper>

      {/* Glass Hero Card */}
      <Paper sx={{ ...glassPaper, mb: 3, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{
          position: 'absolute', top: -90, left: -60, width: 280, height: 280,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.18), rgba(249,115,22,0.08), transparent 70%)',
          filter: 'blur(30px)', pointerEvents: 'none',
        }} />
        <Box sx={{ position: 'relative', zIndex: 1, p: 3.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3.5, flexWrap: 'wrap' }}>
            <Avatar sx={{
              width: 104, height: 104,
              background: 'linear-gradient(135deg, #f59e0b, #f97316)',
              boxShadow: '0 10px 36px rgba(245,158,11,0.4)', border: '3px solid rgba(255,255,255,0.7)',
            }}>
              <HandshakeIcon sx={{ fontSize: 52, color: '#fff' }} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>{c.subject}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <Chip label={`شماره: ${c.number || '—'}`} size="small" color="primary" variant="filled" />
                <Chip label={c.contract_type_master_name || TYPE_LABELS[c.contract_type] || '—'} size="small" variant="outlined" />
                <Chip label={STATUS_LABELS[c.status]} size="small"
                  sx={{ color: '#fff', bgcolor: STATUS_COLORS[c.status] || '#64748b' }} />
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                {toPersianDigits((c.invoices || []).length)} فاکتور · {toPersianDigits((c.payments || []).length)} پرداخت
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            <AmountCard icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />} color="#10b981" label="مبلغ قرارداد" value={formatPersianNumber(c.amount || 0)} currency={currencyLabel} />
            <AmountCard icon={<PaymentsIcon sx={{ fontSize: 20 }} />} color="#14b8a6" label="پیش‌پرداخت" value={formatPersianNumber(c.advance_payment || 0)} currency={currencyLabel} />
            <AmountCard icon={<LockIcon sx={{ fontSize: 20 }} />} color="#f59e0b" label="مبلغ تضمین" value={formatPersianNumber(c.guarantee_amount || 0)} currency={currencyLabel} />
            <AmountCard icon={<ScheduleIcon sx={{ fontSize: 20 }} />} color="#8b5cf6" label="باقی‌مانده" value={formatPersianNumber(remaining)} currency={currencyLabel} />
          </Grid>
          <Grid container spacing={1.5}>
            <InfoItem icon={<StorefrontIcon sx={{ fontSize: 18 }} />} color="#0ea5e9" label="طرف قرارداد" value={c.party_name || '—'} />
            <InfoItem icon={<BusinessIcon sx={{ fontSize: 18 }} />} color="#6366f1" label="نوع قرارداد" value={c.contract_type_master_name || TYPE_LABELS[c.contract_type] || '—'} />
            <InfoItem icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} color="#f59e0b" label="تاریخ شروع" value={toJalali(c.start_date)} />
            <InfoItem icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} color="#ef4444" label="تاریخ پایان" value={toJalali(c.end_date)} />
            <InfoItem icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} color="#ec4899" label="تاریخ امضا" value={toJalali(c.signing_date)} />
            {Array.isArray(c.advance_payments) && c.advance_payments.length > 0 && (
              <InfoItem icon={<PaymentsIcon sx={{ fontSize: 18 }} />} color="#14b8a6" label="پیش‌پرداخت مرحله‌ای" value={`${toPersianDigits(c.advance_payments.length)} مرحله`} />
            )}
          </Grid>

          {/* پروژه‌ها و ضمانت‌ها */}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: '14px', background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.22)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                  <BusinessIcon sx={{ color: '#3b82f6', fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={800} color="#2563eb">پروژه‌ها و درصد تخصیص</Typography>
                </Box>
                {(c.project_allocations_display || []).length === 0 ? (
                  <Typography variant="caption" color="textSecondary">{c.project_name ? `${c.project_name} (100٪)` : 'پروژه‌ای تخصیص نیافته است.'}</Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {c.project_allocations_display.map((pa, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
                        <Typography variant="body2" fontWeight={700} sx={{ wordBreak: 'break-word' }}>{pa.project_name}</Typography>
                        <Chip size="small" label={`${formatPersianNumber(pa.percentage || 0)}٪`} sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 800, flexShrink: 0 }} />
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: '14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.22)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
                  <LockIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={800} color="#b45309">ضمانت‌ها</Typography>
                </Box>
                {(c.guarantee_items_display || []).length === 0 ? (
                  <Typography variant="caption" color="textSecondary">{c.guarantee_type_display ? `${c.guarantee_type_display} · ${formatPersianNumber(c.guarantee_amount || 0)} ریال` : 'ضمانتی تعریف نشده است.'}</Typography>
                ) : (
                  <Stack spacing={0.75}>
                    {c.guarantee_items_display.map((g, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" fontWeight={700}>{g.type_label}</Typography>
                          {g.note && <Typography variant="caption" color="textSecondary">{g.note}</Typography>}
                        </Box>
                        <Typography variant="body2" fontWeight={800} sx={{ color: '#b45309', flexShrink: 0 }}>
                          {formatPersianNumber(g.amount || 0)} ریال{g.percent ? ` (${formatPersianNumber(g.percent)}٪)` : ''}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ ...glassPaper, overflow: 'hidden' }}>
        <Tabs
          value={tabIndex}
          onChange={(ev, v) => setTabIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="نمای کلی" />
          <Tab label="تایم‌لاین" />
          <Tab label="جزئیات" />
          <Tab label="مالی" />
          <Tab label="الحاقیه و تضمین" />
          <Tab label="اسناد" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* نمای کلی */}
          {tabIndex === 0 && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">مبلغ قرارداد</Typography>
                    <Typography variant="h6" fontWeight={800} color="#f59e0b">{formatPersianNumber(c.amount || 0)}</Typography>
                    <Typography variant="caption" color="textSecondary">{currencyLabel}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">جمع پرداخت‌ها</Typography>
                    <Typography variant="h6" fontWeight={800} color="#10b981">{formatPersianNumber(totalPaid)}</Typography>
                    <Typography variant="caption" color="textSecondary">{currencyLabel}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">جمع فاکتورها</Typography>
                    <Typography variant="h6" fontWeight={800} color="#8b5cf6">{formatPersianNumber(totalInvoices)}</Typography>
                    <Typography variant="caption" color="textSecondary">{currencyLabel}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">باقی‌مانده</Typography>
                    <Typography variant="h6" fontWeight={800} color="#ef4444">{formatPersianNumber(remaining)}</Typography>
                    <Typography variant="caption" color="textSecondary">{currencyLabel}</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ ...glassPaper, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>اطلاعات کلیدی</Typography>
                    <Stack spacing={0.5}>
                      <Typography variant="body2"><strong>نام پروژه:</strong> {c.project_name || '—'}</Typography>
                      <Typography variant="body2"><strong>محل اجرا:</strong> {c.project_location || '—'}</Typography>
                      <Typography variant="body2"><strong>تاریخ امضا:</strong> {toJalali(c.signing_date)}</Typography>
                      <Typography variant="body2"><strong>امضاکننده:</strong> {c.signatory_name || '—'}</Typography>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ ...glassPaper, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>شمارش ریز اقلام</Typography>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">فاکتورها: {toPersianDigits((c.invoices || []).length)} مورد</Typography>
                      <Typography variant="body2">صورت‌وضعیت‌ها: {toPersianDigits((c.statements || []).length)} مورد</Typography>
                      <Typography variant="body2">الحاقیه‌ها: {toPersianDigits((c.addendums || []).length)} مورد</Typography>
                      <Typography variant="body2">تضمین‌ها: {toPersianDigits((c.guarantees || []).length)} مورد</Typography>
                      <Typography variant="body2">پرداخت‌ها: {toPersianDigits((c.payments || []).length)} مورد</Typography>
                      <Typography variant="body2">اسناد: {toPersianDigits((c.documents || []).length)} مورد</Typography>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* تایم‌لاین */}
          {tabIndex === 1 && (
            <Box sx={{ position: 'relative', '&::before': { content: '""', position: 'absolute', right: 12, top: 0, bottom: 0, width: 2, background: 'rgba(99,102,241,0.18)' } }}>
              {timeline.length === 0 ? (
                <Typography variant="body2" color="textSecondary">رویدادی ثبت نشده است.</Typography>
              ) : (
                <Stack spacing={2}>
                  {timeline.map((ev, i) => (
                    <Box key={i} sx={{ position: 'relative', pr: 4 }}>
                      <Box sx={{ position: 'absolute', right: 5, top: 4, width: 14, height: 14, borderRadius: '50%', background: timelineColor[ev.type] || '#6366f1', border: '3px solid #fff', boxShadow: '0 0 0 2px rgba(99,102,241,0.2)' }} />
                      <Typography variant="caption" color="textSecondary">{toJalali(ev.date)}</Typography>
                      <Typography variant="body2" fontWeight={700}>{ev.title}</Typography>
                      {ev.extra && <Typography variant="caption" color="textSecondary">{ev.extra}</Typography>}
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          )}

          {/* جزئیات */}
          {tabIndex === 2 && (
            <Box>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <InfoItem icon={<BusinessIcon sx={{ fontSize: 18 }} />} color="#6366f1" label="شماره مناقصه" value={c.tender_number || '—'} />
                <InfoItem icon={<DescriptionIcon sx={{ fontSize: 18 }} />} color="#ec4899" label="طبقه‌بندی" value={c.category || '—'} />
                <InfoItem icon={<PaymentsIcon sx={{ fontSize: 18 }} />} color="#10b981" label="پیش‌پرداخت" value={c.advance_payment ? `${formatPersianNumber(c.advance_payment)} ${currencyLabel}` : '—'} />
                <InfoItem icon={<LockIcon sx={{ fontSize: 18 }} />} color="#f59e0b" label="درصد حسن انجام کار" value={c.retention_percent ? `٪${toPersianDigits(c.retention_percent)}` : '—'} />
                <InfoItem icon={<ScheduleIcon sx={{ fontSize: 18 }} />} color="#3b82f6" label="دوره گارانتی" value={c.warranty_period || '—'} />
                <InfoItem icon={<AccountBalanceIcon sx={{ fontSize: 18 }} />} color="#ef4444" label="مبلغ تضمین" value={c.guarantee_amount ? `${formatPersianNumber(c.guarantee_amount)} ${currencyLabel}` : '—'} />
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ ...glassPaper, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>شرایط پرداخت</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.payment_terms || '—'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ ...glassPaper, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>شرایط تحویل</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.delivery_terms || '—'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ ...glassPaper, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>جریمه / وجه التزام</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.penalty_terms || '—'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ ...glassPaper, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>شرایط بیمه</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.insurance_terms || '—'}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* مالی */}
          {tabIndex === 3 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ ...glassPaper, p: 2 }}>
                  <SectionTitle color="#8b5cf6" icon={<ReceiptIcon sx={{ fontSize: 16 }} />}>فاکتورها</SectionTitle>
                  {renderMini(c.invoices, 'فاکتوری نیست', x => (
                    <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
                      <Typography variant="body2" fontWeight={700}>{x.number || '—'}</Typography>
                      <Typography variant="caption" color="textSecondary">{formatPersianNumber(x.total || 0)} ریال {x.is_paid ? '· پرداخت شده' : ''}</Typography>
                    </Paper>
                  ))}
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ ...glassPaper, p: 2 }}>
                  <SectionTitle color="#6366f1" icon={<ReceiptLongIcon sx={{ fontSize: 16 }} />}>صورت‌وضعیت‌ها</SectionTitle>
                  {renderMini(c.statements, 'صورت‌وضعیتی نیست', x => (
                    <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
                      <Typography variant="body2" fontWeight={700}>{x.number || '—'}</Typography>
                      <Typography variant="caption" color="textSecondary">{formatPersianNumber(x.amount || 0)} ریال {x.is_approved ? '· تأیید شده' : ''}</Typography>
                    </Paper>
                  ))}
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ ...glassPaper, p: 2 }}>
                  <SectionTitle color="#10b981" icon={<PaymentsIcon sx={{ fontSize: 16 }} />}>پرداخت‌ها</SectionTitle>
                  {renderMini(c.payments, 'پرداختی نیست', x => (
                    <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
                      <Typography variant="body2" fontWeight={700}>{toJalali(x.date)}</Typography>
                      <Typography variant="caption" color="textSecondary">{formatPersianNumber(x.amount || 0)} ریال · {x.reference || ''}</Typography>
                    </Paper>
                  ))}
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* الحاقیه و تضمین */}
          {tabIndex === 4 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ ...glassPaper, p: 2 }}>
                  <SectionTitle color="#ec4899" icon={<EditNoteIcon sx={{ fontSize: 16 }} />}>الحاقیه‌ها</SectionTitle>
                  {renderMini(c.addendums, 'الحاقیه‌ای نیست', x => (
                    <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
                      <Typography variant="body2" fontWeight={700}>{x.number || '—'} · {toJalali(x.date)}</Typography>
                      <Typography variant="caption" color="textSecondary">{x.change_description}</Typography>
                    </Paper>
                  ))}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ ...glassPaper, p: 2 }}>
                  <SectionTitle color="#f59e0b" icon={<LockIcon sx={{ fontSize: 16 }} />}>تضمین‌ها</SectionTitle>
                  {renderMini(c.guarantees, 'تضمینی نیست', x => (
                    <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
                      <Typography variant="body2" fontWeight={700}>{x.guarantee_type_display} · {formatPersianNumber(x.amount || 0)} ریال</Typography>
                      <Typography variant="caption" color="textSecondary">تا {toJalali(x.expiry_date)} · {x.bank} {x.is_released ? '· آزاد شده' : ''}</Typography>
                    </Paper>
                  ))}
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* اسناد */}
          {tabIndex === 5 && (
            <Paper sx={{ ...glassPaper, p: 2 }}>
              <SectionTitle color="#06b6d4" icon={<FolderOpenIcon sx={{ fontSize: 16 }} />}>اسناد قرارداد</SectionTitle>
              {renderMini(c.documents, 'سندی نیست', x => (
                <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
                  <Typography variant="body2" fontWeight={700}>{x.title}</Typography>
                  <Typography variant="caption" color="textSecondary">{toJalali(x.uploaded_at?.slice(0, 10))}</Typography>
                </Paper>
              ))}
            </Paper>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default ContractProfilePage;