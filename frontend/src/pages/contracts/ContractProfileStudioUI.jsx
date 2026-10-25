import React from 'react';
import {
  Box, ButtonBase, Chip, Divider, Grid, Paper, Stack, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import BusinessIcon from '@mui/icons-material/Business';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EditNoteIcon from '@mui/icons-material/EditNote';
import InsightsIcon from '@mui/icons-material/Insights';
import LockIcon from '@mui/icons-material/Lock';
import PaymentsIcon from '@mui/icons-material/Payments';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { formatPersianNumber, normalizeCurrencyLabel, toPersianDigits } from '../../core/utils/numberUtils';
import { toJalali } from '../../core/utils/dateUtils';
import { EmptyState, ProgressBar, SectionCard } from './ContractProfileUI';

const money = (value, currency = 'ریال') => `${formatPersianNumber(value || 0)} ${currency}`;
const compactMoney = (value) => {
  const amount = Number(value) || 0;
  const scaled = (unit) => formatPersianNumber(Number((amount / unit).toFixed(1)));
  if (Math.abs(amount) >= 1_000_000_000_000) return `${scaled(1_000_000_000_000)} همت`;
  if (Math.abs(amount) >= 1_000_000_000) return `${scaled(1_000_000_000)} میلیارد`;
  if (Math.abs(amount) >= 1_000_000) return `${scaled(1_000_000)} میلیون`;
  return formatPersianNumber(amount);
};

const panelSx = {
  bgcolor: 'var(--hrms-region-card-bg, #ffffff)',
  border: 'var(--hrms-border-card, 1px solid #e8edf4)',
  borderRadius: 'var(--hrms-radius-large, 18px)',
  boxShadow: 'var(--hrms-shadow-card, none)',
};

const softPanelSx = (theme) => ({
  bgcolor: alpha(theme.palette.text.primary, theme.palette.mode === 'dark' ? 0.045 : 0.025),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 'var(--hrms-radius-medium, 12px)',
});

const FinanceLabel = ({ children }) => {
  const theme = useTheme();
  return <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary, lineHeight: 1.6 }}>{children}</Typography>;
};

const FinanceValue = ({ children, color, size = 14 }) => {
  const theme = useTheme();
  return (
    <Typography sx={{
      fontSize: size, fontWeight: 900, color: color || theme.palette.text.primary,
      direction: 'rtl', lineHeight: 1.5, wordBreak: 'break-word',
    }}>{children}</Typography>
  );
};

