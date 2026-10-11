import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tooltip, Stack, IconButton, Collapse,
} from '@mui/material';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend, PieChart, Pie, Cell,
} from 'recharts';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import GavelIcon from '@mui/icons-material/Gavel';
import DescriptionIcon from '@mui/icons-material/Description';
import PaymentsIcon from '@mui/icons-material/Payments';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { glassPaper, STATUS_LABELS, STATUS_COLORS, SimpleEntityList } from './projects/ProjectsShared';

const FONT = 'Vazirmatn, IRANSans, sans-serif';
const CHART_COLORS = ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];
const CLR = {
  contract: '#8b5cf6', budget: '#6366f1', committed: '#f59e0b', cost: '#ef4444',
  revenue: '#10b981', pay: '#0ea5e9', ledger: '#0891b2', gold: '#eab308',
};

const money = (v) => formatPersianNumber(v || 0);
const fmtDate = (d) => (d ? toJalali(d) : '—');
const curCode = (currency) => ((currency?.code || 'IRR') === 'IRR' ? '' : currency.code);

// --- کمکی‌های نمودار: ارقام فارسی + برچسب ماه به سبک بقیهٔ برنامه (MM/YY) ---
const faNum = (v) => (typeof v === 'number' ? formatPersianNumber(v) : toPersianDigits(String(v ?? '')));
const monthLabel = (m) => {
  const s = String(m || '');
  return s.length >= 7 ? `${toPersianDigits(s.slice(5))}/${toPersianDigits(s.slice(0, 4).slice(2))}` : toPersianDigits(s);
};
const rtlTip = { direction: 'rtl', textAlign: 'right', fontFamily: FONT };
const legendStyle = { fontFamily: FONT, fontSize: 12, direction: 'rtl' };

const headSx = {
  fontWeight: 800, whiteSpace: 'nowrap', fontSize: 12.5,
  bgcolor: 'rgba(248,250,252,0.9)', textAlign: 'center !important',
};
const numSx = {
  direction: 'ltr', textAlign: 'center !important', whiteSpace: 'nowrap', fontFamily: FONT,
};

const GlassCard = ({ children, sx = {}, ...rest }) => (
  <Paper sx={{ ...glassPaper, p: 2, ...sx }} {...rest}>{children}</Paper>
);

const StatTile = ({ icon, label, value, sub, color, onClick, active }) => (
  <Paper onClick={onClick}
    sx={{
      ...glassPaper, p: 1.5, height: '100%', textAlign: 'center',
      cursor: onClick ? 'pointer' : 'default',
      border: active ? `1px solid ${color}` : undefined,
      boxShadow: active ? `0 10px 26px ${color}33` : undefined,
      transition: 'all .18s ease',
      '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: `0 12px 28px ${color}2e` } : undefined,
    }}>
    <Stack alignItems="center" spacing={0.4}>
      <Avatar sx={{ width: 34, height: 34, background: `linear-gradient(135deg,${color},${color}bb)` }}>{icon}</Avatar>
      <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT, textAlign: 'center' }}>{label}</Typography>
      <Typography variant="subtitle1" fontWeight={900}
        sx={{ color, lineHeight: 1.3, width: '100%', ...numSx }}>{value}</Typography>
      {sub ? (
        <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT, textAlign: 'center' }}>{sub}</Typography>
      ) : null}
    </Stack>
  </Paper>
);

const Empty = ({ text }) => (
  <Typography variant="body2" color="textSecondary" textAlign="center" py={3} sx={{ fontFamily: FONT }}>{text}</Typography>
);

