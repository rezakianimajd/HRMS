/**
 * تست اندازهٔ نمایش ایموجی در حباب پیام (پیامِ فقط‌ایموجی بزرگ‌تر دیده می‌شود).
 */
import { countEmojis, emojiOnlyFontSize, isEmojiOnly } from '../pages/chat/chatMessageText';

test('emoji-only detection accepts emojis, flags and keycaps', () => {
  expect(isEmojiOnly('👍')).toBe(true);
  expect(isEmojiOnly(' 👍 🔥 ')).toBe(true);
  expect(isEmojiOnly('👍\n👏')).toBe(true);
  expect(isEmojiOnly('🇮🇷')).toBe(true);
  expect(isEmojiOnly('1️⃣')).toBe(true);
  expect(isEmojiOnly('❤️')).toBe(true);
  expect(isEmojiOnly('👨‍👩‍👧')).toBe(true);
});

test('emoji-only detection rejects text, numbers and empty bodies', () => {
  expect(isEmojiOnly('')).toBe(false);
  expect(isEmojiOnly('   ')).toBe(false);
  expect(isEmojiOnly('سلام')).toBe(false);
  expect(isEmojiOnly('سلام 👍')).toBe(false);
  expect(isEmojiOnly('123')).toBe(false);
  expect(isEmojiOnly('👍 2')).toBe(false);
});

test('font size grows for emoji-only messages and shrinks with the count', () => {
  expect(emojiOnlyFontSize('👍')).toBe(44);
  expect(emojiOnlyFontSize('👍👏')).toBe(38);
  expect(emojiOnlyFontSize('👍👏🔥')).toBe(32);
  expect(emojiOnlyFontSize('👍👏🔥🎉')).toBe(28);
  expect(emojiOnlyFontSize('👍👏🔥🎉✅')).toBe(24);
  expect(emojiOnlyFontSize('👍👏🔥🎉✅🙏')).toBe(20);
  expect(emojiOnlyFontSize('👍👏🔥🎉✅🙏💯')).toBe(20);
  // متن معمولی اندازهٔ بزرگ نمی‌گیرد.
  expect(emojiOnlyFontSize('صورت‌وضعیت تایید شد 👍')).toBeNull();
  expect(emojiOnlyFontSize('')).toBeNull();
});

test('emoji counting is grapheme based', () => {
  expect(countEmojis('👍')).toBe(1);
  expect(countEmojis('👍 👍')).toBe(2);
  expect(countEmojis('👨‍👩‍👧')).toBeGreaterThan(0);
});
