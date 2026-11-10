/**
 * ابزارهای مشترک چت: فرادادهٔ نوع گفتگو، برچسب‌های زمان/رسید و توکن‌های ظاهری.
 *
 * همهٔ رنگ/شعاع/سایه از استودیو تم خوانده می‌شود (هیچ مقدار هاردکد جدیدی اضافه نشده)؛
 * fallbackها فقط برای زمانی است که استودیو مقداری ذخیره نکرده باشد.
 */
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useDesignTokens } from '../../core/context/DesignTokenContext';
import { useModulePalette } from '../../core/context/ModulePaletteContext';
import { toJalali } from '../../core/utils/dateUtils';
import { toPersianDigits } from '../../core/utils/numberUtils';

export const ACCENT_FALLBACK = '#0ea5e9';
export const INK = '#0f172a';
export const MUTED = '#64748b';

export const CHAT_KIND_META = {
  direct: { label: 'خصوصی', short: 'خصوصی', icon: PersonOutlineIcon, color: '#0ea5e9' },
  group: { label: 'گروهی', short: 'گروه', icon: GroupOutlinedIcon, color: '#8b5cf6' },
  channel: { label: 'کانال', short: 'کانال', icon: CampaignOutlinedIcon, color: '#f59e0b' },
  system: { label: 'سیستمی', short: 'سیستمی', icon: LockOutlinedIcon, color: '#64748b' },
};

/** واکنش‌های سریع روی حباب پیام (هم‌راستا با `communication/reactions.py`). */
export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🙏', '✅'];

/** آیا کاربر جاری می‌تواند این پیام را ویرایش کند؟ */
export const canEditMessage = (message, user) => Boolean(
  message && !message.deleted_at && message.sender
  && String(message.sender) === String(user?.id),
);

/** متن وضعیت رسید پیام (ارسال/تحویل/خواندن). */
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

export const timeLabel = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return toPersianDigits(date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));
};

export const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '');

export const kindMetaOf = (conversation) => (
  CHAT_KIND_META[conversation?.kind] || CHAT_KIND_META.group
);

/** حروف اول عنوان برای آواتار گفتگو. */
export const initialsOf = (conversation) => {
  const title = String(conversation?.title || '').trim();
  if (!title) return 'گ';
  const parts = title.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].slice(0, 2));
};

/** توکن‌های ظاهری چت (accent، متن، سطح‌ها، گرادیانت حباب من). */
export const useChatLook = () => {
  const theme = useTheme();
  const { tokens } = useDesignTokens();
  const { getPalette } = useModulePalette();
  const accent = getPalette('chat')?.accent
    || getPalette('correspondence')?.accent
    || ACCENT_FALLBACK;
  const dark = theme.palette.mode === 'dark';
  const ink = tokens?.colors?.textPrimary || (dark ? '#e2e8f0' : INK);
  const muted = tokens?.colors?.textSecondary || MUTED;
  const radius = 'var(--hrms-radius-large, 18px)';
  const surface = tokens?.surfaces?.card?.background
    || theme.palette.background.paper;
  const bubbleOther = dark ? alpha('#ffffff', 0.05) : '#ffffff';
  return {
    theme,
    tokens,
    accent,
    ink,
    muted,
    dark,
    radius,
    surface,
    bubbleOther,
    bubbleMine: `linear-gradient(135deg, ${alpha(accent, 0.96)}, ${alpha(accent, 0.78)})`,
    shadowSoft: tokens?.shadows?.soft || '0 1px 2px rgba(15, 23, 42, 0.06)',
    shadowCard: tokens?.shadows?.card || '0 10px 30px rgba(15, 23, 42, 0.08)',
    divider: theme.palette.divider,
  };
};

export default useChatLook;
