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

const TYPE_LABELS = {
  construction: 'ظ¾غŒظ…ط§ظ†ع©ط§ط±غŒ / ط§ط¬ط±ط§',
  purchase: 'ط®ط±غŒط¯',
  tender: 'ظ…ظ†ط§ظ‚طµظ‡',
  consulting: 'ظ…ط´ط§ظˆط±ظ‡',
  service: 'ط®ط¯ظ…ط§طھ',
  other: 'ط³ط§غŒط±',
};

const STATUS_LABELS = {
  draft: 'ظ¾غŒط´â€Œظ†ظˆغŒط³',
  active: 'ط¯ط± ط­ط§ظ„ ط§ط¬ط±ط§',
  suspended: 'ظ…طھظˆظ‚ظپ',
  completed: 'طھع©ظ…غŒظ„ ط´ط¯ظ‡',
  terminated: 'ظپط³ط® ط´ط¯ظ‡',
};

const STATUS_COLORS = {
  draft: '#64748b',
  active: '#10b981',
  suspended: '#f59e0b',
  completed: '#3b82f6',
  terminated: '#ef4444',
};

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)',
  borderRadius: '10px',
};

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
    push(c.created_at?.slice(0, 10), 'created', 'ط§غŒط¬ط§ط¯ ظ‚ط±ط§ط±ط¯ط§ط¯', `ط´ظ…ط§ط±ظ‡ ${c.number || 'â€”'}`);
    push(c.signing_date, 'signing', 'ط§ظ…ط¶ط§غŒ ظ‚ط±ط§ط±ط¯ط§ط¯', c.signatory_name);
    push(c.start_date, 'start', 'ط´ط±ظˆط¹ ظ‚ط±ط§ط±ط¯ط§ط¯', '');
    push(c.end_date, 'end', 'ظ¾ط§غŒط§ظ† / ط§ظ†ظ‚ط¶ط§غŒ ظ‚ط±ط§ط±ط¯ط§ط¯', '');
    (c.invoices || []).forEach(x => push(x.date, 'invoice', 'ط«ط¨طھ ظپط§ع©طھظˆط±', `${x.number || 'â€”'} آ· ${formatPersianNumber(x.total || 0)} ط±غŒط§ظ„`));
    (c.statements || []).forEach(x => push(x.date, 'statement', 'ط«ط¨طھ طµظˆط±طھâ€Œظˆط¶ط¹غŒطھ', `${x.number || 'â€”'} آ· ${formatPersianNumber(x.amount || 0)} ط±غŒط§ظ„`));
    (c.addendums || []).forEach(x => push(x.date, 'addendum', 'ط«ط¨طھ ط§ظ„ط­ط§ظ‚غŒظ‡', x.number || x.change_description?.slice(0, 40)));
    (c.guarantees || []).forEach(x => push(x.issue_date, 'guarantee', 'طµط¯ظˆط± طھط¶ظ…غŒظ†', `${x.guarantee_type_display} آ· ${formatPersianNumber(x.amount || 0)} ط±غŒط§ظ„`));
    (c.guarantees || []).forEach(x => push(x.expiry_date, 'guarantee-expiry', 'ط§ظ†ظ‚ط¶ط§غŒ طھط¶ظ…غŒظ†', x.number || ''));
    (c.payments || []).forEach(x => push(x.date, 'payment', 'ظ¾ط±ط¯ط§ط®طھ', `${formatPersianNumber(x.amount || 0)} ط±غŒط§ظ„`));
    (c.documents || []).forEach(x => push(x.uploaded_at?.slice(0, 10), 'document', 'ط¨ط§ط±ع¯ط°ط§ط±غŒ ط³ظ†ط¯', x.title));
    return events.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [c]);

  if (isLoading) return <Box sx={{ textAlign: 'center', p: 8 }}><CircularProgress /></Box>;
  if (!c) return (
    <Box sx={{ textAlign: 'center', p: 6 }}>
      <Typography color="error" variant="h5">ظ‚ط±ط§ط±ط¯ط§ط¯ غŒط§ظپطھ ظ†ط´ط¯</Typography>
      <Button onClick={() => navigate('/external-contracts')} sx={{ mt: 2 }}>ط¨ط§ط²ع¯ط´طھ</Button>
    </Box>
  );

  const totalPaid = (c.payments || []).reduce((s, x) => s + Number(x.amount || 0), 0);
  const totalInvoices = (c.invoices || []).reduce((s, x) => s + Number(x.total || 0), 0);
  const remaining = Math.max(0, Number(c.amount || 0) - totalPaid);

  const timelineColor = {
    created: '#64748b', signing: '#10b981', start: '#3b82f6', end: '#ef4444',
    invoice: '#8b5cf6', statement: '#6366f1', addendum: '#ec4899',
    guarantee: '#f59e0b', 'guarantee-expiry': '#ef4444', payment: '#10b981', document: '#06b6d4',
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
        <Button variant="text" onClick={() => navigate('/external-contracts')}>ط¨ط§ط²ع¯ط´طھ</Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" onClick={() => navigate(`/contracts/${id}/edit`)}>ظˆغŒط±ط§غŒط´</Button>
          <Button variant="contained" onClick={() => navigate('/contracts/new')}>ظ‚ط±ط§ط±ط¯ط§ط¯ ط¬ط¯غŒط¯</Button>
        </Box>
      </Box>

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
                <Chip label={`ط´ظ…ط§ط±ظ‡: ${c.number || 'â€”'}`} size="small" color="primary" variant="filled" />
                <Chip label={TYPE_LABELS[c.contract_type] || 'â€”'} size="small" variant="outlined" />
                <Chip label={STATUS_LABELS[c.status]} size="small"
                  sx={{ color: '#fff', bgcolor: STATUS_COLORS[c.status] || '#64748b' }} />
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                {toPersianDigits((c.invoices || []).length)} ظپط§ع©طھظˆط± آ· {toPersianDigits((c.payments || []).length)} ظ¾ط±ط¯ط§ط®طھ
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />
          <Grid container spacing={1.5}>
            <InfoItem icon={<StorefrontIcon sx={{ fontSize: 18 }} />} color="#0ea5e9" label="ط·ط±ظپ ظ‚ط±ط§ط±ط¯ط§ط¯" value={c.party_name || 'â€”'} />
            <InfoItem icon={<BusinessIcon sx={{ fontSize: 18 }} />} color="#6366f1" label="ظ†ظˆط¹ ظ‚ط±ط§ط±ط¯ط§ط¯" value={TYPE_LABELS[c.contract_type] || 'â€”'} />
            <InfoItem icon={<AccountBalanceIcon sx={{ fontSize: 18 }} />} color="#10b981" label="ظ…ط¨ظ„ط؛ ظ‚ط±ط§ط±ط¯ط§ط¯" value={`${formatPersianNumber(c.amount || 0)} ط±غŒط§ظ„`} />
            <InfoItem icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} color="#f59e0b" label="طھط§ط±غŒط® ط´ط±ظˆط¹" value={toJalali(c.start_date)} />
            <InfoItem icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} color="#ef4444" label="طھط§ط±غŒط® ظ¾ط§غŒط§ظ†" value={toJalali(c.end_date)} />
            <InfoItem icon={<ScheduleIcon sx={{ fontSize: 18 }} />} color="#8b5cf6" label="ط¨ط§ظ‚غŒâ€Œظ…ط§ظ†ط¯ظ‡" value={`${formatPersianNumber(remaining)} ط±غŒط§ظ„`} />
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
          <Tab label="ظ†ظ…ط§غŒ ع©ظ„غŒ" />
          <Tab label="طھط§غŒظ…â€Œظ„ط§غŒظ†" />
          <Tab label="ط¬ط²ط¦غŒط§طھ" />
          <Tab label="ظ…ط§ظ„غŒ" />
          <Tab label="ط§ظ„ط­ط§ظ‚غŒظ‡ ظˆ طھط¶ظ…غŒظ†" />
          <Tab label="ط§ط³ظ†ط§ط¯" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* ظ†ظ…ط§غŒ ع©ظ„غŒ */}
          {tabIndex === 0 && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">ظ…ط¨ظ„ط؛ ظ‚ط±ط§ط±ط¯ط§ط¯</Typography>
                    <Typography variant="h6" fontWeight={800} color="#f59e0b">{formatPersianNumber(c.amount || 0)}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">ط¬ظ…ط¹ ظ¾ط±ط¯ط§ط®طھâ€Œظ‡ط§</Typography>
                    <Typography variant="h6" fontWeight={800} color="#10b981">{formatPersianNumber(totalPaid)}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">ط¬ظ…ط¹ ظپط§ع©طھظˆط±ظ‡ط§</Typography>
                    <Typography variant="h6" fontWeight={800} color="#8b5cf6">{formatPersianNumber(totalInvoices)}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ ...glassPaper, p: 2, textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">ط¨ط§ظ‚غŒâ€Œظ…ط§ظ†ط¯ظ‡</Typography>
                    <Typography variant="h6" fontWeight={800} color="#ef4444">{formatPersianNumber(remaining)}</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ ...glassPaper, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>ط§ط·ظ„ط§ط¹ط§طھ ع©ظ„غŒط¯غŒ</Typography>
                    <Stack spacing={0.5}>
                      <Typography variant="body2"><strong>ظ†ط§ظ… ظ¾ط±ظˆعکظ‡:</strong> {c.project_name || 'â€”'}</Typography>
                      <Typography variant="body2"><strong>ظ…ط­ظ„ ط§ط¬ط±ط§:</strong> {c.project_location || 'â€”'}</Typography>
                      <Typography variant="body2"><strong>طھط§ط±غŒط® ط§ظ…ط¶ط§:</strong> {toJalali(c.signing_date)}</Typography>
                      <Typography variant="body2"><strong>ط§ظ…ط¶ط§ع©ظ†ظ†ط¯ظ‡:</strong> {c.signatory_name || 'â€”'}</Typography>
                    </Stack>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ ...glassPaper, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>ط´ظ…ط§ط±ط´ ط±غŒط² ط§ظ‚ظ„ط§ظ…</Typography>
                    <Stack spacing={0.5}>
                      <Typography variant="body2">ظپط§ع©طھظˆط±ظ‡ط§: {toPersianDigits((c.invoices || []).length)} ظ…ظˆط±ط¯</Typography>
                      <Typography variant="body2">طµظˆط±طھâ€Œظˆط¶ط¹غŒطھâ€Œظ‡ط§: {toPersianDigits((c.statements || []).length)} ظ…ظˆط±ط¯</Typography>
                      <Typography variant="body2">ط§ظ„ط­ط§ظ‚غŒظ‡â€Œظ‡ط§: {toPersianDigits((c.addendums || []).length)} ظ…ظˆط±ط¯</Typography>
                      <Typography variant="body2">طھط¶ظ…غŒظ†â€Œظ‡ط§: {toPersianDigits((c.guarantees || []).length)} ظ…ظˆط±ط¯</Typography>
                      <Typography variant="body2">ظ¾ط±ط¯ط§ط®طھâ€Œظ‡ط§: {toPersianDigits((c.payments || []).length)} ظ…ظˆط±ط¯</Typography>
                      <Typography variant="body2">ط§ط³ظ†ط§ط¯: {toPersianDigits((c.documents || []).length)} ظ…ظˆط±ط¯</Typography>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* طھط§غŒظ…â€Œظ„ط§غŒظ† */}
          {tabIndex === 1 && (
            <Box sx={{ position: 'relative', '&::before': { content: '""', position: 'absolute', right: 12, top: 0, bottom: 0, width: 2, background: 'rgba(99,102,241,0.18)' } }}>
              {timeline.length === 0 ? (
                <Typography variant="body2" color="textSecondary">ط±ظˆغŒط¯ط§ط¯غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ.</Typography>
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

          {/* ط¬ط²ط¦غŒط§طھ */}
          {tabIndex === 2 && (
            <Box>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <InfoItem icon={<BusinessIcon sx={{ fontSize: 18 }} />} color="#6366f1" label="ط´ظ…ط§ط±ظ‡ ظ…ظ†ط§ظ‚طµظ‡" value={c.tender_number || 'â€”'} />
                <InfoItem icon={<DescriptionIcon sx={{ fontSize: 18 }} />} color="#ec4899" label="ط·ط¨ظ‚ظ‡â€Œط¨ظ†ط¯غŒ" value={c.category || 'â€”'} />
                <InfoItem icon={<PaymentsIcon sx={{ fontSize: 18 }} />} color="#10b981" label="ظ¾غŒط´â€Œظ¾ط±ط¯ط§ط®طھ" value={c.advance_payment ? `${formatPersianNumber(c.advance_payment)} ط±غŒط§ظ„` : 'â€”'} />
                <InfoItem icon={<LockIcon sx={{ fontSize: 18 }} />} color="#f59e0b" label="ط¯ط±طµط¯ ط­ط³ظ† ط§ظ†ط¬ط§ظ… ع©ط§ط±" value={c.retention_percent ? `ظھ${toPersianDigits(c.retention_percent)}` : 'â€”'} />
                <InfoItem icon={<ScheduleIcon sx={{ fontSize: 18 }} />} color="#3b82f6" label="ط¯ظˆط±ظ‡ ع¯ط§ط±ط§ظ†طھغŒ" value={c.warranty_period || 'â€”'} />
                <InfoItem icon={<AccountBalanceIcon sx={{ fontSize: 18 }} />} color="#ef4444" label="ظ…ط¨ظ„ط؛ طھط¶ظ…غŒظ†" value={c.guarantee_amount ? `${formatPersianNumber(c.guarantee_amount)} ط±غŒط§ظ„` : 'â€”'} />
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ ...glassPaper, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>ط´ط±ط§غŒط· ظ¾ط±ط¯ط§ط®طھ</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.payment_terms || 'â€”'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ ...glassPaper, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>ط´ط±ط§غŒط· طھط­ظˆغŒظ„</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.delivery_terms || 'â€”'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ ...glassPaper, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>ط¬ط±غŒظ…ظ‡ / ظˆط¬ظ‡ ط§ظ„طھط²ط§ظ…</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.penalty_terms || 'â€”'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ ...glassPaper, p: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>ط´ط±ط§غŒط· ط¨غŒظ…ظ‡</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{c.insurance_terms || 'â€”'}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* ظ…ط§ظ„غŒ */}
          {tabIndex === 3 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ ...glassPaper, p: 2 }}>
                  <SectionTitle color="#8b5cf6" icon={<ReceiptIcon sx={{ fontSize: 16 }} />}>ظپط§ع©طھظˆط±ظ‡ط§</SectionTitle>
                  {renderMini(c.invoices, 'ظپط§ع©طھظˆط±غŒ ظ†غŒط³طھ', x => (
                    <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
                      <Typography variant="body2" fontWeight={700}>{x.number || 'â€”'}</Typography>
                      <Typography variant="caption" color="textSecondary">{formatPersianNumber(x.total || 0)} ط±غŒط§ظ„ {x.is_paid ? 'آ· ظ¾ط±ط¯ط§ط®طھ ط´ط¯ظ‡' : ''}</Typography>
                    </Paper>
                  ))}
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ ...glassPaper, p: 2 }}>
                  <SectionTitle color="#6366f1" icon={<ReceiptLongIcon sx={{ fontSize: 16 }} />}>طµظˆط±طھâ€Œظˆط¶ط¹غŒطھâ€Œظ‡ط§</SectionTitle>
                  {renderMini(c.statements, 'طµظˆط±طھâ€Œظˆط¶ط¹غŒطھغŒ ظ†غŒط³طھ', x => (
                    <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
                      <Typography variant="body2" fontWeight={700}>{x.number || 'â€”'}</Typography>
                      <Typography variant="caption" color="textSecondary">{formatPersianNumber(x.amount || 0)} ط±غŒط§ظ„ {x.is_approved ? 'آ· طھط£غŒغŒط¯ ط´ط¯ظ‡' : ''}</Typography>
                    </Paper>
                  ))}
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ ...glassPaper, p: 2 }}>
                  <SectionTitle color="#10b981" icon={<PaymentsIcon sx={{ fontSize: 16 }} />}>ظ¾ط±ط¯ط§ط®طھâ€Œظ‡ط§</SectionTitle>
                  {renderMini(c.payments, 'ظ¾ط±ط¯ط§ط®طھغŒ ظ†غŒط³طھ', x => (
                    <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
                      <Typography variant="body2" fontWeight={700}>{toJalali(x.date)}</Typography>
                      <Typography variant="caption" color="textSecondary">{formatPersianNumber(x.amount || 0)} ط±غŒط§ظ„ آ· {x.reference || ''}</Typography>
                    </Paper>
                  ))}
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* ط§ظ„ط­ط§ظ‚غŒظ‡ ظˆ طھط¶ظ…غŒظ† */}
          {tabIndex === 4 && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ ...glassPaper, p: 2 }}>
                  <SectionTitle color="#ec4899" icon={<EditNoteIcon sx={{ fontSize: 16 }} />}>ط§ظ„ط­ط§ظ‚غŒظ‡â€Œظ‡ط§</SectionTitle>
                  {renderMini(c.addendums, 'ط§ظ„ط­ط§ظ‚غŒظ‡â€Œط§غŒ ظ†غŒط³طھ', x => (
                    <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
                      <Typography variant="body2" fontWeight={700}>{x.number || 'â€”'} آ· {toJalali(x.date)}</Typography>
                      <Typography variant="caption" color="textSecondary">{x.change_description}</Typography>
                    </Paper>
                  ))}
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper sx={{ ...glassPaper, p: 2 }}>
                  <SectionTitle color="#f59e0b" icon={<LockIcon sx={{ fontSize: 16 }} />}>طھط¶ظ…غŒظ†â€Œظ‡ط§</SectionTitle>
                  {renderMini(c.guarantees, 'طھط¶ظ…غŒظ†غŒ ظ†غŒط³طھ', x => (
                    <Paper key={x.id} variant="outlined" sx={{ p: 1, borderRadius: '10px' }}>
                      <Typography variant="body2" fontWeight={700}>{x.guarantee_type_display} آ· {formatPersianNumber(x.amount || 0)} ط±غŒط§ظ„</Typography>
                      <Typography variant="caption" color="textSecondary">طھط§ {toJalali(x.expiry_date)} آ· {x.bank} {x.is_released ? 'آ· ط¢ط²ط§ط¯ ط´ط¯ظ‡' : ''}</Typography>
                    </Paper>
                  ))}
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* ط§ط³ظ†ط§ط¯ */}
          {tabIndex === 5 && (
            <Paper sx={{ ...glassPaper, p: 2 }}>
              <SectionTitle color="#06b6d4" icon={<FolderOpenIcon sx={{ fontSize: 16 }} />}>ط§ط³ظ†ط§ط¯ ظ‚ط±ط§ط±ط¯ط§ط¯</SectionTitle>
              {renderMini(c.documents, 'ط³ظ†ط¯غŒ ظ†غŒط³طھ', x => (
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