const StudioMetric = ({ label, value, hint, color, icon: Icon }) => {
  const theme = useTheme();
  return (
    <Box sx={{ p: 1.2, height: '100%', minWidth: 0, ...softPanelSx(theme) }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.75}>
        <FinanceLabel>{label}</FinanceLabel>
        {Icon ? (
          <Box sx={{ width: 27, height: 27, borderRadius: '8px', color, bgcolor: alpha(color, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon sx={{ fontSize: 15 }} />
          </Box>
        ) : null}
      </Stack>
      <FinanceValue color={color} size={15}>{value}</FinanceValue>
      {hint ? <Typography sx={{ mt: 0.2, fontSize: 12, color: theme.palette.text.secondary, lineHeight: 1.6 }}>{hint}</Typography> : null}
    </Box>
  );
};

const StudioFact = ({ label, value, icon: Icon, color }) => {
  const theme = useTheme();
  return (
    <Box sx={{ minWidth: 0, p: 1, ...softPanelSx(theme) }}>
      <Stack direction="row" alignItems="center" spacing={0.45} useFlexGap>
        {Icon ? <Icon sx={{ fontSize: 13, color: color || theme.palette.text.secondary }} /> : null}
        <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>{label}</Typography>
      </Stack>
      <Typography sx={{ mt: 0.25, fontSize: 12.5, fontWeight: 800, color: theme.palette.text.primary, wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
};

export const QuickAccessStrip = ({ items = [] }) => {
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: {
        xs: 'repeat(2, minmax(0, 1fr))',
        sm: 'repeat(4, minmax(0, 1fr))',
        lg: 'repeat(7, minmax(0, 1fr))',
      },
      gap: 1,
    }}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <ButtonBase key={item.label} onClick={item.onClick} sx={{
            minWidth: 0, height: '100%', p: 1.1, textAlign: 'right', display: 'flex',
            alignItems: 'stretch', flexDirection: 'column', gap: 0.7,
            ...panelSx, borderRadius: 'var(--hrms-radius-medium, 13px)',
            transition: 'border-color .18s ease, transform .18s ease',
            '&:hover': { borderColor: alpha(item.color || theme.palette.primary.main, 0.45), transform: 'translateY(-1px)' },
          }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
              <Box sx={{
                width: 31, height: 31, flexShrink: 0, borderRadius: '9px',
                bgcolor: alpha(item.color, 0.08), color: item.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}><Icon sx={{ fontSize: 17 }} /></Box>
              <FinanceValue color={item.color} size={18}>{toPersianDigits(item.count || 0)}</FinanceValue>
            </Stack>
            <Box sx={{ minWidth: 0, mt: 'auto' }}>
              <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: theme.palette.text.primary }}>{item.label}</Typography>
              <Typography noWrap sx={{ mt: 0.15, fontSize: 11, color: theme.palette.text.secondary }}>{item.meta || 'مشاهده جزئیات'}</Typography>
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
};


const ProjectMini = ({ allocations = [], projectName }) => {
  const theme = useTheme();
  const rows = allocations.length ? allocations : (projectName ? [{ project_name: projectName, percentage: 100 }] : []);
  if (!rows.length) {
    return (
      <Box sx={{ p: 1, ...softPanelSx(theme) }}>
        <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>پروژه‌ای به این قرارداد تخصیص نیافته است.</Typography>
      </Box>
    );
  }
  return (
    <Stack spacing={0.8}>
      {rows.map((allocation, index) => (
        <Box key={`${allocation.project_name || 'project'}-${index}`} sx={{ p: 0.9, ...softPanelSx(theme) }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.75}>
            <Typography noWrap sx={{ fontSize: 12, fontWeight: 700, color: theme.palette.text.primary }}>{allocation.project_name || '—'}</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: theme.palette.info.main }}>{formatPersianNumber(allocation.percentage || 0)}٪</Typography>
          </Stack>
          <Box sx={{ mt: 0.5 }}><ProgressBar value={allocation.percentage || 0} color={theme.palette.info.main} height={5} /></Box>
        </Box>
      ))}
    </Stack>
  );
};

const AddendumMini = ({ addendum }) => {
  const theme = useTheme();
  const isPositive = Number(addendum.amount_change) >= 0;
  return (
    <Box sx={{ p: 1, ...softPanelSx(theme), borderRight: `3px solid ${theme.palette.secondary.main}` }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
        <Typography sx={{ fontSize: 12, fontWeight: 900, color: theme.palette.text.primary }}>{toPersianDigits(addendum.number || '—')}</Typography>
        <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>{toJalali(addendum.date)}</Typography>
      </Stack>
      {addendum.subject_type_display ? <Typography sx={{ mt: 0.2, fontSize: 11, fontWeight: 700, color: theme.palette.secondary.main }}>{addendum.subject_type_display}</Typography> : null}
      <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 0.45 }}>
        {addendum.amount_change != null && addendum.amount_change !== '' ? (
          <Chip size="small" label={`${isPositive ? '+' : ''}${formatPersianNumber(addendum.amount_change)}`}
            sx={{ height: 17, fontSize: 11, bgcolor: alpha(isPositive ? theme.palette.success.main : theme.palette.error.main, 0.08), color: isPositive ? theme.palette.success.main : theme.palette.error.main }} />
        ) : null}
        {addendum.percent_change != null && addendum.percent_change !== '' ? (
          <Chip size="small" label={`${toPersianDigits(addendum.percent_change)}٪`} sx={{ height: 17, fontSize: 11, bgcolor: alpha(theme.palette.info.main, 0.08), color: theme.palette.info.main }} />
        ) : null}
        {addendum.new_end_date ? (
          <Chip size="small" label={`پایان ${toJalali(addendum.new_end_date)}`} sx={{ height: 17, fontSize: 11, bgcolor: alpha(theme.palette.text.primary, 0.05), color: theme.palette.text.secondary }} />
        ) : null}
      </Stack>
    </Box>
  );
};


const IdentitySubjectBlock = ({
  contract, contractTypeLabel, statusLabel, statusColor, remainingDays,
  startDate, endDate, effectiveEndDate, signingDate, signatoryName, category, addendumCount,
}) => {
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const info = theme.palette.info.main;
  const warning = theme.palette.warning.main;
  const danger = theme.palette.error.main;
  return (
    <>
      <Stack direction="row" alignItems="flex-start" spacing={1.2}>
        <Box sx={{
          width: 48, height: 48, flexShrink: 0, borderRadius: '14px',
          bgcolor: alpha(accent, 0.1), border: `1px solid ${alpha(accent, 0.22)}`,
          color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><BusinessIcon sx={{ fontSize: 24 }} /></Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.55} useFlexGap flexWrap="wrap" sx={{ mb: 0.55 }}>
            <Chip size="small" label={contract.number || '—'} sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: alpha(accent, 0.08), color: accent }} />
            <Chip size="small" label={statusLabel || '—'} sx={{ height: 21, fontSize: 12, fontWeight: 800, color: '#fff', bgcolor: statusColor || theme.palette.text.secondary }} />
            <Chip size="small" label={contractTypeLabel || '—'} variant="outlined" sx={{ height: 21, fontSize: 12 }} />
          </Stack>
          <Typography sx={{ fontSize: 'var(--hrms-font-section-title-size, 19px)', fontWeight: 900, color: theme.palette.text.primary, lineHeight: 1.55, wordBreak: 'break-word' }}>
            {contract.subject || '—'}
          </Typography>
          <Typography sx={{ mt: 0.45, fontSize: 12, fontWeight: 700, color: theme.palette.text.secondary }}>
            طرف قرارداد: {contract.party_name || '—'}
          </Typography>
          <Stack direction="row" spacing={0.55} useFlexGap flexWrap="wrap" sx={{ mt: 0.85 }}>
            {category ? <Chip size="small" icon={<BusinessIcon />} label={category} variant="outlined" sx={{ height: 22, fontSize: 12 }} /> : null}
            {signatoryName ? <Chip size="small" label={`امضاکننده: ${signatoryName}`} variant="outlined" sx={{ height: 22, fontSize: 12 }} /> : null}
            <Chip size="small" label={`${toPersianDigits(addendumCount || 0)} الحاقیه`} sx={{ height: 22, fontSize: 12, bgcolor: alpha(theme.palette.secondary.main, 0.08), color: theme.palette.secondary.main }} />
          </Stack>
        </Box>
      </Stack>

      <Box sx={{ mt: 1.55, p: 1.15, ...softPanelSx(theme) }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} useFlexGap>
          <Stack direction="row" alignItems="center" spacing={0.55}>
            <CalendarMonthIcon sx={{ fontSize: 15, color: info }} />
            <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>بازهٔ قرارداد</Typography>
          </Stack>
          <Chip size="small" label={remainingDays === null ? 'بدون تاریخ پایان' : remainingDays < 0 ? `${toPersianDigits(Math.abs(remainingDays))} روز گذشته` : remainingDays === 0 ? 'آخرین روز' : `${toPersianDigits(remainingDays)} روز مانده`}
            sx={{ height: 21, fontSize: 12, fontWeight: 800, bgcolor: remainingDays !== null && remainingDays < 0 ? alpha(danger, 0.08) : alpha(info, 0.08), color: remainingDays !== null && remainingDays < 0 ? danger : info }} />
        </Stack>
        <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 0.75 }}>
          <StudioFact label="شروع" value={toJalali(startDate)} />
          <StudioFact label="پایان پایه" value={toJalali(endDate)} />
          <StudioFact label="پایان مؤثر" value={toJalali(effectiveEndDate)} color={warning} />
          <StudioFact label="امضا" value={toJalali(signingDate)} />
        </Box>
      </Box>
    </>
  );
};


