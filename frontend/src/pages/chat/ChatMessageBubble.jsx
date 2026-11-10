/**
 * حباب پیام چت — طراحی مدرن با نوار اقدام (پاسخ/واکنش/سنجاق/کپی/ویرایش/حذف)،
 * واکنش‌های ایموجی، پیش‌نمایش پاسخ، کارت پیوست، ارجاع ماژول و رسید خواندن.
 */
import React, { useRef, useState } from 'react';
import {
  Box, Chip, IconButton, Popover, Stack, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import ReplyIcon from '@mui/icons-material/Reply';
import TagIcon from '@mui/icons-material/Tag';
import { ENTITY_MODULE_META } from './EntityPickerDialog';
import { emojiOnlyFontSize } from './chatMessageText';
import { QUICK_REACTIONS, receiptLabel, timeLabel } from './chatUi';
import { toPersianDigits } from '../../core/utils/numberUtils';

const iconButtonSx = {
  p: 0.35, color: 'inherit',
  '& svg': { fontSize: 15 },
};

const ActionButton = ({ title, onClick, children, testid }) => (
  <Tooltip title={title}>
    <IconButton size="small" aria-label={title} onClick={onClick} data-testid={testid}
      sx={iconButtonSx}>
      {children}
    </IconButton>
  </Tooltip>
);

const ReactionsRow = ({ reactions = [], look, onReact }) => {
  if (!reactions.length) return null;
  return (
    <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" data-testid="chat-reactions"
      sx={{ mt: 0.5 }}>
      {reactions.map((reaction) => (
        <Box
          key={reaction.emoji}
          component="button"
          type="button"
          data-testid="chat-reaction-chip"
          data-emoji={reaction.emoji}
          onClick={() => onReact(reaction.emoji)}
          title={`${reaction.count} واکنش`}
          sx={{
            border: '1px solid',
            borderColor: reaction.mine ? alpha(look.accent, 0.55) : 'transparent',
            bgcolor: reaction.mine ? alpha(look.accent, 0.18) : alpha(look.ink, 0.06),
            color: 'inherit', cursor: 'pointer', borderRadius: '10px',
            px: 0.55, py: 0.1, fontSize: 12, lineHeight: 1.5,
            display: 'inline-flex', alignItems: 'center', gap: 0.35,
            fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 13 }}>{reaction.emoji}</span>
          <span style={{ fontSize: 10, fontWeight: 800 }}>{toPersianDigits(reaction.count)}</span>
        </Box>
      ))}
    </Stack>
  );
};


const AttachmentCard = ({ file, mine, look }) => (
  <Box
    component="a"
    href={file.file_url || undefined}
    target="_blank"
    rel="noopener noreferrer"
    sx={{
      mt: 0.5, mr: 0.4, display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 0.8, py: 0.45, borderRadius: '10px', textDecoration: 'none',
      bgcolor: mine ? 'rgba(255,255,255,0.18)' : alpha(look.accent, 0.08),
      border: '1px solid',
      borderColor: mine ? 'rgba(255,255,255,0.3)' : alpha(look.accent, 0.2),
      color: mine ? '#fff' : look.ink, maxWidth: '100%',
    }}
  >
    <AttachFileOutlinedIcon sx={{ fontSize: 14, flexShrink: 0 }} />
    <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 800, maxWidth: 190 }}>
      {file.file_name || file.title}
    </Typography>
    <Typography sx={{ fontSize: 9, opacity: 0.75, flexShrink: 0 }}>
      {Math.max(1, Math.round((Number(file.size) || 0) / 1024))}KB
    </Typography>
  </Box>
);

