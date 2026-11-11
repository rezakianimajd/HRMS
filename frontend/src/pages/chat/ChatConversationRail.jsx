/**
 * ستون فهرست گفتگوها: جست‌وجو، فیلترهای سریع (همه/خوانده‌نشده/سنجاق‌شده)،
 * فیلتر نوع (خصوصی/گروه/کانال) و ردیف‌های مدرن با نشان خوانده‌نشده/سنجاق/بی‌صدا.
 */
import React, { useMemo } from 'react';
import {
  Badge, Box, Button, Chip, CircularProgress, IconButton, InputAdornment,
  Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import SearchIcon from '@mui/icons-material/Search';
import { ChatAvatar, CHAT_KIND_META, kindMetaOf, timeLabel } from './chatUi';
import { TabsCard } from '../../core/components/settings/settingsUi';
import { toPersianDigits } from '../../core/utils/numberUtils';

export const RAIL_TABS = [
  { key: 'all', label: 'همه' },
  { key: 'unread', label: 'خوانده‌نشده' },
  { key: 'pinned', label: 'سنجاق‌شده' },
];

export const KIND_FILTERS = [
  { key: 'all', label: 'همهٔ انواع' },
  { key: 'direct', label: 'خصوصی' },
  { key: 'group', label: 'گروهی' },
  { key: 'channel', label: 'کانال' },
];

/** فیلتر سمت کلاینت فهرست گفتگوها (خالص و تست‌پذیر). */
export const filterConversations = (rows, { tab = 'all', kind = 'all' } = {}) => {
  const list = Array.isArray(rows) ? rows : [];
  return list.filter((row) => {
    if (kind !== 'all' && row.kind !== kind) return false;
    if (tab === 'unread') return Number(row.unread_count) > 0;
    if (tab === 'pinned') return Boolean(row.membership?.is_pinned);
    return true;
  });
};

const ConversationRow = ({ row, active, accent, onSelect }) => {
  const meta = kindMetaOf(row);
  const Icon = meta.icon;
  const unread = Number(row.unread_count) || 0;
  const pinned = Boolean(row.membership?.is_pinned);
  const muted = row.membership?.notify === 'muted';
  return (
    <Box
      onClick={() => onSelect(row)}
      role="button"
      tabIndex={0}
      data-testid="chat-conversation-row"
      onKeyDown={(event) => { if (event.key === 'Enter') onSelect(row); }}
      sx={{
        display: 'flex', gap: 1, alignItems: 'flex-start', px: 1.15, py: 0.9,
        cursor: 'pointer', borderRadius: '14px',
        bgcolor: active ? alpha(accent, 0.12) : 'transparent',
        border: '1px solid',
        borderColor: active ? alpha(accent, 0.32) : 'transparent',
        transition: 'background-color .12s ease',
        '&:hover': { bgcolor: active ? alpha(accent, 0.14) : 'action.hover' },
      }}
    >
      <Badge
        color="error" badgeContent={unread ? toPersianDigits(unread) : 0} max={99}
        sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }}
      >
        <ChatAvatar
          name={row.title}
          photo={row.avatar_url}
          kind={row.kind}
          size={40}
          accent={row.color || meta.color || accent}
          sx={{ border: '1px solid', borderColor: alpha(accent, 0.25) }}
        />
      </Badge>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography noWrap sx={{
            fontSize: 12.5, fontWeight: unread ? 900 : 700,
            color: 'text.primary', flex: 1,
          }}>
            {row.title || 'گفتگوی خصوصی'}
          </Typography>
          <Typography sx={{ fontSize: 9.5, color: 'text.secondary', flexShrink: 0 }}>
            {timeLabel(row.last_message_at)}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.4}>
          {muted ? <NotificationsOffOutlinedIcon sx={{ fontSize: 12, color: 'text.secondary' }} /> : null}
          <Typography noWrap sx={{
            fontSize: 11, color: 'text.secondary', flex: 1,
            fontWeight: unread ? 700 : 400,
          }}>
            {row.last_message?.preview || 'پیامی ثبت نشده است'}
          </Typography>
          {pinned ? <PushPinOutlinedIcon sx={{ fontSize: 12, color: accent }} /> : null}
        </Stack>
        <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 0.35 }}>
          <Chip size="small" label={meta.label} sx={{
            height: 17, fontSize: 9, fontWeight: 800,
            bgcolor: alpha(meta.color, 0.1), color: meta.color,
          }} />
          {row.related_label ? (
            <Chip size="small" label={row.related_label} sx={{
              height: 17, fontSize: 9, fontWeight: 700, maxWidth: 150,
            }} />
          ) : null}
          {row.is_public ? (
            <Chip size="small" label="عمومی" sx={{ height: 17, fontSize: 9, fontWeight: 700 }} />
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
};

const ChatConversationRail = ({
  conversations = [], activeId, accent, loading = false, unread = 0,
  search = '', onSearch, tab = 'all', onTab, kindFilter = 'all', onKindFilter,
  onSelect, onNewDirect, onNewChat,
}) => {
  const rows = useMemo(
    () => filterConversations(conversations, { tab, kind: kindFilter }),
    [conversations, tab, kindFilter],
  );

  return (
    <Box sx={{
      width: '100%', minWidth: 0, flexShrink: 0,
      display: 'flex', flexDirection: 'column', minHeight: 0,
      border: '1px solid', borderColor: alpha(accent, 0.22),
      borderRadius: 'var(--hrms-radius-large, 18px)',
      bgcolor: 'background.paper', overflow: 'hidden',
    }}>
      <Box sx={{ px: 1.5, pt: 1.25, pb: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <ChatBubbleOutlineIcon sx={{ fontSize: 18, color: accent }} />
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: 'text.primary', flex: 1 }}>
            گفتگوی سازمانی
          </Typography>
          <Tooltip title="گفتگوی خصوصی با یک همکار">
            <IconButton size="small" aria-label="گفتگوی خصوصی" onClick={onNewDirect}
              sx={{ color: accent }}>
              <PersonAddAltOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="گفتگو/کانال جدید">
            <IconButton size="small" aria-label="گفتگوی جدید" onClick={onNewChat}
              sx={{ color: accent, bgcolor: alpha(accent, 0.1) }}>
              <AddIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>

        <TextField
          size="small" fullWidth placeholder="جست‌وجو در گفتگوها…" value={search}
          onChange={(event) => onSearch?.(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16 }} />
              </InputAdornment>
            ),
          }}
          inputProps={{ 'aria-label': 'جست‌وجو در گفتگوها' }}
          sx={{ mt: 1, '& .MuiInputBase-root': { borderRadius: '10px' },
            '& .MuiInputBase-input': { fontSize: 11.5 } }}
        />

        <TabsCard
          dense
          sx={{ mb: 0, mt: 1, borderRadius: '10px' }}
          activeColor={accent}
          tabs={RAIL_TABS.map((item) => ({
            key: item.key,
            label: item.label,
            badge: item.key === 'unread' && unread ? toPersianDigits(unread) : undefined,
          }))}
          value={Math.max(0, RAIL_TABS.findIndex((item) => item.key === tab))}
          onChange={(index) => onTab?.(RAIL_TABS[index]?.key || 'all')}
        />

        <TabsCard
          dense
          sx={{ mb: 0, mt: 0.5, borderRadius: '10px', bgcolor: 'transparent', border: 0 }}
          activeColor={accent}
          tabs={KIND_FILTERS.map((item) => ({
            key: item.key,
            label: item.label,
            icon: (CHAT_KIND_META[item.key] || {}).icon
              ? React.createElement(CHAT_KIND_META[item.key].icon)
              : undefined,
          }))}
          value={Math.max(0, KIND_FILTERS.findIndex((item) => item.key === kindFilter))}
          onChange={(index) => onKindFilter?.(KIND_FILTERS[index]?.key || 'all')}
        />
        <Box data-testid="chat-rail-tabs" sx={{ display: 'none' }} />
        <Box data-testid="chat-kind-filter" sx={{ display: 'none' }} />
      </Box>

      <Box sx={{
        flex: 1, minHeight: 0, overflowY: 'auto', p: 0.6,
        display: 'flex', flexDirection: 'column', gap: 0.35,
      }}>
        {loading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={20} /></Box>
        ) : rows.length ? (
          rows.map((row) => (
            <ConversationRow
              key={row.id} row={row} accent={accent}
              active={String(row.id) === String(activeId)}
              onSelect={(item) => onSelect?.(item)}
            />
          ))
        ) : (
          <Box sx={{ py: 4, px: 1.5, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
              {conversations.length
                ? 'گفتگویی با این فیلتر پیدا نشد.'
                : 'هنوز گفتگویی ندارید؛ یک گفتگوی خصوصی با یک همکار شروع کنید.'}
            </Typography>
            {!conversations.length ? (
              <Button
                size="small" variant="outlined" sx={{ mt: 1, fontSize: 11 }}
                startIcon={<PersonAddAltOutlinedIcon sx={{ fontSize: 15 }} />}
                onClick={onNewDirect}
              >
                گفتگوی خصوصی
              </Button>
            ) : null}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatConversationRail;

