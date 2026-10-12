import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, Grid, InputLabel, LinearProgress, MenuItem,
  Paper, Select, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VerifiedIcon from '@mui/icons-material/Verified';
import GavelIcon from '@mui/icons-material/Gavel';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import PrintIcon from '@mui/icons-material/Print';
import BoltIcon from '@mui/icons-material/Bolt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';
import { toJalali } from '../../../core/utils/dateUtils';
import JalaliDatePicker from '../../../core/components/ui/JalaliDatePicker';
import { ReportHeader } from './reportHelpers';

const FONT = 'Vazirmatn, IRANSans, sans-serif';

const PALETTE = {
  asset: { main: '#2563eb', light: '#60a5fa', soft: 'rgba(37,99,235,0.10)' },
  liability: { main: '#ef4444', light: '#fb7185', soft: 'rgba(239,68,68,0.10)' },
  equity: { main: '#059669', light: '#34d399', soft: 'rgba(5,150,105,0.10)' },
  summary: { main: '#0f172a', light: '#475569', soft: 'rgba(15,23,42,0.08)' },
  audit: { main: '#7c3aed', light: '#a78bfa', soft: 'rgba(124,58,237,0.10)' },
};

const glassCard = (color) => ({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '22px',
  background: 'linear-gradient(155deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.62) 55%, rgba(255,255,255,0.48) 100%)',
  backdropFilter: 'blur(26px) saturate(185%)',
  WebkitBackdropFilter: 'blur(26px) saturate(185%)',
  border: '1px solid rgba(255,255,255,0.8)',
  borderTop: `4px solid ${color}`,
  boxShadow: `0 22px 60px ${color}24, 0 4px 16px rgba(15,23,42,0.06)`,
});

const Blob = ({ color, side = 'left', size = 260 }) => (
  <Box sx={{
    position: 'absolute', top: -size * 0.45, [side]: -size * 0.3, width: size, height: size,
    borderRadius: '50%', pointerEvents: 'none',
    background: `radial-gradient(circle, ${color}33 0%, ${color}12 45%, transparent 72%)`,
  }} />
);

const money = (v) => formatPersianNumber(v || 0);
const pct = (v) => `${toPersianDigits(v || 0)}٪`;
const jalali = (iso) => (iso ? toJalali(iso) : '—');

/* --------------------------- کارت بخش (دارایی/بدهی/سهام) --------------------------- */
const SectionCard = ({ title, subtitle, icon, tone, total, groups, emptyText }) => {
  const { main: color, light, soft } = PALETTE[tone];
  return (
    <Paper sx={{ ...glassCard(color), p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Blob color={color} side="left" />
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
        <Avatar sx={{
          width: 46, height: 46,
          background: `linear-gradient(135deg, ${light}, ${color})`,
          boxShadow: `0 10px 28px ${color}55`,
        }}>
          {icon}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" fontWeight={900} sx={{ color, fontFamily: FONT }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: FONT }}>{subtitle}</Typography>
        </Box>
        <Box sx={{ textAlign: 'left' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: FONT }}>جمع</Typography>
          <Typography fontWeight={900} sx={{ color, direction: 'ltr', fontFamily: FONT, fontSize: 18 }}>
            {money(total)}
          </Typography>
        </Box>
      </Stack>
      <Divider sx={{ my: 1.5, borderColor: `${color}22` }} />
      <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 420, pr: 0.5 }}>
        {(groups || []).length === 0 ? (
          <Box textAlign="center" py={5}>
            <Typography color="text.secondary" sx={{ fontFamily: FONT, fontSize: 13 }}>
              {emptyText}
            </Typography>
          </Box>
        ) : groups.map((group) => (
          <Box key={`${group.code}-${group.name}`} sx={{ mb: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, fontSize: 12.5 }}>
                {group.code ? `${group.code} — ` : ''}{group.name}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip size="small" label={pct(group.percent)}
                  sx={{ bgcolor: soft, color, fontWeight: 800, fontFamily: FONT, height: 20 }} />
                <Typography variant="body2" fontWeight={800} sx={{ direction: 'ltr', fontFamily: FONT }}>
                  {money(group.total)}
                </Typography>
              </Stack>
            </Stack>
            <LinearProgress variant="determinate" value={Math.min(Math.abs(group.percent || 0), 100)}
              sx={{
                height: 6, borderRadius: 3, my: 0.75, bgcolor: soft,
                '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg, ${light}, ${color})` },
              }} />
            {(group.rows || []).map((row) => (
              <Stack key={row.id} direction="row" spacing={1} alignItems="center"
                sx={{ py: 0.45, px: 0.75, borderRadius: '10px', '&:hover': { bgcolor: soft } }}>
                <Typography variant="caption" sx={{ minWidth: 56, color: 'text.secondary', direction: 'ltr', fontFamily: FONT }}>
                  {row.code}
                </Typography>
                <Typography sx={{ flex: 1, fontFamily: FONT, fontSize: 12.5 }}>{row.name}</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ direction: 'ltr', fontFamily: FONT }}>
                  {money(row.balance)}
                </Typography>
                <Typography variant="caption" color="text.secondary"
                  sx={{ minWidth: 44, textAlign: 'left', fontFamily: FONT }}>
                  {pct(row.share)}
                </Typography>
              </Stack>
            ))}
          </Box>
        ))}
      </Box>
      <Box sx={{
        mt: 1.5, p: 1.25, borderRadius: '14px',
        background: `linear-gradient(135deg, ${color}1f, ${color}0a)`, border: `1px solid ${color}33`,
      }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={900} sx={{ color, fontFamily: FONT }}>جمع {title}</Typography>
          <Typography fontWeight={900} sx={{ color, direction: 'ltr', fontFamily: FONT, fontSize: 18 }}>
            {money(total)}
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
};


