/**
 * انتخابگر ایموجی چت — بدون وابستگی بیرونی.
 *
 * - گروه‌بندی موضوعی (چهره‌ها، دست‌ها، کار اداری، اشیا، طبیعت و غذا)
 * - جست‌وجوی فارسی روی نام/کلیدواژهٔ گروه‌ها + ایموجی‌های اخیر (localStorage)
 * - کاملاً توکن‌محور (شعاع/سایهٔ استودیو تم) و بدون رنگ هاردکد جدید
 */
import React, { useMemo, useState } from 'react';
import {
  Box, Chip, InputAdornment, Popover, Stack, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { alpha } from '@mui/material/styles';

const INK = '#0f172a';
const MUTED = '#64748b';

/** ایموجی‌های پرکاربرد اداری/روزمره، گروه‌بندی‌شده. */
const EMOJI_GROUPS_BASE = [
  {
    key: 'smileys',
    label: 'چهره‌ها',
    keywords: 'چهره لبخند احساس حالت صورت smile face',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🙂', '🙃', '😉', '😊', '😇',
      '🥰', '😍', '🤩', '😘', '😋', '😜', '🤨', '🧐', '🤓', '😎', '🥳', '😏',
      '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺',
      '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
      '😰', '😥', '😓', '🤗', '🤔', '🫡', '🤭', '🫢', '🤫', '🤥', '😶', '😐',
      '😑', '😬', '🫠', '🙄', '😯', '😴', '🤤', '😪', '😵', '🤐', '🤢', '🤧',
      '😷', '🤒', '🤕', '🤑', '🤠',
    ],
  },
  {
    key: 'gestures',
    label: 'دست‌ها',
    keywords: 'دست انگشت تشکر تایید دست دادن thumbs hand',
    emojis: [
      '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈',
      '👉', '👆', '👇', '☝️', '🫵', '👏', '🙌', '🫶', '👐', '🤲', '🤝', '🙏',
      '✍️', '💅', '🤳', '💪', '🦾', '🖐️', '✋', '🤚', '🖖', '👋', '🫱', '🫲',
      '🫳', '🫴', '👊', '✊', '🤛', '🤜', '💯', '✅', '❌', '❗', '❓',
    ],
  },
];

const EMOJI_GROUPS_MORE = [
  {
    key: 'work',
    label: 'کار اداری',
    keywords: 'کار اداری دفتر پرونده سند قرارداد جلسه ایمیل چت office work',
    emojis: [
      '📄', '📃', '📑', '📊', '📈', '📉', '🗂️', '📁', '📂', '🗃️', '🗄️', '📅',
      '📆', '📇', '📋', '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗒️', '🖊️',
      '🖋️', '✒️', '🖌️', '🖍️', '📝', '💼', '🎓', '🏢', '🏦', '🏛️', '💻', '🖥️',
      '🖨️', '⌨️', '🖱️', '📱', '☎️', '📞', '📠', '📧', '📨', '📩', '📤', '📥',
      '📦', '📬', '📭', '🔖', '🔑', '🗝️', '🔒', '🔓', '🔔', '⏰', '⏳', '⌛',
      '🧮', '💰', '💵', '💳', '🧾', '💸', '📢', '📣', '🗣️', '🔍',
    ],
  },
  {
    key: 'objects',
    label: 'اشیا و نمادها',
    keywords: 'اشیا نماد علامت ستاره موفقیت objects symbols',
    emojis: [
      '⭐', '🌟', '✨', '⚡', '🔥', '💧', '🌈', '☀️', '🌤️', '⛅', '🌧️', '⛈️',
      '❄️', '🌙', '🌞', '🎯', '🎉', '🎊', '🎁', '🏆', '🥇', '🥈', '🥉', '🎖️',
      '🏅', '💡', '💎', '🧿', '🩺', '💊', '🛠️', '🔧', '🔩', '⚙️', '🧰', '🔋',
      '🔌', '💾', '💿', '📀', '📷', '📸', '🎥', '🎬', '🎵', '🎶', '📻', '🔊',
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    ],
  },
  {
    key: 'nature',
    label: 'طبیعت و غذا',
    keywords: 'طبیعت گل گیاه غذا میوه نوشیدنی nature food',
    emojis: [
      '🌹', '🌷', '🌻', '🌼', '🌸', '💐', '🌱', '🌿', '☘️', '🍀', '🌳', '🌴',
      '🌵', '🌾', '🍁', '🍂', '🍃', '🕊️', '🐝', '🐞', '🦋', '🐢', '🐬', '🐾',
      '☕', '🍵', '🥤', '🧃', '🧉', '🍶', '🥛', '🍯', '🍞', '🍚', '🍲', '🥗',
      '🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍒', '🍑', '🥝', '🍍', '🥜', '🌰',
      '🍰', '🎂', '🍫', '🍬', '🍭', '🍩', '🍪', '🥧', '🧁', '🍕', '🍔', '🌯',
    ],
  },
];

export const EMOJI_GROUPS = [...EMOJI_GROUPS_BASE, ...EMOJI_GROUPS_MORE];

export const EMOJI_RECENT_KEY = 'hrms-chat-emoji-recent';
const MAX_RECENT = 16;