const IdentityAmountBlock = ({
  currencyLabel, baseAmount, amountWithAddendum, adjustmentAmount, adjustedAmount,
  adjustedAmountRial, contractRate, totalPaid, remainingRial, progressPercent,
  advanceAmount, guaranteeAmount, retentionPercent,
}) => {
  const theme = useTheme();
  const info = theme.palette.info.main;
  const success = theme.palette.success.main;
  const warning = theme.palette.warning.main;
  const danger = theme.palette.error.main;
  const violet = theme.palette.secondary.main;
  const progressColor = progressPercent >= 100 ? success : progressPercent > 50 ? info : warning;
  const effectiveDelta = Number(amountWithAddendum) - Number(baseAmount);
  return (
    <Box sx={{
      p: 1.5, height: '100%', borderRadius: 'var(--hrms-radius-medium, 15px)',
      border: `1px solid ${alpha(warning, 0.25)}`,
      background: `linear-gradient(145deg, ${alpha(warning, 0.09)}, ${alpha(info, 0.035)})`,
    }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} spacing={1}>
        <Box>
          <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>مبلغ مؤثر قرارداد با الحاقیه و تعدیل</Typography>
          <Typography sx={{ mt: 0.3, fontSize: { xs: 23, sm: 28 }, fontWeight: 900, color: warning, lineHeight: 1.25, direction: 'rtl' }}>
            {formatPersianNumber(adjustedAmount)} <Box component="span" sx={{ fontSize: 12, fontWeight: 600, color: theme.palette.text.secondary }}>{currencyLabel}</Box>
          </Typography>
          <Stack direction="row" spacing={0.55} useFlexGap flexWrap="wrap" sx={{ mt: 0.55 }}>
            <Chip size="small" label={`پایه ${money(baseAmount, currencyLabel)}`} sx={{ height: 20, fontSize: 11, bgcolor: alpha(theme.palette.text.primary, 0.05), color: theme.palette.text.secondary }} />
            {effectiveDelta ? <Chip size="small" label={`${effectiveDelta >= 0 ? '+' : ''}${money(effectiveDelta, currencyLabel)} الحاقیه`} sx={{ height: 20, fontSize: 11, bgcolor: alpha(info, 0.08), color: info }} /> : null}
            {adjustmentAmount ? <Chip size="small" label={`${adjustmentAmount >= 0 ? '+' : ''}${money(adjustmentAmount, currencyLabel)} تعدیل`} sx={{ height: 20, fontSize: 11, bgcolor: alpha(violet, 0.08), color: violet }} /> : null}
            {contractRate > 1 ? <Chip size="small" label={`معادل ${money(adjustedAmountRial, 'ریال')}`} sx={{ height: 20, fontSize: 11, bgcolor: alpha(success, 0.08), color: success }} /> : null}
          </Stack>
        </Box>
        <Chip size="small" icon={<TrendingUpIcon />} label={`${toPersianDigits(progressPercent)}٪ پرداخت`}
          sx={{ height: 24, fontSize: 12, fontWeight: 800, bgcolor: alpha(progressColor, 0.09), color: progressColor }} />
      </Stack>

      <Box sx={{ mt: 1.3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.45 }}>
          <Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>پیشرفت مالی</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: progressColor }}>{formatPersianNumber(totalPaid)} از {formatPersianNumber(adjustedAmountRial)} ریال</Typography>
        </Stack>
        <ProgressBar value={progressPercent} color={progressColor} height={8} />
      </Box>

      <Box sx={{ mt: 1, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0.75 }}>
        <StudioFact label="پیش‌پرداخت" value={money(advanceAmount, currencyLabel)} />
        <StudioFact label="تضمین" value={money(guaranteeAmount, currencyLabel)} />
        <StudioFact label="نگهداشت" value={retentionPercent ? `${formatPersianNumber(retentionPercent)}٪` : '—'} />
      </Box>
      <Box sx={{ mt: 0.8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
        <StudioMetric label="پرداخت‌شده" value={money(totalPaid, 'ریال')} color={success} />
        <StudioMetric label="مانده مالی" value={money(remainingRial, 'ریال')} color={danger} />
      </Box>
    </Box>
  );
};

const IdentityFacts = ({
  contract, contractTypeLabel, category, signatoryName, advanceAmount,
  guaranteeAmount, warrantyPeriod, tenderNumber, projectAllocations, projectName,
  currencyLabel,
}) => {
  const theme = useTheme();
  const info = theme.palette.info.main;
  const projectCount = projectAllocations.length || (projectName ? 1 : 0);
  return (
    <Grid container spacing={1.1}>
      <Grid item xs={12} lg={7}>
        <Typography sx={{ fontSize: 12, fontWeight: 900, color: theme.palette.text.primary, mb: 0.55 }}>شناسنامهٔ قرارداد</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, minmax(0, 1fr))' }, gap: 0.75 }}>
          <StudioFact label="شماره" value={toPersianDigits(contract.number || '—')} />
          <StudioFact label="نوع" value={contractTypeLabel} />
          <StudioFact label="طبقه‌بندی" value={category} />
          <StudioFact label="امضاکننده" value={signatoryName} />
          <StudioFact label="پیش‌پرداخت" value={money(advanceAmount, currencyLabel)} />
          <StudioFact label="مبلغ تضمین" value={money(guaranteeAmount, currencyLabel)} />
          <StudioFact label="دوره گارانتی" value={warrantyPeriod} />
          <StudioFact label="شمارهٔ مناقصه" value={tenderNumber} />
        </Box>
      </Grid>
      <Grid item xs={12} lg={5}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 0.55 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 900, color: theme.palette.text.primary }}>پروژه‌ها و تخصیص</Typography>
          <Chip size="small" label={`${toPersianDigits(projectCount)} پروژه`} sx={{ height: 19, fontSize: 11, bgcolor: alpha(info, 0.08), color: info }} />
        </Stack>
        <ProjectMini allocations={projectAllocations} projectName={projectName} />
      </Grid>
    </Grid>
  );
};

