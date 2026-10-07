import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, CircularProgress, Chip, Divider, Grid, Avatar, Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HandshakeIcon from '@mui/icons-material/Handshake';
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
import LaunchIcon from '@mui/icons-material/Launch';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import { CONTRACT_STATUS_LABELS as STATUS_LABELS, CONTRACT_STATUS_COLORS as STATUS_COLORS, CONTRACT_TYPE_LABELS as TYPE_LABELS } from '../core/theme/tokens';
import { DonutChart, BarChart } from '../core/components/charts/Charts';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.4))',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 10px 34px rgba(15,23,42,0.06)',
  borderRadius: '16px',
};

const InfoCard = ({ title, color, icon: Icon, children }) => (
  <Box sx={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${color}22`, background: '#fff', boxShadow: `0 6px 20px ${color}0d` }}>
    <Box sx={{ px: 2, py: 1.25, background: `linear-gradient(120deg, ${color}16, ${color}07)`, borderBottom: `1px solid ${color}1c`, display: 'flex', alignItems: 'center', gap: 1 }}>
      <Icon sx={{ color, fontSize: 19 }} />
      <Typography variant="subtitle2" fontWeight={800} sx={{ color }}>{title}</Typography>
    </Box>
    <Box sx={{ p: 2 }}>{children}</Box>
  </Box>
);

const InfoRow = ({ label, value, ltr }) => value ? (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1.5, py: 0.5, borderBottom: '1px dashed rgba(0,0,0,0.06)' }}>
    <Typography variant="caption" color="textSecondary" sx={{ flexShrink: 0 }}>{label}</Typography>
    <Typography variant="body2" fontWeight={700} sx={{ textAlign: 'left', direction: ltr ? 'ltr' : 'inherit' }}>{value}</Typography>
  </Box>
) : null;

const StatCard = ({ icon, color, label, value, sub }) => (
  <Paper sx={{
    p: 1.75, borderRadius: '16px', textAlign: 'center', height: '100%',
    background: `linear-gradient(160deg, ${color}16, rgba(255,255,255,0.7))`,
    border: `1px solid ${color}24`, boxShadow: `0 4px 16px ${color}0d`,
    transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 14px 30px ${color}1f` },
  }}>
    <Box sx={{ width: 40, height: 40, borderRadius: '50%', mx: 'auto', mb: 0.75, background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${color}40` }}>
      {icon}
    </Box>
    <Typography variant="h5" fontWeight={900} sx={{ color, direction: 'ltr' }}>{value}</Typography>
    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>{label}</Typography>
    {sub && <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.25 }}>{sub}</Typography>}
  </Paper>
);

const ContractProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: c, isLoading } = useQuery({
    queryKey: ['external-contract', id],
    queryFn: () => axiosInstance.get(`/external-contracts/${id}/`).then(r => r.data),
  });

  const { data: allContracts } = useQuery({
    queryKey: ['external-contracts-all'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 1000 } }).then(r => r.data),
  });
  const allList = Array.isArray(allContracts) ? allContracts : allContracts?.results || [];

  const relatedContracts = useMemo(() => {
    if (!c) return [];
    const projects = new Set((c.project_allocations || []).map(p => p.project).filter(Boolean));
    if (c.project) projects.add(c.project);
    return allList.filter(x => String(x.id) !== String(c.id) && (
      projects.size > 0 && ((x.project_allocations || []).some(p => projects.has(p.project)) || (x.project && projects.has(x.project)))
    )).slice(0, 8);
  }, [allList, c]);

  const timeline = useMemo(() => {
    if (!c) return [];
    const events = [];
    const push = (date, type, title, extra) => { if (date) events.push({ date, type, title, extra }); };
    push(c.created_at?.slice(0, 10), 'created', 'ایجاد قرارداد', `شماره ${c.number || '—'}`);
    push(c.signing_date, 'signing', 'امضای قرارداد', c.signatory_name);
    push(c.start_date, 'start', 'شروع قرارداد', '');
    push(c.end_date, 'end', 'پایان / انقضای قرارداد', '');
    (c.invoices || []).forEach(x => push(x.date, 'invoice', 'ثبت فاکتور', `${x.number || '—'} · ${formatPersianNumber(x.total || 0)}`));
    (c.statements || []).forEach(x => push(x.date, 'statement', 'ثبت صورت‌وضعیت', `${x.number || '—'} · ${formatPersianNumber(x.amount || 0)}`));
    (c.addendums || []).forEach(x => push(x.date, 'addendum', 'ثبت الحاقیه', x.number || x.change_description?.slice(0, 40)));
    (c.guarantees || []).forEach(x => push(x.issue_date, 'guarantee', 'صدور تضمین', x.guarantee_type_display));
    (c.guarantees || []).forEach(x => push(x.expiry_date, 'guarantee-expiry', 'انقضای تضمین', x.number || ''));
    (c.payments || []).forEach(x => push(x.date, 'payment', 'پرداخت', `${formatPersianNumber(x.amount || 0)}`));
    (c.documents || []).forEach(x => push(x.uploaded_at?.slice(0, 10), 'document', 'بارگذاری سند', x.title));
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
  const addendumTotal = (c.addendums || []).reduce((s, x) => s + Number(x.amount_change || 0), 0);
  const amountWithAddendum = Number(c.amount || 0) + addendumTotal;
  const addendumsWithEnd = (c.addendums || []).filter(a => a.new_end_date);
  const lastAddendum = addendumsWithEnd.length ? addendumsWithEnd.reduce((m, a) => (a.date > m.date ? a : m)) : null;
  const endDateWithAddendum = lastAddendum?.new_end_date || c.end_date;
  const remaining = Math.max(0, amountWithAddendum - totalPaid);
  const progressPercent = amountWithAddendum > 0 ? Math.min(100, Math.round((totalPaid / amountWithAddendum) * 100)) : 0;
  const currencyLabel = c.currency_name || 'ریال';

  const timelineColor = {
    created: '#64748b', signing: '#10b981', start: '#3b82f6', end: '#ef4444',
    invoice: '#8b5cf6', statement: '#6366f1', addendum: '#ec4899',
    guarantee: '#f59e0b', 'guarantee-expiry': '#ef4444', payment: '#14b8a6', document: '#06b6d4',
  };

  const quickLinks = [
    { label: 'فاکتور', path: '/contracts-invoices', icon: <ReceiptIcon fontSize="small" />, color: '#8b5cf6', count: (c.invoices || []).length },
    { label: 'صورت‌وضعیت', path: '/contracts-statements', icon: <ReceiptLongIcon fontSize="small" />, color: '#6366f1', count: (c.statements || []).length },
    { label: 'پرداخت', path: '/contracts-payments', icon: <PaymentsIcon fontSize="small" />, color: '#10b981', count: (c.payments || []).length },
    { label: 'الحاقیه', path: '/contracts-addendums', icon: <EditNoteIcon fontSize="small" />, color: '#ec4899', count: (c.addendums || []).length },
    { label: 'تضمین', path: '/contracts-guarantees', icon: <LockIcon fontSize="small" />, color: '#3b82f6', count: (c.guarantees || []).length },
    { label: 'اختلاف', path: '/contracts-disputes', icon: <GavelIcon fontSize="small" />, color: '#ef4444', count: 0 },
    { label: 'اسناد', path: '/contracts-documents', icon: <FolderOpenIcon fontSize="small" />, color: '#f97316', count: (c.documents || []).length },
  ];

  const financialDist = [
    { label: 'پرداخت شده', value: totalPaid, color: '#10b981' },
    { label: 'باقی‌مانده', value: remaining, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const itemsDist = [
    { label: 'فاکتور', value: (c.invoices || []).length, color: '#8b5cf6' },
    { label: 'صورت‌وضعیت', value: (c.statements || []).length, color: '#6366f1' },
    { label: 'پرداخت', value: (c.payments || []).length, color: '#14b8a6' },
    { label: 'الحاقیه', value: (c.addendums || []).length, color: '#ec4899' },
    { label: 'تضمین', value: (c.guarantees || []).length, color: '#f59e0b' },
    { label: 'اسناد', value: (c.documents || []).length, color: '#f97316' },
  ];

  return (
    <Box>
      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button variant="text" startIcon={<ArrowBackIcon />} onClick={() => navigate('/external-contracts')}>بازگشت</Button>
        <Button variant="contained" onClick={() => navigate(`/contracts/${id}/edit`)}>ویرایش</Button>
      </Box>

      {/* Hero */}
      <Paper sx={{ ...glass, mb: 2.5, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', top: -90, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.18), transparent 70%)', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'relative', zIndex: 1, p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Avatar sx={{ width: 88, height: 88, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 10px 36px rgba(245,158,11,0.4)', border: '3px solid rgba(255,255,255,0.7)' }}>
              <HandshakeIcon sx={{ fontSize: 44, color: '#fff' }} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <Typography variant="h4" fontWeight={900} sx={{ mb: 1 }}>{c.subject}</Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap">
                <Chip size="small" label={`شماره: ${c.number || '—'}`} color="primary" variant="filled" />
                <Chip size="small" label={c.contract_type_master_name || TYPE_LABELS[c.contract_type] || '—'} variant="outlined" />
                <Chip size="small" label={STATUS_LABELS[c.status]} sx={{ color: '#fff', bgcolor: STATUS_COLORS[c.status] || '#64748b' }} />
              </Stack>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary" display="block">مبلغ قرارداد</Typography>
              <Typography variant="h4" fontWeight={900} sx={{ color: '#b45309', direction: 'ltr' }}>{formatPersianNumber(amountWithAddendum)}</Typography>
              <Typography variant="caption" color="textSecondary">{currencyLabel}</Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
              <Typography variant="caption" fontWeight={800} color="textSecondary">پیشرفت مالی</Typography>
              <Typography variant="body2" fontWeight={900} color="#10b981">{toPersianDigits(progressPercent)}٪</Typography>
            </Box>
            <Box sx={{ height: 10, bgcolor: 'rgba(0,0,0,0.07)', borderRadius: '10px', overflow: 'hidden' }}>
              <Box sx={{ width: `${progressPercent}%`, height: '100%', background: 'linear-gradient(90deg,#10b981,#14b8a6)', borderRadius: '10px', transition: 'width 0.6s ease' }} />
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Quick links */}
      <Paper sx={{ ...glass, p: 1.5, mb: 2.5 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {quickLinks.map(a => (
            <Button key={a.label} size="small" variant="outlined" startIcon={a.icon} endIcon={a.count > 0 ? <Chip size="small" label={toPersianDigits(a.count)} sx={{ height: 16, fontSize: 10 }} /> : null}
              onClick={() => navigate(`${a.path}?contract=${id}`)}
              sx={{ color: a.color, borderColor: `${a.color}66`, borderRadius: '10px', textTransform: 'none' }}>
              {a.label}
            </Button>
          ))}
        </Box>
      </Paper>

      {/* Stats */}
      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />} color="#f59e0b" label="مبلغ قرارداد (با الحاقیه)" value={formatPersianNumber(amountWithAddendum)} sub={currencyLabel} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<PaymentsIcon sx={{ fontSize: 20 }} />} color="#10b981" label="پرداخت شده" value={formatPersianNumber(totalPaid)} sub={currencyLabel} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<ScheduleIcon sx={{ fontSize: 20 }} />} color="#ef4444" label="باقی‌مانده" value={formatPersianNumber(remaining)} sub={currencyLabel} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<ReceiptIcon sx={{ fontSize: 20 }} />} color="#8b5cf6" label="جمع فاکتورها" value={formatPersianNumber(totalInvoices)} sub={currencyLabel} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<EditNoteIcon sx={{ fontSize: 20 }} />} color="#ec4899" label="الحاقیه‌ها" value={toPersianDigits((c.addendums || []).length)} sub="مورد" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard icon={<LockIcon sx={{ fontSize: 20 }} />} color="#3b82f6" label="تضمین‌ها" value={toPersianDigits((c.guarantees || []).length)} sub="مورد" />
        </Grid>
      </Grid>

      {/* Main grid */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={7}>
          <Stack spacing={2.5}>
            <InfoCard title="اطلاعات کلیدی" color="#6366f1" icon={BusinessIcon}>
              <InfoRow label="طرف قرارداد" value={c.party_name} />
              <InfoRow label="نوع قرارداد" value={c.contract_type_master_name || TYPE_LABELS[c.contract_type]} />
              <InfoRow label="مبلغ اولیه" value={`${formatPersianNumber(c.amount || 0)} ${currencyLabel}`} ltr />
              <InfoRow label="مبلغ با الحاقیه" value={`${formatPersianNumber(amountWithAddendum)} ${currencyLabel}`} ltr />
              <InfoRow label="تاریخ شروع" value={toJalali(c.start_date)} />
              <InfoRow label="تاریخ پایان" value={toJalali(c.end_date)} />
              <InfoRow label="تاریخ پایان (با الحاقیه)" value={toJalali(endDateWithAddendum)} />
              <InfoRow label="تاریخ امضا" value={toJalali(c.signing_date)} />
              <InfoRow label="امضاکننده" value={c.signatory_name} />
              <InfoRow label="پیش‌پرداخت" value={c.advance_payment ? `${formatPersianNumber(c.advance_payment)} ${currencyLabel}` : null} ltr />
              <InfoRow label="دوره گارانتی" value={c.warranty_period} />
              <InfoRow label="طبقه‌بندی" value={c.category} />
            </InfoCard>

            <InfoCard title="پروژه‌ها و درصد تخصیص" color="#3b82f6" icon={BusinessIcon}>
              {(c.project_allocations_display || []).length === 0 ? (
                <Typography variant="caption" color="textSecondary">{c.project_name ? `${c.project_name} (100٪)` : 'پروژه‌ای تخصیص نیافته است.'}</Typography>
              ) : (
                <Stack spacing={0.75}>
                  {c.project_allocations_display.map((pa, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1, borderRadius: '10px', background: 'rgba(59,130,246,0.06)' }}>
                      <Typography variant="body2" fontWeight={700} sx={{ wordBreak: 'break-word' }}>{pa.project_name}</Typography>
                      <Chip size="small" label={`${formatPersianNumber(pa.percentage || 0)}٪`} sx={{ bgcolor: '#3b82f6', color: '#fff', fontWeight: 800 }} />
                    </Box>
                  ))}
                </Stack>
              )}
            </InfoCard>

            <Grid container spacing={2.5}>
              <Grid item xs={12} md={6}>
                <InfoCard title="شرایط پرداخت" color="#10b981" icon={PaymentsIcon}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.payment_terms || '—'}</Typography>
                </InfoCard>
              </Grid>
              <Grid item xs={12} md={6}>
                <InfoCard title="شرایط تحویل" color="#0ea5e9" icon={StorefrontIcon}>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.delivery_terms || '—'}</Typography>
                </InfoCard>
              </Grid>
            </Grid>
          </Stack>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Stack spacing={2.5}>
            <InfoCard title="تایم‌لاین" color="#8b5cf6" icon={ScheduleIcon}>
              {timeline.length === 0 ? (
                <Typography variant="caption" color="textSecondary">رویدادی ثبت نشده است.</Typography>
              ) : (
                <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 0.5 }}>
                  <Stack spacing={1.25}>
                    {timeline.slice(0, 12).map((ev, i) => {
                      const color = timelineColor[ev.type] || '#6366f1';
                      return (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0, mt: 0.4, boxShadow: `0 0 0 3px ${color}22` }} />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={800}>{ev.title}</Typography>
                            {ev.extra && <Typography variant="caption" color="textSecondary">{ev.extra}</Typography>}
                          </Box>
                          <Typography variant="caption" color="textSecondary" sx={{ flexShrink: 0 }}>{toJalali(ev.date)}</Typography>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </InfoCard>

            <InfoCard title="الحاقیه‌ها" color="#ec4899" icon={EditNoteIcon}>
              {(c.addendums || []).length === 0 ? (
                <Typography variant="caption" color="textSecondary">الحاقیه‌ای ثبت نشده است.</Typography>
              ) : (
                <Stack spacing={0.75}>
                  {c.addendums.map(x => (
                    <Box key={x.id} sx={{ p: 1, borderRadius: '10px', background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.15)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
                        <Typography variant="body2" fontWeight={800}>{x.number || '—'}</Typography>
                        <Typography variant="caption" color="textSecondary">{toJalali(x.date)}</Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                        {x.amount_change != null && x.amount_change !== '' && (
                          <Chip size="small" label={`${Number(x.amount_change) >= 0 ? '+' : ''}${formatPersianNumber(x.amount_change)}`}
                            sx={{ bgcolor: Number(x.amount_change) >= 0 ? '#10b98118' : '#ef444418', color: Number(x.amount_change) >= 0 ? '#059669' : '#b91c1c', height: 18, fontSize: 10, fontWeight: 700 }} />
                        )}
                        {x.percent_change != null && x.percent_change !== '' && (
                          <Chip size="small" label={`${toPersianDigits(x.percent_change)}٪`} sx={{ bgcolor: '#6366f118', color: '#4f46e5', height: 18, fontSize: 10, fontWeight: 700 }} />
                        )}
                        {x.new_end_date && (
                          <Chip size="small" label={`پایان جدید: ${toJalali(x.new_end_date)}`} sx={{ bgcolor: '#ec489918', color: '#be185d', height: 18, fontSize: 10, fontWeight: 700 }} />
                        )}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </InfoCard>

            <InfoCard title="تضمین‌ها" color="#f59e0b" icon={LockIcon}>
              {(c.guarantee_items_display || []).length === 0 && (c.guarantees || []).length === 0 ? (
                <Typography variant="caption" color="textSecondary">تضمینی ثبت نشده است.</Typography>
              ) : (
                <Stack spacing={0.75}>
                  {(c.guarantee_items_display || []).map((g, i) => (
                    <Box key={`gi-${i}`} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderRadius: '10px', background: 'rgba(245,158,11,0.05)' }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700}>{g.type_label}</Typography>
                        {g.note && <Typography variant="caption" color="textSecondary">{g.note}</Typography>}
                      </Box>
                      <Typography variant="body2" fontWeight={800} sx={{ color: '#b45309' }}>{formatPersianNumber(g.amount || 0)} {currencyLabel}{g.percent ? ` (${formatPersianNumber(g.percent)}٪)` : ''}</Typography>
                    </Box>
                  ))}
                  {(c.guarantees || []).map(x => (
                    <Box key={x.id} sx={{ p: 1, borderRadius: '10px', background: 'rgba(245,158,11,0.05)' }}>
                      <Typography variant="body2" fontWeight={700}>{x.guarantee_type_display} · {formatPersianNumber(x.amount || 0)} {currencyLabel}</Typography>
                      <Typography variant="caption" color="textSecondary">تا {toJalali(x.expiry_date)} {x.is_released ? '· آزاد شده' : ''}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </InfoCard>
          </Stack>
        </Grid>
      </Grid>

      {/* نمودارها */}
      <Grid container spacing={2.5} sx={{ mt: 2.5 }}>
        <Grid item xs={12} md={6}>
          <InfoCard title="توزیع مالی" color="#10b981" icon={AccountBalanceIcon}>
            {financialDist.length === 0 ? (
              <Typography variant="caption" color="textSecondary">داده‌ای نیست</Typography>
            ) : (
              <DonutChart data={financialDist} size={180} centerLabel="مالی" />
            )}
          </InfoCard>
        </Grid>
        <Grid item xs={12} md={6}>
          <InfoCard title="تعداد اقلام" color="#6366f1" icon={ReceiptLongIcon}>
            {itemsDist.filter(d => d.value > 0).length === 0 ? (
              <Typography variant="caption" color="textSecondary">داده‌ای نیست</Typography>
            ) : (
              <BarChart data={itemsDist.filter(d => d.value > 0)} />
            )}
          </InfoCard>
        </Grid>
      </Grid>

      {/* شبکه ارتباط */}
      <Grid container spacing={2.5} sx={{ mt: 2.5 }}>
        <Grid item xs={12}>
          <InfoCard title="شبکه ارتباط (قراردادهای هم‌پروژه)" color="#3b82f6" icon={AccountBalanceIcon}>
            {relatedContracts.length === 0 ? (
              <Typography variant="caption" color="textSecondary">قرارداد مرتبطی در همین پروژه‌ها یافت نشد.</Typography>
            ) : (
              <Box sx={{ position: 'relative', width: '100%', height: 380 }}>
                <svg viewBox="0 0 340 340" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                  {relatedContracts.map((rc, i) => {
                    const angle = (i / relatedContracts.length) * 2 * Math.PI - Math.PI / 2;
                    const x = 170 + 132 * Math.cos(angle);
                    const y = 170 + 132 * Math.sin(angle);
                    const color = ['#8b5cf6', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#6366f1', '#14b8a6', '#f97316'][i % 8];
                    return <line key={rc.id} x1="170" y1="170" x2={x} y2={y} stroke={`${color}66`} strokeWidth="2" strokeDasharray="6 5" />;
                  })}
                </svg>

                {/* مرکز */}
                <Box sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 2, width: 150, textAlign: 'center' }}>
                  <Box sx={{ width: 118, height: 118, mx: 'auto', borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#f97316)', boxShadow: '0 12px 34px rgba(245,158,11,0.45)', border: '3px solid #fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', px: 1 }}>
                    <Typography variant="body2" fontWeight={900} sx={{ color: '#fff' }}>{c.number || 'قرارداد'}</Typography>
                    <Typography variant="caption" sx={{ fontSize: 8.5, lineHeight: 1.2, textAlign: 'center', color: 'rgba(255,255,255,0.9)' }}>{c.party_name || 'مرکزی'}</Typography>
                  </Box>
                </Box>

                {/* مرتبط‌ها */}
                {relatedContracts.map((rc, i) => {
                  const angle = (i / relatedContracts.length) * 2 * Math.PI - Math.PI / 2;
                  const x = 50 + 39 * Math.cos(angle);
                  const y = 50 + 39 * Math.sin(angle);
                  const color = ['#8b5cf6', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#6366f1', '#14b8a6', '#f97316'][i % 8];
                  return (
                    <Box key={rc.id} onClick={() => navigate(`/external-contracts/${rc.id}`)}
                      sx={{
                        position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)',
                        zIndex: 2, cursor: 'pointer', width: 128, textAlign: 'center',
                        '&:hover .node': { boxShadow: `0 14px 30px ${color}55`, transform: 'scale(1.05)' },
                      }}>
                      <Box className="node" sx={{
                        width: 100, height: 100, mx: 'auto', borderRadius: '50%',
                        background: `linear-gradient(135deg, ${color}22, rgba(255,255,255,0.7))`,
                        border: `2px solid ${color}`, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                        boxShadow: `0 6px 18px ${color}22`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 1,
                        transition: 'all 0.2s ease',
                      }}>
                        <Typography variant="body2" fontWeight={900} sx={{ color: '#1e293b' }}>{rc.number || '—'}</Typography>
                        <Typography variant="caption" sx={{ fontSize: 8, lineHeight: 1.25, textAlign: 'center', color: '#475569' }}>{rc.party_name || '—'}</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </InfoCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ContractProfilePage;