/* --------------------------------- کارت جمع‌بندی --------------------------------- */
const StatBlock = ({ label, value, color, sub }) => (
  <Box sx={{
    p: 1.5, borderRadius: '16px', flex: 1, minWidth: 160,
    background: `linear-gradient(135deg, ${color}22, ${color}08)`,
    border: `1px solid ${color}36`, boxShadow: `0 10px 26px ${color}14`,
  }}>
    <Typography variant="caption" sx={{ fontFamily: FONT, fontWeight: 700, color: 'text.secondary' }}>
      {label}
    </Typography>
    <Typography sx={{ fontFamily: FONT, fontWeight: 900, color, fontSize: 20, direction: 'ltr' }}>
      {value}
    </Typography>
    {sub ? (
      <Typography variant="caption" sx={{ fontFamily: FONT, color: 'text.secondary' }}>{sub}</Typography>
    ) : null}
  </Box>
);

const BalanceBadge = ({ balanced, difference }) => (
  <Box sx={{
    px: 2, py: 1.25, borderRadius: '16px', display: 'flex', alignItems: 'center', gap: 1.25,
    background: balanced
      ? 'linear-gradient(135deg, rgba(16,185,129,0.20), rgba(16,185,129,0.05))'
      : 'linear-gradient(135deg, rgba(239,68,68,0.20), rgba(239,68,68,0.05))',
    border: `1px solid ${balanced ? '#10b981' : '#ef4444'}55`,
    boxShadow: `0 10px 30px ${balanced ? '#10b98133' : '#ef444433'}`,
  }}>
    {balanced
      ? <CheckCircleIcon sx={{ color: '#10b981' }} />
      : <WarningAmberIcon sx={{ color: '#ef4444' }} />}
    <Box>
      <Typography fontWeight={900} sx={{ fontFamily: FONT, color: balanced ? '#047857' : '#b91c1c' }}>
        {balanced ? 'معادلهٔ حسابداری تراز است ✓' : 'معادلهٔ حسابداری تراز نیست'}
      </Typography>
      <Typography variant="caption" sx={{ fontFamily: FONT, color: 'text.secondary' }}>
        {balanced ? 'دارایی‌ها = بدهی‌ها + حقوق صاحبان سهام' : `اختلاف: ${money(difference)}`}
      </Typography>
    </Box>
  </Box>
);

