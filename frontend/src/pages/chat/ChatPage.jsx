import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, IconButton, InputAdornment, MenuItem,
  Select, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import ReplyIcon from '@mui/icons-material/Reply';
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import TagIcon from '@mui/icons-material/Tag';
import axiosInstance from '../../core/api/axiosConfig';
import useAuth from '../../core/hooks/useAuth';
import { toPersianDigits } from '../../core/utils/numberUtils';
import ChatConversationRail from './ChatConversationRail';
import ChatEmojiPicker from './ChatEmojiPicker';
import ChatInfoPanel from './ChatInfoPanel';
import ChatMessageBubble from './ChatMessageBubble';
import ChatTaskDialog from './ChatTaskDialog';
import EntityPickerDialog, { ENTITY_MODULE_META } from './EntityPickerDialog';
import {
  ChatAvatar, CHAT_KIND_META, MUTED, dateLabel, kindMetaOf, useChatLook,
} from './chatUi';

export { CHAT_KIND_META, canEditMessage, receiptLabel } from './chatUi';

const TYPING_WINDOW_MS = 6000;
const TYPING_THROTTLE_MS = 3000;
const draftKeyOf = (id) => `hrms-chat-draft-${id}`;

const useChatQueries = ({ user, activeId, search, threadSearch, infoOpen }) => {
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
    queryKey: ['chat-messages', activeId, threadSearch],
    queryFn: () => axiosInstance
      .get(`/chat/conversations/${activeId}/messages/`, {
        params: { limit: 40, search: threadSearch || undefined },
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

  // رویدادها سبک‌اند؛ در گفتگوی فعال سریع‌تر خوانده می‌شوند تا «در حال نوشتن» زنده باشد.
  const eventsQuery = useQuery({
    queryKey: ['chat-events', activeId],
    queryFn: () => axiosInstance.get('/chat/events/', { params: { since: 0 } })
      .then((response) => response.data),
    enabled: Boolean(user?.id),
    refetchInterval: activeId ? 4_000 : 20_000,
  });

  const knownEventIds = useRef(new Set());
  useEffect(() => {
    const rows = eventsQuery.data?.results || [];
    if (!rows.length) return;
    const fresh = rows.filter((row) => !knownEventIds.current.has(row.id));
    rows.forEach((row) => knownEventIds.current.add(row.id));
    if (!fresh.length) return;
    qc.invalidateQueries({ queryKey: ['chat-conversations'] });
    if (activeId && fresh.some((row) => String(row.conversation) === String(activeId))) {
      qc.invalidateQueries({ queryKey: ['chat-messages', activeId] });
    }
    qc.invalidateQueries({ queryKey: ['chat-unread'] });
  }, [eventsQuery.data, activeId, qc]);

  /** کاربرانی که همین حالا در حال نوشتن‌اند (رویداد typing با عمر کوتاه). */
  const typingUsers = useMemo(() => {
    if (!activeId) return [];
    const rows = eventsQuery.data?.results || [];
    const now = Date.now();
    const names = new Map();
    rows.forEach((row) => {
      if (row.type !== 'typing') return;
      if (String(row.conversation) !== String(activeId)) return;
      const payload = row.payload || {};
      if (!payload.user || String(payload.user) === String(user?.id)) return;
      const at = new Date(row.at).getTime();
      if (!Number.isFinite(at) || now - at > TYPING_WINDOW_MS) return;
      names.set(String(payload.user), payload.name || 'کاربر');
    });
    return Array.from(names.values());
  }, [eventsQuery.data, activeId, user?.id]);

  const pinnedQuery = useQuery({
    queryKey: ['chat-pinned', activeId],
    queryFn: () => axiosInstance
      .get(`/chat/conversations/${activeId}/pinned/`)
      .then((response) => response.data),
    enabled: Boolean(activeId && infoOpen),
    staleTime: 15_000,
  });

  return {
    conversations, conversationsQuery, messages, messagesQuery, unreadQuery,
    eventsQuery, typingUsers, pinnedQuery,
  };
};


const DateSeparator = ({ value }) => {
  const iso = String(value || '').slice(0, 10);
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const yesterday = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);
  const label = iso === todayIso ? 'امروز' : (iso === yesterday ? 'دیروز' : dateLabel(value));
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ my: 0.6 }}>
      <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
      <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: 1, bgcolor: 'divider' }} />
    </Stack>
  );
};