const EntityRefCard = ({ entityRef, mine, look }) => {
  const meta = ENTITY_MODULE_META[entityRef.module] || {};
  const Icon = meta.icon || TagIcon;
  const accessible = entityRef.is_accessible && entityRef.url;
  return (
    <Box
      component={accessible ? 'a' : 'div'}
      href={accessible ? entityRef.url : undefined}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        mt: 0.55, display: 'flex', alignItems: 'center', gap: 0.6,
        px: 0.8, py: 0.5, borderRadius: '10px', textDecoration: 'none',
        border: '1px solid',
        borderColor: mine ? 'rgba(255,255,255,0.32)' : alpha(meta.color || look.accent, 0.3),
        bgcolor: mine ? 'rgba(255,255,255,0.14)' : alpha(meta.color || look.accent, 0.07),
        cursor: accessible ? 'pointer' : 'default',
        opacity: entityRef.is_accessible ? 1 : 0.68,
      }}
    >
      <Box sx={{
        width: 22, height: 22, borderRadius: '6px', display: 'grid', placeItems: 'center',
        flexShrink: 0,
        bgcolor: mine ? 'rgba(255,255,255,0.2)' : alpha(meta.color || look.accent, 0.16),
        color: mine ? '#fff' : (meta.color || look.accent),
      }}>
        <Icon sx={{ fontSize: 13 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 900 }}>
          {entityRef.is_accessible
            ? (entityRef.label || `${meta.label || entityRef.module} #${entityRef.object_id}`)
            : 'دسترسی به این رکورد ندارید'}
        </Typography>
        <Typography noWrap sx={{ fontSize: 9, opacity: 0.8 }}>
          {entityRef.is_accessible ? (meta.label || entityRef.module) : 'بدون مجوز مشاهده'}
        </Typography>
      </Box>
    </Box>
  );
};