const IdentityAddendums = ({ addendums = [], addendumCount, effectiveChanges = [], effectsWarnings = [], onOpenAddendums }) => {
  const theme = useTheme();
  return (
    <>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mb: 0.7 }}>
        <Stack direction="row" alignItems="center" spacing={0.6}>
          <EditNoteIcon sx={{ fontSize: 16, color: theme.palette.secondary.main }} />
          <Typography sx={{ fontSize: 12, fontWeight: 900, color: theme.palette.text.primary }}>الحاقیه‌ها و اثرهای ثبت‌شده</Typography>
        </Stack>
        <Stack direction="row" spacing={0.45} useFlexGap>
          <Chip size="small" label={`${toPersianDigits(addendumCount || 0)} الحاقیه`} sx={{ height: 19, fontSize: 11, bgcolor: alpha(theme.palette.secondary.main, 0.08), color: theme.palette.secondary.main }} />
          {onOpenAddendums ? <Chip size="small" label="مشاهده پرونده الحاقیه" onClick={onOpenAddendums} sx={{ height: 19, fontSize: 11, cursor: 'pointer', color: theme.palette.info.main }} /> : null}
        </Stack>
      </Stack>
      {addendums.length ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 0.85, maxHeight: 235, overflowY: 'auto', pr: 0.25 }}>
          {addendums.map((addendum) => <AddendumMini key={addendum.id} addendum={addendum} />)}
        </Box>
      ) : (
        <Box sx={{ p: 1, ...softPanelSx(theme) }}><Typography sx={{ fontSize: 12, color: theme.palette.text.secondary }}>الحاقیه‌ای برای این قرارداد ثبت نشده است.</Typography></Box>
      )}
      {effectiveChanges.length ? (
        <Box sx={{ mt: 0.9, p: 1, ...softPanelSx(theme) }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: theme.palette.text.secondary, mb: 0.45 }}>اثر مؤثر الحاقیه‌ها</Typography>
          <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
            {effectiveChanges.slice(0, 6).map((change, index) => (
              <Chip key={`${change.field}-${index}`} size="small"
                label={change.field === 'end_date' ? `${change.source_label}: ${toJalali(change.to)}` : `${change.source_label}: ${formatPersianNumber(change.to || 0)}`}
                sx={{ height: 19, fontSize: 11, bgcolor: alpha(theme.palette.info.main, 0.07), color: theme.palette.info.main }} />
            ))}
          </Stack>
        </Box>
      ) : null}
      {effectsWarnings.map((warning) => (
        <Typography key={warning} sx={{ mt: 0.65, fontSize: 11, color: theme.palette.warning.main }}>{warning}</Typography>
      ))}
    </>
  );
};

export const StudioIdentityCard = (props) => {
  const theme = useTheme();
  const accent = theme.palette.primary.main;
  const info = theme.palette.info.main;
  return (
    <Paper elevation={0} sx={{ ...panelSx, mb: 2, overflow: 'hidden', position: 'relative' }}>
      <Box sx={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `radial-gradient(circle at 12% -15%, ${alpha(accent, 0.16)}, transparent 42%), radial-gradient(circle at 92% 0%, ${alpha(info, 0.10)}, transparent 38%)`,
      }} />
      <Box sx={{ position: 'relative', p: { xs: 1.5, md: 2.2 } }}>
        <Grid container spacing={2}>
          <Grid item xs={12} lg={6}><IdentitySubjectBlock {...props} /></Grid>
          <Grid item xs={12} lg={6}><IdentityAmountBlock {...props} /></Grid>
        </Grid>
        <Divider sx={{ my: 1.6 }} />
        <IdentityFacts {...props} />
        <Divider sx={{ my: 1.6 }} />
        <IdentityAddendums
          addendums={props.addendums}
          addendumCount={props.addendumCount}
          effectiveChanges={props.effectiveChanges}
          effectsWarnings={props.effectsWarnings}
          onOpenAddendums={props.onOpenAddendums}
        />
      </Box>
    </Paper>
  );
};


