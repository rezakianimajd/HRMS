/**
 * روند نامه — یک تایم‌لاین واحد از ارجاعات، پاسخ‌ها و رویدادها.
 *
 * همین کامپوننت هم در پروندهٔ نامه (تب ارجاعات) و هم در کارتابل استفاده می‌شود تا
 * «قبل و بعد» هر ارجاع در یک ترتیب زمانی روشن دیده شود.
 */
import React from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import ReplyIcon from '@mui/icons-material/Reply';
import TaskAltIcon from '@mui/icons-material/TaskAlt';

import { toPersianDigits } from '../../core/utils/numberUtils';
import {
  EVENT_META, INCOMING, OK, REFERRAL_STATUS_META, SLATE, WARN,
  MetaChip, chipSx, dateLabel, dateTimeLabel, daysBetween, daysColor, daysLabel,
} from './correspondenceUi';

const PURPOSE_LABEL = {
  action: 'اقدام / انجام کار',
  info: 'اطلاع / مشاهده',
  comment: 'اظهارنظر',
};

const REFERRAL_EVENT_ACTIONS = new Set([
  'referred', 'referral_done', 'referral_seen', 'referral_note', 'referral_forwarded',
]);

const timeOf = (value) => {
  if (!value) return 0;
  const date = new Date(String(value).replace(' ', 'T'));
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
};

const isoOf = (value) => (value ? String(value).replace(' ', 'T') : '');

/** تبدیل پروندهٔ کامل نامه به آیتم‌های مرتب‌شدهٔ تایم‌لاین (قدیمی → جدید). */
export const buildLetterTimeline = (letter) => {
  if (!letter) return [];
  const hasReplies = Array.isArray(letter.replies) && letter.replies.length > 0;
  const items = [];

  (letter.referrals || []).forEach((referral) => {
    items.push({
      kind: 'referral',
      id: `referral-${referral.id}`,
      at: isoOf(referral.referred_on || referral.created_at),
      order: Number(referral.seq) || 0,
      data: referral,
    });
  });

  (letter.replies || []).forEach((reply) => {
    items.push({
      kind: 'reply',
      id: `reply-${reply.id}`,
      at: isoOf(reply.letter_date || reply.created_at),
      order: 0,
      data: reply,
    });
  });

  (letter.events || []).forEach((event) => {
    if (REFERRAL_EVENT_ACTIONS.has(event.action)) return;
    if (event.action === 'replied' && hasReplies) return;
    items.push({
      kind: 'event',
      id: `event-${event.id}`,
      at: isoOf(event.created_at),
      order: 0,
      data: event,
    });
  });

  return items.sort((a, b) => {
    const diff = timeOf(a.at) - timeOf(b.at);
    if (diff !== 0) return diff;
    if (a.order !== b.order) return a.order - b.order;
    return String(a.kind).localeCompare(String(b.kind));
  });
};