const IntegrityChips = ({ integrity = {} }) => {
  const items = [
    { label: `اسناد ثبت‌شده/قفل: ${toPersianDigits(integrity.posted || 0)}`, ok: true, color: '#0ea5e9' },
    { label: `در انتظار تأیید: ${toPersianDigits(integrity.pending_approval || 0)}`, ok: !integrity.pending_approval, color: '#f59e0b' },
    { label: `سند ناتراز: ${toPersianDigits(integrity.unbalanced_documents || 0)}`, ok: !integrity.unbalanced_documents, color: '#ef4444' },
    { label: `پیش‌نویس کنارگذاشته: ${toPersianDigits(integrity.draft_excluded || 0)}`, ok: true, color: '#64748b' },
    { label: `حساب با نوع ناهمگون: ${toPersianDigits((integrity.coding_mismatch_accounts || 0) + (integrity.coding_mismatch_groups || 0))}`, ok: !(integrity.coding_mismatch_accounts || integrity.coding_mismatch_groups), color: '#dc2626' },
  ];
  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
      {items.map((item) => (
        <Chip
          key={item.label}
          size="small"
          icon={item.ok ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <WarningAmberIcon sx={{ fontSize: 14 }} />}
          label={item.label}
          sx={{
            fontFamily: FONT, fontWeight: 700, fontSize: 11.5,
            bgcolor: item.ok ? `${item.color}14` : 'rgba(239,68,68,0.14)',
            color: item.ok ? '#334155' : '#b91c1c',
          }}
        />
      ))}
    </Stack>
  );
};

/* ------------------------------ مهر تأیید حسابرسی ------------------------------ */
const AuditSeal = ({ audit, audited, onRecord }) => {
  const approval = audit?.approval || null;
  const tone = audited ? '#059669' : (approval ? '#f59e0b' : '#64748b');
  const label = approval ? approval.status_display : 'بدون تأیید حسابرسی';
  return (
    <Paper sx={{ ...glassCard(tone), p: 2, height: '100%' }}>
      <Blob color={tone} side="right" size={220} />
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
        <Avatar sx={{
          width: 52, height: 52,
          background: `linear-gradient(135deg, ${audited ? '#34d399' : tone}, ${tone})`,
          boxShadow: `0 12px 30px ${tone}55`,
        }}>
          {audited ? <VerifiedIcon sx={{ fontSize: 30 }} /> : <GavelIcon />}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={900} sx={{ fontFamily: FONT, color: tone, fontSize: 15.5 }}>
            {audited ? 'تأیید حسابرسی صورت‌های مالی'
              : (approval ? 'تأیید ثبت‌شده (نیازمند تأیید نهایی)' : 'تأیید حسابرسی ثبت نشده است')}
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: FONT, color: 'text.secondary' }}>
            {approval
              ? `${approval.auditor_name}${approval.audit_firm ? ` — ${approval.audit_firm}` : ''}`
              : 'برای درج مهر تأیید، اطلاعات حسابرس و تاریخ تأیید را ثبت کنید.'}
          </Typography>
        </Box>
        <Chip label={label} sx={{ fontFamily: FONT, fontWeight: 800, bgcolor: `${tone}1f`, color: tone }} />
      </Stack>

      {approval ? (
        <Grid container spacing={1.5} sx={{ mt: 1.25, position: 'relative', zIndex: 1 }}>
          {[
            ['شمارهٔ گزارش/نامه', approval.reference_no || '—'],
            ['تاریخ تأیید', jalali(approval.approved_at)],
            ['سال مالی', approval.fiscal_year_name || '—'],
            ['تهیه‌کننده', approval.prepared_by_name || '—'],
          ].map(([k, v]) => (
            <Grid item xs={6} md={3} key={k}>
              <Typography variant="caption" sx={{ fontFamily: FONT, color: 'text.secondary' }}>{k}</Typography>
              <Typography sx={{ fontFamily: FONT, fontWeight: 800, fontSize: 13 }}>{v}</Typography>
            </Grid>
          ))}
          {approval.opinion_note ? (
            <Grid item xs={12}>
              <Box sx={{ p: 1.25, borderRadius: '12px', bgcolor: `${tone}12`, border: `1px dashed ${tone}66` }}>
                <Typography sx={{ fontFamily: FONT, fontSize: 12.5, lineHeight: 1.9 }}>
                  {approval.opinion_note}
                </Typography>
              </Box>
            </Grid>
          ) : null}
        </Grid>
      ) : null}

      <Divider sx={{ my: 1.5 }} />
      <Typography variant="caption" sx={{ fontFamily: FONT, fontWeight: 800, color: 'text.secondary' }}>
        کنترل صحت داده‌های مبنای صورت مالی
      </Typography>
      <Box sx={{ mt: 0.75 }}>
        <IntegrityChips integrity={audit?.integrity || {}} />
      </Box>
      <Stack direction="row" spacing={1} sx={{ mt: 1.75 }} flexWrap="wrap" useFlexGap>
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={onRecord}
          sx={{
            borderRadius: '12px', fontFamily: FONT, fontWeight: 800,
            background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
            boxShadow: '0 10px 26px rgba(124,58,237,0.35)',
          }}>
          ثبت تأیید حسابرسی
        </Button>
        {approval ? (
          <Chip size="small" label={approval.is_final ? 'تأیید نهایی' : 'غیرنهایی'}
            color={approval.is_final ? 'success' : 'warning'} sx={{ fontFamily: FONT, fontWeight: 800 }} />
        ) : null}
      </Stack>
    </Paper>
  );
};