const FinanceRing = ({ percent, color, track, label, value }) => {
  const size = 154;
  const thickness = 17;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.max(0, Math.min(100, percent)) / 100) * circumference;
  const theme = useTheme();
  return (
    <Box sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={track} strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={thickness}
          strokeDasharray={`${dash} ${circumference - dash}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 24, fontWeight: 900, color: theme.palette.text.primary, lineHeight: 1.1 }}>{toPersianDigits(Math.round(percent))}٪</Typography>
        <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>{label}</Typography>
        {value ? <Typography sx={{ mt: 0.2, fontSize: 11, fontWeight: 700, color }}>{value}</Typography> : null}
      </Box>
    </Box>
  );
};

const MonthlyBars = ({ data = [], color }) => {
  const theme = useTheme();
  const max = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.75, height: 145, mt: 0.8 }}>
      {data.map((item, index) => (
        <Box key={`${item.label}-${index}`} sx={{ flex: 1, minWidth: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Typography noWrap sx={{ fontSize: 10, color: theme.palette.text.secondary, mb: 0.25 }}>{compactMoney(item.value)}</Typography>
          <Box sx={{ width: '78%', height: `${Math.max(4, (Number(item.value) / max) * 100)}%`, bgcolor: alpha(color, item.value ? 0.76 : 0.16), borderRadius: '6px 6px 2px 2px', transition: 'height .4s ease' }} />
          <Typography noWrap sx={{ mt: 0.35, fontSize: 10, color: theme.palette.text.secondary }}>{item.label}</Typography>
        </Box>
      ))}
    </Box>
  );
};

const FinanceBar = ({ label, value, total, color }) => {
  const theme = useTheme();
  const percent = total > 0 ? Math.min(100, (Number(value) / total) * 100) : 0;
  return (
    <Box sx={{ mb: 0.75 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.7}>
        <FinanceLabel>{label}</FinanceLabel>
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: theme.palette.text.primary }}>{compactMoney(value)}</Typography>
      </Stack>
      <Box sx={{ mt: 0.35, height: 6, borderRadius: 3, bgcolor: alpha(theme.palette.text.primary, 0.06), overflow: 'hidden' }}>
        <Box sx={{ width: `${percent}%`, height: '100%', borderRadius: 3, bgcolor: color }} />
      </Box>
    </Box>
  );
};

const FinanceGroup = ({ title, icon: Icon, color, metrics = [] }) => {
  const theme = useTheme();
  return (
    <Box sx={{ p: 1.2, height: '100%', ...softPanelSx(theme) }}>
      <Stack direction="row" alignItems="center" spacing={0.55} sx={{ mb: 0.7 }}>
        <Box sx={{ width: 25, height: 25, borderRadius: '8px', bgcolor: alpha(color, 0.08), color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon sx={{ fontSize: 14 }} />
        </Box>
        <Typography sx={{ fontSize: 12, fontWeight: 900, color: theme.palette.text.primary }}>{title}</Typography>
      </Stack>
      <Stack spacing={0.4}>
        {metrics.map((metric) => (
          <Stack key={metric.label} direction="row" alignItems="center" justifyContent="space-between" spacing={0.65}>
            <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>{metric.label}</Typography>
            <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: metric.color || theme.palette.text.primary, direction: 'rtl', whiteSpace: 'nowrap' }}>{metric.value}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

const FinanceSummaryStrip = ({
  contractRate, currencyLabel, adjustedAmount, adjustedAmountRial, totalPaid,
  remainingRial, progressPercent, adjustmentNetRial, adjustmentNetForeign,
  adjustmentCount,
}) => {
  const theme = useTheme();
  const success = theme.palette.success.main;
  const warning = theme.palette.warning.main;
  const danger = theme.palette.error.main;
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
      <StudioMetric icon={AccountBalanceIcon} label="مبلغ مؤثر قرارداد" value={`${compactMoney(adjustedAmountRial)} ریال`}
        hint={contractRate > 1 ? `معادل ${compactMoney(adjustedAmount)} ${currencyLabel}` : 'شامل الحاقیه و تعدیل'} color={warning} />
      <StudioMetric icon={PaymentsIcon} label="پرداخت‌شده" value={`${compactMoney(totalPaid)} ریال`}
        hint={`${toPersianDigits(progressPercent)}٪ پیشرفت`} color={success} />
      <StudioMetric icon={AccountBalanceIcon} label="مانده قابل پرداخت" value={`${compactMoney(remainingRial)} ریال`}
        hint={`مانده از ${compactMoney(adjustedAmountRial)} ریال`} color={danger} />
      <StudioMetric icon={InsightsIcon} label="اثر تعدیلات"
        value={contractRate > 1 ? `${formatPersianNumber(adjustmentNetForeign || 0)} ${currencyLabel}` : `${formatPersianNumber(adjustmentNetRial || 0)} ریال`}
        hint={`${toPersianDigits(adjustmentCount)} تعدیل ثبت‌شده`} color={adjustmentNetRial >= 0 ? success : danger} />
    </Box>
  );
};

const FinanceCharts = ({
  totalStatements, totalPaid, totalInvoices, remainingRial, progressPercent,
  adjustedAmountRial, monthlyPayments,
}) => {
  const theme = useTheme();
  const success = theme.palette.success.main;
  const info = theme.palette.info.main;
  const danger = theme.palette.error.main;
  const primary = theme.palette.primary.main;
  const violet = theme.palette.secondary.main;
  const total = adjustedAmountRial || 1;
  return (
    <Box sx={{ mt: 1.2, display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.05fr 1.2fr 1fr' }, gap: 1 }}>
      <Box sx={{ p: 1.2, ...softPanelSx(theme) }}>
        <Typography sx={{ fontSize: 12, fontWeight: 900, color: theme.palette.text.primary, mb: 0.7 }}>پیشرفت پرداخت</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.35 }}>
          <FinanceRing percent={progressPercent} color={progressPercent >= 100 ? success : info} track={theme.palette.divider}
            label="پرداخت‌شده" value={`${compactMoney(totalPaid)} ریال`} />
        </Box>
        <Stack direction="row" justifyContent="space-between" spacing={0.5} sx={{ mt: 0.6 }}>
          <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>مانده: <Box component="span" sx={{ fontWeight: 800, color: danger }}>{compactMoney(remainingRial)} ریال</Box></Typography>
          <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>صورت‌وضعیت: <Box component="span" sx={{ fontWeight: 800, color: primary }}>{compactMoney(totalStatements)} ریال</Box></Typography>
        </Stack>
      </Box>

      <Box sx={{ p: 1.2, ...softPanelSx(theme) }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
          <Typography sx={{ fontSize: 12, fontWeight: 900, color: theme.palette.text.primary }}>جریان پرداخت شش‌ماهه</Typography>
          <Chip size="small" label={`${toPersianDigits(monthlyPayments.filter((item) => item.value > 0).length)} ماه فعال`} sx={{ height: 18, fontSize: 10, bgcolor: alpha(info, 0.08), color: info }} />
        </Stack>
        <MonthlyBars data={monthlyPayments} color={info} />
      </Box>

      <Box sx={{ p: 1.2, ...softPanelSx(theme) }}>
        <Typography sx={{ fontSize: 12, fontWeight: 900, color: theme.palette.text.primary, mb: 0.6 }}>نسبت‌های کلیدی</Typography>
        <FinanceBar label="پرداخت به قرارداد" value={totalPaid} total={total} color={success} />
        <FinanceBar label="صورت‌وضعیت به قرارداد" value={totalStatements} total={total} color={primary} />
        <FinanceBar label="فاکتورها به قرارداد" value={totalInvoices} total={total} color={violet} />
        <FinanceBar label="مانده تعهد" value={remainingRial} total={total} color={danger} />
      </Box>
    </Box>
  );
};


const FinanceGroups = ({ financial, contractRate, currencyLabel, adjustmentNetRial, totalPaid, remainingRial }) => {
  const theme = useTheme();
  const success = theme.palette.success.main;
  const info = theme.palette.info.main;
  const warning = theme.palette.warning.main;
  const danger = theme.palette.error.main;
  const violet = theme.palette.secondary.main;
  const rial = financial.rial;
  const foreign = financial.foreign;
  const display = (ri, fo) => contractRate > 1
    ? `${formatPersianNumber(fo || 0)} ${currencyLabel}`
    : `${formatPersianNumber(ri || 0)} ریال`;
  return (
    <Box sx={{ mt: 1.2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
      <FinanceGroup title="تعدیلات" icon={TrendingUpIcon} color={violet} metrics={[
        { label: 'تعدیل افزایشی', value: display(financial.adjustments.increase, financial.adjustments.increaseForeign), color: success },
        { label: 'تعدیل کاهشی', value: display(financial.adjustments.decrease, financial.adjustments.decreaseForeign), color: danger },
        { label: 'اثر خالص', value: display(adjustmentNetRial, financial.adjustments.netForeign), color: adjustmentNetRial >= 0 ? success : danger },
      ]} />
      <FinanceGroup title="کسورات" icon={TrendingDownIcon} color={danger} metrics={[
        { label: 'حسن انجام کار', value: display(rial.retention, foreign.retention) },
        { label: 'پیش‌پرداخت کسرشده', value: display(rial.prepayment, foreign.prepayment), color: info },
        { label: 'ارزش افزوده', value: display(rial.vat, foreign.vat) },
        { label: 'بیمه', value: display(rial.insurance, foreign.insurance) },
      ]} />
      <FinanceGroup title="سایر اقلام" icon={AccountBalanceIcon} color={warning} metrics={[
        { label: 'علی‌الحساب و مصالح', value: display(rial.statementAdvance + rial.otherAdvances + rial.materials, foreign.statementAdvance + foreign.otherAdvances + foreign.materials) },
        { label: 'سایر کسورات', value: display(rial.otherDeductions, foreign.otherDeductions), color: danger },
        { label: 'سایر اضافات', value: display(rial.otherAdditions, foreign.otherAdditions), color: success },
      ]} />
      <FinanceGroup title="خلاصهٔ نقدی" icon={PaymentsIcon} color={success} metrics={[
        { label: 'خالص قابل پرداخت', value: display(rial.net, foreign.net), color: success },
        { label: 'پرداخت‌شده', value: `${compactMoney(totalPaid)} ریال`, color: success },
        { label: 'مانده', value: `${compactMoney(remainingRial)} ریال`, color: danger },
      ]} />
    </Box>
  );
};

export const ContractFinanceStudioCard = ({
  financial, contractRate, currencyLabel, adjustedAmount, adjustedAmountRial,
  totalStatements, totalPaid, totalInvoices, remainingRial, progressPercent,
  adjustmentNetRial, monthlyPayments = [],
}) => {
  const theme = useTheme();
  const info = theme.palette.info.main;
  const primary = theme.palette.primary.main;
  return (
    <SectionCard title="تحلیل مالی قرارداد" icon={InsightsIcon} color={info} sx={{ mb: 2 }}
      action={(
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
          <Chip size="small" label={currencyLabel} sx={{ height: 21, fontSize: 11, bgcolor: alpha(info, 0.08), color: info }} />
          {contractRate > 1 ? <Chip size="small" label={`نرخ ${formatPersianNumber(contractRate)} ریال`} sx={{ height: 21, fontSize: 11, bgcolor: alpha(theme.palette.text.primary, 0.05), color: theme.palette.text.secondary }} /> : null}
          <Chip size="small" label={`${toPersianDigits(financial.count)} صورت‌وضعیت`} sx={{ height: 21, fontSize: 11, bgcolor: alpha(primary, 0.08), color: primary }} />
        </Stack>
      )}>
      <FinanceSummaryStrip contractRate={contractRate} currencyLabel={currencyLabel}
        adjustedAmount={adjustedAmount} adjustedAmountRial={adjustedAmountRial}
        totalPaid={totalPaid} remainingRial={remainingRial} progressPercent={progressPercent}
        adjustmentNetRial={adjustmentNetRial} adjustmentNetForeign={financial.adjustments.netForeign}
        adjustmentCount={financial.adjustments.count} />
      <FinanceCharts totalStatements={totalStatements} totalPaid={totalPaid} totalInvoices={totalInvoices}
        remainingRial={remainingRial} progressPercent={progressPercent}
        adjustedAmountRial={adjustedAmountRial} monthlyPayments={monthlyPayments} />
      <FinanceGroups financial={financial} contractRate={contractRate} currencyLabel={currencyLabel}
        adjustmentNetRial={adjustmentNetRial} totalPaid={totalPaid} remainingRial={remainingRial} />
    </SectionCard>
  );
};


export const GuaranteeCompactCard = ({ summary, items = [], count = 0, coverage: coverageValue, currencyLabel, onOpen }) => {
  const theme = useTheme();
  const warning = theme.palette.warning.main;
  const coverage = Number(coverageValue ?? summary?.coverage_percent ?? 0);
  const color = coverage >= 100 ? theme.palette.info.main : coverage > 0 ? warning : theme.palette.error.main;
  return (
    <SectionCard title="تضامین قرارداد" icon={LockIcon} color={warning} sx={{ height: '100%' }}
      action={<Chip size="small" label={`${toPersianDigits(count)} فقره`} sx={{ height: 20, fontSize: 11, bgcolor: alpha(warning, 0.08), color: warning }} />}>
      {summary || items.length ? (
        <>
          {summary ? (
            <>
              <Box sx={{ p: 1.1, borderRadius: 'var(--hrms-radius-medium, 12px)', bgcolor: alpha(color, 0.05), border: `1px solid ${alpha(color, 0.16)}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box><FinanceLabel>پوشش تأمین</FinanceLabel><FinanceValue color={color} size={20}>{toPersianDigits(coverage)}٪</FinanceValue></Box>
                  <LockIcon sx={{ fontSize: 22, color }} />
                </Stack>
                <Box sx={{ mt: 0.7 }}><ProgressBar value={coverage} color={color} height={7} /></Box>
              </Box>
              <Box sx={{ mt: 0.8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.65 }}>
                <StudioFact label="نیاز" value={formatPersianNumber(summary.required_total || 0)} />
                <StudioFact label="تأمین" value={formatPersianNumber(summary.provided_total || 0)} />
                <StudioFact label="کمبود" value={formatPersianNumber(summary.balance_total || 0)} color={summary.balance_total > 0 ? theme.palette.error.main : theme.palette.success.main} />
              </Box>
            </>
          ) : null}
          {items.length ? (
            <Stack spacing={0.55} sx={{ mt: 0.8 }}>
              {items.slice(0, 4).map((item) => (
                <Box key={item.id || `${item.number}-${item.amount}`} sx={{ p: 0.8, ...softPanelSx(theme) }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: theme.palette.text.primary }}>{item.number || item.type_label || 'تضمین'}</Typography>
                    <Typography sx={{ fontSize: 11, color: theme.palette.text.secondary }}>{toJalali(item.expiry_date)}</Typography>
                  </Stack>
                  <Typography sx={{ mt: 0.15, fontSize: 11, color: warning, fontWeight: 700 }}>{formatPersianNumber(item.amount || 0)} {currencyLabel}</Typography>
                </Box>
              ))}
            </Stack>
          ) : <Typography sx={{ mt: 0.8, fontSize: 12, color: theme.palette.text.secondary }}>تضمینی ثبت نشده است.</Typography>}
          {onOpen ? <Typography onClick={onOpen} sx={{ mt: 0.8, fontSize: 11, color: theme.palette.info.main, fontWeight: 700, cursor: 'pointer' }}>مشاهدهٔ همهٔ تضامین و اقلام ←</Typography> : null}
        </>
      ) : <EmptyState icon={LockIcon} text="تضمینی برای این قرارداد ثبت نشده است." />}
    </SectionCard>
  );
};