const ReferralCard = ({
  referral, onCompleteReferral, onEditReferral, onDeleteReferral, canManage,
}) => {
  const meta = REFERRAL_STATUS_META[referral.status] || REFERRAL_STATUS_META.pending;
  const referralDays = daysBetween(referral.due_date);
  const open = !['done', 'canceled'].includes(referral.status);
  const canComplete = open && typeof onCompleteReferral === 'function';
  const canManageReferral = Boolean(canManage);
  return (
    <Box sx={{
      p: 1.15, borderRadius: '10px', border: '1px solid',
      borderColor: alpha(meta.color, 0.28), bgcolor: alpha(meta.color, 0.035), minWidth: 0,
    }}>
      <Stack direction="row" alignItems="center" spacing={0.7} useFlexGap flexWrap="wrap">
        <Chip size="small" label={`ارجاع سطح ${toPersianDigits(referral.seq || 1)}`} sx={chipSx(SLATE)} />
        <MetaChip meta={meta} />
        <Chip size="small" label={PURPOSE_LABEL[referral.purpose] || referral.purpose_display || 'ارجاع'}
          sx={chipSx(WARN)} />
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          {dateLabel(referral.referred_on)}
        </Typography>
      </Stack>

      <Typography sx={{ mt: 0.7, fontSize: 12.5, fontWeight: 800 }} noWrap
        title={`${referral.from_employee_name || referral.from_user_name || '—'} → ${referral.target_label || referral.to_name || referral.to_user_name || '—'}`}>
        {referral.from_employee_name || referral.from_user_name || '—'}
        {' → '}
        {referral.target_label || referral.to_name || referral.to_user_name
          || referral.to_employee_name || '—'}
      </Typography>

      {referral.instruction ? (
        <Box sx={{ mt: 0.7 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.secondary' }}>دستور / اقدام درخواستی</Typography>
          <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{referral.instruction}</Typography>
        </Box>
      ) : null}
      {referral.note ? (
        <Box sx={{ mt: 0.55 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.secondary' }}>توضیح ارجاع</Typography>
          <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{referral.note}</Typography>
        </Box>
      ) : null}
      {referral.margin_note ? (
        <Box sx={{ mt: 0.55 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.secondary' }}>حواشی</Typography>
          <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{referral.margin_note}</Typography>
        </Box>
      ) : null}

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.6 }}>
        {referral.due_date ? (
          <Typography sx={{ fontSize: 11.5, color: daysColor(referralDays) }}>
            مهلت اقدام: {dateLabel(referral.due_date)} ({daysLabel(referralDays)})
          </Typography>
        ) : null}
        {referral.seen_at ? (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            مشاهده: {dateTimeLabel(referral.seen_at)}
          </Typography>
        ) : null}
      </Stack>

      {referral.response ? (
        <Box sx={{ mt: 0.7, p: 0.8, borderRadius: '8px', bgcolor: alpha(OK, 0.055) }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: OK }}>پاسخ / جوابیه</Typography>
          <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{referral.response}</Typography>
        </Box>
      ) : null}
      {referral.result || referral.result_note ? (
        <Box sx={{ mt: 0.55, p: 0.8, borderRadius: '8px', bgcolor: alpha(INCOMING, 0.05) }}>
          <Typography sx={{ fontSize: 11, fontWeight: 800, color: INCOMING }}>نتیجه</Typography>
          <Typography sx={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>
            {[referral.result, referral.result_note].filter(Boolean).join(' — ')}
          </Typography>
        </Box>
      ) : null}

      <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 0.6 }}>
        {referral.answered_on ? (
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
            پاسخ در {dateLabel(referral.answered_on)}
            {referral.answered_by_name ? ` توسط ${referral.answered_by_name}` : ''}
          </Typography>
        ) : null}
        {canComplete ? (
          <Button size="small" variant="contained" startIcon={<TaskAltIcon />}
            onClick={() => onCompleteReferral(referral)}
            sx={{ fontSize: 11.5, py: 0.2, bgcolor: OK, '&:hover': { bgcolor: '#115e59' } }}>
            ثبت پاسخ و نتیجه
          </Button>
        ) : null}
        {canManageReferral && typeof onEditReferral === 'function' ? (
          <Button size="small" variant="outlined" startIcon={<EditIcon />}
            onClick={() => onEditReferral(referral)}
            sx={{ fontSize: 11.5, py: 0.2 }}>
            ویرایش ارجاع
          </Button>
        ) : null}
        {canManageReferral && typeof onDeleteReferral === 'function' ? (
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlineIcon />}
            onClick={() => onDeleteReferral(referral)}
            sx={{ fontSize: 11.5, py: 0.2 }}>
            حذف ارجاع
          </Button>
        ) : null}
      </Stack>
    </Box>
  );
};

const ReplyCard = ({ reply, onOpenReply }) => (
  <Box sx={{
    p: 1.1, borderRadius: '10px', border: '1px solid', borderColor: alpha(OK, 0.3),
    bgcolor: alpha(OK, 0.035), minWidth: 0,
  }}>
    <Stack direction="row" alignItems="center" spacing={0.7} useFlexGap flexWrap="wrap">
      <Chip size="small" label="پاسخ نامه" sx={chipSx(OK)} />
      <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>
        {reply.number ? toPersianDigits(reply.number) : 'بدون شماره'}
      </Typography>
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
        {dateLabel(reply.letter_date || reply.created_at)}
      </Typography>
    </Stack>
    <Typography sx={{ mt: 0.4, fontSize: 12, fontWeight: 700 }}>{reply.subject || 'بدون موضوع'}</Typography>
    <Stack direction="row" alignItems="center" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 0.4 }}>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
        {reply.status_display || reply.direction_display || '—'}
      </Typography>
      {onOpenReply ? (
        <Button size="small" variant="text" startIcon={<ReplyIcon />} onClick={() => onOpenReply(reply)}
          sx={{ fontSize: 11.5, py: 0 }}>
          مشاهدهٔ پاسخ
        </Button>
      ) : null}
    </Stack>
  </Box>
);