const readRecent = () => {
  try {
    const raw = window.localStorage.getItem(EMOJI_RECENT_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows)
      ? rows.filter((item) => typeof item === 'string').slice(0, MAX_RECENT)
      : [];
  } catch (error) {
    return [];
  }
};

const writeRecent = (rows) => {
  try {
    window.localStorage.setItem(EMOJI_RECENT_KEY, JSON.stringify(rows.slice(0, MAX_RECENT)));
  } catch (error) {
    /* حافظهٔ محلی در دسترس نیست — بی‌صدا رد می‌شویم */
  }
};

const EmojiGrid = ({ emojis, onPick, accent, testid }) => (
  <Box
    data-testid={testid}
    sx={{
      display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0.25,
      maxHeight: 186, overflowY: 'auto', pr: 0.25,
    }}
  >
    {emojis.map((emoji) => (
      <Box
        key={emoji}
        component="button"
        type="button"
        data-emoji={emoji}
        aria-label={`ایموجی ${emoji}`}
        onClick={() => onPick(emoji)}
        sx={{
          border: 0, bgcolor: 'transparent', cursor: 'pointer', borderRadius: '10px',
          fontSize: 20, lineHeight: 1.5, py: 0.35, px: 0,
          transition: 'background-color .12s ease, transform .12s ease',
          '&:hover': { bgcolor: alpha(accent, 0.12), transform: 'scale(1.12)' },
          '&:focus-visible': { outline: `2px solid ${alpha(accent, 0.6)}` },
        }}
      >
        {emoji}
      </Box>
    ))}
  </Box>
);

const ChatEmojiPicker = ({ open, anchorEl, onClose, onPick, accent = '#0ea5e9' }) => {
  const [query, setQuery] = useState('');
  const [groupKey, setGroupKey] = useState('all');
  const [recent, setRecent] = useState(readRecent);

  const term = query.trim();
  const groups = useMemo(() => {
    const source = groupKey === 'all'
      ? EMOJI_GROUPS
      : EMOJI_GROUPS.filter((group) => group.key === groupKey);
    if (!term) return source;
    const lowered = term.toLowerCase();
    return source
      .map((group) => ({
        ...group,
        emojis: group.label.includes(term) || group.keywords.includes(lowered)
          ? group.emojis
          : group.emojis.filter((emoji) => emoji.includes(term)),
      }))
      .filter((group) => group.emojis.length);
  }, [groupKey, term]);

  const visibleRecent = useMemo(() => (
    term ? recent.filter((emoji) => emoji.includes(term)) : recent
  ), [recent, term]);

  const pick = (emoji) => {
    const nextRecent = [emoji, ...recent.filter((item) => item !== emoji)].slice(0, MAX_RECENT);
    setRecent(nextRecent);
    writeRecent(nextRecent);
    if (onPick) onPick(emoji);
  };

  const chipSx = (active) => ({
    height: 20, fontSize: 9.5, fontWeight: 800,
    bgcolor: active ? alpha(accent, 0.16) : 'transparent',
    color: active ? accent : MUTED,
  });

  return (
    <Popover
      open={Boolean(open)}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      PaperProps={{
        sx: {
          width: 324, p: 1.1,
          borderRadius: 'var(--hrms-radius-large, 16px)',
          boxShadow: 'var(--hrms-shadow-dialog, 0 18px 40px rgba(15, 23, 42, 0.18))',
          border: '1px solid', borderColor: 'divider',
        },
      }}
    >
      <Box data-testid="chat-emoji-picker">
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.6 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK }}>
            ایموجی‌ها
          </Typography>
          <Typography sx={{ fontSize: 9.5, color: MUTED }}>
            با کلیک، در محل نشانگر درج می‌شود
          </Typography>
        </Stack>

        <TextField
          size="small" fullWidth value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جست‌وجوی ایموجی…"
          inputProps={{ 'aria-label': 'جست‌وجوی ایموجی' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: MUTED }} />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 0.7, '& .MuiInputBase-input': { fontSize: 11.5 } }}
        />

        <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mb: 0.7 }}>
          <Chip label="همه" size="small" clickable onClick={() => setGroupKey('all')}
            sx={chipSx(groupKey === 'all')} />
          {EMOJI_GROUPS.map((group) => (
            <Chip
              key={group.key}
              label={group.label} size="small" clickable
              onClick={() => setGroupKey(group.key)}
              sx={chipSx(groupKey === group.key)}
            />
          ))}
        </Stack>

        {visibleRecent.length ? (
          <Box sx={{ mb: 0.6 }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: MUTED, mb: 0.2 }}>
              اخیر
            </Typography>
            <EmojiGrid emojis={visibleRecent} onPick={pick} accent={accent} testid="chat-emoji-recent" />
          </Box>
        ) : null}

        {groups.length ? groups.map((group) => (
          <Box key={group.key} sx={{ mb: 0.6 }}>
            <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: MUTED, mb: 0.2 }}>
              {group.label}
            </Typography>
            <EmojiGrid
              emojis={group.emojis} onPick={pick} accent={accent}
              testid={`chat-emoji-group-${group.key}`}
            />
          </Box>
        )) : (
          <Typography sx={{ fontSize: 11, color: MUTED, py: 1.2, textAlign: 'center' }}>
            ایموجی‌ای با این عبارت پیدا نشد.
          </Typography>
        )}
      </Box>
    </Popover>
  );
};

export default ChatEmojiPicker;


