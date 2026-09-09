import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Tabs, Tab, Divider, LinearProgress,
} from '@mui/material';
import HandshakeIcon from '@mui/icons-material/Handshake';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TimelineIcon from '@mui/icons-material/Timeline';
import OverviewIcon from '@mui/icons-material/Dashboard';
import DetailsIcon from '@mui/icons-material/Description';
import PaymentsIcon from '@mui/icons-material/Payments';
import GavelIcon from '@mui/icons-material/Gavel';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LockIcon from '@mui/icons-material/Lock';
import EditNoteIcon from '@mui/icons-material/EditNote';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';

const TYPE_LABELS = {
  construction: 'پیمانکاری / اجرا', purchase: 'خرید', tender: 'مناقصه',
  consulting: 'مشاوره', service: 'خدمات', other: 'سایر',
};

const STATUS_LABELS = {
  draft: 'پیش‌نویس', active: 'در حال اجرا', suspended: 'متوقف',
  completed: 'تکمیل شده', terminated: 'فسخ شده',
};

const STATUS_COLORS = {
  draft: '#64748b', active: '#10b981', suspended: '#f59e0b',
  completed: '#3b82f6', terminated: '#ef4444',
};

const ContractProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);

  const { data: c, isLoading } = useQuery({
    queryKey: ['external-contract', id],
    queryFn: () => axiosInstance.get(`/external-contracts/${id}/`).then(r => r.data),
  });

  const timeline = useMemo(() => {
    if (!c) return [];
    const events = [];
    const push = (date, type, title, extra) => {
      if (!date) return;
      events.push({ date, type, title, extra });
    };
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

    return events.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [c]);

  if (isLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;
  if (!c) return <Box sx={{ py: 8, textAlign: 'center' }}>قرارداد یافت نشد.</Box>;

  const totalPaid = (c.payments || []).reduce((s, x) => s + Number(x.amount || 0), 0);
  const totalInvoices = (c.invoices || []).reduce((s, x) => s + Number(x.total || 0), 0);
  const remaining = Math.max(0, Number(c.amount || 0) - totalPaid);

  const statCard = (title, value, color, icon, suffix) => (
    <Paper sx={{ p: 2, borderRadius: 2.5, background: 'rgba(255,255,255,0.65)', border: `1px solid ${color}22` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 42, height: 42, background: `linear-gradient(135deg, ${color}, ${color}99)` }}>{icon}</Avatar>
        <Box>
          <Typography variant="h6" fontWeight={800} sx={{ color }}>{formatPersianNumber(value)}{suffix ? ` ${suffix}` : ''}</Typography>
          <Typography variant="caption" color="textSecondary">{title}</Typography>
        </Box>
      </Box>
    </Paper>
  );

  const info = (label, value) => value ? (
    <Box sx={{ display: 'flex', gap: 1, py: 0.5 }}>
      <Typography variant="caption" color="textSecondary" sx={{ minWidth: 130 }}>{label}</Typography>
      <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>{value}</Typography>
    </Box>
  ) : null;

  const timelineColor = {
    created: '#64748b', signing: '#10b981', start: '#3b82f6', end: '#ef4444',
    invoice: '#8b5cf6', statement: '#6366f1', addendum: '#ec4899',
    guarantee: '#f59e0b', 'guarantee-expiry': '#ef4444', payment: '#10b981', document: '#06b6d4',
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{ p: 2.5, mb: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(245,158,11,0.12), rgba(249,115,22,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.18)', borderRadius: 3 }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
          <HandshakeIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800}>{c.subject}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
            <Chip size="small" label={c.number || 'بدون شماره'} variant="outlined" />
            <Chip size="small" label={TYPE_LABELS[c.contract_type] || ''} color="primary" />
            <Chip size="small" label={STATUS_LABELS[c.status] || ''} sx={{ color: '#fff', bgcolor: STATUS_COLORS[c.status] || '#64748b' }} />
          </Box>
        </Box>
        <Box sx={{ textAlign: 'left' }}>
          <Typography variant="caption" color="textSecondary">طرف قرارداد</Typography>
          <Typography variant="body2" fontWeight={800}>{c.party_name}</Typography>
          <Typography variant="h6" fontWeight={900} color="#b45309">{formatPersianNumber(c.amount || 0)} ریال</Typography>
        </Box>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/external-contracts')}>بازگشت</Button>
      </Paper>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        <Tab icon={<OverviewIcon />} label="نمای کلی" />
        <Tab icon={<TimelineIcon />} label="تایم‌لاین" />
        <Tab icon={<DetailsIcon />} label="جزئیات" />
        <Tab icon={<PaymentsIcon />} label="مالی" />
        <Tab icon={<GavelIcon />} label="الحاقیه و تضمین" />
        <Tab icon={<FolderOpenIcon />} label="اسناد" />
      </Tabs>

      {/* نمای کلی */}
      {tab === 0 && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>{statCard('مبلغ قرارداد', c.amount || 0, '#f59e0b', <HandshakeIcon sx={{ color: '#fff' }} />, 'ریال')}</Grid>
            <Grid item xs={12} sm={6} md={3}>{statCard('جمع پرداخت‌ها', totalPaid, '#10b981', <PaymentsIcon sx={{ color: '#fff' }} />, 'ریال')}</Grid>
            <Grid item xs={12} sm={6} md={3}>{statCard('باقی‌مانده', remaining, '#ef4444', <ScheduleIcon sx={{ color: '#fff' }} />, 'ریال')}</Grid>
            <Grid item xs={12} sm={6} md={3}>{statCard('جمع فاکتورها', totalInvoices, '#8b5cf6', <ReceiptIcon sx={{ color: '#fff' }} />, 'ریال')}</Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>اطلاعات کلیدی</Typography>
                {info('شماره قرارداد', c.number)}
                {info('نوع قرارداد', TYPE_LABELS[c.contract_type])}
                {info('وضعیت', STATUS_LABELS[c.status])}
                {info('نام پروژه / طرح', c.project_name)}
                {info('محل اجرا / تحویل', c.project_location)}
                {info('تاریخ شروع', toJalali(c.start_date))}
                {info('تاریخ پایان', toJalali(c.end_date))}
                {info('تاریخ امضا', toJalali(c.signing_date))}
                {info('امضاکننده', c.signatory_name)}
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>شمارش ریز اقلام</Typography>
                {info('فاکتورها', `${formatPersianNumber((c.invoices || []).length)} مورد`)}
                {info('صورت‌وضعیت‌ها', `${formatPersianNumber((c.statements || []).length)} مورد`)}
                {info('الحاقیه‌ها', `${formatPersianNumber((c.addendums || []).length)} مورد`)}
                {info('تضمین‌ها', `${formatPersianNumber((c.guarantees || []).length)} مورد`)}
                {info('پرداخت‌ها', `${formatPersianNumber((c.payments || []).length)} مورد`)}
                {info('اسناد', `${formatPersianNumber((c.documents || []).length)} مورد`)}
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* تایم‌لاین */}
      {tab === 1 && (
        <Paper sx={{ p: 2.5, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>تایم‌لاین قرارداد</Typography>
          {timeline.length === 0 ? (
            <Typography variant="body2" color="textSecondary">رویدادی ثبت نشده است.</Typography>
          ) : (
            <Box sx={{ position: 'relative', '&::before': { content: '""', position: 'absolute', right: 12, top: 0, bottom: 0, width: 2, background: 'rgba(99,102,241,0.18)' } }}>
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
            </Box>
          )}
        </Paper>
      )}

      {/* جزئیات */}
      {tab === 2 && (
        <Paper sx={{ p: 2.5, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>جزئیات کامل قرارداد</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              {info('شماره مناقصه / استعلام', c.tender_number)}
              {info('طبقه‌بندی', c.category)}
              {info('پیش‌پرداخت', c.advance_payment ? `${formatPersianNumber(c.advance_payment)} ریال` : null)}
              {info('درصد حسن انجام کار', c.retention_percent ? `٪${toPersianDigits(c.retention_percent)}` : null)}
              {info('دوره گارانتی', c.warranty_period)}
              {info('مبلغ تضمین', c.guarantee_amount ? `${formatPersianNumber(c.guarantee_amount)} ریال` : null)}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="textSecondary">شرایط پرداخت</Typography>
              <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{c.payment_terms || '—'}</Typography>
              <Typography variant="caption" color="textSecondary">شرایط تحویل</Typography>
              <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{c.delivery_terms || '—'}</Typography>
              <Typography variant="caption" color="textSecondary">جریمه / وجه التزام</Typography>
              <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{c.penalty_terms || '—'}</Typography>
              <Typography variant="caption" color="textSecondary">شرایط بیمه</Typography>
              <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>{c.insurance_terms || '—'}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* مالی */}
      {tab === 3 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom><ReceiptIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> فاکتورها</Typography>
              <Stack spacing={1}>
                {(c.invoices || []).map(x => (
                  <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight={700}>{x.number || '—'}</Typography>
                    <Typography variant="caption" color="textSecondary">{formatPersianNumber(x.total || 0)} ریال {x.is_paid ? '· پرداخت شده' : ''}</Typography>
                  </Paper>
                ))}
                {(c.invoices || []).length === 0 && <Typography variant="caption" color="textSecondary">فاکتوری نیست</Typography>}
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom><ReceiptLongIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> صورت‌وضعیت‌ها</Typography>
              <Stack spacing={1}>
                {(c.statements || []).map(x => (
                  <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight={700}>{x.number || '—'}</Typography>
                    <Typography variant="caption" color="textSecondary">{formatPersianNumber(x.amount || 0)} ریال {x.is_approved ? '· تأیید شده' : ''}</Typography>
                  </Paper>
                ))}
                {(c.statements || []).length === 0 && <Typography variant="caption" color="textSecondary">صورت‌وضعیتی نیست</Typography>}
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom><PaymentsIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> پرداخت‌ها</Typography>
              <Stack spacing={1}>
                {(c.payments || []).map(x => (
                  <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight={700}>{toJalali(x.date)}</Typography>
                    <Typography variant="caption" color="textSecondary">{formatPersianNumber(x.amount || 0)} ریال · {x.reference || ''}</Typography>
                  </Paper>
                ))}
                {(c.payments || []).length === 0 && <Typography variant="caption" color="textSecondary">پرداختی نیست</Typography>}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* الحاقیه و تضمین */}
      {tab === 4 && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom><EditNoteIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> الحاقیه‌ها</Typography>
              <Stack spacing={1}>
                {(c.addendums || []).map(x => (
                  <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight={700}>{x.number || '—'} · {toJalali(x.date)}</Typography>
                    <Typography variant="caption" color="textSecondary">{x.change_description}</Typography>
                  </Paper>
                ))}
                {(c.addendums || []).length === 0 && <Typography variant="caption" color="textSecondary">الحاقیه‌ای نیست</Typography>}
              </Stack>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom><LockIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> تضمین‌ها</Typography>
              <Stack spacing={1}>
                {(c.guarantees || []).map(x => (
                  <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                    <Typography variant="body2" fontWeight={700}>{x.guarantee_type_display} · {formatPersianNumber(x.amount || 0)} ریال</Typography>
                    <Typography variant="caption" color="textSecondary">تا {toJalali(x.expiry_date)} · {x.bank} {x.is_released ? '· آزاد شده' : ''}</Typography>
                  </Paper>
                ))}
                {(c.guarantees || []).length === 0 && <Typography variant="caption" color="textSecondary">تضمینی نیست</Typography>}
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* اسناد */}
      {tab === 5 && (
        <Paper sx={{ p: 2.5, borderRadius: 3, background: 'rgba(255,255,255,0.65)' }}>
          <Typography variant="subtitle1" fontWeight={800} gutterBottom><FolderOpenIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> اسناد قرارداد</Typography>
          <Stack spacing={1}>
            {(c.documents || []).map(x => (
              <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={700}>{x.title}</Typography>
                <Typography variant="caption" color="textSecondary">{toJalali(x.uploaded_at?.slice(0, 10))}</Typography>
              </Paper>
            ))}
            {(c.documents || []).length === 0 && <Typography variant="caption" color="textSecondary">سندی نیست</Typography>}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default ContractProfilePage;