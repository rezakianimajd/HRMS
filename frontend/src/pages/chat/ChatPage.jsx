import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Avatar, Badge, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, InputAdornment, MenuItem,
  Select, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import ReplyIcon from '@mui/icons-material/Reply';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import TagIcon from '@mui/icons-material/Tag';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import axiosInstance from '../../core/api/axiosConfig';
import { useDesignTokens } from '../../core/context/DesignTokenContext';
import { useModulePalette } from '../../core/context/ModulePaletteContext';
import useAuth from '../../core/hooks/useAuth';
import { toJalali } from '../../core/utils/dateUtils';
import { toPersianDigits } from '../../core/utils/numberUtils';

const ACCENT_FALLBACK = '#0ea5e9';
const INK = '#0f172a';
const MUTED = '#64748b';

export const CHAT_KIND_META = {
  direct: { label: 'خصوصی', icon: PersonOutlineIcon, color: '#0ea5e9' },
  group: { label: 'گروهی', icon: GroupOutlinedIcon, color: '#8b5cf6' },
  channel: { label: 'کانال', icon: CampaignOutlinedIcon, color: '#f59e0b' },
  system: { label: 'سیستمی', icon: LockOutlinedIcon, color: '#64748b' },
};

/** آیا کاربر جاری می‌تواند این پیام را ویرایش کند؟ */
export const canEditMessage = (message, user) => Boolean(
  message && !message.deleted_at && message.sender && String(message.sender) === String(user?.id),
);

/** متن وضعیت رسید پیام (ارسال/تحویل/خواندن) برای نمایش زیر حباب. */
export const receiptLabel = (message) => {
  if (!message || message.deleted_at) return '';
  const read = Number(message.read_count) || 0;
  const delivered = Number(message.delivered_count) || 0;
  const members = Number(message.member_count) || 0;
  if (members > 2) {
    if (read) return `${toPersianDigits(read)} از ${toPersianDigits(members)} خواندند`;
    if (delivered) return 'تحویل شد';
    return 'ارسال شد';
  }
  if (read) return 'خوانده شد';
  if (delivered) return 'تحویل شد';
  return 'ارسال شد';
};

const timeLabel = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return toPersianDigits(date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));
};

const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '');

const useChatQueries = ({ user, activeId, search }) => {
  const qc = useQueryClient();
  const conversationsQuery = useQuery({
    queryKey: ['chat-conversations', search],
    queryFn: () => axiosInstance
      .get('/chat/conversations/', { params: { page_size: 60, search: search || undefined } })
      .then((response) => response.data),
    refetchInterval: 12_000,
    staleTime: 5_000,
    placeholderData: (previous) => previous,
  });
  const conversations = useMemo(() => {
    const payload = conversationsQuery.data;
    return Array.isArray(payload) ? payload : payload?.results || [];
  }, [conversationsQuery.data]);

  const messagesQuery = useQuery({
    queryKey: ['chat-messages', activeId, search],
    queryFn: () => axiosInstance
      .get(`/chat/conversations/${activeId}/messages/`, {
        params: { limit: 40, search: search || undefined },
      })
      .then((response) => response.data),
    enabled: Boolean(activeId),
    refetchInterval: 6_000,
    staleTime: 2_000,
    placeholderData: (previous) => previous,
  });
  const messages = useMemo(() => {
    const rows = messagesQuery.data?.results || [];
    return [...rows].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  }, [messagesQuery.data]);

  const unreadQuery = useQuery({
    queryKey: ['chat-unread'],
    queryFn: () => axiosInstance.get('/chat/unread/').then((response) => response.data),
    refetchInterval: 20_000,
  });

  const eventsQuery = useQuery({
    queryKey: ['chat-events', activeId],
    queryFn: () => axiosInstance.get('/chat/events/', { params: { since: 0 } })
      .then((response) => response.data),
    enabled: Boolean(user?.id),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    const rows = eventsQuery.data?.results || [];
    if (!rows.length) return;
    qc.invalidateQueries({ queryKey: ['chat-conversations'] });
    if (activeId && rows.some((row) => String(row.conversation) === String(activeId))) {
      qc.invalidateQueries({ queryKey: ['chat-messages', activeId] });
    }
    qc.invalidateQueries({ queryKey: ['chat-unread'] });
  }, [eventsQuery.data, activeId, qc]);

  return { conversations, conversationsQuery, messages, messagesQuery, unreadQuery };
};