const UnreadDivider = ({ accent }) => (
  <Stack direction="row" alignItems="center" spacing={0.8} sx={{ my: 0.5 }}
    data-testid="chat-unread-divider">
    <Box sx={{ flex: 1, height: 1, bgcolor: alpha(accent, 0.45) }} />
    <Typography sx={{ fontSize: 9.5, fontWeight: 900, color: accent }}>
      پیام‌های خوانده‌نشده
    </Typography>
    <Box sx={{ flex: 1, height: 1, bgcolor: alpha(accent, 0.45) }} />
  </Stack>
);

const TypingIndicator = ({ names, accent }) => {
  if (!names.length) return null;
  const text = names.length === 1
    ? `${names[0]} در حال نوشتن…`
    : `${toPersianDigits(names.length)} نفر در حال نوشتن…`;
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" data-testid="chat-typing-indicator"
      sx={{ px: 0.5, py: 0.3 }}>
      <Box sx={{ display: 'inline-flex', gap: '3px' }}>
        {[0, 1, 2].map((dot) => (
          <Box key={dot} sx={{
            width: 4, height: 4, borderRadius: '50%', bgcolor: accent,
            animation: 'chatTyping 1.1s infinite',
            animationDelay: `${dot * 0.15}s`,
            '@keyframes chatTyping': {
              '0%, 60%, 100%': { opacity: 0.25, transform: 'translateY(0)' },
              '30%': { opacity: 1, transform: 'translateY(-2px)' },
            },
          }} />
        ))}
      </Box>
      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{text}</Typography>
    </Stack>
  );
};