const TimelineDot = ({ color, first, last }) => (
  <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', width: 22, flex: '0 0 22px' }}>
    {!first ? <Box sx={{ position: 'absolute', top: 0, bottom: '50%', width: 2, bgcolor: 'divider' }} /> : null}
    {!last ? <Box sx={{ position: 'absolute', top: '50%', bottom: -8, width: 2, bgcolor: 'divider' }} /> : null}
    <Box sx={{
      position: 'relative', zIndex: 1, mt: 0.55, width: 10, height: 10, borderRadius: '50%',
      bgcolor: color, boxShadow: `0 0 0 4px ${alpha(color, 0.12)}`,
    }} />
  </Box>
);

const EventCard = ({ event }) => {
  const meta = EVENT_META[event.action] || { label: event.action_display || event.action, color: SLATE };
  return (
    <Box sx={{
      p: 1, borderRadius: '10px', border: '1px solid', borderColor: alpha(meta.color, 0.22),
      bgcolor: alpha(meta.color, 0.025), minWidth: 0,
    }}>
      <Stack direction="row" alignItems="center" spacing={0.7} useFlexGap flexWrap="wrap">
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: meta.color, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 800 }}>{meta.label}</Typography>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
          {dateTimeLabel(event.created_at)}
        </Typography>
      </Stack>
      {event.note ? (
        <Typography sx={{ mt: 0.35, fontSize: 12, whiteSpace: 'pre-wrap' }}>{event.note}</Typography>
      ) : null}
      <Typography sx={{ mt: 0.25, fontSize: 11.5, color: 'text.secondary' }}>
        {event.actor_name || '—'}
      </Typography>
    </Box>
  );
};

/**
 * تایم‌لاین روند نامه.
 * `letter` باید پروندهٔ کامل نامه (شامل referrals/events/replies) باشد.
 */
const LetterTimeline = ({
  letter, onCompleteReferral, onEditReferral, onDeleteReferral, canManageReferral,
  onOpenReply, emptyText, showSummary = true,
}) => {
  const items = buildLetterTimeline(letter);
  const referralCount = (letter?.referrals || []).length;
  const replyCount = (letter?.replies || []).length;
  const eventCount = items.filter((item) => item.kind === 'event').length;

  if (!items.length) {
    return (
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
        {emptyText || 'هنوز ارجاع، پاسخ یا رویدادی برای این نامه ثبت نشده است.'}
      </Typography>
    );
  }

  return (
    <Box data-testid="letter-timeline">
      {showSummary ? (
        <Stack direction="row" alignItems="center" spacing={0.7} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
          <HistoryIcon sx={{ fontSize: 17, color: SLATE }} />
          <Typography sx={{ fontSize: 12.5, fontWeight: 900 }}>روند نامه (قدیمی → جدید)</Typography>
          <Box sx={{ flex: 1 }} />
          <Chip size="small" label={`${toPersianDigits(referralCount)} ارجاع`} sx={chipSx(WARN)} />
          <Chip size="small" label={`${toPersianDigits(replyCount)} پاسخ`} sx={chipSx(OK)} />
          <Chip size="small" label={`${toPersianDigits(eventCount)} رویداد`} sx={chipSx(SLATE)} />
        </Stack>
      ) : null}

      <Box>
        {items.map((item, index) => {
          const color = item.kind === 'referral'
            ? (REFERRAL_STATUS_META[item.data.status] || REFERRAL_STATUS_META.pending).color
            : item.kind === 'reply' ? OK : (EVENT_META[item.data.action]?.color || SLATE);
          return (
            <Stack key={item.id} direction="row" spacing={0.9} sx={{ alignItems: 'stretch', minWidth: 0 }}>
              <TimelineDot color={color} first={index === 0} last={index === items.length - 1} />
              <Box sx={{ flex: 1, minWidth: 0, pb: 1.1 }}>
                {item.kind === 'referral' ? (
                  <ReferralCard
                    referral={item.data}
                    onCompleteReferral={onCompleteReferral}
                    onEditReferral={onEditReferral}
                    onDeleteReferral={onDeleteReferral}
                    canManage={typeof canManageReferral === 'function'
                      ? canManageReferral(item.data)
                      : false}
                  />
                ) : item.kind === 'reply' ? (
                  <ReplyCard reply={item.data} onOpenReply={onOpenReply} />
                ) : (
                  <EventCard event={item.data} />
                )}
              </Box>
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
};

export default LetterTimeline;