export const CoverageCompactCard = ({ summary, coverage, onOpen }) => {
  const theme = useTheme();
  const percent = Number(coverage || 0);
  const color = percent >= 100 ? theme.palette.success.main : percent > 0 ? theme.palette.warning.main : theme.palette.error.main;
  return (
    <SectionCard title="پوشش تعهدات" icon={AccountBalanceIcon} color={color} sx={{ height: '100%' }}
      action={onOpen ? <Chip size="small" label="جزئیات" onClick={onOpen} sx={{ height: 20, fontSize: 11, cursor: 'pointer', color: theme.palette.info.main }} /> : null}>
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.4 }}>
        <FinanceRing percent={percent} color={color} track={theme.palette.divider} label="پوشش" value={percent >= 100 ? 'کامل' : 'نیازمند تکمیل'} />
      </Box>
      <Box sx={{ mt: 0.6, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.6 }}>
        <StudioFact label="مورد نیاز" value={formatPersianNumber(summary?.required_total || 0)} />
        <StudioFact label="تأمین‌شده" value={formatPersianNumber(summary?.provided_total || 0)} color={theme.palette.success.main} />
        <StudioFact label="کمبود" value={formatPersianNumber(summary?.balance_total || 0)} color={summary?.balance_total > 0 ? theme.palette.error.main : theme.palette.success.main} />
        <StudioFact label="آزادشده" value={formatPersianNumber(summary?.released_total || 0)} />
      </Box>
      <Typography sx={{ mt: 0.7, fontSize: 11, color: theme.palette.text.secondary, lineHeight: 1.8 }}>پوشش بر اساس اقلام الزامات تضمین و مبالغ تأمین‌شده محاسبه می‌شود.</Typography>
    </SectionCard>
  );
};