const ChatPanel = ({
  initialConversationId = '', syncUrl = true, embedded = false,
  height = 'calc(100vh - 150px)',
}) => {
  const look = useChatLook();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [, setSearchParams] = useSearchParams();
  const accent = look.accent;

  const [activeId, setActiveId] = useState(
    () => (initialConversationId ? String(initialConversationId) : ''),
  );
  const [search, setSearch] = useState('');
  const [threadSearch, setThreadSearch] = useState('');
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [railTab, setRailTab] = useState('all');
  const [kindFilter, setKindFilter] = useState('all');
  const [infoOpen, setInfoOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [pickedFiles, setPickedFiles] = useState([]);
  const [entityRefs, setEntityRefs] = useState([]);
  const [entityPickerOpen, setEntityPickerOpen] = useState(false);
  const [mentionIds, setMentionIds] = useState([]);
  const [toast, setToast] = useState('');
  const [newDialog, setNewDialog] = useState(false);
  const [newForm, setNewForm] = useState({
    kind: 'direct', title: '', description: '', members: [], user: '',
  });
  const [membersDialog, setMembersDialog] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [editMessage, setEditMessage] = useState(null);
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [taskTarget, setTaskTarget] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [unreadAfter, setUnreadAfter] = useState(null);
  const composerRef = useRef(null);
  const listEndRef = useRef(null);
  const messageRefs = useRef({});
  const typingSentAt = useRef(0);

  const {
    conversations, conversationsQuery, messages, messagesQuery, unreadQuery,
    typingUsers, pinnedQuery,
  } = useChatQueries({ user, activeId, search, threadSearch, infoOpen });

  const directoryQuery = useQuery({
    queryKey: ['chat-directory'],
    queryFn: () => axiosInstance.get('/chat/directory/').then((response) => response.data),
    staleTime: 5 * 60 * 1000,
  });
  const directory = useMemo(
    () => (Array.isArray(directoryQuery.data) ? directoryQuery.data : []),
    [directoryQuery.data],
  );
  /** نقشهٔ عکس پرسنلی کاربران برای آواتار پیام‌ها (از همان فهرست کاربران چت). */
  const photoByUser = useMemo(() => {
    const map = new Map();
    directory.forEach((person) => {
      if (person?.id && person.photo_url) map.set(String(person.id), person.photo_url);
    });
    return map;
  }, [directory]);

  const membersQuery = useQuery({
    queryKey: ['chat-members', activeId],
    queryFn: () => axiosInstance
      .get(`/chat/conversations/${activeId}/members/`)
      .then((response) => response.data),
    enabled: Boolean(activeId && infoOpen),
    staleTime: 20_000,
  });

  const activeConversation = useMemo(
    () => conversations.find((row) => String(row.id) === String(activeId)) || null,
    [conversations, activeId],
  );
  const lastReadMarker = activeConversation?.membership?.last_read_message ?? null;

  useEffect(() => {
    if (!activeId && conversations.length) setActiveId(String(conversations[0].id));
  }, [conversations, activeId]);

  // نشان «پیام‌های خوانده‌نشده» فقط هنگام ورود به گفتگو محاسبه می‌شود (سبک تلگرام).
  useEffect(() => {
    setUnreadAfter(lastReadMarker || null);
  }, [activeId]); // eslint-disable-line

  // پیش‌نویس هر گفتگو جدا نگه داشته می‌شود.
  useEffect(() => {
    if (!activeId) { setDraft(''); return; }
    try {
      setDraft(window.localStorage.getItem(draftKeyOf(activeId)) || '');
    } catch (error) {
      setDraft('');
    }
    setReplyTo(null);
    setHighlightId(null);
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    try {
      if (draft) window.localStorage.setItem(draftKeyOf(activeId), draft);
      else window.localStorage.removeItem(draftKeyOf(activeId));
    } catch (error) {
      /* حافظهٔ محلی اختیاری است */
    }
  }, [activeId, draft]);

  const scrollToMessage = (messageId) => {
    const node = messageRefs.current[String(messageId)];
    setInfoOpen(false);
    if (!node) return;
    if (typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setHighlightId(String(messageId));
    window.setTimeout(() => setHighlightId(null), 2600);
  };

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
        // اعلان‌های همین گفتگو در سرور خوانده می‌شوند؛ زنگوله هم فوراً صفر می‌شود.
        qc.invalidateQueries({ queryKey: ['notifications'] });
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
      if (entityRefs.length) {
        form.append('entity_refs', JSON.stringify(entityRefs));
      }
      pickedFiles.forEach((file) => form.append('files', file));
      return axiosInstance.post(`/chat/conversations/${activeId}/messages/`, form);
    },
    onSuccess: () => {
      setDraft('');
      setReplyTo(null);
      setPickedFiles([]);
      setMentionIds([]);
      setEntityRefs([]);
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

  /** واکنش ایموجی: سرور toggle می‌کند و خلاصهٔ تازه برمی‌گرداند. */
  const toggleReaction = useMutation({
    mutationFn: ({ message, emoji }) => axiosInstance
      .post(`/chat/messages/${message.id}/reactions/`, { emoji }),
    onSuccess: (response, variables) => {
      const reactions = response.data?.reactions;
      if (!Array.isArray(reactions)) return;
      qc.setQueryData(['chat-messages', activeId, threadSearch], (previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          results: (previous.results || []).map((row) => (
            String(row.id) === String(variables.message.id) ? { ...row, reactions } : row
          )),
        };
      });
    },
    onError: () => setToast('ثبت واکنش انجام نشد'),
  });

  /** سنجاق/برداشتن سنجاق پیام. */
  const togglePin = useMutation({
    mutationFn: (message) => axiosInstance.post(`/chat/messages/${message.id}/pin/`, {}),
    onSuccess: () => {
      invalidateThread();
      qc.invalidateQueries({ queryKey: ['chat-pinned', activeId] });
    },
    onError: () => setToast('سنجاق‌کردن پیام انجام نشد'),
  });

  /** تنظیمات شخصی گفتگو: سنجاق در فهرست، بی‌صدا، بایگانی. */
  const updatePrefs = useMutation({
    mutationFn: (payload) => axiosInstance
      .post(`/chat/conversations/${activeId}/preferences/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-conversations'] });
      qc.invalidateQueries({ queryKey: ['chat-typing', activeId] });
    },
    onError: () => setToast('ذخیرهٔ تنظیمات گفتگو انجام نشد'),
  });

  /** اعلام «در حال نوشتن» (throttled؛ هر ۳ ثانیه یک‌بار در هر گفتگو). */
  const notifyTyping = () => {
    if (!activeId) return;
    const now = Date.now();
    if (now - typingSentAt.current < TYPING_THROTTLE_MS) return;
    typingSentAt.current = now;
    axiosInstance.post(`/chat/conversations/${activeId}/typing/`, {}).catch(() => {});
  };

  /** پس از ساخت وظیفه از پیام: تازه‌سازی فهرست پیام‌ها و اعلان موفقیت. */
  const handleTaskCreated = (data) => {
    invalidateThread();
    qc.invalidateQueries({ queryKey: ['planning-tasks'] });
    qc.invalidateQueries({ queryKey: ['chat-pinned', activeId] });
    const title = data?.task?.title || '';
    setToast(title ? `وظیفه «${title}» ساخته شد` : 'وظیفه ساخته شد');
    setTaskTarget(null);
  };

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

  /** درج ایموجی در محل نشانگر نوشتن (نه انتهای متن). */
  const insertEmoji = (emoji) => {
    const node = composerRef.current;
    const start = typeof node?.selectionStart === 'number' ? node.selectionStart : draft.length;
    const end = typeof node?.selectionEnd === 'number' ? node.selectionEnd : start;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
    setDraft(next);
    setEmojiAnchor(null);
    requestAnimationFrame(() => {
      if (!node || typeof node.setSelectionRange !== 'function') return;
      node.focus();
      const caret = start + emoji.length;
      try {
        node.setSelectionRange(caret, caret);
      } catch (error) {
        /* مرورگرهای قدیمی — نادیده */
      }
    });
  };

  const chipTone = {
    height: 20, fontSize: 10, fontWeight: 800,
    bgcolor: alpha(accent, 0.1), color: accent,
  };
  const showInfo = Boolean(infoOpen && activeConversation);

  return (
    <Box sx={{
      pb: embedded ? 0 : 1,
      width: '100%', minWidth: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* چیدمان گرید (RTL-safe): فهرست | رشتهٔ پیام | پنل اطلاعات با `gap` واقعی */}
      <Box data-testid="chat-layout" sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: showInfo ? '320px minmax(0, 1fr) 290px' : '320px minmax(0, 1fr)',
          xl: showInfo ? '356px minmax(0, 1fr) 300px' : '356px minmax(0, 1fr)',
        },
        gridTemplateRows: {
          xs: 'minmax(180px, 40%) minmax(0, 1fr) auto',
          md: 'minmax(0, 1fr)',
        },
        gridAutoRows: 'minmax(0, 1fr)',
        gap: { xs: 1.5, md: 2.25 },
        alignItems: 'stretch',
        height, minHeight: 0, minWidth: 0, width: '100%',
      }}>
        {/* ---------------- فهرست گفتگوها ---------------- */}
        <ChatConversationRail
          conversations={conversations}
          activeId={activeId}
          accent={accent}
          loading={conversationsQuery.isLoading}
          unread={unreadQuery.data?.chat || 0}
          search={search}
          onSearch={setSearch}
          tab={railTab}
          onTab={setRailTab}
          kindFilter={kindFilter}
          onKindFilter={setKindFilter}
          onSelect={(item) => { setActiveId(String(item.id)); setThreadSearch(''); }}
          onNewDirect={() => {
            setNewForm({ kind: 'direct', title: '', description: '', members: [], user: '' });
            setNewDialog(true);
          }}
          onNewChat={() => setNewDialog(true)}
        />

        {/* ---------------- رشتهٔ پیام‌ها ---------------- */}
        <Box sx={{
          minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column',
          border: '1px solid', borderColor: alpha(accent, 0.22),
          borderRadius: 'var(--hrms-radius-large, 18px)',
          bgcolor: look.wash,
          overflow: 'hidden',
        }}>
          {activeConversation ? (
            <>
              <Box sx={{
                px: 1.4, py: 1, borderBottom: '1px solid', borderColor: 'divider',
                bgcolor: look.tint,
              }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <ChatAvatar
                    name={activeConversation.title}
                    photo={activeConversation.avatar_url}
                    kind={activeConversation.kind}
                    size={36}
                    accent={accent}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 900, color: 'text.primary' }}>
                      {activeConversation.title || 'گفتگوی خصوصی'}
                    </Typography>
                    <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minHeight: 16 }}>
                      {typingUsers.length ? (
                        <TypingIndicator names={typingUsers} accent={accent} />
                      ) : (
                        <>
                          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                            {kindMetaOf(activeConversation).label}
                            {' · '}
                            {toPersianDigits(activeConversation.member_count || 0)} عضو
                          </Typography>
                          {activeConversation.related_label ? (
                            <Chip size="small" icon={<TagIcon sx={{ fontSize: 11 }} />}
                              label={activeConversation.related_label} sx={chipTone} />
                          ) : null}
                        </>
                      )}
                    </Stack>
                  </Box>
                  <Tooltip title="جست‌وجو در این گفتگو">
                    <IconButton size="small" aria-label="جست‌وجو در گفتگو"
                      onClick={() => {
                        setThreadSearchOpen((open) => !open);
                        if (threadSearchOpen) setThreadSearch('');
                      }}>
                      <SearchIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="اطلاعات و پیام‌های سنجاق‌شده">
                    <IconButton size="small" aria-label="اطلاعات گفتگو"
                      onClick={() => setInfoOpen((open) => !open)}>
                      <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
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
                </Stack>
                {threadSearchOpen ? (
                  <TextField
                    size="small" fullWidth autoFocus
                    sx={{ mt: 0.8, '& .MuiInputBase-input': { fontSize: 11.5 } }}
                    placeholder="جست‌وجو در پیام‌های این گفتگو…"
                    value={threadSearch}
                    onChange={(event) => setThreadSearch(event.target.value)}
                    inputProps={{ 'aria-label': 'جست‌وجو در پیام‌ها' }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ fontSize: 15 }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                ) : null}
              </Box>

              <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.4, py: 1.1 }}>
                {messagesQuery.isLoading ? (
                  <Box sx={{ py: 4, textAlign: 'center' }}><CircularProgress size={20} /></Box>
                ) : messages.length ? (
                  messages.map((message, index) => {
                    const previous = index > 0 ? messages[index - 1] : null;
                    const day = String(message.created_at || '').slice(0, 10);
                    const prevDay = previous ? String(previous.created_at || '').slice(0, 10) : '';
                    const showDate = Boolean(day) && day !== prevDay;
                    const showUnread = Boolean(unreadAfter)
                      && Number(message.id) > Number(unreadAfter)
                      && (!previous || Number(previous.id) <= Number(unreadAfter));
                    const compact = Boolean(
                      previous && !showDate && previous.sender === message.sender
                      && previous.sender
                      && (new Date(message.created_at).getTime()
                        - new Date(previous.created_at).getTime()) < 5 * 60000,
                    );
                    return (
                      <React.Fragment key={message.id}>
                        {showDate ? <DateSeparator value={message.created_at} /> : null}
                        {showUnread ? <UnreadDivider accent={accent} /> : null}
                        <Box ref={(node) => {
                          if (node) messageRefs.current[String(message.id)] = node;
                          else delete messageRefs.current[String(message.id)];
                        }}>
                          <ChatMessageBubble
                            message={message}
                            look={look}
                            compact={compact}
                            showAvatar={!message.is_mine && !compact}
                            avatar={photoByUser.get(String(message.sender)) || ''}
                            highlight={String(highlightId || '') === String(message.id)}
                            onReply={setReplyTo}
                            onEdit={(row) => { setEditMessage(row); setEditValue(row.body || ''); }}
                            onDelete={(row) => removeMessage.mutate(row)}
                            onPin={(row) => togglePin.mutate(row)}
                            onReact={(row, emoji) => toggleReaction.mutate({ message: row, emoji })}
                            onJumpTo={scrollToMessage}
                            onMakeTask={(row) => setTaskTarget(row)}
                            onOpenTask={(task) => navigate(`/planning?task=${task.id}`)}
                          />
                        </Box>
                      </React.Fragment>
                    );
                  })
                ) : (
                  <Box sx={{ py: 5, textAlign: 'center' }}>
                    <ChatBubbleOutlineIcon sx={{ fontSize: 34, color: alpha(accent, 0.5), mb: 0.5 }} />
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      {threadSearch
                        ? 'پیامی با این عبارت پیدا نشد.'
                        : 'هنوز پیامی ثبت نشده است؛ اولین پیام را بفرستید.'}
                    </Typography>
                  </Box>
                )}
                <Box ref={listEndRef} />
              </Box>


              <Box sx={{
                borderTop: '1px solid', borderColor: 'divider', p: 0.9,
                bgcolor: 'background.paper',
              }}>
                {replyTo ? (
                  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.7 }}
                    data-testid="chat-reply-bar">
                    <ReplyIcon sx={{ fontSize: 15, color: accent }} />
                    <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary', flex: 1 }}>
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
                {entityRefs.length ? (
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 0.6 }}>
                    {entityRefs.map((entity, index) => {
                      const meta = ENTITY_MODULE_META[entity.module] || {};
                      const EntityIcon = meta.icon || TagIcon;
                      return (
                        <Chip
                          key={`${entity.module}-${entity.object_id}-${index}`}
                          size="small"
                          icon={<EntityIcon sx={{ fontSize: 12 }} />}
                          label={entity.label || `${meta.label || entity.module} #${entity.object_id}`}
                          onDelete={() => setEntityRefs((rows) => rows.filter((_, i) => i !== index))}
                          sx={{
                            height: 22, fontSize: 10, fontWeight: 800,
                            bgcolor: alpha(meta.color || accent, 0.12),
                            color: meta.color || accent,
                          }}
                        />
                      );
                    })}
                  </Stack>
                ) : null}
                <Stack direction="row" spacing={0.5} alignItems="flex-end">
                  <TextField
                    size="small" fullWidth multiline maxRows={4} value={draft}
                    inputRef={composerRef}
                    placeholder="پیام خود را بنویسید… (Shift+Enter برای خط جدید)"
                    onChange={(event) => { setDraft(event.target.value); notifyTyping(); }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        submit();
                      }
                    }}
                    sx={{ '& .MuiInputBase-root': { borderRadius: '12px' },
                      '& .MuiInputBase-input': { fontSize: 12 } }}
                  />
                  <Tooltip title="ایموجی">
                    <IconButton
                      size="small" aria-label="ایموجی"
                      onClick={(event) => setEmojiAnchor(
                        emojiAnchor ? null : event.currentTarget,
                      )}
                      aria-haspopup="true"
                      aria-expanded={Boolean(emojiAnchor)}
                    >
                      <EmojiEmotionsOutlinedIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
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
                  <Tooltip title="الصاق رکورد از ماژول‌ها">
                    <IconButton size="small" aria-label="الصاق رکورد"
                      onClick={() => setEntityPickerOpen(true)}
                      sx={{ color: accent }}>
                      <TagIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Button
                    variant="contained" size="small" onClick={submit}
                    disabled={sendMessage.isPending || (!draft.trim() && !pickedFiles.length)}
                    startIcon={<SendIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      bgcolor: accent, '&:hover': { bgcolor: look.deep },
                      minWidth: 80, fontSize: 11.5, borderRadius: '11px',
                    }}
                  >
                    ارسال
                  </Button>
                </Stack>
              </Box>
            </>
          ) : (
            <Box sx={{ flex: 1, display: 'grid', placeItems: 'center', p: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <ChatBubbleOutlineIcon sx={{ fontSize: 46, color: alpha(accent, 0.4) }} />
                <Typography sx={{ fontSize: 13, fontWeight: 900, color: 'text.primary', mt: 1 }}>
                  یک گفتگو انتخاب کنید
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.5 }}>
                  پیام‌ها رمزنگاری‌شده‌اند و فقط اعضای گفتگو آن‌ها را می‌بینند.
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {showInfo ? (
          <ChatInfoPanel
            look={look}
            conversation={activeConversation}
            members={Array.isArray(membersQuery.data) ? membersQuery.data : []}
            pinned={Array.isArray(pinnedQuery.data) ? pinnedQuery.data : []}
            pinnedLoading={pinnedQuery.isLoading}
            onClose={() => setInfoOpen(false)}
            onPrefs={(payload) => updatePrefs.mutate(payload)}
            onManageMembers={() => setMembersDialog(true)}
            onOpenFull={() => navigate(`/chat?conversation=${activeId}`)}
            onJumpTo={scrollToMessage}
          />
        ) : null}
      </Box>

      {toast ? (
        <Alert severity="info" onClose={() => setToast('')} sx={{ mt: 1 }}>{toast}</Alert>
      ) : null}

      {/* ---------------- دیالوگ الصاق رکورد (جست‌وجو در ماژول‌ها) ---------------- */}
      <EntityPickerDialog
        open={entityPickerOpen}
        accent={accent}
        existing={entityRefs}
        onClose={() => setEntityPickerOpen(false)}
        onPick={(picked) => setEntityRefs((rows) => {
          const keys = new Set(rows.map((row) => `${row.module}:${row.object_type}:${row.object_id}`));
          const merged = [...rows];
          picked.forEach((entity) => {
            const key = `${entity.module}:${entity.object_type}:${entity.object_id}`;
            if (!keys.has(key)) {
              keys.add(key);
              merged.push(entity);
            }
          });
          return merged;
        })}
      />

      {/* ---------------- انتخابگر ایموجی ---------------- */}
      <ChatEmojiPicker
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        accent={accent}
        onClose={() => setEmojiAnchor(null)}
        onPick={insertEmoji}
      />

      {/* ---------------- ساخت وظیفه از پیام ---------------- */}
      <ChatTaskDialog
        open={Boolean(taskTarget)}
        message={taskTarget}
        directory={directory}
        accent={accent}
        onClose={() => setTaskTarget(null)}
        onCreated={handleTaskCreated}
      />

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