const ChatMessageBubble = ({
  message, look, compact = false, highlight = false,
  onReply, onEdit, onDelete, onPin, onReact, onJumpTo,
}) => {
  const [reactionAnchor, setReactionAnchor] = useState(null);
  const mine = Boolean(message.is_mine);
  const deleted = Boolean(message.deleted_at);
  const emojiSize = deleted ? null : emojiOnlyFontSize(message.body);
  const textColor = mine ? '#ffffff' : look.ink;
  const bubbleSx = {
    px: 1.4, py: compact ? 0.7 : 0.95,
    borderRadius: 16,
    borderTopRightRadius: mine ? 6 : 16,
    borderTopLeftRadius: mine ? 16 : 6,
    background: mine ? look.bubbleMine : look.bubbleOther,
    color: textColor,
    border: '1px solid',
    borderColor: mine ? alpha('#ffffff', 0.22) : look.divider,
    boxShadow: look.shadowSoft,
    outline: highlight ? `2px solid ${alpha(look.accent, 0.65)}` : 'none',
    outlineOffset: 2,
    transition: 'outline .2s ease',
  };

  const copyBody = () => {
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(message.body || '');
    } catch (error) {
      /* کپی متن اختیاری است */
    }
  };

  return (
    <Box
      data-testid="chat-message"
      data-message-id={message.id}
      sx={{
        display: 'flex',
        justifyContent: mine ? 'flex-start' : 'flex-end',
        mt: compact ? 0.25 : 0.9,
        '&:hover .chat-actions, &:focus-within .chat-actions': {
          opacity: 1, pointerEvents: 'auto',
        },
      }}
    >
      <Box sx={{ maxWidth: '78%', position: 'relative' }}>
        {!deleted ? (
          <Stack
            direction="row" spacing={0.1} data-testid="chat-message-actions"
            className="chat-actions"
            sx={{
              position: 'absolute', top: -15, insetInlineStart: 8, zIndex: 3,
              bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
              borderRadius: '10px', boxShadow: look.shadowCard,
              px: 0.3, py: 0.15, opacity: 0, pointerEvents: 'none',
              transition: 'opacity .12s ease',
              color: look.ink,
            }}
          >
            <ActionButton title="واکنش" testid="chat-react-button"
              onClick={(event) => setReactionAnchor(
                reactionAnchor ? null : event.currentTarget,
              )}>
              <AddReactionOutlinedIcon />
            </ActionButton>
            <ActionButton title="پاسخ" testid="chat-reply-button" onClick={() => onReply?.(message)}>
              <ReplyIcon />
            </ActionButton>
            <ActionButton title="کپی متن" testid="chat-copy-button" onClick={copyBody}>
              <ContentCopyIcon />
            </ActionButton>
            <ActionButton
              title={message.is_pinned ? 'برداشتن سنجاق' : 'سنجاق به گفتگو'}
              testid="chat-pin-button"
              onClick={() => onPin?.(message)}
            >
              <PushPinOutlinedIcon sx={{ color: message.is_pinned ? look.accent : 'inherit' }} />
            </ActionButton>
            {mine ? (
              <ActionButton title="ویرایش" testid="chat-edit-button"
                onClick={() => onEdit?.(message)}>
                <EditOutlinedIcon />
              </ActionButton>
            ) : null}
            {mine ? (
              <ActionButton title="حذف" testid="chat-delete-button"
                onClick={() => onDelete?.(message)}>
                <DeleteOutlineIcon />
              </ActionButton>
            ) : null}
          </Stack>
        ) : null}

        <Popover
          open={Boolean(reactionAnchor)}
          anchorEl={reactionAnchor}
          onClose={() => setReactionAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          transformOrigin={{ vertical: 'top', horizontal: 'center' }}
          PaperProps={{ sx: { px: 0.6, py: 0.4, borderRadius: '12px' } }}
        >
          <Stack direction="row" spacing={0.2}>
            {QUICK_REACTIONS.map((emoji) => (
              <IconButton
                key={emoji} size="small" aria-label={`واکنش ${emoji}`}
                data-testid="chat-quick-reaction"
                onClick={() => { onReact?.(message, emoji); setReactionAnchor(null); }}
                sx={{ fontSize: 18, p: 0.5 }}
              >
                {emoji}
              </IconButton>
            ))}
          </Stack>
        </Popover>


        <Box sx={bubbleSx}>
          {!mine && !compact ? (
            <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: look.accent, mb: 0.2 }}>
              {message.sender_name || 'کاربر'}
            </Typography>
          ) : null}

          {message.reply_to ? (
            <Box
              role={onJumpTo ? 'button' : undefined}
              onClick={() => onJumpTo?.(message.reply_to)}
              sx={{
                mb: 0.55, px: 0.9, py: 0.4, borderRadius: '8px',
                borderInlineStart: `3px solid ${mine ? 'rgba(255,255,255,0.7)' : look.accent}`,
                bgcolor: mine ? 'rgba(255,255,255,0.14)' : alpha(look.accent, 0.07),
                cursor: onJumpTo ? 'pointer' : 'default',
              }}
            >
              <Typography sx={{ fontSize: 10, fontWeight: 800 }}>
                {message.reply_to_sender || 'پاسخ'}
              </Typography>
              <Typography noWrap sx={{ fontSize: 10.5, opacity: 0.85 }}>
                {message.reply_to_preview}
              </Typography>
            </Box>
          ) : null}

          {deleted ? (
            <Typography sx={{ fontSize: 11.5, fontStyle: 'italic', opacity: 0.7 }}>
              این پیام حذف شده است
            </Typography>
          ) : (
            <Typography
              data-testid="chat-message-body"
              data-emoji-only={emojiSize ? 'true' : 'false'}
              sx={{
                fontSize: emojiSize || 12.5,
                lineHeight: emojiSize ? 1.2 : 1.65,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                ...(emojiSize ? { letterSpacing: 0.5, py: 0.2, display: 'inline-block' } : {}),
              }}
            >
              {message.body}
            </Typography>
          )}

          {(message.attachments || []).map((file) => (
            <AttachmentCard key={file.id} file={file} mine={mine} look={look} />
          ))}

          {(message.entity_refs || []).map((entityRef) => (
            <EntityRefCard key={entityRef.id} entityRef={entityRef} mine={mine} look={look} />
          ))}

          <ReactionsRow
            reactions={message.reactions || []}
            look={look}
            onReact={(emoji) => onReact?.(message, emoji)}
          />
        </Box>

        <Stack direction="row" alignItems="center" spacing={0.6}
          sx={{
            mt: 0.3, px: 0.4, opacity: 0.85, color: look.muted,
            justifyContent: mine ? 'flex-end' : 'flex-start',
          }}>
          {message.is_pinned ? (
            <Tooltip title="سنجاق‌شده">
              <PushPinOutlinedIcon sx={{ fontSize: 12 }} />
            </Tooltip>
          ) : null}
          <Typography sx={{ fontSize: 9.5 }}>
            {timeLabel(message.created_at)}{message.edited_at ? ' · ویرایش‌شده' : ''}
          </Typography>
          {mine ? (
            <Tooltip title={receiptLabel(message)}>
              <DoneAllIcon sx={{
                fontSize: 12,
                color: (message.read_count || 0) ? look.accent : 'inherit',
              }} />
            </Tooltip>
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
};

export default ChatMessageBubble;