export const AddendumsStudioCard = ({ addendums = [], onOpen }) => {
  const theme = useTheme();
  return (
    <SectionCard title="الحاقیه‌ها" icon={EditNoteIcon} color={theme.palette.secondary.main} sx={{ height: '100%' }}
      action={<Chip size="small" label={`${toPersianDigits(addendums.length)} الحاقیه`} sx={{ height: 20, fontSize: 11, bgcolor: alpha(theme.palette.secondary.main, 0.08), color: theme.palette.secondary.main }} />}>
      {addendums.length === 0 ? <EmptyState icon={EditNoteIcon} text="الحاقیه‌ای ثبت نشده است." /> : (
        <Stack spacing={0.65} sx={{ maxHeight: 245, overflowY: 'auto', pr: 0.3 }}>
          {addendums.map((addendum) => (
            <Box key={addendum.id} sx={{ p: 0.9, ...softPanelSx(theme), borderRight: `3px solid ${theme.palette.secondary.main}` }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
                <Typography sx={{ fontSize: 11, fontWeight: 900, color: theme.palette.text.primary }}>{toPersianDigits(addendum.number || '—')}</Typography>
                <Typography sx={{ fontSize: 10, color: theme.palette.text.secondary }}>{toJalali(addendum.date)}</Typography>
              </Stack>
              {addendum.subject_type_display ? <Typography sx={{ mt: 0.15, fontSize: 11, fontWeight: 700, color: theme.palette.secondary.main }}>{addendum.subject_type_display}</Typography> : null}
              <Stack direction="row" spacing={0.35} useFlexGap flexWrap="wrap" sx={{ mt: 0.35 }}>
                {addendum.amount_change != null && addendum.amount_change !== '' ? <Chip size="small" label={`${Number(addendum.amount_change) >= 0 ? '+' : ''}${formatPersianNumber(addendum.amount_change)}`} sx={{ height: 17, fontSize: 10, bgcolor: alpha(theme.palette.info.main, 0.08), color: theme.palette.info.main }} /> : null}
                {addendum.percent_change != null && addendum.percent_change !== '' ? <Chip size="small" label={`${toPersianDigits(addendum.percent_change)}٪`} sx={{ height: 17, fontSize: 10, bgcolor: alpha(theme.palette.secondary.main, 0.08), color: theme.palette.secondary.main }} /> : null}
                {addendum.new_end_date ? <Chip size="small" label={`پایان ${toJalali(addendum.new_end_date)}`} sx={{ height: 17, fontSize: 10, bgcolor: alpha(theme.palette.text.primary, 0.05), color: theme.palette.text.secondary }} /> : null}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
      {onOpen ? <Typography onClick={onOpen} sx={{ mt: 0.7, fontSize: 11, color: theme.palette.info.main, fontWeight: 700, cursor: 'pointer' }}>مشاهدهٔ پروندهٔ الحاقیه‌ها ←</Typography> : null}
    </SectionCard>
  );
};

export const TermsStudioCard = ({ title, icon: Icon, color, text, onOpen, actionLabel = 'ویرایش' }) => {
  const theme = useTheme();
  return (
    <SectionCard title={title} icon={Icon} color={color} sx={{ height: '100%' }}
      action={onOpen ? <Chip size="small" label={actionLabel} onClick={onOpen} sx={{ height: 20, fontSize: 11, cursor: 'pointer', color: theme.palette.info.main }} /> : null}>
      <Box sx={{ p: 1.15, height: 'calc(100% - 10px)', minHeight: 112, ...softPanelSx(theme) }}>
        <Typography sx={{ fontSize: 12, color: text ? theme.palette.text.primary : theme.palette.text.secondary, lineHeight: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {text || 'برای این قرارداد ثبت نشده است.'}
        </Typography>
      </Box>
    </SectionCard>
  );
};

export const RelatedContractsStudioCard = ({ contracts = [], onOpen, statusLabels = {}, statusColors = {} }) => {
  const theme = useTheme();
  const info = theme.palette.info.main;
  return (
    <SectionCard title="قراردادهای هم‌تراز" icon={BusinessIcon} color={info}
      action={<Chip size="small" label={`${toPersianDigits(contracts.length)} قرارداد`} sx={{ height: 20, fontSize: 11, bgcolor: alpha(info, 0.08), color: info }} />}>
      {contracts.length === 0 ? <EmptyState icon={BusinessIcon} text="قرارداد مرتبطی در همین پروژه‌ها یافت نشد." /> : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 1 }}>
          {contracts.map((row) => {
            const statusColor = statusColors[row.status] || theme.palette.text.secondary;
            return (
              <ButtonBase key={row.id} onClick={() => onOpen(row.id)} sx={{ display: 'block', textAlign: 'right', p: 1.15, height: '100%', ...panelSx, borderRadius: 'var(--hrms-radius-medium, 13px)', '&:hover': { borderColor: alpha(info, 0.42) } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.6}>
                  <Typography sx={{ fontSize: 12, fontWeight: 900, color: theme.palette.text.primary }}>{toPersianDigits(row.number || '—')}</Typography>
                  <Chip size="small" label={statusLabels[row.status] || '—'} sx={{ height: 18, fontSize: 10, bgcolor: alpha(statusColor, 0.08), color: statusColor }} />
                </Stack>
                <Typography sx={{ mt: 0.5, fontSize: 11, fontWeight: 700, color: theme.palette.text.primary, lineHeight: 1.6, minHeight: 35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{row.subject || '—'}</Typography>
                <Typography sx={{ mt: 0.25, fontSize: 10, color: theme.palette.text.secondary }}>{row.party_name || '—'}</Typography>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5} sx={{ mt: 0.75, pt: 0.65, borderTop: `1px solid ${theme.palette.divider}` }}>
                  <Typography sx={{ fontSize: 10, fontWeight: 800, color: theme.palette.warning.main, direction: 'rtl' }}>
                    {formatPersianNumber(row.effective_amount ?? row.amount ?? 0)} {normalizeCurrencyLabel(row.currency_name || row.currency_symbol)}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: theme.palette.text.secondary }}>{toJalali(row.effective_end_date || row.end_date)}</Typography>
                </Stack>
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </SectionCard>
  );
};
