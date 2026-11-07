import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Stack, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import TuneIcon from '@mui/icons-material/Tune';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import PageHeader from '../../core/components/ui/PageHeader';
import {
  STATUS_META, INCOMING, OUTGOING, INTERNAL, OK, WARN, SOON, DANGER, SLATE, ACCENT,
  chipSx, dateLabel, daysBetween, daysColor, daysLabel, REFERRAL_STATUS_META, MetaChip,
} from './correspondenceUi';
import {
  StudioKpi, StudioCard, StudioRow, StudioBar, QuickAction, deltaPercent, MUTED,
} from './correspondenceStudioUi';

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const JALALI_SHORT = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const monthLabel = (row) => {
  if (row?.label) return String(row.label).split(' ')[0];
  const parts = String(row?.period || '').split('-');
  const month = Number(parts[1]);
  return JALALI_SHORT[month - 1] || row?.period || '—';
};


const CorrespondenceDashboardPage = () => {
  const navigate = useNavigate();
  const statsQuery = useQuery({
    queryKey: ['correspondence-stats'],
    queryFn: () => axiosInstance.get('/letters/stats/').then((response) => response.data),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const { data: stats, isLoading, isFetching, isError, refetch } = statsQuery;
  const { data: myReferrals } = useQuery({
    queryKey: ['correspondence-my-referrals'],
    queryFn: () => axiosInstance.get('/letter-referrals/', {
      params: { mine: 1, open_only: 1, page_size: 8 },
    }).then((response) => response.data),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
  const { data: recent } = useQuery({
    queryKey: ['correspondence-recent'],
    queryFn: () => axiosInstance.get('/letters/', { params: { page_size: 12 } })
      .then((response) => response.data),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const totals = stats?.totals || {};
  const trend = useMemo(() => stats?.trend || [], [stats]);
  const recentLetters = useMemo(() => asList(recent), [recent]);
  const referrals = useMemo(() => asList(myReferrals).slice(0, 6), [myReferrals]);

  const monthDelta = useMemo(() => {
    if (trend.length < 2) return { incoming: null, outgoing: null };
    const previous = trend[trend.length - 2] || {};
    const current = trend[trend.length - 1] || {};
    return {
      incoming: deltaPercent(previous.incoming, current.incoming),
      outgoing: deltaPercent(previous.outgoing, current.outgoing),
    };
  }, [trend]);

  const maxTrend = useMemo(
    () => Math.max(1, ...trend.map((row) => (row.incoming || 0) + (row.outgoing || 0) + (row.internal || 0))),
    [trend],
  );

  const statusRows = useMemo(() => Object.entries(stats?.by_status || {})
    .map(([key, count]) => ({ key, count, meta: STATUS_META[key] || { label: key, color: SLATE } }))
    .sort((a, b) => b.count - a.count), [stats]);

  const categoryRows = useMemo(() => (stats?.by_category || []).map((row) => ({
    id: row.category_id,
    name: row.category__name || 'بدون نوع',
    count: row.c,
  })), [stats]);

  const organizationRows = useMemo(() => (stats?.top_organizations || []).map((row) => ({
    name: row.organization__name || '—',
    count: row.c,
  })), [stats]);

  const scannedPercent = totals.all
    ? Math.round(((totals.with_attachments || 0) / totals.all) * 100)
    : 0;

  const go = (path, params) => navigate(`${path}${params ? `?${params}` : ''}`);

  if (isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress sx={{ color: ACCENT }} /></Box>;
  }

  return (
    <Box sx={{ pb: 1, minWidth: 0 }}>
      <PageHeader
        icon={<DashboardIcon />}
        title="داشبورد مکاتبات اداری"
        subtitle="نمای عملیاتی دفتر وارده و صادره، ارجاعات و اقدامات عقب‌افتاده"
        badge={(
          <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
            <Chip size="small" label={`${formatPersianNumber(totals.all || 0)} مکاتبه`}
              sx={{ height: 23, fontWeight: 800, bgcolor: alpha(ACCENT, 0.1), color: '#0369a1' }} />
            {totals.overdue ? (
              <Chip size="small" label={`${formatPersianNumber(totals.overdue)} معوق`}
                sx={{ height: 23, fontWeight: 800, bgcolor: alpha(DANGER, 0.1), color: DANGER }} />
            ) : null}
            {totals.without_attachments ? (
              <Chip size="small" label={`${formatPersianNumber(totals.without_attachments)} بدون اسکن`}
                sx={{ height: 23, fontWeight: 800, bgcolor: alpha(WARN, 0.1), color: WARN }} />
            ) : null}
          </Stack>
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی آمار">
              <span>
                <Button variant="outlined" startIcon={<RefreshIcon />} disabled={isFetching}
                  onClick={() => refetch()}>
                  {isFetching ? 'در حال به‌روزرسانی…' : 'به‌روزرسانی'}
                </Button>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<InboxIcon />}
              onClick={() => go('/correspondence/incoming', 'new=1')}>
              نامه وارده
            </Button>
            <Button variant="contained" startIcon={<SendIcon />}
              onClick={() => go('/correspondence/outgoing', 'new=1')}
              sx={{ bgcolor: OUTGOING, '&:hover': { bgcolor: '#115e59' } }}>
              نامه صادره
            </Button>
          </>
        )}
      />

      {isError ? (
        <Alert severity="error" sx={{ mb: 1.25 }}>
          دریافت آمار داشبورد ناموفق بود؛ اتصال به سرور را بررسی کنید.
        </Alert>
      ) : null}

      {/* کارت‌های شاخص */}
      <Box sx={{
        display: 'grid', gap: 1, mb: 1.25, minWidth: 0,
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0,1fr))', sm: 'repeat(3, minmax(0,1fr))',
          md: 'repeat(4, minmax(0,1fr))', xl: 'repeat(6, minmax(0,1fr))',
        },
      }}>
        <StudioKpi label="نامه‌های وارده" value={formatPersianNumber(totals.incoming || 0)}
          hint={`این ماه: ${formatPersianNumber(totals.incoming_this_month || 0)}`}
          delta={monthDelta.incoming} color={INCOMING} icon={InboxIcon}
          onClick={() => go('/correspondence/incoming')} />
        <StudioKpi label="نامه‌های صادره" value={formatPersianNumber(totals.outgoing || 0)}
          hint={`این ماه: ${formatPersianNumber(totals.outgoing_this_month || 0)}`}
          delta={monthDelta.outgoing} color={OUTGOING} icon={SendIcon}
          onClick={() => go('/correspondence/outgoing')} />
        <StudioKpi label="مکاتبات داخلی" value={formatPersianNumber(totals.internal || 0)}
          hint="نامه‌های بین واحدها" color={INTERNAL} icon={MailOutlineIcon}
          onClick={() => go('/correspondence/internal')} />
        <StudioKpi label="در جریان" value={formatPersianNumber(totals.open || 0)}
          hint={`پیش‌نویس: ${formatPersianNumber(totals.drafts || 0)}`} color={WARN}
          icon={EditNoteIcon} onClick={() => go('/correspondence/letters', 'status=in_progress')} />
        <StudioKpi label="معوقات پاسخ" value={formatPersianNumber(totals.overdue || 0)}
          hint={`نزدیک مهلت: ${formatPersianNumber(totals.due_soon || 0)}`}
          color={DANGER} icon={WarningAmberIcon} onClick={() => go('/correspondence/overdue')} />
        <StudioKpi label="ارجاعات باز من" value={formatPersianNumber(totals.my_referrals || 0)}
          hint={`معوق: ${formatPersianNumber(totals.my_overdue_referrals || 0)}`}
          color={INTERNAL} icon={AltRouteIcon} onClick={() => go('/correspondence/referrals')} />
      </Box>


      {/* صف اقدام + دسترسی سریع */}
      <Box sx={{
        display: 'grid', gap: 1.25, mb: 1.25, minWidth: 0,
        gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: '1.25fr 0.75fr' },
      }}>
        <StudioCard icon={TuneIcon} title="صف اقدام امروز" color={WARN}
          hint="مواردی که منتظر کار شما هستند">
          <Box sx={{
            display: 'grid', gap: 0.75,
            gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2, minmax(0,1fr))' },
          }}>
            <QuickAction icon={WarningAmberIcon} label="معوق (گذشته از مهلت)"
              description={`${formatPersianNumber(totals.overdue || 0)} مکاتبه`}
              color={DANGER} onClick={() => go('/correspondence/overdue')} />
            <QuickAction icon={ScheduleIcon} label="نزدیک مهلت (۷ روز)"
              description={`${formatPersianNumber(totals.due_soon || 0)} مکاتبه`}
              color={SOON} onClick={() => go('/correspondence/letters', 'status=in_progress')} />
            <QuickAction icon={EditNoteIcon} label="پیش‌نویس‌های نیمه‌کاره"
              description={`${formatPersianNumber(totals.drafts || 0)} مکاتبه`}
              color={SLATE} onClick={() => go('/correspondence/drafts')} />
            <QuickAction icon={AttachFileIcon} label="نامه‌های وارده بدون اسکن"
              description={`${formatPersianNumber(totals.without_attachments || 0)} مکاتبه`}
              color={WARN} onClick={() => go('/correspondence/incoming', 'has_attachments=0')} />
          </Box>
          <Box sx={{ mt: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.4 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: MUTED }}>نسبت مکاتبات اسکن‌شده</Typography>
              <Typography sx={{ fontSize: 11, fontWeight: 900, color: OK }}>
                {toPersianDigits(scannedPercent)}٪
              </Typography>
            </Stack>
            <StudioBar value={scannedPercent} color={OK} height={6} />
            <Typography sx={{ mt: 0.35, fontSize: 10, color: MUTED }}>
              {formatPersianNumber(totals.with_attachments || 0)} از {formatPersianNumber(totals.all || 0)} مکاتبه پیوست دارد
            </Typography>
          </Box>
        </StudioCard>

        <StudioCard icon={SettingsSuggestIcon} title="دسترسی سریع" color={ACCENT}
          hint="میان‌بُرهای پرکاربرد">
          <Stack spacing={0.6}>
            <QuickAction icon={ForwardToInboxIcon} label="کارتابل من"
              description="ارجاعات باز و نیازمند اقدام" color={INTERNAL}
              onClick={() => go('/correspondence/workdesk')} />
            <QuickAction icon={SearchIcon} label="جست‌وجوی مکاتبات"
              description="بر اساس شماره، موضوع یا طرف حساب" color={INCOMING}
              onClick={() => go('/correspondence/letters')} />
            <QuickAction icon={DoneAllIcon} label="پاسخ‌داده‌شده‌ها"
              description="مرور مکاتبات بسته‌شده" color={OK}
              onClick={() => go('/correspondence/letters', 'status=answered')} />
            <QuickAction icon={SettingsSuggestIcon} label="نگاشت نام‌ها"
              description="قواعد تخصصی تطبیق نام در ورود داده" color={SLATE}
              onClick={() => go('/correspondence/name-mapping')} />
          </Stack>
        </StudioCard>
      </Box>


      {/* روند مکاتبات + ارجاعات باز */}
      <Box sx={{
        display: 'grid', gap: 1.25, mb: 1.25, minWidth: 0,
        gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: '1.15fr 0.85fr' },
      }}>
        <StudioCard icon={DashboardIcon} title="روند مکاتبات (۶ ماه اخیر)" color={ACCENT}
          hint="وارده / صادره / داخلی"
          action={(
            <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap"
              sx={{ display: { xs: 'none', sm: 'flex' } }}>
              {[['وارده', INCOMING], ['صادره', OUTGOING], ['داخلی', INTERNAL]].map(([label, color]) => (
                <Stack key={label} direction="row" spacing={0.35} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: 2, bgcolor: color }} />
                  <Typography sx={{ fontSize: 10, color: MUTED }}>{label}</Typography>
                </Stack>
              ))}
            </Stack>
          )}>
          {trend.length ? (
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.9, minHeight: 168, px: 0.25 }}>
              {trend.map((row) => {
                const total = (row.incoming || 0) + (row.outgoing || 0) + (row.internal || 0);
                const heightFor = (value) => `${Math.max(3, ((value || 0) / maxTrend) * 100)}%`;
                return (
                  <Tooltip key={row.period} arrow
                    title={`${row.label || row.period} — وارده ${formatPersianNumber(row.incoming || 0)}، صادره ${formatPersianNumber(row.outgoing || 0)}، داخلی ${formatPersianNumber(row.internal || 0)}`}>
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.4 }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 900, color: SLATE }}>
                        {formatPersianNumber(total)}
                      </Typography>
                      <Box sx={{
                        width: '100%', height: 118, display: 'flex', alignItems: 'flex-end',
                        justifyContent: 'center', gap: 0.35,
                      }}>
                        {[[row.incoming || 0, INCOMING], [row.outgoing || 0, OUTGOING], [row.internal || 0, INTERNAL]]
                          .map(([value, color]) => (
                            <Box key={color} sx={{
                              width: 9, height: heightFor(value), bgcolor: color,
                              borderRadius: '3px 3px 0 0', minHeight: 3, transition: 'height .3s ease',
                            }} />
                          ))}
                      </Box>
                      <Typography noWrap sx={{ fontSize: 10, color: MUTED, maxWidth: '100%' }}>
                        {monthLabel(row)}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 11.5, color: MUTED }}>داده‌ای برای نمایش نیست.</Typography>
          )}
        </StudioCard>

        <StudioCard icon={ForwardToInboxIcon} title="ارجاعات باز من" color={WARN}
          hint={`${formatPersianNumber(totals.my_overdue_referrals || 0)} مورد معوق`}
          action={(
            <Button size="small" variant="text" onClick={() => go('/correspondence/referrals')}
              sx={{ fontSize: 11 }}>
              همه
            </Button>
          )}>
          <Stack spacing={0.6}>
            {referrals.length ? referrals.map((referral) => {
              const days = daysBetween(referral.due_date);
              return (
                <StudioRow key={referral.id} onClick={() => go('/correspondence/referrals')}>
                  <Chip size="small" label={REFERRAL_STATUS_META[referral.status]?.label || '—'}
                    sx={chipSx(REFERRAL_STATUS_META[referral.status]?.color || WARN)} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap title={referral.letter_subject} sx={{ fontSize: 11, fontWeight: 800 }}>
                      {referral.letter_subject || '—'}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 9.5, color: MUTED }}>
                      {referral.letter_number ? `شماره ${toPersianDigits(referral.letter_number)}` : 'بدون شماره'}
                      {referral.note ? ` · ${referral.note}` : ''}
                    </Typography>
                  </Box>
                  {referral.due_date ? (
                    <Typography noWrap sx={{ fontSize: 10, fontWeight: 800, color: daysColor(days) }}>
                      {daysLabel(days)}
                    </Typography>
                  ) : null}
                </StudioRow>
              );
            }) : (
              <Typography sx={{ fontSize: 11.5, color: OK }}>ارجاع بازی برای شما وجود ندارد.</Typography>
            )}
          </Stack>
        </StudioCard>
      </Box>


      {/* توزیع وضعیت / نوع / طرف حساب */}
      <Box sx={{
        display: 'grid', gap: 1.25, mb: 1.25, minWidth: 0,
        gridTemplateColumns: { xs: 'minmax(0,1fr)', md: 'repeat(3, minmax(0,1fr))' },
      }}>
        <StudioCard icon={DoneAllIcon} title="وضعیت پرونده‌ها" color={OK} hint="به تفکیک مرحله">
          <Stack spacing={0.75}>
            {statusRows.length ? statusRows.map((row) => {
              const percent = totals.all ? Math.round((row.count / totals.all) * 100) : 0;
              return (
                <Box key={row.key}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.3 }}>
                    <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: SLATE }}>{row.meta.label}</Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 900, color: row.meta.color }}>
                      {formatPersianNumber(row.count)}
                    </Typography>
                  </Stack>
                  <StudioBar value={percent} color={row.meta.color} height={5} />
                </Box>
              );
            }) : (
              <Typography sx={{ fontSize: 11.5, color: MUTED }}>داده‌ای برای نمایش نیست.</Typography>
            )}
          </Stack>
        </StudioCard>

        <StudioCard icon={MailOutlineIcon} title="نوع مکاتبه" color={INTERNAL} hint="پرتکرارترین انواع">
          <Stack spacing={0.7}>
            {categoryRows.length ? categoryRows.map((row) => {
              const max = Math.max(1, ...categoryRows.map((item) => item.count));
              return (
                <Box key={row.id}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.3 }}>
                    <Typography noWrap title={row.name} sx={{ fontSize: 11, fontWeight: 700, color: SLATE }}>
                      {row.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 900, color: INTERNAL }}>
                      {formatPersianNumber(row.count)}
                    </Typography>
                  </Stack>
                  <StudioBar value={(row.count / max) * 100} color={INTERNAL} height={5} />
                </Box>
              );
            }) : (
              <Typography sx={{ fontSize: 11.5, color: MUTED }}>نوعی برای مکاتبات ثبت نشده است.</Typography>
            )}
          </Stack>
        </StudioCard>

        <StudioCard icon={AltRouteIcon} title="طرف حساب‌های فعال" color={INCOMING} hint="بیشترین مکاتبه"
          action={(
            <Button size="small" variant="text" sx={{ fontSize: 11 }}
              onClick={() => go('/correspondence/letters')}>
              فهرست
            </Button>
          )}>
          <Stack spacing={0.6}>
            {organizationRows.length ? organizationRows.map((row) => (
              <StudioRow key={row.name} dense
                onClick={() => go('/correspondence/letters', `q=${encodeURIComponent(row.name)}`)}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap title={row.name} sx={{ fontSize: 11, fontWeight: 700 }}>{row.name}</Typography>
                </Box>
                <Chip size="small" label={formatPersianNumber(row.count)} sx={chipSx(INCOMING)} />
              </StudioRow>
            )) : (
              <Typography sx={{ fontSize: 11.5, color: MUTED }}>طرف حسابی ثبت نشده است.</Typography>
            )}
          </Stack>
        </StudioCard>
      </Box>


      {/* آخرین مکاتبات + معوقات */}
      <Box sx={{
        display: 'grid', gap: 1.25, minWidth: 0,
        gridTemplateColumns: {
          xs: 'minmax(0,1fr)', md: 'repeat(2, minmax(0,1fr))', xl: 'repeat(3, minmax(0,1fr))',
        },
      }}>
        <StudioCard icon={InboxIcon} title="آخرین نامه‌های وارده" color={INCOMING}
          action={(
            <Button size="small" variant="text" onClick={() => go('/correspondence/incoming')}
              sx={{ fontSize: 11 }}>
              همه
            </Button>
          )}>
          <Stack spacing={0.6}>
            {recentLetters.filter((row) => row.direction === 'incoming').length
              ? recentLetters.filter((row) => row.direction === 'incoming').slice(0, 5).map((row) => (
                <StudioRow key={row.id} onClick={() => go('/correspondence/incoming')}>
                  <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 800, width: 78, color: INCOMING }}>
                    {row.number ? toPersianDigits(row.number) : 'بدون شماره'}
                  </Typography>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap title={row.subject} sx={{ fontSize: 11, fontWeight: 700 }}>
                      {row.subject}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 9.5, color: MUTED }}>
                      {row.organization_name || '—'} · {dateLabel(row.letter_date)}
                    </Typography>
                  </Box>
                  <MetaChip meta={STATUS_META[row.status]} />
                </StudioRow>
              )) : (
                <Typography sx={{ fontSize: 11.5, color: MUTED }}>نامه‌ای ثبت نشده است.</Typography>
              )}
          </Stack>
        </StudioCard>

        <StudioCard icon={SendIcon} title="آخرین نامه‌های صادره" color={OUTGOING}
          action={(
            <Button size="small" variant="text" onClick={() => go('/correspondence/outgoing')}
              sx={{ fontSize: 11 }}>
              همه
            </Button>
          )}>
          <Stack spacing={0.6}>
            {recentLetters.filter((row) => row.direction === 'outgoing').length
              ? recentLetters.filter((row) => row.direction === 'outgoing').slice(0, 5).map((row) => (
                <StudioRow key={row.id} onClick={() => go('/correspondence/outgoing')}>
                  <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 800, width: 78, color: OUTGOING }}>
                    {row.number ? toPersianDigits(row.number) : 'بدون شماره'}
                  </Typography>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap title={row.subject} sx={{ fontSize: 11, fontWeight: 700 }}>
                      {row.subject}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 9.5, color: MUTED }}>
                      {row.organization_name || '—'} · {dateLabel(row.letter_date)}
                    </Typography>
                  </Box>
                  <MetaChip meta={STATUS_META[row.status]} />
                </StudioRow>
              )) : (
                <Typography sx={{ fontSize: 11.5, color: MUTED }}>نامه‌ای ثبت نشده است.</Typography>
              )}
          </Stack>
        </StudioCard>

        <StudioCard icon={WarningAmberIcon} title="معوقات پاسخ" color={DANGER}
          hint="گذشته از مهلت قانونی"
          action={(
            <Button size="small" variant="text" onClick={() => go('/correspondence/overdue')}
              sx={{ fontSize: 11 }}>
              همه
            </Button>
          )}>
          <Stack spacing={0.6}>
            {(stats?.recent?.overdue || []).length ? (stats?.recent?.overdue || []).map((row) => {
              const days = daysBetween(row.due_date);
              return (
                <StudioRow key={row.id} onClick={() => go('/correspondence/overdue')}>
                  <Chip size="small" label={daysLabel(days)} sx={chipSx(DANGER)} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap title={row.subject} sx={{ fontSize: 11, fontWeight: 700 }}>
                      {row.subject}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 9.5, color: MUTED }}>
                      {row.organization__name || row.organization_name || '—'} · مهلت {dateLabel(row.due_date)}
                    </Typography>
                  </Box>
                </StudioRow>
              );
            }) : (
              <Typography sx={{ fontSize: 11.5, color: OK }}>معوقه‌ای وجود ندارد.</Typography>
            )}
          </Stack>
        </StudioCard>
      </Box>
    </Box>
  );
};

export default CorrespondenceDashboardPage;