/** جزئیات یک قرارداد: اقلام، الحاقیه‌ها، پرداخت‌ها و اسناد حسابداری */
const ContractDetail = ({ c }) => (
  <Box sx={{ p: 1.5, bgcolor: 'rgba(139,92,246,0.05)' }}>
    <Typography variant="caption" sx={{ fontFamily: FONT, color: '#5b21b6', fontWeight: 800 }}>
      « {c.subject} » — {c.party_name || '—'} {c.tender_number ? `· مناقصه: ${toPersianDigits(c.tender_number)}` : ''}
    </Typography>
    <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
      <Grid item xs={12} md={6}>
        <Typography variant="caption" fontWeight={800} sx={{ fontFamily: FONT }}>اقلام قراردادی (BOQ)</Typography>
        {c.items.length === 0 ? <Empty text="قلمی ثبت نشده" /> : (
          <Table size="small" sx={{ mt: 0.5 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={headSx}>کد</TableCell>
                <TableCell sx={headSx}>شرح</TableCell>
                <TableCell sx={headSx}>مقدار</TableCell>
                <TableCell sx={headSx}>نرخ واحد</TableCell>
                <TableCell sx={headSx}>مبلغ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {c.items.slice(0, 8).map(i => (
                <TableRow key={i.id}>
                  <TableCell sx={numSx}>{toPersianDigits(i.code)}</TableCell>
                  <TableCell sx={{ fontFamily: FONT, maxWidth: 200 }}>{i.description || '—'}</TableCell>
                  <TableCell sx={numSx}>{toPersianDigits(String(i.quantity))} {i.unit || ''}</TableCell>
                  <TableCell sx={numSx}>{money(i.unit_price)}</TableCell>
                  <TableCell sx={{ ...numSx, fontWeight: 700 }}>{money(i.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {c.items.length > 8 ? (
          <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
            … و {toPersianDigits(String(c.items.length - 8))} قلم دیگر (تب «اقلام قراردادی»)
          </Typography>
        ) : null}
      </Grid>
      <Grid item xs={12} md={6}>
        <Typography variant="caption" fontWeight={800} sx={{ fontFamily: FONT }}>الحاقیه‌ها</Typography>
        {c.addendums.length === 0 ? <Empty text="الحاقیه‌ای ثبت نشده" /> : (
          <Stack spacing={0.5} sx={{ mt: 0.5 }}>
            {c.addendums.map(a => (
              <Paper key={a.id} sx={{ p: 1, borderRadius: '10px', bgcolor: 'rgba(234,179,8,0.10)' }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" fontWeight={800} sx={{ fontFamily: FONT }}>
                    {a.number || '—'} · {fmtDate(a.date)}
                  </Typography>
                  <Typography variant="caption" fontWeight={800} sx={{ ...numSx, color: '#a16207' }}>
                    {money(a.amount_change)} {curCode(a.currency)}
                    {a.percent_change ? ` (${toPersianDigits(String(a.percent_change))}٪)` : ''}
                  </Typography>
                </Stack>
                {a.subject ? (
                  <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>{a.subject}</Typography>
                ) : null}
                {a.change_description ? (
                  <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT, display: 'block' }}>
                    {a.change_description}
                  </Typography>
                ) : null}
              </Paper>
            ))}
          </Stack>
        )}
      </Grid>

      <Grid item xs={12} md={6}>
        <Typography variant="caption" fontWeight={800} sx={{ fontFamily: FONT }}>پرداخت‌های ثبت‌شده روی قرارداد</Typography>
        {c.payments.length === 0 ? <Empty text="پرداختی ثبت نشده" /> : (
          <Table size="small" sx={{ mt: 0.5 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={headSx}>تاریخ</TableCell>
                <TableCell sx={headSx}>مبلغ</TableCell>
                <TableCell sx={headSx}>روش / مرجع</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {c.payments.map(p => (
                <TableRow key={p.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</TableCell>
                  <TableCell sx={{ ...numSx, color: CLR.pay, fontWeight: 700 }}>
                    {money(p.amount)} {curCode(p.currency)}
                  </TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>
                    {p.method || '—'} {p.reference ? `· ${p.reference}` : ''}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Grid>
      <Grid item xs={12}>
        <Typography variant="caption" fontWeight={800} sx={{ fontFamily: FONT }}>
          اسناد حسابداری مرتبط (پرداخت به پیمانکار از دفاتر)
        </Typography>
        {c.ledger.length === 0 ? <Empty text="سندی در دفاتر ثبت نشده" /> : (
          <Table size="small" sx={{ mt: 0.5 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={headSx}>شماره سند</TableCell>
                <TableCell sx={headSx}>تاریخ</TableCell>
                <TableCell sx={headSx}>شرح</TableCell>
                <TableCell sx={headSx}>حساب</TableCell>
                <TableCell sx={headSx}>بدهکار</TableCell>
                <TableCell sx={headSx}>بستانکار</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {c.ledger.map(l => (
                <TableRow key={l.id}>
                  <TableCell sx={numSx}>{toPersianDigits(l.document_number)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(l.date)}</TableCell>
                  <TableCell sx={{ fontFamily: FONT, maxWidth: 240 }}>{l.description || '—'}</TableCell>
                  <TableCell sx={{ fontFamily: FONT }}>
                    {l.account_code ? `${toPersianDigits(l.account_code)} — ${l.account_name}` : '—'}
                  </TableCell>
                  <TableCell sx={numSx}>{money(l.debit)}</TableCell>
                  <TableCell sx={numSx}>{money(l.credit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Grid>
    </Grid>
  </Box>
);

const ProjectProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [openContract, setOpenContract] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState(null);

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['project-profile', id],
    queryFn: () => axiosInstance.get(`/projects/${id}/profile/`).then(r => r.data),
    enabled: !!id,
  });

  const { data: employees } = useQuery({
    queryKey: ['emp-dropdown-proj'],
    queryFn: () => axiosInstance.get('/employees/', { params: { page_size: 500 } }).then(r => r.data.results || r.data),
  });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  const update = useMutation({
    mutationFn: (payload) => axiosInstance.patch(`/projects/${id}/`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project-profile', id] }); setEditOpen(false); },
  });

  const project = profile?.project || {};
  const summary = profile?.summary || {};
  const contracts = profile?.contracts || [];
  const items = profile?.contract_items || [];
  const addendums = profile?.addendums || [];
  const guarantees = profile?.guarantees || [];
  const costs = profile?.costs || {};
  const revenues = profile?.revenues || {};
  const payments = profile?.payments || {};
  const charts = profile?.charts || {};
  const currencies = summary.contracts_currency || [];
  const monthly = charts.monthly || [];
  const bySource = charts.cost_by_source || [];
  const byStatus = charts.contracts_by_status || [];
  const progressList = revenues.progress_statements || [];
  const contractPayments = payments.contract || [];
  const ledgerPayments = payments.ledger || [];

  const costPie = useMemo(() => bySource.map((r, i) => ({
    name: r.name, value: r.amount, color: CHART_COLORS[i % CHART_COLORS.length],
  })), [bySource]);

  const openEdit = () => {
    setForm({
      code: project.code || '', name: project.name || '', manager: project.manager_id || '',
      status: project.status || 'draft', client: project.client || '', location: project.location || '',
      start_date: project.start_date || '', end_date: project.end_date || '',
      description: project.description || '',
    });
    setEditOpen(true);
  };

  if (isLoading) return <Box textAlign="center" py={8}><CircularProgress /></Box>;
  if (isError || !profile) {
    return (
      <GlassCard sx={{ textAlign: 'center' }}>
        <Typography color="error" sx={{ fontFamily: FONT }}>خطا در بارگذاری پروندهٔ پروژه</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')} sx={{ mt: 1 }}>بازگشت</Button>
      </GlassCard>
    );
  }

  return (
    <Box>
      {/* ---------- هدر پرونده ---------- */}
      <Paper sx={{
        ...glassPaper, p: 2, mb: 2, overflow: 'hidden',
        background: 'linear-gradient(120deg, rgba(139,92,246,0.16), rgba(14,165,233,0.10), rgba(255,255,255,0.4))',
        border: '1px solid rgba(139,92,246,0.25)',
      }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <Avatar sx={{ width: 58, height: 58, background: 'linear-gradient(135deg,#8b5cf6,#0ea5e9)', boxShadow: '0 10px 26px rgba(139,92,246,0.35)' }}>
            <AccountTreeIcon sx={{ fontSize: 30 }} />
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="h6" fontWeight={900} sx={{ fontFamily: FONT, color: '#5b21b6' }}>{project.name}</Typography>
              <Chip size="small" label={`کد: ${toPersianDigits(project.code || '—')}`} sx={{ fontFamily: FONT, fontWeight: 700 }} />
              <Chip size="small" label={project.status_display || STATUS_LABELS[project.status] || project.status}
                sx={{ fontFamily: FONT, fontWeight: 800, bgcolor: `${STATUS_COLORS[project.status] || '#64748b'}22`, color: STATUS_COLORS[project.status] || '#64748b' }} />
              {project.project_type ? <Chip size="small" variant="outlined" label={project.project_type} sx={{ fontFamily: FONT }} /> : null}
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
              <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>کارفرما: <b>{project.client || '—'}</b></Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>محل: <b>{project.location || '—'}</b></Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>مدیر: <b>{project.manager_name || '—'}</b></Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
                بازه: <b>{fmtDate(project.start_date)}</b> تا <b>{fmtDate(project.end_date)}</b>
              </Typography>
            </Stack>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="ویرایش اطلاعات پروژه">
              <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={openEdit}
                sx={{ borderRadius: '12px', fontFamily: FONT }}>ویرایش</Button>
            </Tooltip>
            <Tooltip title="چاپ پرونده">
              <Button size="small" variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()}
                sx={{ borderRadius: '12px', fontFamily: FONT, background: 'linear-gradient(135deg,#8b5cf6,#0ea5e9)' }}>چاپ</Button>
            </Tooltip>
            <Tooltip title="بازگشت به فهرست پروژه‌ها">
              <IconButton onClick={() => navigate('/projects')}><ArrowBackIcon /></IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        <Box sx={{ mt: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" sx={{ fontFamily: FONT, color: 'text.secondary' }}>
              پیشرفت مالی (درآمد ثبت‌شده ÷ مبلغ قراردادهای ریالی)
            </Typography>
            <Typography variant="caption" fontWeight={800} sx={{ fontFamily: FONT, color: '#0e7490' }}>
              {toPersianDigits(String(summary.progress_percent || 0))}٪
            </Typography>
          </Stack>
          <LinearProgress variant="determinate" value={Math.min(100, summary.progress_percent || 0)}
            sx={{ height: 9, borderRadius: 5, mt: 0.5, bgcolor: 'rgba(139,92,246,0.15)',
              '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#8b5cf6,#0ea5e9)' } }} />
        </Box>
      </Paper>
      {/* ---------- کارت‌های کلیدی ---------- */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile icon={<HandshakeIcon fontSize="small" />} label="قراردادهای مرتبط" color={CLR.contract}
            value={toPersianDigits(String(summary.contracts_count || 0))}
            sub={`${toPersianDigits(String(summary.items_count || 0))} قلم قراردادی`} onClick={() => setTab(0)} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile icon={<DescriptionIcon fontSize="small" />} label="جمع قراردادها (ریال)" color="#7c3aed"
            value={money(summary.contracts_rial)}
            sub={currencies.length
              ? currencies.map(c => `${toPersianDigits(String(Math.round(c.contracts_amount)))} ${c.code}`).join(' · ')
              : 'همهٔ قراردادها ریالی'}
            onClick={() => setTab(0)} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile icon={<ReceiptLongIcon fontSize="small" />} label="جمع الحاقیه‌ها (ریال)" color={CLR.gold}
            value={money(summary.addendum_rial)} sub={`مبلغ نهایی: ${money(summary.contracts_final_rial)}`} onClick={() => setTab(2)} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile icon={<AccountBalanceWalletIcon fontSize="small" />} label="بودجهٔ مصوب" color={CLR.budget}
            value={money(summary.budget)} sub={`تعهد: ${money(summary.committed)}`} onClick={() => setTab(3)} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile icon={<TrendingDownIcon fontSize="small" />} label="هزینهٔ واقعی" color={CLR.cost}
            value={money(summary.actual_cost)} sub={`ماندهٔ بودجه: ${money(summary.remaining_budget)}`} onClick={() => setTab(3)} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile icon={<TrendingUpIcon fontSize="small" />} label="درآمد (صورت‌وضعیت)" color={CLR.revenue}
            value={money(summary.revenue_accrued)} sub={`ناخالص: ${money(summary.revenue_gross)}`} onClick={() => setTab(4)} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile icon={<PaymentsIcon fontSize="small" />} label="پرداخت به پیمانکاران" color={CLR.pay}
            value={money(summary.paid_total)}
            sub={`${toPersianDigits(String(summary.payments_count || 0))} پرداخت${summary.paid_currency_total ? ` · ارزی ${money(summary.paid_currency_total)}` : ''}`}
            onClick={() => setTab(5)} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatTile icon={<GavelIcon fontSize="small" />} label="ضمانت‌نامه‌ها" color={CLR.ledger}
            value={toPersianDigits(String(summary.guarantees_count || 0))}
            sub={`جمع: ${money(summary.guarantee_total)}`} onClick={() => setTab(6)} />
        </Grid>
      </Grid>
      {/* ---------- نمودارها ---------- */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid item xs={12} lg={6}>
          <GlassCard>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, mb: 1, color: '#5b21b6' }}>
              روند ماهانه: هزینه · درآمد · پرداخت (ریال)
            </Typography>
            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly} margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                  <XAxis dataKey="month" reversed tick={{ fontSize: 11 }} tickFormatter={monthLabel} />
                  <YAxis orientation="right" tick={{ fontSize: 11 }} width={80} tickFormatter={faNum} />
                  <ReTooltip formatter={(v) => money(v)} labelFormatter={monthLabel}
                    contentStyle={rtlTip} itemStyle={{ fontFamily: FONT }} />
                  <Legend align="right" wrapperStyle={legendStyle} />
                  <Line type="monotone" dataKey="cost" name="هزینه" stroke={CLR.cost} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="revenue" name="درآمد" stroke={CLR.revenue} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="payment" name="پرداخت" stroke={CLR.pay} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </GlassCard>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <GlassCard>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, mb: 1, color: '#b45309' }}>
              هزینه به تفکیک منشأ
            </Typography>
            {costPie.length === 0 ? <Empty text="هزینهای ثبت نشده است" /> : (
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={costPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}
                      paddingAngle={2} startAngle={90} endAngle={450}>
                      {costPie.map((c) => <Cell key={c.name} fill={c.color} />)}
                    </Pie>
                    <ReTooltip formatter={(v) => money(v)} contentStyle={rtlTip} itemStyle={{ fontFamily: FONT }} />
                    <Legend align="right" wrapperStyle={{ ...legendStyle, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </GlassCard>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <GlassCard>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, mb: 1, color: '#0e7490' }}>
              مبلغ قراردادها به تفکیک وضعیت
            </Typography>
            {byStatus.length === 0 ? <Empty text="قراردادی متصل نشده است" /> : (
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byStatus.map(r => ({ name: STATUS_LABELS[r.status] || r.status, amount: r.amount }))}
                    margin={{ top: 5, right: 8, left: 8, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                    <XAxis dataKey="name" reversed tick={{ fontSize: 11 }} />
                    <YAxis orientation="right" tick={{ fontSize: 11 }} width={70} tickFormatter={faNum} />
                    <ReTooltip formatter={(v) => money(v)} contentStyle={rtlTip} itemStyle={{ fontFamily: FONT }} />
                    <Bar dataKey="amount" name="مبلغ" radius={[6, 6, 0, 0]}>
                      {byStatus.map((r, i) => <Cell key={r.status} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </GlassCard>
        </Grid>
      </Grid>

      {/* ---------- تب‌ها ---------- */}
      <Paper sx={{ ...glassPaper, p: 1, mb: 1.5 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ '& .MuiTab-root': { fontFamily: FONT, fontWeight: 700, minHeight: 44, fontSize: 13 } }}>
          <Tab label={`قراردادها (${toPersianDigits(String(contracts.length))})`} />
          <Tab label={`اقلام قراردادی (${toPersianDigits(String(items.length))})`} />
          <Tab label={`الحاقیه‌ها (${toPersianDigits(String(addendums.length))})`} />
          <Tab label={`هزینه‌ها (${toPersianDigits(String((costs.transactions || []).length))})`} />
          <Tab label={`درآمدها (${toPersianDigits(String(progressList.length))})`} />
          <Tab label={`پرداخت‌ها (${toPersianDigits(String(contractPayments.length + ledgerPayments.length))})`} />
          <Tab label={`ضمانت‌ها (${toPersianDigits(String(guarantees.length))})`} />
          <Tab label="ساختار پروژه" />
        </Tabs>
      </Paper>
      {/* ================= تب ۰: قراردادها ================= */}
      {tab === 0 && (contracts.length === 0 ? (
        <GlassCard><Empty text="هیچ قراردادی به این پروژه متصل نشده است" /></GlassCard>
      ) : (
        <GlassCard>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, color: '#5b21b6' }}>
              قراردادهای مرتبط با پروژه
            </Typography>
            <Chip size="small" label={`جمع ریالی: ${money(summary.contracts_rial)}`}
              sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(139,92,246,0.12)', color: '#6d28d9' }} />
            {currencies.map(c => (
              <Chip key={c.code} size="small"
                label={`${c.name || c.code}: ${toPersianDigits(String(Math.round(c.contracts_amount)))} ${c.code}`}
                sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(14,165,233,0.12)', color: '#0369a1' }} />
            ))}
            <Chip size="small" label={`الحاقیه (ریال): ${money(summary.addendum_rial)}`}
              sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(234,179,8,0.16)', color: '#a16207' }} />
          </Stack>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={headSx}>شماره</TableCell>
                  <TableCell sx={headSx}>موضوع / طرف قرارداد</TableCell>
                  <TableCell sx={headSx}>وضعیت</TableCell>
                  <TableCell sx={headSx}>مبلغ قرارداد</TableCell>
                  <TableCell sx={headSx}>الحاقیه</TableCell>
                  <TableCell sx={headSx}>مبلغ نهایی</TableCell>
                  <TableCell sx={headSx}>اقلام</TableCell>
                  <TableCell sx={headSx}>صورت‌وضعیت</TableCell>
                  <TableCell sx={headSx}>پرداخت‌شده</TableCell>
                  <TableCell sx={headSx}>دفاتر</TableCell>
                  <TableCell sx={headSx}> </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contracts.map((c) => {
                  const t = c.totals || {};
                  const expanded = openContract === c.id;
                  return (
                    <React.Fragment key={c.id}>
                      <TableRow hover>
                        <TableCell sx={{ fontWeight: 800, ...numSx }}>{toPersianDigits(c.number || '—')}</TableCell>
                        <TableCell sx={{ maxWidth: 260 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ fontFamily: FONT }}>{c.subject}</Typography>
                          <Typography variant="caption" color="textSecondary" sx={{ fontFamily: FONT }}>
                            {c.party_name || '—'} · {c.contract_type_display}
                            {c.allocation_percent !== 100 ? ` · سهم پروژه: ${toPersianDigits(String(c.allocation_percent))}٪` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={c.status_display}
                            sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(139,92,246,0.12)', color: '#6d28d9' }} />
                        </TableCell>
                        <TableCell sx={numSx}>
                          {money(c.amount)} {curCode(c.currency) ? <b>{curCode(c.currency)}</b> : ''}
                        </TableCell>
                        <TableCell sx={numSx}>{t.addendum_rial ? money(t.addendum_rial) : '—'}</TableCell>
                        <TableCell sx={{ ...numSx, fontWeight: 800 }}>{money(t.final_amount)}</TableCell>
                        <TableCell sx={numSx}>
                          {toPersianDigits(String(t.items_count || 0))}
                          <Typography component="span" variant="caption" color="textSecondary"> ({money(t.items_amount)})</Typography>
                        </TableCell>
                        <TableCell sx={numSx}>
                          {toPersianDigits(String(t.statements_count || 0))}
                          <Typography component="span" variant="caption" color="textSecondary"> ({money(t.statements_net)})</Typography>
                        </TableCell>
                        <TableCell sx={{ ...numSx, color: CLR.pay, fontWeight: 700 }}>{money(t.paid_total)}</TableCell>
                        <TableCell sx={{ ...numSx, color: CLR.ledger }}>{money(t.ledger_credit)}</TableCell>
                        <TableCell>
                          <Tooltip title={expanded ? 'بستن جزئیات' : 'جزئیات: اقلام، الحاقیه، پرداخت‌ها و اسناد'}>
                            <IconButton size="small" onClick={() => setOpenContract(expanded ? null : c.id)}>
                              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={11} sx={{ p: 0 }}>
                          <Collapse in={expanded} timeout="auto" unmountOnExit>
                            <ContractDetail c={c} />
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </GlassCard>
      ))}
      {/* ================= تب ۱: اقلام قراردادی ================= */}
      {tab === 1 && (
        <GlassCard>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, color: '#5b21b6' }}>
              اقلام قراردادی (BOQ) — {toPersianDigits(String(items.length))} قلم
            </Typography>
            <Chip size="small" label={`جمع: ${money(summary.items_amount)}`}
              sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(139,92,246,0.12)', color: '#6d28d9' }} />
          </Stack>
          {items.length === 0 ? <Empty text="قلم قراردادی ثبت نشده است" /> : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>کد</TableCell>
                    <TableCell sx={headSx}>شرح</TableCell>
                    <TableCell sx={headSx}>واحد</TableCell>
                    <TableCell sx={headSx}>مقدار</TableCell>
                    <TableCell sx={headSx}>نرخ واحد</TableCell>
                    <TableCell sx={headSx}>مبلغ</TableCell>
                    <TableCell sx={headSx}>قرارداد</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map(i => (
                    <TableRow key={`${i.contract_id}-${i.id}`} hover>
                      <TableCell sx={numSx}>{toPersianDigits(i.code)}</TableCell>
                      <TableCell sx={{ fontFamily: FONT, maxWidth: 320 }}>{i.description || '—'}</TableCell>
                      <TableCell sx={{ fontFamily: FONT }}>{i.unit || '—'}</TableCell>
                      <TableCell sx={numSx}>{toPersianDigits(String(i.quantity))}</TableCell>
                      <TableCell sx={numSx}>{money(i.unit_price)}</TableCell>
                      <TableCell sx={{ ...numSx, fontWeight: 700 }}>{money(i.amount)}</TableCell>
                      <TableCell sx={{ fontFamily: FONT }}>
                        {toPersianDigits(i.contract_number || '—')}
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontFamily: FONT }}>
                          {i.contract_subject}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </GlassCard>
      )}
      {/* ================= تب ۲: الحاقیه‌ها ================= */}
      {tab === 2 && (
        <GlassCard>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, color: '#a16207' }}>
              الحاقیه‌های قراردادها — {toPersianDigits(String(addendums.length))} مورد
            </Typography>
            <Chip size="small" label={`جمع تغییرات ریالی: ${money(summary.addendum_rial)}`}
              sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(234,179,8,0.16)', color: '#a16207' }} />
          </Stack>
          {addendums.length === 0 ? <Empty text="الحاقیه‌ای ثبت نشده است" /> : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>شماره</TableCell>
                    <TableCell sx={headSx}>قرارداد</TableCell>
                    <TableCell sx={headSx}>تاریخ</TableCell>
                    <TableCell sx={headSx}>موضوع / شرح تغییرات</TableCell>
                    <TableCell sx={headSx}>تغییر مبلغ</TableCell>
                    <TableCell sx={headSx}>درصد</TableCell>
                    <TableCell sx={headSx}>پایان جدید</TableCell>
                    <TableCell sx={headSx}>مفاد</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {addendums.map(a => (
                    <TableRow key={`${a.contract_id}-${a.id}`} hover>
                      <TableCell sx={numSx}>{toPersianDigits(a.number || '—')}</TableCell>
                      <TableCell sx={{ fontFamily: FONT }}>
                        {toPersianDigits(a.contract_number || '—')}
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontFamily: FONT }}>
                          {a.contract_subject}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(a.date)}</TableCell>
                      <TableCell sx={{ fontFamily: FONT, maxWidth: 220 }}>
                        {a.subject || a.change_description || '—'}
                      </TableCell>
                      <TableCell sx={{ ...numSx, fontWeight: 700, color: '#a16207' }}>
                        {money(a.amount_change)} {curCode(a.currency)}
                      </TableCell>
                      <TableCell sx={numSx}>
                        {a.percent_change ? `${toPersianDigits(String(a.percent_change))}٪` : '—'}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(a.new_end_date)}</TableCell>
                      <TableCell sx={{ maxWidth: 240 }}>
                        {(a.provisions || []).length === 0 ? '—' : a.provisions.slice(0, 2).map((p, idx) => (
                          <Typography key={idx} variant="caption" display="block" sx={{ fontFamily: FONT }}>
                            • {p.title || p.text}
                          </Typography>
                        ))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </GlassCard>
      )}
      {/* ================= تب ۶: ضمانت‌ها ================= */}
      {tab === 6 && (
        <GlassCard>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, color: '#0e7490' }}>
              ضمانت‌نامه‌های قراردادها — {toPersianDigits(String(guarantees.length))} مورد
            </Typography>
            <Chip size="small" label={`جمع: ${money(summary.guarantee_total)}`}
              sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(8,145,178,0.12)', color: '#0e7490' }} />
          </Stack>
          {guarantees.length === 0 ? <Empty text="ضمانت‌نامه‌ای ثبت نشده است" /> : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>شماره</TableCell>
                    <TableCell sx={headSx}>قرارداد</TableCell>
                    <TableCell sx={headSx}>نوع</TableCell>
                    <TableCell sx={headSx}>مبلغ</TableCell>
                    <TableCell sx={headSx}>بانک</TableCell>
                    <TableCell sx={headSx}>تاریخ صدور</TableCell>
                    <TableCell sx={headSx}>انقضا</TableCell>
                    <TableCell sx={headSx}>وضعیت</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {guarantees.map(g => (
                    <TableRow key={`${g.contract_id}-${g.id}`} hover>
                      <TableCell sx={numSx}>{toPersianDigits(g.number || '—')}</TableCell>
                      <TableCell sx={numSx}>{toPersianDigits(g.contract_number || '—')}</TableCell>
                      <TableCell sx={{ fontFamily: FONT }}>{g.guarantee_type || '—'}</TableCell>
                      <TableCell sx={{ ...numSx, fontWeight: 700 }}>{money(g.amount)}</TableCell>
                      <TableCell sx={{ fontFamily: FONT }}>{g.bank || '—'}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(g.issue_date)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(g.expiry_date)}</TableCell>
                      <TableCell>
                        <Chip size="small" label={g.is_released ? 'آزاد شده' : (g.last_action || 'جاری')}
                          sx={{ fontFamily: FONT, fontWeight: 700,
                            bgcolor: g.is_released ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.16)',
                            color: g.is_released ? '#047857' : '#b45309' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </GlassCard>
      )}
      {/* ================= تب ۳: هزینه‌ها ================= */}
      {tab === 3 && (
        <React.Fragment>
          <GlassCard sx={{ mb: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, color: '#b91c1c' }}>
                کنترل هزینهٔ پروژه
              </Typography>
              <Chip size="small" label={`بودجه: ${money(summary.budget)}`}
                sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(99,102,241,0.12)', color: '#4338ca' }} />
              <Chip size="small" label={`تعهد: ${money(summary.committed)}`}
                sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(245,158,11,0.16)', color: '#b45309' }} />
              <Chip size="small" label={`هزینهٔ واقعی: ${money(summary.actual_cost)}`}
                sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(239,68,68,0.14)', color: '#b91c1c' }} />
              <Chip size="small" label={`ماندهٔ بودجه: ${money(summary.remaining_budget)}`}
                sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(16,185,129,0.14)', color: '#047857' }} />
              <Chip size="small" label={`انحراف: ${money(summary.variance)}`}
                sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(139,92,246,0.12)', color: '#6d28d9' }} />
              <Chip size="small" label={`پیش‌بینی (تعهد + واقعی): ${money(summary.forecast)}`}
                sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(14,165,233,0.12)', color: '#0369a1' }} />
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" fontWeight={800} sx={{ fontFamily: FONT }}>هزینه به تفکیک منشأ هزینه</Typography>
                {bySource.length === 0 ? <Empty text="هزینه‌ای ثبت نشده" /> : bySource.map((s, i) => {
                  const pct = summary.actual_cost ? Math.round((s.amount / summary.actual_cost) * 100) : 0;
                  return (
                    <Box key={`${s.name}-${i}`} sx={{ mb: 0.75 }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" sx={{ fontFamily: FONT }}>
                          {s.name}{s.count ? ` (${toPersianDigits(String(s.count))} ردیف)` : ''}
                        </Typography>
                        <Typography variant="caption" fontWeight={700} sx={numSx}>
                          {money(s.amount)} · {toPersianDigits(String(pct))}٪
                        </Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={Math.min(100, pct)}
                        sx={{ height: 7, borderRadius: 4, bgcolor: 'rgba(148,163,184,0.2)',
                          '& .MuiLinearProgress-bar': { bgcolor: CHART_COLORS[i % CHART_COLORS.length] } }} />
                    </Box>
                  );
                })}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" fontWeight={800} sx={{ fontFamily: FONT }}>هزینه به تفکیک WBS</Typography>
                {(costs.by_wbs || []).length === 0 ? <Empty text="گره WBS ثبت نشده" /> : costs.by_wbs.map((w, i) => {
                  const pct = summary.actual_cost ? Math.round((w.amount / summary.actual_cost) * 100) : 0;
                  return (
                    <Box key={`${w.code}-${i}`} sx={{ mb: 0.75 }}>
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="caption" sx={{ fontFamily: FONT }}>
                          {w.code ? `${toPersianDigits(w.code)} — ` : ''}{w.name}
                        </Typography>
                        <Typography variant="caption" fontWeight={700} sx={numSx}>
                          {money(w.amount)} · {toPersianDigits(String(pct))}٪
                        </Typography>
                      </Stack>
                      <LinearProgress variant="determinate" value={Math.min(100, pct)}
                        sx={{ height: 7, borderRadius: 4, bgcolor: 'rgba(148,163,184,0.2)',
                          '& .MuiLinearProgress-bar': { bgcolor: CLR.budget } }} />
                    </Box>
                  );
                })}
              </Grid>
            </Grid>
          </GlassCard>
          <GlassCard sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, color: '#4338ca', mb: 1 }}>
              بودجهٔ مصوب — {(costs.budget_rows || []).length} ردیف
            </Typography>
            {(costs.budget_rows || []).length === 0 ? <Empty text="ردیف بودجه‌ای ثبت نشده است" /> : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headSx}>شرح</TableCell>
                      <TableCell sx={headSx}>واحد</TableCell>
                      <TableCell sx={headSx}>مقدار</TableCell>
                      <TableCell sx={headSx}>نرخ واحد</TableCell>
                      <TableCell sx={headSx}>مبلغ بودجه</TableCell>
                      <TableCell sx={headSx}>WBS</TableCell>
                      <TableCell sx={headSx}>منشأ هزینه</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(costs.budget_rows || []).map(b => (
                      <TableRow key={b.id} hover>
                        <TableCell sx={{ fontFamily: FONT, maxWidth: 300 }}>{b.description || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{b.unit || '—'}</TableCell>
                        <TableCell sx={numSx}>{toPersianDigits(String(b.quantity))}</TableCell>
                        <TableCell sx={numSx}>{money(b.unit_cost)}</TableCell>
                        <TableCell sx={{ ...numSx, fontWeight: 700 }}>{money(b.amount)}</TableCell>
                        <TableCell sx={numSx}>{b.wbs ? toPersianDigits(b.wbs) : '—'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{b.cost_source || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </GlassCard>

          <GlassCard sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, color: '#b45309', mb: 1 }}>
              تعهدات هزینه (قرارداد / سفارش خرید) — {(costs.committed_rows || []).length} مورد
            </Typography>
            {(costs.committed_rows || []).length === 0 ? <Empty text="تعهدی ثبت نشده است" /> : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headSx}>تاریخ</TableCell>
                      <TableCell sx={headSx}>شرح</TableCell>
                      <TableCell sx={headSx}>قرارداد</TableCell>
                      <TableCell sx={headSx}>مرجع</TableCell>
                      <TableCell sx={headSx}>مبلغ تعهد</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(costs.committed_rows || []).map(c => (
                      <TableRow key={c.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(c.date)}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, maxWidth: 320 }}>{c.description || '—'}</TableCell>
                        <TableCell sx={numSx}>{toPersianDigits(c.contract_number || '—')}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{c.reference || '—'}</TableCell>
                        <TableCell sx={{ ...numSx, fontWeight: 700, color: '#b45309' }}>{money(c.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </GlassCard>

          <GlassCard>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, color: '#b91c1c', mb: 1 }}>
              تراکنش‌های هزینهٔ واقعی — {(costs.transactions || []).length} سند
            </Typography>
            {(costs.transactions || []).length === 0 ? <Empty text="تراکنش هزینه‌ای ثبت نشده است" /> : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headSx}>تاریخ</TableCell>
                      <TableCell sx={headSx}>شماره</TableCell>
                      <TableCell sx={headSx}>منشأ هزینه</TableCell>
                      <TableCell sx={headSx}>قرارداد</TableCell>
                      <TableCell sx={headSx}>شرح</TableCell>
                      <TableCell sx={headSx}>مرجع حسابداری</TableCell>
                      <TableCell sx={headSx}>مبلغ</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(costs.transactions || []).map(t => (
                      <TableRow key={t.id} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(t.date)}</TableCell>
                        <TableCell sx={numSx}>{toPersianDigits(t.number || '—')}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{t.cost_source || '—'}</TableCell>
                        <TableCell sx={numSx}>{toPersianDigits(t.contract_number || '—')}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, maxWidth: 300 }}>{t.description || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{t.accounting_reference || t.purchase_reference || '—'}</TableCell>
                        <TableCell sx={{ ...numSx, fontWeight: 700, color: '#b91c1c' }}>{money(t.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </GlassCard>
        </React.Fragment>
      )}
      {/* ================= تب ۴: درآمدها ================= */}
      {tab === 4 && (
        <GlassCard>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, color: '#047857' }}>
              صورت‌وضعیت‌های پروژه — {toPersianDigits(String(progressList.length))} مورد
            </Typography>
            <Chip size="small" label={`ناخالص: ${money(summary.revenue_gross)}`}
              sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(16,185,129,0.12)', color: '#047857' }} />
            <Chip size="small" label={`قابل پرداخت (خالص): ${money(summary.revenue_accrued)}`}
              sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(14,165,233,0.12)', color: '#0369a1' }} />
          </Stack>
          {progressList.length === 0 ? <Empty text="صورت‌وضعیتی برای این پروژه ثبت نشده است" /> : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={headSx}>شماره</TableCell>
                    <TableCell sx={headSx}>قرارداد</TableCell>
                    <TableCell sx={headSx}>تاریخ</TableCell>
                    <TableCell sx={headSx}>ناخالص</TableCell>
                    <TableCell sx={headSx}>حسن انجام کار</TableCell>
                    <TableCell sx={headSx}>بیمه</TableCell>
                    <TableCell sx={headSx}>مالیات</TableCell>
                    <TableCell sx={headSx}>تعدیلات</TableCell>
                    <TableCell sx={headSx}>قابل پرداخت</TableCell>
                    <TableCell sx={headSx}>ردیف‌ها</TableCell>
                    <TableCell sx={headSx}>تأیید</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {progressList.map(p => (
                    <TableRow key={p.id} hover>
                      <TableCell sx={numSx}>{toPersianDigits(p.number || '—')}</TableCell>
                      <TableCell sx={numSx}>{toPersianDigits(p.contract_number || '—')}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</TableCell>
                      <TableCell sx={numSx}>{money(p.gross)}</TableCell>
                      <TableCell sx={numSx}>{money(p.retention)}</TableCell>
                      <TableCell sx={numSx}>{money(p.insurance)}</TableCell>
                      <TableCell sx={numSx}>{money(p.tax)}</TableCell>
                      <TableCell sx={numSx}>{money(p.adjustment)}</TableCell>
                      <TableCell sx={{ ...numSx, fontWeight: 800, color: '#047857' }}>{money(p.net_payable)}</TableCell>
                      <TableCell sx={numSx}>{toPersianDigits(String(p.items_count || 0))}</TableCell>
                      <TableCell>
                        <Chip size="small" label={p.is_approved ? 'تأیید شده' : 'در انتظار'}
                          sx={{ fontFamily: FONT, fontWeight: 700,
                            bgcolor: p.is_approved ? 'rgba(16,185,129,0.14)' : 'rgba(148,163,184,0.2)',
                            color: p.is_approved ? '#047857' : '#475569' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </GlassCard>
      )}
      {/* ================= تب ۵: پرداخت‌ها ================= */}
      {tab === 5 && (
        <React.Fragment>
          <GlassCard sx={{ mb: 1.5 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, color: '#0369a1' }}>
                پرداخت‌های ثبت‌شده روی قراردادها — {toPersianDigits(String(contractPayments.length))} مورد
              </Typography>
              <Chip size="small" label={`جمع ریالی: ${money(summary.paid_rial)}`}
                sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(14,165,233,0.12)', color: '#0369a1' }} />
              {currencies.map(c => (
                <Chip key={`pay-${c.code}`} size="small"
                  label={`${c.code}: ${toPersianDigits(String(Math.round(c.paid_amount)))}`}
                  sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(139,92,246,0.12)', color: '#6d28d9' }} />
              ))}
            </Stack>
            {contractPayments.length === 0 ? <Empty text="پرداختی روی قراردادها ثبت نشده است" /> : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headSx}>تاریخ</TableCell>
                      <TableCell sx={headSx}>قرارداد</TableCell>
                      <TableCell sx={headSx}>پیمانکار / طرف قرارداد</TableCell>
                      <TableCell sx={headSx}>مبلغ</TableCell>
                      <TableCell sx={headSx}>ارز</TableCell>
                      <TableCell sx={headSx}>روش پرداخت</TableCell>
                      <TableCell sx={headSx}>مرجع / سند</TableCell>
                      <TableCell sx={headSx}>مرتبط با</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {contractPayments.map(p => (
                      <TableRow key={`cp-${p.contract_id}-${p.id}`} hover>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>
                          {toPersianDigits(p.contract_number || '—')}
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontFamily: FONT }}>
                            {p.contract_subject}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{p.party_name || '—'}</TableCell>
                        <TableCell sx={{ ...numSx, fontWeight: 800, color: CLR.pay }}>{money(p.amount)}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{p.currency?.code || 'IRR'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{p.method || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{p.reference || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>
                          {p.statement_id ? `صورت‌وضعیت #${toPersianDigits(String(p.statement_id))}` : (p.invoice_id ? `فاکتور #${toPersianDigits(String(p.invoice_id))}` : '—')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </GlassCard>
          <GlassCard>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ fontFamily: FONT, color: '#0e7490' }}>
                پرداخت‌ها و اسناد حسابداری مرتبط با پروژه (دفاتر) — {toPersianDigits(String(ledgerPayments.length))} ردیف
              </Typography>
              <Chip size="small" label={`جمع بدهکار: ${money(summary.ledger_debit)}`}
                sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(8,145,178,0.12)', color: '#0e7490' }} />
              <Chip size="small" label={`جمع بستانکار: ${money(summary.ledger_credit)}`}
                sx={{ fontFamily: FONT, fontWeight: 700, bgcolor: 'rgba(139,92,246,0.12)', color: '#6d28d9' }} />
            </Stack>
            {ledgerPayments.length === 0 ? (
              <Empty text="سند حسابداری مرتبط با این پروژه یا قراردادهای آن ثبت نشده است" />
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={headSx}>شماره سند</TableCell>
                      <TableCell sx={headSx}>تاریخ</TableCell>
                      <TableCell sx={headSx}>شرح</TableCell>
                      <TableCell sx={headSx}>حساب</TableCell>
                      <TableCell sx={headSx}>طرف / تفصیلی</TableCell>
                      <TableCell sx={headSx}>بدهکار</TableCell>
                      <TableCell sx={headSx}>بستانکار</TableCell>
                      <TableCell sx={headSx}>ارز / نرخ</TableCell>
                      <TableCell sx={headSx}>ارجاع</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ledgerPayments.map(l => (
                      <TableRow key={`lg-${l.id}`} hover>
                        <TableCell sx={numSx}>{toPersianDigits(l.document_number)}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmtDate(l.date)}</TableCell>
                        <TableCell sx={{ fontFamily: FONT, maxWidth: 280 }}>{l.description || '—'}</TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>
                          {l.account_code ? `${toPersianDigits(l.account_code)} — ${l.account_name}` : '—'}
                        </TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{l.party_name || '—'}</TableCell>
                        <TableCell sx={{ ...numSx, fontWeight: 700, color: '#0e7490' }}>{money(l.debit)}</TableCell>
                        <TableCell sx={{ ...numSx, fontWeight: 700, color: '#6d28d9' }}>{money(l.credit)}</TableCell>
                        <TableCell sx={numSx}>
                          {l.currency?.code || 'IRR'}
                          {l.exchange_rate && l.exchange_rate !== 1 ? ` · ${toPersianDigits(String(l.exchange_rate))}` : ''}
                        </TableCell>
                        <TableCell sx={{ fontFamily: FONT }}>{l.invoice_number || l.reference || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </GlassCard>
        </React.Fragment>
      )}
      {/* ================= تب ۷: ساختار پروژه (فازها و WBS) ================= */}
      {tab === 7 && (
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            <SimpleEntityList queryKey={['project-phases', id]} endpoint="/project-phases/" title="فازهای پروژه"
              color="#8b5cf6" icon={<AccountTreeIcon fontSize="small" />}
              params={{ project: Number(id) }}
              fields={[{ key: 'name', label: 'عنوان فاز' }, { key: 'sequence', label: 'ترتیب' }]} />
          </Grid>
          <Grid item xs={12} md={6}>
            <SimpleEntityList queryKey={['project-wbs', id]} endpoint="/wbs-nodes/" title="ساختار شکست کار (WBS)"
              color="#3b82f6" icon={<AccountTreeIcon fontSize="small" />}
              params={{ project: Number(id) }}
              fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام' }]} />
          </Grid>
          <Grid item xs={12}>
            <GlassCard>
              <Typography variant="caption" sx={{ fontFamily: FONT, color: 'text.secondary' }}>
                نکته: قراردادها، اقلام، الحاقیه‌ها، هزینه‌ها، درآمدها و پرداخت‌های مرتبط با این پروژه در تب‌های
                بالای همین پرونده به‌صورت تجمیعی نمایش داده می‌شوند. برای اتصال قرارداد جدید به این پروژه، در
                ماژول «قراردادها» فیلد پروژه را انتخاب کنید.
              </Typography>
            </GlassCard>
          </Grid>
        </Grid>
      )}

      {/* ---------- ویرایش پروژه ---------- */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontFamily: FONT, fontWeight: 800 }}>ویرایش پروژه</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {form && (
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="کد پروژه" value={form.code || ''}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={8}>
                <TextField size="small" fullWidth label="نام پروژه *" value={form.name || ''}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl size="small" fullWidth>
                  <InputLabel>مدیر پروژه</InputLabel>
                  <Select value={form.manager || ''} label="مدیر پروژه"
                    onChange={e => setForm(p => ({ ...p, manager: e.target.value }))}>
                    {empList.map(emp => <MenuItem key={emp.id} value={emp.id}>{emp.full_name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl size="small" fullWidth>
                  <InputLabel>وضعیت</InputLabel>
                  <Select value={form.status || 'draft'} label="وضعیت"
                    onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField size="small" fullWidth label="کارفرما" value={form.client || ''}
                  onChange={e => setForm(p => ({ ...p, client: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField size="small" fullWidth label="محل اجرا" value={form.location || ''}
                  onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={3}>
                <JalaliDatePicker fullWidth label="تاریخ شروع" value={form.start_date}
                  onChange={(g) => setForm(p => ({ ...p, start_date: g }))} />
              </Grid>
              <Grid item xs={12} md={3}>
                <JalaliDatePicker fullWidth label="تاریخ پایان" value={form.end_date}
                  onChange={(g) => setForm(p => ({ ...p, end_date: g }))} />
              </Grid>
              <Grid item xs={12}>
                <TextField size="small" fullWidth label="توضیحات" multiline rows={2} value={form.description || ''}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} sx={{ fontFamily: FONT }}>انصراف</Button>
          <Button variant="contained" onClick={() => update.mutate(form)}
            sx={{ fontFamily: FONT, background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectProfilePage;