/* ================================= صفحهٔ ترازنامه ================================= */
// برچسب فارسی طبقهٔ حساب (برای بنر تشخیص طبقه‌بندی)
const CATEGORY_FA = {
  asset: 'دارایی', liability: 'بدهی', equity: 'حقوق صاحبان سهام',
  revenue: 'درآمد', expense: 'هزینه', cost_of_sales: 'بهای تمام‌شده',
};

/* --- بنر تشخیص طبقه‌بندی: نشان می‌دهد چرا همه‌چیز در کارت دارایی‌ها آمده --- */
const CodingClassificationBanner = ({ classification, integrity = {}, fixing, onFix }) => {
  const mismatched = integrity.coding_mismatch_accounts || 0;
  const mismatchedGroups = integrity.coding_mismatch_groups || 0;
  const suspicious = !!classification?.suspicious;
  if (!mismatched && !mismatchedGroups && !suspicious) return null;
  const counts = classification?.accounts || {};
  const excluded = classification?.excluded || {};

  return (
    <Paper sx={{ ...glassCard('#dc2626'), p: 1.75, mb: 2.5 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap
        sx={{ position: 'relative', zIndex: 1 }}>
        <WarningAmberIcon sx={{ color: '#dc2626' }} />
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Typography sx={{ fontFamily: FONT, fontWeight: 900, color: '#b91c1c' }}>
            طبقه‌بندی حساب‌ها هم‌خوان نیست
          </Typography>
          <Typography variant="caption" sx={{ fontFamily: FONT, color: '#7f1d1d' }}>
            {mismatched > 0
              ? `${toPersianDigits(mismatched)} حساب`
              : 'حساب‌های این دوره'}
            {mismatchedGroups > 0 ? ` و ${toPersianDigits(mismatchedGroups)} گروه` : ''}
            {' '}با نوع ناهمگون ثبت شده‌اند (گروهشان بدهی/هزینه است اما نوعشان «دارایی»)؛ به همین دلیل
            همه در کارت دارایی‌ها می‌آیند و فقط با نام گروه تفکیک می‌شوند. با «اصلاح نوع حساب‌ها»،
            نوع و ماهیت از والد/گروه بازنویسی و گزارش بازخوانی می‌شود.
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {Object.entries(counts).map(([k, v]) => (
            <Chip key={k} size="small" label={`${CATEGORY_FA[k] || k}: ${toPersianDigits(v)}`}
              sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(15,23,42,0.06)' }} />
          ))}
          {Object.entries(excluded).map(([k, v]) => (
            <Chip key={k} size="small" label={`کنارگذاشته — ${CATEGORY_FA[k] || k}: ${toPersianDigits(v)}`}
              sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(100,116,139,0.12)', color: '#334155' }} />
          ))}
        </Stack>
        <Button
          variant="contained"
          disabled={fixing}
          onClick={onFix}
          startIcon={fixing ? <CircularProgress size={16} color="inherit" /> : <BoltIcon />}
          sx={{
            borderRadius: '12px', fontFamily: FONT, fontWeight: 800,
            background: 'linear-gradient(135deg,#ef4444,#dc2626)',
            boxShadow: '0 10px 24px rgba(220,38,38,0.3)',
          }}>
          {fixing ? 'در حال اصلاح…' : 'اصلاح نوع حساب‌ها و بازخوانی'}
        </Button>
      </Stack>
    </Paper>
  );
};

const BalanceSheetPage = () => {
  const qc = useQueryClient();
  const [yearId, setYearId] = useState('');
  const [asOf, setAsOf] = useState('');
  const [msg, setMsg] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    auditor_name: '', audit_firm: '', reference_no: '', approved_at: '',
    status: 'approved', opinion_note: '', prepared_by_name: '', as_of_date: '',
  });

  const { data: years } = useQuery({
    queryKey: ['acc-fy-list'],
    queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then((r) => r.data),
  });
  const yearList = Array.isArray(years) ? years : years?.results || [];

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['acc-bs-page', yearId, asOf],
    queryFn: () => axiosInstance.get('/accounting/reports/balance-sheet/', {
      params: {
        ...(yearId ? { fiscal_year: yearId } : {}),
        ...(asOf ? { as_of: asOf } : {}),
      },
    }).then((r) => r.data),
  });

  const saveApproval = useMutation({
    mutationFn: (body) => axiosInstance.post('/accounting/statement-approvals/', body).then((r) => r.data),
    onSuccess: (saved) => {
      setMsg({ type: 'success', text: `تأیید حسابرسی «${saved.auditor_name}» ثبت شد (${saved.status_display}).` });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ['acc-bs-page'] });
    },
    onError: (e) => setMsg({
      type: 'error',
      text: e?.response?.data?.detail || 'ثبت تأیید حسابرسی ناموفق بود.',
    }),
  });

  const submitApproval = () => {
    if (!form.auditor_name) {
      setMsg({ type: 'error', text: 'نام حسابرس/تأییدکننده الزامی است.' });
      return;
    }
    saveApproval.mutate({
      ...form,
      statement_type: 'balance_sheet',
      fiscal_year: yearId || null,
      approved_at: form.approved_at || null,
      as_of_date: form.as_of_date || null,
    });
  };

  // اصلاح ناهمگونی نوع حساب‌ها و بازخوانی گزارش (عارضهٔ «همه دارایی»)
  const [fixing, setFixing] = useState(false);
  const fixCoding = async () => {
    setFixing(true);
    setMsg(null);
    try {
      const { data: repair } = await axiosInstance.post(
        '/accounting/accounts/sync-types/', { apply: 1, fix_groups: 1 },
      );
      setMsg({
        type: 'success',
        text: `نوع ${toPersianDigits(repair.accounts_updated || 0)} حساب`
          + (repair.groups_updated ? ` و ${toPersianDigits(repair.groups_updated)} گروه حساب` : '')
          + ' اصلاح شد؛ گزارش بازخوانی شد.',
      });
      qc.invalidateQueries({ queryKey: ['acc-bs-page'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['acc-general'] });
      qc.invalidateQueries({ queryKey: ['acc-subsidiary'] });
      qc.invalidateQueries({ queryKey: ['acc-groups'] });
      refetch();
    } catch (e) {
      setMsg({
        type: 'error',
        text: e?.response?.data?.detail || e?.response?.data?.error || 'اصلاح نوع حساب‌ها ناموفق بود.',
      });
    } finally {
      setFixing(false);
    }
  };

  const balanced = data?.is_balanced !== undefined
    ? !!data.is_balanced
    : (!!data && Math.round(((data.total_assets || 0) - (data.total_liabilities_equity || 0)) * 100) / 100 === 0);
  const difference = data?.difference !== undefined
    ? data.difference
    : Math.round(((data?.total_assets || 0) - (data?.total_liabilities_equity || 0)) * 100) / 100;
  const audited = !!data?.audited;
  // سازگاری با پاسخ قدیمی بک‌اند: اگر گروه‌بندی نیامده باشد، از ردیف‌های تخت گروه می‌سازیم
  const groupedOf = (groups, rows, total) => {
    if (groups && groups.length) return groups;
    const list = rows || [];
    if (!list.length) return [];
    const byGroup = {};
    list.forEach((row) => {
      const key = row.group || 'حساب‌ها';
      const bucket = byGroup[key] || (byGroup[key] = { name: key, code: '', rows: [], total: 0 });
      bucket.rows.push(row);
      bucket.total += row.balance || 0;
    });
    return Object.values(byGroup).map((g) => ({
      ...g,
      total: Math.round(g.total * 100) / 100,
      percent: total ? Math.round((g.total / total) * 1000) / 10 : 0,
      rows: g.rows.map((r) => ({
        ...r,
        share: total ? Math.round(((r.balance || 0) / total) * 1000) / 10 : 0,
      })),
    }));
  };
  const assetGroups = groupedOf(data?.asset_groups, data?.assets, data?.total_assets);
  const liabilityGroups = groupedOf(data?.liability_groups, data?.liabilities, data?.total_liabilities);
  const equityGroups = groupedOf(data?.equity_groups, data?.equity, data?.total_equity);
  const maxSide = Math.max(
    Math.abs(data?.total_assets || 0),
    Math.abs(data?.total_liabilities || 0),
    Math.abs(data?.total_equity || 0),
    1,
  );
  const bar = (value) => Math.min(Math.abs(value) / maxSide * 100, 100);

  return (
    <Box>
      <ReportHeader
        icon={<AccountBalanceIcon sx={{ fontSize: 28, color: '#fff' }} />}
        title="ترازنامه"
        subtitle="دارایی‌ها (راست) = بدهی‌ها + حقوق صاحبان سهام (چپ) — با مهر تأیید حسابرسی"
        color="#3b82f6"
        dark="#1d4ed8"
        actions={(
          <>
            <FormControl size="small" sx={{ minWidth: 190 }}>
              <InputLabel>سال مالی</InputLabel>
              <Select value={yearId} label="سال مالی" onChange={(e) => setYearId(e.target.value)}>
                <MenuItem value="">همهٔ دوره‌ها</MenuItem>
                {yearList.map((y) => (
                  <MenuItem key={y.id} value={String(y.id)}>
                    {y.name}{y.is_current ? ' (جاری)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ minWidth: 180 }}>
              <JalaliDatePicker fullWidth label="تا تاریخ" value={asOf}
                onChange={(g) => setAsOf(g || '')} />
            </Box>
            <Tooltip title="به‌روزرسانی">
              <Button variant="outlined" onClick={() => refetch()} disabled={isFetching}
                sx={{ borderRadius: '12px', minWidth: 44 }}>
                <RefreshIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}
              sx={{ borderRadius: '12px', fontFamily: FONT, fontWeight: 700 }}>
              چاپ
            </Button>
            <Button variant="contained" startIcon={<VerifiedIcon />} onClick={() => setOpen(true)}
              sx={{
                borderRadius: '12px', fontFamily: FONT, fontWeight: 700,
                background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
              }}>
              ثبت تأیید حسابرسی
            </Button>
          </>
        )}
      />

      <CodingClassificationBanner
        classification={data?.classification}
        integrity={data?.audit?.integrity || {}}
        fixing={fixing}
        onFix={fixCoding}
      />

      {/* نوار وضعیت ترازنامه: سال مالی، تاریخ، تراز/ناتراز و تأیید حسابرسی */}
      <Paper sx={{ ...glassCard(PALETTE.audit.main), p: 1.5, mb: 2.5 }}>
        <Blob color={PALETTE.audit.main} side="right" size={160} />
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap
          sx={{ position: 'relative', zIndex: 1 }}>
          <Chip size="small" label={`سال مالی: ${data?.fiscal_year?.name || 'همهٔ دوره‌ها'}`}
            sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(37,99,235,0.12)', color: '#1d4ed8' }} />
          <Chip size="small" label={`تا تاریخ: ${data?.as_of ? jalali(data.as_of) : 'امروز'}`}
            sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(100,116,139,0.12)' }} />
          <Chip size="small" icon={balanced ? <CheckCircleIcon /> : <WarningAmberIcon />}
            label={balanced ? 'معادلهٔ حسابداری تراز است' : `ناتراز — اختلاف: ${money(difference)}`}
            color={balanced ? 'success' : 'error'} sx={{ fontFamily: FONT, fontWeight: 800 }} />
          <Chip size="small" icon={<VerifiedIcon />}
            label={audited ? 'تأییدشدهٔ حسابرسی' : (data?.audit?.approval ? 'تأیید غیرنهایی' : 'بدون تأیید حسابرسی')}
            color={audited ? 'primary' : 'default'} sx={{ fontFamily: FONT, fontWeight: 800 }} />
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: FONT }}>
            آخرین به‌روزرسانی: {data?.generated_at ? toJalali(String(data.generated_at).slice(0, 10)) : '—'}
          </Typography>
        </Stack>
      </Paper>


      {msg ? (
        <Alert severity={msg.type} sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      ) : null}

      {isLoading ? (
        <Box textAlign="center" py={8}><CircularProgress /></Box>
      ) : isError ? (
        <Alert severity="error" sx={{ borderRadius: '12px' }}>
          خطا در بارگذاری ترازنامه. لطفاً دوباره تلاش کنید.
        </Alert>
      ) : (
        <Grid container spacing={2.5}>
          {/* ---------- دارایی‌ها — سمت راست (ستون اول در چیدمان RTL) ---------- */}
          <Grid item xs={12} lg={7}>
            <SectionCard
              title="دارایی‌ها"
              subtitle="Assets — منابع اقتصادی شرکت"
              icon={<AccountBalanceIcon sx={{ fontSize: 24, color: '#fff' }} />}
              tone="asset"
              total={data?.total_assets}
              groups={assetGroups}
              emptyText="حساب دارایی با مانده در این دوره ثبت نشده است."
            />
          </Grid>
          {/* ---------- بدهی‌ها و زیر آن حقوق صاحبان سهام — سمت چپ ---------- */}
          <Grid item xs={12} lg={5}>
            <Stack spacing={2.5}>
              <SectionCard
                title="بدهی‌ها"
                subtitle="Liabilities — تعهدات به اشخاص ثالث"
                icon={<AccountBalanceIcon sx={{ fontSize: 24, color: '#fff' }} />}
                tone="liability"
                total={data?.total_liabilities}
                groups={liabilityGroups}
                emptyText="حساب بدهی با مانده در این دوره ثبت نشده است."
              />
              <SectionCard
                title="حقوق صاحبان سهام"
                subtitle="Equity — سرمایه، اندوخته و سود انباشته"
                icon={<TrendingUpIcon sx={{ fontSize: 24, color: '#fff' }} />}
                tone="equity"
                total={data?.total_equity}
                groups={equityGroups}
                emptyText="حساب حقوق صاحبان سهام با مانده در این دوره ثبت نشده است."
              />
            </Stack>
          </Grid>
          {/* SUMMARY_CARD */}
          <Grid item xs={12}>
            <Paper sx={{ ...glassCard(PALETTE.summary.main), p: 2.5 }}>
              <Blob color="#10b981" side="left" size={260} />
              <Stack direction="row" justifyContent="space-between" alignItems="center"
                flexWrap="wrap" gap={1.5} sx={{ position: 'relative', zIndex: 1 }}>
                <Box>
                  <Typography variant="h6" fontWeight={900} sx={{ fontFamily: FONT, color: '#0f172a' }}>
                    جمع‌بندی و کنترل تراز
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: FONT }}>
                    تطبیق جمع دارایی‌ها با بدهی‌ها + حقوق صاحبان سهام و مهر تأیید حسابرسی
                  </Typography>
                </Box>
                <BalanceBadge balanced={balanced} difference={difference} />
              </Stack>

              <Grid container spacing={1.5} sx={{ mt: 0.5, position: 'relative', zIndex: 1 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <StatBlock label="جمع دارایی‌ها" value={money(data?.total_assets)}
                    color={PALETTE.asset.main} sub="سمت راست معادله" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatBlock label="جمع بدهی‌ها" value={money(data?.total_liabilities)}
                    color={PALETTE.liability.main}
                    sub={`نسبت به دارایی: ${pct(data?.ratios?.debt_to_asset)}`} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatBlock label="حقوق صاحبان سهام" value={money(data?.total_equity)}
                    color={PALETTE.equity.main}
                    sub={`سهم از دارایی: ${pct(data?.ratios?.equity_to_asset)}`} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatBlock label="بدهی + حقوق صاحبان سهام"
                    value={money(data?.total_liabilities_equity)} color="#334155"
                    sub={`اهرم مالی (بدهی/سهام): ${toPersianDigits(data?.ratios?.leverage || 0)}`} />
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2.5} sx={{ position: 'relative', zIndex: 1 }}>
                <Grid item xs={12} lg={7}>
                  <AuditSeal
                    audit={data?.audit}
                    audited={audited}
                    onRecord={() => {
                      setForm((prev) => ({ ...prev, as_of_date: data?.as_of || '' }));
                      setOpen(true);
                    }}
                  />
                </Grid>
                <Grid item xs={12} lg={5}>
                  <Paper sx={{ ...glassCard('#0ea5e9'), p: 2, height: '100%' }}>
                    <Blob color="#0ea5e9" side="right" size={180} />
                    <Typography variant="subtitle2" fontWeight={900}
                      sx={{ fontFamily: FONT, color: '#0369a1', position: 'relative', zIndex: 1 }}>
                      ترکیب ساختار مالی
                    </Typography>
                    <Stack spacing={1.75} sx={{ mt: 1.5, position: 'relative', zIndex: 1 }}>
                      {[
                        ['دارایی‌ها', data?.total_assets, PALETTE.asset],
                        ['بدهی‌ها', data?.total_liabilities, PALETTE.liability],
                        ['حقوق صاحبان سهام', data?.total_equity, PALETTE.equity],
                      ].map(([label, value, tone]) => (
                        <Box key={label}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography sx={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: tone.main }}>
                              {label}
                            </Typography>
                            <Typography sx={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 800, direction: 'ltr' }}>
                              {money(value)}
                            </Typography>
                          </Stack>
                          <LinearProgress variant="determinate" value={bar(value)}
                            sx={{
                              height: 8, borderRadius: 4, mt: 0.5, bgcolor: tone.soft,
                              '& .MuiLinearProgress-bar': {
                                background: `linear-gradient(90deg, ${tone.light}, ${tone.main})`,
                              },
                            }} />
                        </Box>
                      ))}
                    </Stack>
                    <Box sx={{
                      mt: 2, p: 1.25, borderRadius: '12px',
                      background: 'rgba(15,23,42,0.04)', border: '1px dashed rgba(15,23,42,0.15)',
                    }}>
                      <Typography sx={{ fontFamily: FONT, fontSize: 12, color: '#334155', lineHeight: 2 }}>
                        دارایی‌ها = بدهی‌ها + حقوق صاحبان سهام
                        <br />
                        {money(data?.total_assets)} {balanced ? '=' : '≠'} {money(data?.total_liabilities)} + {money(data?.total_equity)}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ------------------------- دیالوگ ثبت تأیید حسابرسی ------------------------- */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 900, color: PALETTE.audit.main }}>
          ثبت تأیید حسابرسی ترازنامه
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth required label="حسابرس / تأییدکننده *"
                value={form.auditor_name}
                onChange={(e) => setForm((p) => ({ ...p, auditor_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField size="small" fullWidth label="مؤسسهٔ حسابرسی" value={form.audit_firm}
                onChange={(e) => setForm((p) => ({ ...p, audit_firm: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth label="شمارهٔ گزارش/نامه" value={form.reference_no}
                onChange={(e) => setForm((p) => ({ ...p, reference_no: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="تاریخ تأیید" value={form.approved_at}
                onChange={(g) => setForm((p) => ({ ...p, approved_at: g || '' }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl size="small" fullWidth>
                <InputLabel>وضعیت تأیید</InputLabel>
                <Select value={form.status} label="وضعیت تأیید"
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <MenuItem value="approved">تأییدشده</MenuItem>
                  <MenuItem value="approved_with_comments">تأیید با ملاحظات</MenuItem>
                  <MenuItem value="pending">در انتظار تأیید</MenuItem>
                  <MenuItem value="rejected">رد شده</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <JalaliDatePicker fullWidth label="تاریخ صورت مالی" value={form.as_of_date}
                onChange={(g) => setForm((p) => ({ ...p, as_of_date: g || '' }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth label="تهیه‌کننده" value={form.prepared_by_name}
                onChange={(e) => setForm((p) => ({ ...p, prepared_by_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField size="small" fullWidth disabled label="سال مالی"
                value={data?.fiscal_year?.name || 'همهٔ دوره‌ها'} />
            </Grid>
            <Grid item xs={12}>
              <TextField size="small" fullWidth multiline minRows={3} label="متن نظر حسابرسی"
                value={form.opinion_note}
                onChange={(e) => setForm((p) => ({ ...p, opinion_note: e.target.value }))}
                helperText="این متن در کارت تأیید، زیر نام حسابرس نمایش داده می‌شود." />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} sx={{ fontFamily: FONT }}>انصراف</Button>
          <Button variant="contained" onClick={submitApproval} disabled={saveApproval.isPending}
            startIcon={<VerifiedIcon />}
            sx={{
              borderRadius: '12px', fontFamily: FONT, fontWeight: 800,
              background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
            }}>
            ثبت تأیید
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BalanceSheetPage;

