import React from 'react';
import { Box, Typography, Grid, Stack, Chip, Alert } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import LockIcon from '@mui/icons-material/Lock';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { SectionCard, ProgressBar, EmptyState, INK, MUTED, SOFT_BG } from './ContractProfileUI';

const STATUS_STYLE = {
  provided: { color: '#2563eb', bg: '#eff6ff', icon: <CheckCircleRoundedIcon sx={{ fontSize: 17 }} /> },
  partial: { color: '#d97706', bg: '#fffbeb', icon: <HourglassBottomIcon sx={{ fontSize: 17 }} /> },
  missing: { color: '#e11d48', bg: '#fff1f2', icon: <CancelRoundedIcon sx={{ fontSize: 17 }} /> },
};

const SummaryMetric = ({ label, value, color }) => (
  <Box sx={{ p: 1, borderRadius: '10px', bgcolor: '#fff', border: '1px solid #eef2f7' }}>
    <Typography sx={{ fontSize: 9.5, color: MUTED }}>{label}</Typography>
    <Typography sx={{ fontSize: 12, fontWeight: 900, color: color || INK, direction: 'ltr' }}>
      {formatPersianNumber(value)}
    </Typography>
  </Box>
);

const GuaranteeRow = ({ item, currencyLabel }) => (
  <Box sx={{ p: 1, borderRadius: '10px', bgcolor: SOFT_BG, border: '1px solid #eef2f7' }}>
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.75} useFlexGap>
      <Stack direction="row" alignItems="center" spacing={0.6} useFlexGap sx={{ minWidth: 0 }}>
        <Chip size="small" label={item.instrument_label || item.type_label || 'تضمین'}
          sx={{ height: 20, fontSize: 9.5, fontWeight: 700, bgcolor: '#fff7ed', color: '#b45309' }} />
        <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: INK }}>{item.number || '—'}</Typography>
      </Stack>
      {item.is_released ? (
        <Chip size="small" label="آزادشده" sx={{ height: 20, fontSize: 9.5, bgcolor: '#f1f5f9', color: '#475569' }} />
      ) : (
        <Chip size="small" label="فعال" sx={{ height: 20, fontSize: 9.5, bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 700 }} />
      )}
    </Stack>
    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.75} useFlexGap sx={{ mt: 0.45 }}>
      <Typography sx={{ fontSize: 10, color: '#334155', fontWeight: 700 }}>{formatPersianNumber(item.amount)} {currencyLabel}</Typography>
      <Typography sx={{ fontSize: 9.5, color: MUTED }}>
        انقضا: {toJalali(item.expiry_date)}
        {item.days_to_expiry != null && !item.is_released
          ? (item.days_to_expiry < 0 ? ' · منقضی' : ` · ${toPersianDigits(item.days_to_expiry)} روز`)
          : ''}
      </Typography>
    </Stack>
    {item.bank ? <Typography sx={{ mt: 0.25, fontSize: 9.5, color: MUTED }}>{item.bank}</Typography> : null}
  </Box>
);

