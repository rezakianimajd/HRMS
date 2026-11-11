/**
 * پنل کنار گفتگو: خلاصهٔ گفتگو، تنظیمات شخصی (سنجاق/بی‌صدا/بایگانی)،
 * فهرست اعضا و پیام‌های سنجاق‌شده (کلیک → پرش به همان پیام).
 */
import React from 'react';
import {
  Box, Button, Chip, Divider, FormControlLabel, IconButton, Stack,
  Switch, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { ChatAvatar, kindMetaOf, timeLabel } from './chatUi';
import { toPersianDigits } from '../../core/utils/numberUtils';

const SectionTitle = ({ children, look }) => (
  <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: look.muted, mb: 0.5 }}>
    {children}
  </Typography>
);

const ChatInfoPanel = ({
  conversation, members = [], pinned = [], look, pinnedLoading = false,
  onClose, onPrefs, onManageMembers, onOpenFull, onJumpTo,
}) => {
  if (!conversation) return null;
  const meta = kindMetaOf(conversation);
  const membership = conversation.membership || {};
  const switchSx = { '& .MuiSwitch-switchBase.Mui-checked': { color: look.accent } };

  return (
    <Box
      data-testid="chat-info-panel"
      sx={{
        width: { xs: '100%', md: 290 }, flexShrink: 0, minHeight: 0,
        display: 'flex', flexDirection: 'column',
        border: '1px solid', borderColor: 'divider',
        borderRadius: 'var(--hrms-radius-large, 18px)',
        bgcolor: 'background.paper', overflow: 'hidden',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5}
        sx={{ px: 1.4, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 900, color: 'text.primary', flex: 1 }}>
          اطلاعات گفتگو
        </Typography>
        <Tooltip title="باز کردن در صفحهٔ کامل">
          <IconButton size="small" aria-label="باز کردن در صفحهٔ کامل" onClick={onOpenFull}>
            <OpenInNewIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <IconButton size="small" aria-label="بستن اطلاعات" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.4, py: 1.2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <ChatAvatar
            name={conversation.title}
            photo={conversation.avatar_url}
            kind={conversation.kind}
            size={44}
            accent={meta.color || look.accent}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 900, color: 'text.primary' }}>
              {conversation.title || 'گفتگوی خصوصی'}
            </Typography>
            <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 0.3 }}>
              <Chip size="small" label={meta.label} sx={{
                height: 17, fontSize: 9, fontWeight: 800,
                bgcolor: alpha(meta.color, 0.1), color: meta.color,
              }} />
              <Chip size="small"
                label={`${toPersianDigits(conversation.member_count || members.length || 0)} عضو`}
                sx={{ height: 17, fontSize: 9, fontWeight: 700 }} />
            </Stack>
          </Box>
        </Stack>

        {conversation.description ? (
          <Typography sx={{ fontSize: 10.5, color: look.muted, mb: 1, lineHeight: 1.7 }}>
            {conversation.description}
          </Typography>
        ) : null}
        {conversation.related_label ? (
          <Typography sx={{ fontSize: 10.5, color: look.muted, mb: 1 }}>
            مرتبط با: <Box component="span" sx={{ fontWeight: 800, color: look.accent }}>
              {conversation.related_label}
            </Box>
          </Typography>
        ) : null}

        <Divider sx={{ my: 1 }} />
        <SectionTitle look={look}>تنظیمات من</SectionTitle>
        <FormControlLabel
          sx={{ m: 0, display: 'flex', justifyContent: 'space-between' }}
          labelPlacement="start"
          label={<Typography sx={{ fontSize: 11 }}>سنجاق در بالای فهرست</Typography>}
          control={(
            <Switch size="small" sx={switchSx} checked={Boolean(membership.is_pinned)}
              onChange={(event) => onPrefs?.({ is_pinned: event.target.checked })} />
          )}
        />
        <FormControlLabel
          sx={{ m: 0, display: 'flex', justifyContent: 'space-between' }}
          labelPlacement="start"
          label={<Typography sx={{ fontSize: 11 }}>بی‌صدا کردن اعلان‌ها</Typography>}
          control={(
            <Switch size="small" sx={switchSx} checked={membership.notify === 'muted'}
              onChange={(event) => onPrefs?.({
                notify: event.target.checked ? 'muted' : 'all',
              })} />
          )}
        />
        <FormControlLabel
          sx={{ m: 0, display: 'flex', justifyContent: 'space-between' }}
          labelPlacement="start"
          label={<Typography sx={{ fontSize: 11 }}>بایگانی گفتگو</Typography>}
          control={(
            <Switch size="small" sx={switchSx} checked={Boolean(membership.is_archived)}
              onChange={(event) => onPrefs?.({ is_archived: event.target.checked })} />
          )}
        />

        <Divider sx={{ my: 1 }} />
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.4 }}>
          <SectionTitle look={look}>اعضا ({toPersianDigits(members.length)})</SectionTitle>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="افزودن عضو">
            <IconButton size="small" aria-label="افزودن عضو" onClick={onManageMembers}>
              <PersonAddAltOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Stack>
        {members.length ? members.map((member) => (
          <Stack key={member.id || member.user} direction="row" spacing={0.75}
            alignItems="center" sx={{ py: 0.35 }}>
            <ChatAvatar
              name={member.user_name || `کاربر #${member.user}`}
              photo={member.photo_url}
              size={26}
              accent={look.accent}
            />
            <Typography noWrap sx={{ fontSize: 11, flex: 1, color: 'text.primary' }}>
              {member.user_name || `کاربر #${member.user}`}
            </Typography>
            <Chip size="small" label={member.role_display || member.role || 'عضو'}
              sx={{ height: 17, fontSize: 9, fontWeight: 700 }} />
          </Stack>
        )) : (
          <Typography sx={{ fontSize: 10.5, color: look.muted }}>عضوی ثبت نشده است.</Typography>
        )}

        <Divider sx={{ my: 1 }} />
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.4 }}>
          <PushPinOutlinedIcon sx={{ fontSize: 14, color: look.accent }} />
          <SectionTitle look={look}>پیام‌های سنجاق‌شده</SectionTitle>
        </Stack>
        {pinnedLoading ? (
          <Typography sx={{ fontSize: 10.5, color: look.muted }}>در حال بارگذاری…</Typography>
        ) : pinned.length ? pinned.map((message) => (
          <Box
            key={message.id}
            role="button"
            tabIndex={0}
            onClick={() => onJumpTo?.(message.id)}
            onKeyDown={(event) => { if (event.key === 'Enter') onJumpTo?.(message.id); }}
            sx={{
              px: 0.9, py: 0.55, mb: 0.4, borderRadius: '9px', cursor: 'pointer',
              bgcolor: alpha(look.accent, 0.06),
              border: '1px solid', borderColor: alpha(look.accent, 0.18),
              '&:hover': { bgcolor: alpha(look.accent, 0.1) },
            }}
          >
            <Typography sx={{ fontSize: 10, fontWeight: 800, color: look.accent }}>
              {message.sender_name || 'کاربر'} · {timeLabel(message.created_at)}
            </Typography>
            <Typography noWrap sx={{ fontSize: 10.5, color: 'text.primary' }}>
              {message.body || 'پیوست'}
            </Typography>
          </Box>
        )) : (
          <Typography sx={{ fontSize: 10.5, color: look.muted }}>
            پیامی سنجاق نشده است.
          </Typography>
        )}

        <Button
          fullWidth size="small" variant="text" sx={{ mt: 1, fontSize: 10.5 }}
          onClick={onOpenFull}
        >
          باز کردن در صفحهٔ کامل
        </Button>
      </Box>
    </Box>
  );
};

export default ChatInfoPanel;