const ConversationRow = ({ row, active, accent, onSelect }) => {
  const meta = CHAT_KIND_META[row.kind] || CHAT_KIND_META.group;
  const Icon = meta.icon;
  const unread = Number(row.unread_count) || 0;
  return (
    <Box
      onClick={() => onSelect(row)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === 'Enter') onSelect(row); }}
      sx={{
        display: 'flex', gap: 1, alignItems: 'flex-start', px: 1.25, py: 1,
        cursor: 'pointer', borderRadius: '12px',
        bgcolor: active ? alpha(accent, 0.1) : 'transparent',
        border: '1px solid', borderColor: active ? alpha(accent, 0.3) : 'transparent',
        '&:hover': { bgcolor: active ? alpha(accent, 0.12) : 'action.hover' },
      }}
    >
      <Avatar sx={{
        width: 38, height: 38, fontSize: 14, fontWeight: 800,
        bgcolor: alpha(row.color || meta.color, 0.16), color: row.color || meta.color,
      }}>
        {row.kind === 'channel'
          ? <Icon sx={{ fontSize: 18 }} />
          : String(row.title || 'گ').slice(0, 2)}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography noWrap sx={{ fontSize: 12.5, fontWeight: unread ? 900 : 700, color: INK, flex: 1 }}>
            {row.title || 'گفتگوی خصوصی'}
          </Typography>
          <Typography sx={{ fontSize: 10, color: MUTED, flexShrink: 0 }}>
            {timeLabel(row.last_message_at)}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography noWrap sx={{ fontSize: 11, color: MUTED, flex: 1 }}>
            {row.last_message?.preview || 'پیامی ثبت نشده است'}
          </Typography>
          {unread ? (
            <Badge color="error" badgeContent={toPersianDigits(unread)} max={99}
              sx={{ '& .MuiBadge-badge': { fontSize: 9, height: 16, minWidth: 16 } }} />
          ) : null}
        </Stack>
        <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 0.4 }}>
          <Chip size="small" label={meta.label} sx={{
            height: 18, fontSize: 9.5, fontWeight: 800,
            bgcolor: alpha(meta.color, 0.1), color: meta.color,
          }} />
          {row.related_label ? (
            <Chip size="small" icon={<TagIcon sx={{ fontSize: 12 }} />}
              label={row.related_label} sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }} />
          ) : null}
          {row.is_public ? (
            <Chip size="small" label="عمومی" sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }} />
          ) : null}
        </Stack>
      </Box>
    </Box>
  );
};