const RequirementCard = ({ req, currencyLabel }) => {
  const style = STATUS_STYLE[req.status] || STATUS_STYLE.missing;
  return (
    <Grid item xs={12} md={6}>
      <Box sx={{
        height: '100%', p: 1.5, borderRadius: '14px', bgcolor: '#fff',
        border: '1px solid #e8edf4', borderRight: `3px solid ${style.color}`,
      }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} useFlexGap>
          <Stack direction="row" alignItems="center" spacing={0.75} useFlexGap sx={{ minWidth: 0 }}>
            <Box sx={{ width: 30, height: 30, flexShrink: 0, borderRadius: '9px', bgcolor: style.bg, color: style.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {style.icon}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={0.5} useFlexGap flexWrap="wrap">
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{req.label}</Typography>
                {req.index != null && (
                  <Chip size="small" label={`ردیف ${toPersianDigits(req.index + 1)}`}
                    sx={{ height: 18, fontSize: 9, bgcolor: '#f1f5f9', color: '#475569' }} />
                )}
              </Stack>
              {req.note ? <Typography sx={{ mt: 0.2, fontSize: 9.5, color: MUTED }}>{req.note}</Typography> : null}
            </Box>
          </Stack>
          <Chip size="small" label={req.status_label} sx={{ height: 20, fontSize: 9, fontWeight: 700, bgcolor: style.bg, color: style.color }} />
        </Stack>

        <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1} useFlexGap sx={{ mt: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 900, color: INK, direction: 'ltr' }}>
            {formatPersianNumber(req.required)} <Box component="span" sx={{ fontSize: 9.5, color: MUTED, fontWeight: 500 }}>{currencyLabel}</Box>
          </Typography>
          <Typography sx={{ fontSize: 9.5, color: MUTED }}>
            {req.percent ? `${toPersianDigits(req.percent)}٪ مبلغ مؤثر` : 'مبلغ ثابت'}
          </Typography>
        </Stack>

        <Box sx={{ mt: 0.8 }}>
          <ProgressBar value={req.coverage_percent} color={style.color} height={6} track="#eef2f7" />
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.35 }}>
            <Typography sx={{ fontSize: 9, color: MUTED }}>پوشش این قلم</Typography>
            <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: style.color }}>{toPersianDigits(req.coverage_percent)}٪</Typography>
          </Stack>
        </Box>

        <Stack direction="row" spacing={0.45} useFlexGap flexWrap="wrap" sx={{ mt: 0.9 }}>
          <Chip size="small" label={`تأمین: ${formatPersianNumber(req.provided)}`} sx={{ height: 19, fontSize: 9, bgcolor: '#eff6ff', color: '#1d4ed8' }} />
          {req.balance > 0 ? <Chip size="small" label={`کمبود: ${formatPersianNumber(req.balance)}`} sx={{ height: 19, fontSize: 9, bgcolor: '#fff1f2', color: '#be123c' }} /> : null}
          {req.released_total > 0 ? <Chip size="small" label={`آزادشده: ${formatPersianNumber(req.released_total)}`} sx={{ height: 19, fontSize: 9, bgcolor: '#f1f5f9', color: '#475569' }} /> : null}
        </Stack>

        <Stack spacing={0.55} sx={{ mt: 1 }}>
          {req.items.length === 0 ? (
            <Box sx={{ p: 1, borderRadius: '9px', bgcolor: '#fbfcfe', border: '1px dashed #dbe4ee', textAlign: 'center' }}>
              <Typography sx={{ fontSize: 9.5, color: MUTED }}>تضمینی برای این قلم ثبت نشده است.</Typography>
            </Box>
          ) : req.items.map((item) => <GuaranteeRow key={item.id} item={item} currencyLabel={currencyLabel} />)}
        </Stack>
      </Box>
    </Grid>
  );
};
const ContractGuarantees = ({ status, currencyLabel, fallbackItems = [], fallbackGuarantees = [] }) => {
  const summary = status?.summary;
  const requirements = status?.requirements || [];
  const coverage = Number(summary?.coverage_percent || 0);
  const registeredCount = summary?.registered_count
    ?? requirements.reduce((sum, req) => sum + (req.items || []).length, 0);
  const coverageColor = coverage >= 100 ? '#2563eb' : coverage > 0 ? '#d97706' : '#e11d48';

  if (!summary) {
    if (!fallbackItems.length && !fallbackGuarantees.length) {
      return (
        <SectionCard title="تضامین و پوشش قرارداد" icon={LockIcon} color="#f59e0b">
          <EmptyState icon={LockIcon} text="تضمینی برای این قرارداد ثبت نشده است." />
        </SectionCard>
      );
    }
    return (
      <SectionCard title="تضامین و پوشش قرارداد" icon={LockIcon} color="#f59e0b">
        <Stack spacing={1}>
          {fallbackItems.map((g, i) => (
            <Box key={`gi-${i}`} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, p: 1.2, borderRadius: '11px', bgcolor: SOFT_BG, border: '1px solid #eef2f7' }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: INK }}>{g.type_label}</Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: '#b45309' }}>{formatPersianNumber(g.amount || 0)} {currencyLabel}</Typography>
            </Box>
          ))}
          {fallbackGuarantees.map((g) => (
            <Box key={g.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, p: 1.2, borderRadius: '11px', bgcolor: SOFT_BG, border: '1px solid #eef2f7' }}>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: INK }}>{g.instrument_type_display || g.guarantee_type_display}</Typography>
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: '#b45309' }}>{formatPersianNumber(g.amount || 0)} {currencyLabel}</Typography>
            </Box>
          ))}
        </Stack>
      </SectionCard>
    );
  }

  if (!requirements.length && !(status?.unrequired || []).length) {
    return (
      <SectionCard title="تضامین و پوشش قرارداد" icon={LockIcon} color="#f59e0b">
        <EmptyState icon={LockIcon} text="تضمینی برای این قرارداد تعریف نشده است." />
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="تضامین و پوشش قرارداد"
      icon={LockIcon}
      color="#f59e0b"
      action={(
        <Chip size="small" label={`${toPersianDigits(registeredCount)} تضمین · ${toPersianDigits(coverage)}٪ پوشش`}
          sx={{ height: 23, fontSize: 10, fontWeight: 800, bgcolor: '#fff7ed', color: '#c2410c' }} />
      )}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} lg={4}>
          <Stack spacing={1.5}>
            <Box sx={{ p: 1.75, borderRadius: '16px', bgcolor: '#fff', border: '1px solid #e8edf4' }}>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1} useFlexGap>
                <Box>
                  <Typography sx={{ fontSize: 10.5, color: MUTED, fontWeight: 600 }}>پوشش کل تضامین</Typography>
                  <Typography sx={{ mt: 0.3, fontSize: 32, fontWeight: 900, color: coverageColor, lineHeight: 1.15 }}>
                    {toPersianDigits(coverage)}٪
                  </Typography>
                </Box>
                <Box sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: `${coverageColor}10`, color: coverageColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LockIcon sx={{ fontSize: 21 }} />
                </Box>
              </Stack>
              <Box sx={{ mt: 1.2 }}>
                <ProgressBar value={coverage} color={coverageColor} height={9} track="#eef2f7" />
              </Box>
              <Grid container spacing={1} sx={{ mt: 0.4 }}>
                <Grid item xs={6}><SummaryMetric label="مورد نیاز" value={summary.required_total} /></Grid>
                <Grid item xs={6}><SummaryMetric label="تأمین‌شده" value={summary.provided_total} /></Grid>
                <Grid item xs={6}><SummaryMetric label="کمبود" value={summary.balance_total} color={summary.balance_total > 0 ? '#be123c' : INK} /></Grid>
                <Grid item xs={6}><SummaryMetric label="آزادشده" value={summary.released_total} /></Grid>
              </Grid>
              <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mt: 1.1 }}>
                <Chip size="small" label={`${toPersianDigits(summary.provided_count)} تأمین‌شده`} sx={{ height: 20, fontSize: 9.5, bgcolor: '#eff6ff', color: '#1d4ed8' }} />
                {summary.partial_count > 0 && <Chip size="small" label={`${toPersianDigits(summary.partial_count)} ناقص`} sx={{ height: 20, fontSize: 9.5, bgcolor: '#fffbeb', color: '#b45309' }} />}
                {summary.missing_count > 0 && <Chip size="small" label={`${toPersianDigits(summary.missing_count)} تأمین‌نشده`} sx={{ height: 20, fontSize: 9.5, bgcolor: '#fff1f2', color: '#be123c' }} />}
              </Stack>
            </Box>

            {(status?.unrequired || []).length > 0 && (
              <Box sx={{ p: 1.4, borderRadius: '13px', bgcolor: '#fff', border: '1px dashed #cbd5e1' }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#475569', mb: 0.6 }}>تضامین بدون قلم متناظر</Typography>
                <Stack spacing={0.5}>
                  {(status.unrequired || []).map((item) => (
                    <Typography key={item.id} sx={{ fontSize: 10, color: MUTED }}>
                      {item.instrument_label || item.type_label} · {item.number || '—'} · {formatPersianNumber(item.amount)} {currencyLabel}
                      {item.is_released ? ' · آزادشده' : ''}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Grid>

        <Grid item xs={12} lg={8}>
          <Grid container spacing={1.5}>
            {requirements.map((req) => (
              <RequirementCard key={req.index != null ? `item-${req.index}` : `type-${req.type}`} req={req} currencyLabel={currencyLabel} />
            ))}
          </Grid>
        </Grid>
      </Grid>

      {(status?.warnings || []).map((warning) => (
        <Alert key={warning} severity="warning" sx={{ mt: 1.2, borderRadius: '10px', py: 0 }}>
          <Typography sx={{ fontSize: 10.5 }}>{warning}</Typography>
        </Alert>
      ))}
    </SectionCard>
  );
};

export default ContractGuarantees;

