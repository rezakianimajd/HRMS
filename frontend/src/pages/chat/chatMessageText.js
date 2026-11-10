/**
 * متن پیام چت: تشخیص «پیام فقط ایموجی» و اندازهٔ نمایش بزرگ‌تر (سبک تلگرام).
 *
 * قاعده: اگر کل بدنه از ایموجی (و فاصله/خط جدید) تشکیل شده باشد، ایموجی‌ها بزرگ
 * نمایش داده می‌شوند تا در حباب پیام خوانا و دیدنی باشند؛ متن معمولی دست‌نخورده
 * می‌ماند. تعداد ایموجی بیشتر ⇒ اندازهٔ کمی کوچک‌تر تا حباب از کادر بیرون نزند.
 */
const KEYCAP_PATTERN = /[0-9#*]\ufe0f?\u20e3/gu;

const EMOJI_ONLY_PATTERN = new RegExp(
  '^(?:'
  + '\\p{Extended_Pictographic}'      // بیشتر ایموجی‌ها
  + '|\\p{Emoji_Modifier}'            // رنگ پوست
  + '|\\p{Regional_Indicator}'        // پرچم‌ها
  + '|[\\u2640\\u2642]'               // ♀ ♂
  + '|\\u200d|\\ufe0f|\\ufe0e'        // اتصال ZWJ و variation selector
  + '|\\s'
  + ')+$',
  'u',
);

/** تعداد ایموجی‌های متن (نزدیک به تعداد نمادهای دیده‌شده). */
export const countEmojis = (text) => {
  const cleaned = String(text ?? '').replace(KEYCAP_PATTERN, '⬛').replace(/\s+/g, '');
  if (!cleaned) return 0;
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    try {
      const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
      return Array.from(segmenter.segment(cleaned)).length;
    } catch (error) {
      /* مرورگرهای قدیمی — شمارش تقریبی پایین */
    }
  }
  const matches = cleaned.match(/(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic})/gu);
  return matches ? matches.length : 0;
};

/** آیا پیام فقط از ایموجی تشکیل شده است؟ */
export const isEmojiOnly = (text) => {
  const value = String(text ?? '').trim();
  if (!value) return false;
  const withoutKeycaps = value.replace(KEYCAP_PATTERN, '').trim();
  if (!withoutKeycaps) return true;
  if (!EMOJI_ONLY_PATTERN.test(withoutKeycaps)) return false;
  return countEmojis(value) > 0;
};

const EMOJI_FONT_SIZES = { 1: 44, 2: 38, 3: 32, 4: 28, 5: 24 };

/**
 * اندازهٔ فونت بدنهٔ پیام؛ `null` یعنی متن معمولی (۱۲٫۵ پیکسل).
 */
export const emojiOnlyFontSize = (text) => {
  if (!isEmojiOnly(text)) return null;
  const count = countEmojis(text);
  if (!count) return null;
  return EMOJI_FONT_SIZES[count] || 20;
};
