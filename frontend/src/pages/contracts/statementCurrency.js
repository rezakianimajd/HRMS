import { normalizeCurrencyLabel } from '../../core/utils/numberUtils';

export const RIAL_LABEL = 'ریال';

/** آیا واحد پول، ریال است؟ */
export const isRialCurrency = (currency) => normalizeCurrencyLabel(currency) === RIAL_LABEL;

/** نرخ معتبر (همیشه بزرگ‌تر از صفر) — نرخ ارز می‌تواند اعشار داشته باشد. */
export const normalizeRate = (value) => {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
};

/**
 * نرخ مؤثر یک صورت‌وضعیت:
 *  - نرخ ثبت‌شدهٔ همان صورت‌وضعیت (تاریخی) اولویت دارد.
 *  - اگر نرخ ۱ یا خالی بود، نرخ ارز قرارداد/ارز به‌عنوان جایگزین استفاده می‌شود.
 *  - برای ریال همیشه ۱ است.
 */
export const rateOfStatement = (row = {}, fallbackRate = 1) => {
  const ownRate = Number(row?.exchange_rate);
  const currency = row?.currency_name || row?.currency_symbol || row?.currency_code;
  if (currency && isRialCurrency(currency)) return 1;
  if (Number.isFinite(ownRate) && ownRate > 1) return ownRate;
  const fallback = normalizeRate(fallbackRate ?? row?.currency_exchange_rate);
  if (fallback > 1) return fallback;
  return Number.isFinite(ownRate) && ownRate > 0 ? ownRate : 1;
};

/** تبدیل مبلغ ارزی به ریال؛ ریال همیشه عدد صحیح است. */
export const toRial = (amount, rate = 1) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * normalizeRate(rate));
};

/** تبدیل مبلغ ریالی به ارز برای نمایش/ویرایش (حداکثر ۴ رقم اعشار). */
export const fromRial = (amount, rate = 1) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;
  const normalized = normalizeRate(rate);
  if (normalized <= 1) return value;
  return Math.round((value / normalized) * 10000) / 10000;
};

/** مقدار نمایشی یک مبلغ ریالی در واحد ارز صورت‌وضعیت. */
export const displayAmount = (row, rialAmount, fallbackRate = 1) => {
  const rate = rateOfStatement(row, fallbackRate);
  return rate > 1 ? fromRial(rialAmount, rate) : (Number(rialAmount) || 0);
};

/** تبدیل مبلغ تجمعی ارزی به ریال بدون بازمحاسبهٔ دوره‌های قبل. */
export const cumulativeRialFromForeign = (previousRial, previousForeign, foreignAmount, rate) => (
  (Number(previousRial) || 0)
  + toRial(Math.max(0, (Number(foreignAmount) || 0) - (Number(previousForeign) || 0)), rate)
);

/** آیا باید معادل ارزی جداگانه نمایش داده شود؟ */
export const hasForeignAmount = (row, fallbackRate = 1) => rateOfStatement(row, fallbackRate) > 1;
