import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import { Box, Button, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EditNoteIcon from '@mui/icons-material/EditNote';
import ForwardToInboxIcon from '@mui/icons-material/ForwardToInbox';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import SendIcon from '@mui/icons-material/Send';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import PageHeader from '../../core/components/ui/PageHeader';
import { MUTED } from '../accounting/AccountingDashboardUI';
import {
  ACCENT, DANGER, INCOMING, INTERNAL, KpiTile, MiniRow, OK, OUTGOING, PRIORITY_META,
  REFERRAL_STATUS_META, SLATE, STATUS_META, WARN, chipSx, dateLabel, daysBetween, daysColor,
  daysLabel, SectionPaper, SectionTitle, MetaChip,
} from './correspondenceUi';

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const CorrespondenceDashboardPage = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['correspondence-stats'],
    queryFn: () => axiosInstance.get('/letters/stats/').then((response) => response.data),
  });
  const { data: myReferrals } = useQuery({
    queryKey: ['correspondence-my-referrals'],
    queryFn: () => axiosInstance.get('/letter-referrals/', {
      params: { mine: 1, open_only: 1, page_size: 8 },
    }).then((response) => response.data),
  });
  const { data: recent } = useQuery({
    queryKey: ['correspondence-recent'],
    queryFn: () => axiosInstance.get('/letters/', { params: { page_size: 8 } })
      .then((response) => response.data),
  });

  const totals = stats?.totals || {};
  const trend = useMemo(() => stats?.trend || [], [stats]);
  const maxTrend = useMemo(
    () => Math.max(1, ...trend.map((row) => (row.incoming || 0) + (row.outgoing || 0))),
    [trend],
  );
  const referrals = asList(myReferrals).slice(0, 6);
  const recentLetters = asList(recent).slice(0, 8);

  const go = (params) => navigate(`/correspondence/letters?${params}`);

  if (isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress sx={{ color: ACCENT }} /></Box>;
  }

  return (
    <Box sx={{ pb: 1, minWidth: 0 }}>
      <PageHeader
        icon={<DashboardIcon />}
        title="داشبورد مکاتبات اداری"
        subtitle="نمای کلی دفتر وارده و صادره، ارجاعات باز و معوقات پاسخ"
        badge={(
          <Chip size="small" label={`${formatPersianNumber(totals.all || 0)} مکاتبه ثبت‌شده`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(ACCENT, 0.1), color: '#0369a1' }} />
        )}
        actions={(
          <>
            <Button variant="outlined" startIcon={<RefreshIcon />} disabled={isFetching}
              onClick={() => refetch()}>
              به‌روزرسانی
            </Button>
            <Button variant="outlined" startIcon={<InboxIcon />} onClick={() => go('direction=incoming&new=1')}>
              نامه وارده
            </Button>
            <Button variant="contained" startIcon={<SendIcon />} onClick={() => go('direction=outgoing&new=1')}
              sx={{ bgcolor: OUTGOING, '&:hover': { bgcolor: '#115e59' } }}>
              نامه صادره
            </Button>
          </>
        )}
      />

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0,1fr)', sm: 'repeat(2, minmax(0,1fr))',
          md: 'repeat(3, minmax(0,1fr))', lg: 'repeat(6, minmax(0,1fr))',
        },
        gap: 1, mb: 1.5, minWidth: 0,
      }}>
        <KpiTile label="نامه‌های وارده" value={formatPersianNumber(totals.incoming || 0)}
          hint={`این ماه: ${formatPersianNumber(totals.incoming_this_month || 0)}`}
          color={INCOMING} icon={InboxIcon} onClick={() => go('direction=incoming')} />
        <KpiTile label="نامه‌های صادره" value={formatPersianNumber(totals.outgoing || 0)}
          hint={`این ماه: ${formatPersianNumber(totals.outgoing_this_month || 0)}`}
          color={OUTGOING} icon={SendIcon} onClick={() => go('direction=outgoing')} />
        <KpiTile label="مکاتبات داخلی" value={formatPersianNumber(totals.internal || 0)}
          hint="نامه‌های داخلی" color={INTERNAL} icon={MailOutlineIcon}
          onClick={() => go('direction=internal')} />
        <KpiTile label="در جریان" value={formatPersianNumber(totals.open || 0)}
          hint={`پیش‌نویس: ${formatPersianNumber(totals.drafts || 0)}`} color={WARN}
          icon={EditNoteIcon} onClick={() => go('status=in_progress')} />
        <KpiTile label="معوقات پاسخ" value={formatPersianNumber(totals.overdue || 0)}
          hint="از مهلت گذشته" color={DANGER} icon={WarningAmberIcon} onClick={() => go('overdue=1')} />
        <KpiTile label="ارجاعات باز من" value={formatPersianNumber(totals.my_referrals || 0)}
          hint={`معوق: ${formatPersianNumber(totals.my_overdue_referrals || 0)}`}
          color={INTERNAL} icon={AltRouteIcon} onClick={() => go('scope=referred')} />
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: '1.1fr 0.9fr' },
        gap: 1.25, minWidth: 0,
      }}>
        <SectionPaper>
          <SectionTitle icon={DashboardIcon} title="روند مکاتبات (۶ ماه اخیر)"
            hint="تعداد نامه‌های وارده و صادره در هر ماه" />
          {trend.length ? (
            <Stack spacing={0.75}>
              {trend.map((row) => {
                const total = (row.incoming || 0) + (row.outgoing || 0);
                return (
                  <Stack key={row.period} direction="row" alignItems="center" spacing={1}
                    sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 10.5, width: 62, color: MUTED }}>
                      {row.period}
                    </Typography>
                    <Box sx={{
                      flex: 1, minWidth: 0, height: 8, borderRadius: 4,
                      bgcolor: alpha(SLATE, 0.1), display: 'flex', overflow: 'hidden',
                    }}>
                      <Box sx={{
                        width: `${((row.incoming || 0) / maxTrend) * 100}%`, bgcolor: INCOMING,
                        transition: 'width .3s ease',
                      }} />
                      <Box sx={{
                        width: `${((row.outgoing || 0) / maxTrend) * 100}%`, bgcolor: OUTGOING,
                        transition: 'width .3s ease',
                      }} />
                    </Box>
                    <Typography noWrap sx={{ fontSize: 10, fontWeight: 800, width: 74, textAlign: 'left' }}>
                      {toPersianDigits(row.incoming || 0)} / {toPersianDigits(row.outgoing || 0)}
                    </Typography>
                    <Chip size="small" label={toPersianDigits(total)} sx={chipSx(SLATE)} />
                  </Stack>
                );
              })}
              <Stack direction="row" spacing={1.25} sx={{ pt: 0.75 }}>
                <Stack direction="row" spacing={0.4} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: 2, bgcolor: INCOMING }} />
                  <Typography sx={{ fontSize: 10, color: MUTED }}>وارده</Typography>
                </Stack>
                <Stack direction="row" spacing={0.4} alignItems="center">
                  <Box sx={{ width: 8, height: 8, borderRadius: 2, bgcolor: OUTGOING }} />
                  <Typography sx={{ fontSize: 10, color: MUTED }}>صادره</Typography>
                </Stack>
              </Stack>
            </Stack>
          ) : (
            <Typography sx={{ fontSize: 11.5, color: MUTED }}>داده‌ای برای نمایش نیست.</Typography>
          )}
        </SectionPaper>

        <SectionPaper>
          <SectionTitle icon={ForwardToInboxIcon} title="ارجاعات باز من" color={WARN}
            hint="نامه‌هایی که برای شما ارجاع شده و در انتظار اقدام است"
            action={(
              <Button size="small" variant="text" endIcon={<ArrowBackIcon sx={{ fontSize: 14 }} />}
                onClick={() => go('scope=referred')} sx={{ fontSize: 11 }}>
                همه
              </Button>
            )} />
          <Stack spacing={0.6}>
            {referrals.length ? referrals.map((referral) => {
              const days = daysBetween(referral.due_date);
              return (
                <MiniRow key={referral.id} onClick={() => go('scope=referred')}>
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
                </MiniRow>
              );
            }) : (
              <Typography sx={{ fontSize: 11.5, color: MUTED }}>ارجاع بازی برای شما وجود ندارد.</Typography>
            )}
          </Stack>
        </SectionPaper>

        <SectionPaper>
          <SectionTitle icon={InboxIcon} title="آخرین نامه‌های وارده" color={INCOMING}
            action={(
              <Button size="small" variant="text" onClick={() => go('direction=incoming')}
                sx={{ fontSize: 11 }}>
                همه
              </Button>
            )} />
          <Stack spacing={0.6}>
            {recentLetters.filter((row) => row.direction === 'incoming').length
              ? recentLetters.filter((row) => row.direction === 'incoming').slice(0, 5).map((row) => (
                <MiniRow key={row.id} onClick={() => go('direction=incoming')}>
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
                </MiniRow>
              )) : (
                <Typography sx={{ fontSize: 11.5, color: MUTED }}>نامه‌ای ثبت نشده است.</Typography>
              )}
          </Stack>
        </SectionPaper>

        <SectionPaper>
          <SectionTitle icon={SendIcon} title="آخرین نامه‌های صادره" color={OUTGOING}
            action={(
              <Button size="small" variant="text" onClick={() => go('direction=outgoing')}
                sx={{ fontSize: 11 }}>
                همه
              </Button>
            )} />
          <Stack spacing={0.6}>
            {recentLetters.filter((row) => row.direction === 'outgoing').length
              ? recentLetters.filter((row) => row.direction === 'outgoing').slice(0, 5).map((row) => (
                <MiniRow key={row.id} onClick={() => go('direction=outgoing')}>
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
                  <MetaChip meta={PRIORITY_META[row.priority]} />
                </MiniRow>
              )) : (
                <Typography sx={{ fontSize: 11.5, color: MUTED }}>نامه‌ای ثبت نشده است.</Typography>
              )}
          </Stack>
        </SectionPaper>

        <SectionPaper>
          <SectionTitle icon={WarningAmberIcon} title="معوقات پاسخ" color={DANGER}
            hint="نامه‌های باز که مهلت پاسخ آن‌ها گذشته است"
            action={(
              <Button size="small" variant="text" onClick={() => go('overdue=1')} sx={{ fontSize: 11 }}>
                همه
              </Button>
            )} />
          <Stack spacing={0.6}>
            {(stats?.recent?.overdue || []).length ? (stats?.recent?.overdue || []).map((row) => {
              const days = daysBetween(row.due_date);
              return (
                <MiniRow key={row.id} onClick={() => go('overdue=1')}>
                  <Chip size="small" label={daysLabel(days)} sx={chipSx(DANGER)} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap title={row.subject} sx={{ fontSize: 11, fontWeight: 700 }}>
                      {row.subject}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 9.5, color: MUTED }}>
                      {row.organization_name || '—'} · مهلت {dateLabel(row.due_date)}
                    </Typography>
                  </Box>
                </MiniRow>
              );
            }) : (
              <Typography sx={{ fontSize: 11.5, color: OK }}>معوقه‌ای وجود ندارد.</Typography>
            )}
          </Stack>
        </SectionPaper>


      </Box>
    </Box>
  );
};

export default CorrespondenceDashboardPage;