const MessageBubble = ({ message, accent, tokens, onReply, onEdit, onDelete }) => {
  const mine = Boolean(message.is_mine);
  return (
    <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-start' : 'flex-end' }}>
      <Box sx={{
        maxWidth: '78%', px: 1.4, py: 1, borderRadius: '14px',
        borderTopLeftRadius: mine ? 4 : 14, borderTopRightRadius: mine ? 14 : 4,
        bgcolor: mine ? accent : 'background.paper',
        color: mine ? '#ffffff' : (tokens?.colors?.textPrimary || INK),
        border: '1px solid', borderColor: mine ? alpha(accent, 0.7) : 'divider',
        boxShadow: tokens?.shadows?.soft || '0 1px 2px rgba(15,23,42,0.06)',
      }}>
        {!mine ? (
          <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: accent, mb: 0.25 }}>
            {message.sender_name || 'کاربر'}
          </Typography>
        ) : null}
        {message.reply_to ? (
          <Box sx={{
            mb: 0.6, px: 0.9, py: 0.4, borderRadius: '8px',
            borderInlineStart: `3px solid ${mine ? 'rgba(255,255,255,0.7)' : accent}`,
            bgcolor: mine ? 'rgba(255,255,255,0.14)' : alpha(accent, 0.07),
          }}>
            <Typography sx={{ fontSize: 10, fontWeight: 800 }}>
              {message.reply_to_sender || 'پاسخ'}
            </Typography>
            <Typography noWrap sx={{ fontSize: 10.5, opacity: 0.85 }}>
              {message.reply_to_preview}
            </Typography>
          </Box>
        ) : null}
        {message.deleted_at ? (
          <Typography sx={{ fontSize: 11.5, fontStyle: 'italic', opacity: 0.7 }}>
            این پیام حذف شده است
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 12.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.body}
          </Typography>
        )}
        {(message.entity_refs || []).map((ref) => (
          <Chip
            key={ref.id}
            size="small"
            icon={<TagIcon sx={{ fontSize: 12 }} />}
            label={ref.is_accessible ? (ref.label || `${ref.module} #${ref.object_id}`) : 'دسترسی ندارد'}
            component={ref.is_accessible && ref.url ? 'a' : 'div'}
            href={ref.is_accessible && ref.url ? ref.url : undefined}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              mt: 0.5, mr: 0.4, height: 20, fontSize: 9.5, fontWeight: 800,
              bgcolor: mine ? 'rgba(255,255,255,0.18)' : alpha(accent, 0.1),
              color: mine ? '#fff' : accent,
            }}
          />
        ))}
        {(message.attachments || []).map((file) => (
          <Chip
            key={file.id}
            size="small"
            icon={<AttachFileOutlinedIcon sx={{ fontSize: 12 }} />}
            label={`${file.file_name || file.title} · ${Math.max(1, Math.round((file.size || 0) / 1024))}KB`}
            component="a"
            href={file.file_url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              mt: 0.5, mr: 0.4, height: 20, fontSize: 9.5, fontWeight: 800,
              bgcolor: mine ? 'rgba(255,255,255,0.2)' : 'action.hover',
              color: mine ? '#fff' : INK,
            }}
          />
        ))}
        <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mt: 0.4, opacity: 0.9 }}>
          <Typography sx={{ fontSize: 9.5 }}>
            {timeLabel(message.created_at)}{message.edited_at ? ' · ویرایش‌شده' : ''}
          </Typography>
          {mine ? (
            <Tooltip title={receiptLabel(message)}>
              <DoneAllIcon sx={{ fontSize: 12 }} />
            </Tooltip>
          ) : null}
          <Box sx={{ flex: 1 }} />
          {message.deleted_at ? null : (
            <>
              <Tooltip title="پاسخ">
                <ReplyIcon sx={{ fontSize: 13, cursor: 'pointer' }} onClick={() => onReply(message)} />
              </Tooltip>
              {mine ? (
                <Tooltip title="ویرایش">
                  <EditOutlinedIcon sx={{ fontSize: 13, cursor: 'pointer' }}
                    onClick={() => onEdit(message)} />
                </Tooltip>
              ) : null}
              {mine ? (
                <Tooltip title="حذف">
                  <DeleteOutlineIcon sx={{ fontSize: 13, cursor: 'pointer' }}
                    onClick={() => onDelete(message)} />
                </Tooltip>
              ) : null}
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
};



const ChatPanel = ({
  initialConversationId = '', syncUrl = true, embedded = false,
  height = 'calc(100vh - 150px)',
}) => {
  const theme = useTheme();
  const { tokens } = useDesignTokens();
  const { getPalette } = useModulePalette();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [, setSearchParams] = useSearchParams();

  const accent = getPalette('chat')?.accent || getPalette('correspondence')?.accent || ACCENT_FALLBACK;
  const [activeId, setActiveId] = useState(() => (initialConversationId ? String(initialConversationId) : ''));

  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [pickedFiles, setPickedFiles] = useState([]);
  const [entityRef, setEntityRef] = useState({ module: '', label: '', url: '', object_id: '' });
  const [mentionIds, setMentionIds] = useState([]);
  const [toast, setToast] = useState('');
  const [newDialog, setNewDialog] = useState(false);
  const [newForm, setNewForm] = useState({
    kind: 'direct', title: '', description: '', members: [], user: '',
  });
  const [membersDialog, setMembersDialog] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editMessage, setEditMessage] = useState(null);
  const listEndRef = useRef(null);

  const { conversations, conversationsQuery, messages, messagesQuery, unreadQuery } = useChatQueries({
    user, activeId, search,
  });

  const directoryQuery = useQuery({
    queryKey: ['chat-directory'],
    queryFn: () => axiosInstance.get('/chat/directory/').then((response) => response.data),
    staleTime: 5 * 60 * 1000,
  });
  const directory = useMemo(
    () => (Array.isArray(directoryQuery.data) ? directoryQuery.data : []),
    [directoryQuery.data],
  );

  const activeConversation = useMemo(
    () => conversations.find((row) => String(row.id) === String(activeId)) || null,
    [conversations, activeId],
  );

  useEffect(() => {
    if (!activeId && conversations.length) setActiveId(String(conversations[0].id));
  }, [conversations, activeId]);

  useEffect(() => {
    if (!activeId) return;
    if (syncUrl) {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('conversation', activeId);
        return next;
      }, { replace: true });
    }
    const markRead = async () => {
      try {
        await axiosInstance.post(`/chat/conversations/${activeId}/read/`, {});
        qc.invalidateQueries({ queryKey: ['chat-unread'] });
        qc.invalidateQueries({ queryKey: ['chat-conversations'] });
      } catch (error) {
        setToast('ثبت «خوانده شد» انجام نشد');
      }
    };
    markRead();
  }, [activeId, messages.length, qc, setSearchParams, syncUrl]);

  useEffect(() => {
    if (!listEndRef.current) return;
    if (typeof listEndRef.current.scrollIntoView !== 'function') return;
    listEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, activeId]);

  const invalidateThread = () => {
    qc.invalidateQueries({ queryKey: ['chat-messages', activeId] });
    qc.invalidateQueries({ queryKey: ['chat-conversations'] });
    qc.invalidateQueries({ queryKey: ['chat-unread'] });
  };

  const sendMessage = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('body', draft);
      if (replyTo?.id) form.append('reply_to', replyTo.id);
      if (mentionIds.length) form.append('mentions', JSON.stringify(mentionIds));
      if (entityRef.module && (entityRef.label || entityRef.object_id)) {
        form.append('entity_refs', JSON.stringify([entityRef]));
      }
      pickedFiles.forEach((file) => form.append('files', file));
      return axiosInstance.post(`/chat/conversations/${activeId}/messages/`, form);
    },
    onSuccess: () => {
      setDraft('');
      setReplyTo(null);
      setPickedFiles([]);
      setMentionIds([]);
      setEntityRef({ module: '', label: '', url: '', object_id: '' });
      invalidateThread();
    },
    onError: () => setToast('ارسال پیام انجام نشد'),
  });

  const saveEdit = useMutation({
    mutationFn: () => axiosInstance.patch(`/chat/messages/${editMessage.id}/`, { body: editValue }),
    onSuccess: () => {
      setEditMessage(null);
      setEditValue('');
      invalidateThread();
    },
    onError: () => setToast('ویرایش پیام انجام نشد'),
  });

  const removeMessage = useMutation({
    mutationFn: (message) => axiosInstance.delete(`/chat/messages/${message.id}/`),
    onSuccess: invalidateThread,
    onError: () => setToast('حذف پیام انجام نشد'),
  });

  const createConversation = useMutation({
    mutationFn: () => {
      if (newForm.kind === 'direct') {
        return axiosInstance.post('/chat/conversations/', {
          kind: 'direct', user: newForm.user,
        });
      }
      return axiosInstance.post('/chat/conversations/', {
        kind: newForm.kind,
        title: newForm.title,
        description: newForm.description,
        members: newForm.members,
        color: CHAT_KIND_META[newForm.kind]?.color || accent,
        is_public: newForm.kind === 'channel',
        post_policy: newForm.kind === 'channel' ? 'admins' : 'members',
      });
    },
    onSuccess: (response) => {
      setNewDialog(false);
      setNewForm({ kind: 'direct', title: '', description: '', members: [], user: '' });
      setActiveId(String(response.data.id));
      qc.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
    onError: () => setToast('ساخت گفتگو انجام نشد'),
  });

  /** شروع/بازکردن گفتگوی خصوصی با یک کاربر (idempotent در بک‌اند). */
  const startDirect = useMutation({
    mutationFn: (peerId) => axiosInstance.post('/chat/conversations/', {
      kind: 'direct', user: peerId,
    }),
    onSuccess: (response) => {
      setMembersDialog(false);
      setNewDialog(false);
      setActiveId(String(response.data.id));
      qc.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
    onError: () => setToast('شروع گفتگوی خصوصی انجام نشد'),
  });

  const addMembers = useMutation({
    mutationFn: (ids) => axiosInstance.post(`/chat/conversations/${activeId}/members/`, { users: ids }),
    onSuccess: () => {
      setMembersDialog(false);
      invalidateThread();
      qc.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
    onError: () => setToast('افزودن عضو انجام نشد'),
  });

  const submit = () => {
    if (!activeId) return;
    if (!draft.trim() && !pickedFiles.length) return;
    sendMessage.mutate();
  };

  const applyMention = (person) => {
    setDraft((previous) => `${previous}${previous.endsWith(' ') || !previous ? '' : ' '}@${person.name} `);
    setMentionIds((previous) => (previous.includes(person.id) ? previous : [...previous, person.id]));
  };

  const chipTone = {
    height: 20, fontSize: 10, fontWeight: 800,
    bgcolor: alpha(accent, 0.1), color: accent,
  };

  return (
    <Box sx={{ pb: 1, height: embedded ? '100%' : undefined, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems="stretch"
        sx={{ height, minHeight: 0, flex: 1 }}>
        {/* ---------------- فهرست گفتگوها ---------------- */}
        <Box sx={{
          width: { xs: '100%', md: 320 }, flexShrink: 0, display: 'flex', flexDirection: 'column',
          border: '1px solid', borderColor: 'divider', borderRadius: 'var(--hrms-radius-large, 16px)',
          bgcolor: 'background.paper', overflow: 'hidden',
        }}>
          <Box sx={{ px: 1.5, py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <ChatBubbleOutlineIcon sx={{ fontSize: 18, color: accent }} />
              <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK, flex: 1 }}>
                گفتگوی سازمانی
              </Typography>
              <Tooltip title="گفتگوی خصوصی با یک همکار">
                <IconButton
                  size="small" aria-label="گفتگوی خصوصی"
                  onClick={() => {
                    setNewForm({ kind: 'direct', title: '', description: '', members: [], user: '' });
                    setNewDialog(true);
                  }}
                  sx={{ color: accent }}
                >
                  <PersonAddAltOutlinedIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="گفتگو/کانال جدید">
                <IconButton size="small" aria-label="گفتگوی جدید" onClick={() => setNewDialog(true)}
                  sx={{ color: accent, bgcolor: alpha(accent, 0.1) }}>
                  <AddIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Stack>
            <TextField
              size="small" fullWidth placeholder="جست‌وجو در گفتگوها…" value={search}
              onChange={(event) => setSearch(event.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 16 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ mt: 1, '& .MuiInputBase-input': { fontSize: 11.5 } }}
            />
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', p: 0.75, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {conversationsQuery.isLoading ? (
              <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={20} /></Box>
            ) : conversations.length ? (
              conversations.map((row) => (
                <ConversationRow
                  key={row.id} row={row} accent={accent}
                  active={String(row.id) === String(activeId)}
                  onSelect={(item) => setActiveId(String(item.id))}
                />
              ))
            ) : (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography sx={{ fontSize: 11.5, color: MUTED }}>
                  هنوز گفتگویی ندارید؛ یک گفتگوی خصوصی با یک همکار شروع کنید.
                </Typography>
                <Button
                  size="small" variant="outlined" sx={{ mt: 1, fontSize: 11 }}
                  startIcon={<PersonAddAltOutlinedIcon sx={{ fontSize: 15 }} />}
                  onClick={() => {
                    setNewForm({ kind: 'direct', title: '', description: '', members: [], user: '' });
                    setNewDialog(true);
                  }}
                >
                  گفتگوی خصوصی
                </Button>
              </Box>
            )}
          </Box>
          <Box sx={{ px: 1.25, py: 0.9, borderTop: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Badge color="error" badgeContent={toPersianDigits(unreadQuery.data?.mentions || 0)}
                max={99} invisible={!unreadQuery.data?.mentions}>
                <AlternateEmailOutlinedIcon sx={{ fontSize: 16, color: MUTED }} />
              </Badge>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>
                منشن‌های خوانده‌نشده
              </Typography>
            </Stack>
          </Box>
        </Box>

        {/* ---------------- رشتهٔ پیام‌ها ---------------- */}
        <Box sx={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          border: '1px solid', borderColor: 'divider',
          borderRadius: 'var(--hrms-radius-large, 16px)',
          bgcolor: theme.palette.mode === 'dark'
            ? alpha('#ffffff', 0.02)
            : alpha('#f8fafc', 0.9),
          overflow: 'hidden',
        }}>
          {activeConversation ? (
            <>
              <Box sx={{
                px: 1.5, py: 1.1, borderBottom: '1px solid', borderColor: 'divider',
                bgcolor: 'background.paper', display: 'flex', alignItems: 'center', gap: 1,
              }}>
                <Avatar sx={{
                  width: 34, height: 34, fontSize: 13, fontWeight: 800,
                  bgcolor: alpha(accent, 0.14), color: accent,
                }}>
                  {String(activeConversation.title || 'گ').slice(0, 2)}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 900, color: INK }}>
                    {activeConversation.title || 'گفتگوی خصوصی'}
                  </Typography>
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                    <Typography sx={{ fontSize: 10, color: MUTED }}>
                      {CHAT_KIND_META[activeConversation.kind]?.label}
                      {' · '}
                      {toPersianDigits(activeConversation.member_count || 0)} عضو
                    </Typography>
                    {activeConversation.related_label ? (
                      <Chip size="small" icon={<TagIcon sx={{ fontSize: 11 }} />}
                        label={activeConversation.related_label} sx={chipTone} />
                    ) : null}
                  </Stack>
                </Box>
                <Tooltip title="اعضا">
                  <IconButton size="small" aria-label="اعضای گفتگو"
                    onClick={() => setMembersDialog(true)}>
                    <GroupOutlinedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="بستن">
                  <IconButton size="small" aria-label="بستن گفتگو" onClick={() => setActiveId('')}>
                    <CloseIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{
                flex: 1, overflowY: 'auto', px: 1.5, py: 1.25,
                display: 'flex', flexDirection: 'column', gap: 0.9,
              }}>
                {messagesQuery.isLoading ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={20} /></Box>
                ) : messages.length ? (
                  messages.map((message) => (
                    <MessageBubble
                      key={message.id} message={message} accent={accent} tokens={tokens}
                      onReply={setReplyTo}
                      onEdit={(row) => { setEditMessage(row); setEditValue(row.body || ''); }}
                      onDelete={(row) => removeMessage.mutate(row)}
                    />
                  ))
                ) : (
                  <Box sx={{ py: 5, textAlign: 'center' }}>
                    <ChatBubbleOutlineIcon sx={{ fontSize: 34, color: alpha(accent, 0.5), mb: 0.5 }} />
                    <Typography sx={{ fontSize: 12, color: MUTED }}>
                      هنوز پیامی ثبت نشده است؛ اولین پیام را بفرستید.
                    </Typography>
                  </Box>
                )}
                <Box ref={listEndRef} />
              </Box>


              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: 1, bgcolor: 'background.paper' }}>
                {replyTo ? (
                  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
                    <ReplyIcon sx={{ fontSize: 15, color: accent }} />
                    <Typography noWrap sx={{ fontSize: 10.5, color: MUTED, flex: 1 }}>
                      پاسخ به {replyTo.sender_name}: {replyTo.body}
                    </Typography>
                    <IconButton size="small" aria-label="لغو پاسخ" onClick={() => setReplyTo(null)}>
                      <CloseIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Stack>
                ) : null}
                {pickedFiles.length ? (
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 0.6 }}>
                    {pickedFiles.map((file, index) => (
                      <Chip
                        key={`${file.name}-${index}`} size="small"
                        icon={<AttachFileOutlinedIcon sx={{ fontSize: 12 }} />}
                        label={file.name}
                        onDelete={() => setPickedFiles((rows) => rows.filter((_, i) => i !== index))}
                        sx={chipTone}
                      />
                    ))}
                  </Stack>
                ) : null}
                {entityRef.label ? (
                  <Chip
                    size="small" icon={<TagIcon sx={{ fontSize: 12 }} />}
                    label={`ارجاع: ${entityRef.label}`} sx={{ ...chipTone, mb: 0.6 }}
                    onDelete={() => setEntityRef({ module: '', label: '', url: '', object_id: '' })}
                  />
                ) : null}
                <Stack direction="row" spacing={0.6} alignItems="flex-end">
                  <TextField
                    size="small" fullWidth multiline maxRows={4} value={draft}
                    placeholder="پیام خود را بنویسید… (Shift+Enter برای خط جدید)"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        submit();
                      }
                    }}
                    sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
                  />
                  <Tooltip title="پیوست فایل">
                    <IconButton component="label" size="small" aria-label="پیوست فایل">
                      <AttachFileOutlinedIcon sx={{ fontSize: 18 }} />
                      <input hidden type="file" multiple
                        onChange={(event) => setPickedFiles([...event.target.files])} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="منشن کاربر">
                    <IconButton size="small" aria-label="منشن"
                      onClick={() => { if (directory.length) applyMention(directory[0]); }}>
                      <AlternateEmailOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Button
                    variant="contained" size="small" onClick={submit}
                    disabled={sendMessage.isPending || (!draft.trim() && !pickedFiles.length)}
                    startIcon={<SendIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      bgcolor: accent, '&:hover': { bgcolor: accent },
                      minWidth: 80, fontSize: 11.5,
                    }}
                  >
                    ارسال
                  </Button>
                </Stack>

                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.6 }}>
                  <Select
                    size="small" displayEmpty value={entityRef.module}
                    onChange={(event) => setEntityRef((previous) => ({
                      ...previous, module: event.target.value,
                    }))}
                    sx={{ fontSize: 10.5, height: 26, minWidth: 110 }}
                  >
                    <MenuItem value="">ارجاع به…</MenuItem>
                    <MenuItem value="contracts">قرارداد</MenuItem>
                    <MenuItem value="projects">پروژه</MenuItem>
                    <MenuItem value="procurement">خرید</MenuItem>
                    <MenuItem value="accounting">سند حسابداری</MenuItem>
                    <MenuItem value="correspondence">مکاتبه</MenuItem>
                    <MenuItem value="documents">سند DMS</MenuItem>
                  </Select>
                  {entityRef.module ? (
                    <>
                      <TextField size="small" placeholder="شناسه" value={entityRef.object_id}
                        onChange={(event) => setEntityRef((previous) => ({
                          ...previous, object_id: event.target.value,
                        }))}
                        sx={{ width: 90, '& .MuiInputBase-input': { fontSize: 10.5, py: 0.5 } }} />
                      <TextField size="small" placeholder="عنوان" value={entityRef.label}
                        onChange={(event) => setEntityRef((previous) => ({
                          ...previous, label: event.target.value,
                        }))}
                        sx={{ width: 150, '& .MuiInputBase-input': { fontSize: 10.5, py: 0.5 } }} />
                      <TextField size="small" placeholder="لینک" value={entityRef.url}
                        onChange={(event) => setEntityRef((previous) => ({
                          ...previous, url: event.target.value,
                        }))}
                        sx={{ flex: 1, '& .MuiInputBase-input': { fontSize: 10.5, py: 0.5 } }} />
                    </>
                  ) : null}
                </Stack>
              </Box>
            </>
          ) : (
            <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <ChatBubbleOutlineIcon sx={{ fontSize: 46, color: alpha(accent, 0.4) }} />
                <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK, mt: 1 }}>
                  یک گفتگو انتخاب کنید
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: MUTED, mt: 0.5 }}>
                  پیام‌ها رمزنگاری‌شده‌اند و فقط اعضای گفتگو آن‌ها را می‌بینند.
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

      </Stack>

      {toast ? (
        <Alert severity="info" onClose={() => setToast('')} sx={{ mt: 1 }}>{toast}</Alert>
      ) : null}

      {/* ---------------- دیالوگ ساخت گفتگو/کانال ---------------- */}
      <Dialog open={newDialog} onClose={() => setNewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 13.5, fontWeight: 900, pb: 0.5 }}>
          {newForm.kind === 'direct'
            ? 'گفتگوی خصوصی جدید'
            : (newForm.kind === 'channel' ? 'کانال جدید' : 'گروه کاری جدید')}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            <Select
              size="small" value={newForm.kind}
              onChange={(event) => setNewForm((previous) => ({
                ...previous, kind: event.target.value,
              }))}
            >
              <MenuItem value="direct">گفتگوی خصوصی (دو نفره)</MenuItem>
              <MenuItem value="group">گروه کاری</MenuItem>
              <MenuItem value="channel">کانال اطلاع‌رسانی</MenuItem>
            </Select>
            {newForm.kind === 'direct' ? (
              <>
                <Select
                  size="small" displayEmpty value={newForm.user}
                  onChange={(event) => setNewForm((previous) => ({
                    ...previous, user: event.target.value,
                  }))}
                  renderValue={(selected) => {
                    const person = directory.find((row) => row.id === selected);
                    return person ? person.name : 'یک همکار را انتخاب کنید';
                  }}
                >
                  {directory
                    .filter((person) => String(person.id) !== String(user?.id))
                    .map((person) => (
                      <MenuItem key={person.id} value={person.id}>{person.name}</MenuItem>
                    ))}
                </Select>
                <Typography sx={{ fontSize: 10.5, color: MUTED }}>
                  گفتگوی خصوصی فقط بین شما دو نفر است؛ پیام‌ها رمزنگاری‌شده ذخیره می‌شوند.
                </Typography>
              </>
            ) : (
              <>
                <TextField
                  size="small" label="عنوان" value={newForm.title}
                  onChange={(event) => setNewForm((previous) => ({
                    ...previous, title: event.target.value,
                  }))}
                />
                <TextField
                  size="small" label="توضیح (اختیاری)" multiline minRows={2}
                  value={newForm.description}
                  onChange={(event) => setNewForm((previous) => ({
                    ...previous, description: event.target.value,
                  }))}
                />
                <Select
                  size="small" multiple displayEmpty
                  value={newForm.members}
                  onChange={(event) => setNewForm((previous) => ({
                    ...previous, members: event.target.value,
                  }))}
                  renderValue={(selected) => (selected.length
                    ? `${toPersianDigits(selected.length)} عضو انتخاب شد`
                    : 'انتخاب اعضا')}
                >
                  {directory.map((person) => (
                    <MenuItem key={person.id} value={person.id}>{person.name}</MenuItem>
                  ))}
                </Select>
                <Typography sx={{ fontSize: 10.5, color: MUTED }}>
                  {newForm.kind === 'channel'
                    ? 'کانال برای اطلاع‌رسانی است؛ ارسال پیام فقط توسط مدیران کانال انجام می‌شود.'
                    : 'در گروه، همهٔ اعضا می‌توانند پیام بفرستند.'}
                </Typography>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDialog(false)}>انصراف</Button>
          <Button
            variant="contained"
            disabled={(
              newForm.kind === 'direct'
                ? !newForm.user
                : !newForm.title.trim()
            ) || createConversation.isPending}
            onClick={() => createConversation.mutate()}
            sx={{ bgcolor: accent, '&:hover': { bgcolor: accent } }}
          >
            شروع
          </Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- دیالوگ اعضا ---------------- */}
      <Dialog open={membersDialog} onClose={() => setMembersDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 13, fontWeight: 900, pb: 0.5 }}>اعضای گفتگو</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={0.75} sx={{ mb: 1.5 }}>
            {(activeConversation?.members || []).map((member) => {
              const isMe = String(member.user) === String(user?.id);
              return (
                <Stack
                  key={member.id} direction="row" alignItems="center" spacing={0.75}
                  onClick={() => { if (!isMe) startDirect.mutate(member.user); }}
                  sx={{
                    p: 0.4, borderRadius: '8px',
                    cursor: isMe ? 'default' : 'pointer',
                    '&:hover': { bgcolor: isMe ? 'transparent' : 'action.hover' },
                  }}
                >
                  <Avatar sx={{
                    width: 26, height: 26, fontSize: 11,
                    bgcolor: alpha(accent, 0.14), color: accent,
                  }}>
                    {String(member.user_name || 'ک').slice(0, 2)}
                  </Avatar>
                  <Typography sx={{ fontSize: 11.5, flex: 1 }}>
                    {member.user_name || member.user}
                    {isMe ? ' (شما)' : ''}
                  </Typography>
                  {!isMe ? (
                    <Tooltip title="شروع گفتگوی خصوصی">
                      <PersonAddAltOutlinedIcon sx={{ fontSize: 15, color: accent }} />
                    </Tooltip>
                  ) : null}
                  <Chip size="small" label={member.role_display}
                    sx={{ height: 18, fontSize: 9.5, fontWeight: 800 }} />
                </Stack>
              );
            })}
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <Typography sx={{ fontSize: 11, color: MUTED, mb: 0.5 }}>افزودن عضو جدید</Typography>
          <Select
            size="small" multiple fullWidth displayEmpty value={[]}
            onChange={(event) => addMembers.mutate(event.target.value)}
            renderValue={() => 'انتخاب کاربر برای افزودن'}
          >
            {directory.map((person) => (
              <MenuItem key={person.id} value={person.id}>{person.name}</MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMembersDialog(false)}>بستن</Button>
        </DialogActions>
      </Dialog>

      {/* ---------------- دیالوگ ویرایش پیام ---------------- */}
      <Dialog open={Boolean(editMessage)} onClose={() => setEditMessage(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 13, fontWeight: 900, pb: 0.5 }}>ویرایش پیام</DialogTitle>
        <DialogContent dividers>
          <TextField
            size="small" fullWidth multiline minRows={3} value={editValue}
            onChange={(event) => setEditValue(event.target.value)}
          />
          <Typography sx={{ fontSize: 10, color: MUTED, mt: 0.75 }}>
            ویرایش در تاریخچه (Audit) ثبت می‌شود و متن قبلی برای حسابرسی می‌ماند.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMessage(null)}>انصراف</Button>
          <Button variant="contained" disabled={saveEdit.isPending}
            onClick={() => saveEdit.mutate()}
            sx={{ bgcolor: accent, '&:hover': { bgcolor: accent } }}>
            ذخیره
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

/** صفحهٔ کامل چت (مسیر `/chat`) — همان پنل با همگام‌سازی آدرس. */
const ChatPage = () => {
  const [searchParams] = useSearchParams();
  const conversation = searchParams.get('conversation') || '';
  return <ChatPanel initialConversationId={conversation} syncUrl />;
};

export { ChatPanel };
export default ChatPage;

