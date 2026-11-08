/**
 * اعتبار ابزارهای تضمین — منبع واحد سمت کلاینت.
 *
 * قاعده: **چک** با گذشتن «تاریخ سررسید» منقضی نمی‌شود؛ تا **۵ سال** از تاریخ صدور
 * معتبر است (قانون اصلاح قانون صدور چک). ضمانت‌نامه‌ها با `guarantee_expiry_date`
 * منقضی می‌شوند.
 *
 * اگر پاسخ بک‌اند فیلدهای اعتبار (`expiry_kind`, `valid_until`, `days_to_expiry`,
 * `is_expired`, `is_check`) را داشته باشد همان ملاک است؛ در غیر این صورت محاسبهٔ
 * محلی (سازگاری با کش/پاسخ قدیمی) انجام می‌شود.
 */
export const CHECK_VALIDITY_YEARS = 5;

const CHECK_INSTRUMENTS = ['check', 'check_and_guarantee'];

export const isCheckInstrument = (instrumentType) => (
  CHECK_INSTRUMENTS.includes(String(instrumentType || '').trim())
);

const toDate = (value) => {
  if (!value) return null;
  const day = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(day.getTime()) ? null : day;
};

/** افزودن سال به تاریخ با مدیریت ۲۹ فوریه (خروجی ISO). */
export const addYears = (value, years) => {
  const day = toDate(value);
  if (!day) return null;
  const targetYear = day.getFullYear() + years;
  const month = day.getMonth();
  const lastDay = new Date(targetYear, month + 1, 0).getDate();
  const result = new Date(targetYear, month, Math.min(day.getDate(), lastDay));
  const pad = (number) => String(number).padStart(2, '0');
  return `${result.getFullYear()}-${pad(result.getMonth() + 1)}-${pad(result.getDate())}`;
};

/** تعداد روز تا تاریخ (منفی = گذشته). */
export const daysUntil = (value) => {
  const day = toDate(value);
  if (!day) return null;
  return Math.ceil((day - new Date()) / 86400000);
};

/**
 * اعتبار یک ردیف تضمین.
 *
 * @returns {{days: number|null, expired: boolean, validUntil: string|null,
 *   dueDate: string|null, isCheck: boolean, expiryKind: string}}
 */
export const guaranteeValidity = (row = {}) => {
  const backendHasValidity = row.expiry_kind !== undefined && row.expiry_kind !== null;
  const isCheck = row.is_check !== undefined && row.is_check !== null
    ? Boolean(row.is_check)
    : isCheckInstrument(row.instrument_type);
  const rawDue = guaranteeDueDate(row);
  const dueDays = daysUntil(rawDue);

  if (backendHasValidity) {
    return {
      days: row.days_to_expiry ?? null,
      dueDays,
      expired: Boolean(row.is_expired),
      validUntil: row.valid_until || null,
      dueDate: row.due_date || rawDue,
      isCheck,
      expiryKind: row.expiry_kind,
    };
  }

  const dueDate = rawDue;
  const expiryDate = row.guarantee_expiry_date || row.expiry_date || null;

  if (isCheck) {
    const base = row.issue_date || dueDate;
    let validUntil = base ? addYears(base, CHECK_VALIDITY_YEARS) : expiryDate;
    if (expiryDate && (!validUntil || expiryDate > validUntil)) validUntil = expiryDate;
    const days = daysUntil(validUntil);
    return {
      days,
      dueDays,
      expired: days !== null && days < 0,
      validUntil,
      dueDate,
      isCheck: true,
      expiryKind: validUntil ? 'validity' : 'none',
    };
  }

  const days = daysUntil(expiryDate);
  return {
    days,
    dueDays,
    expired: days !== null && days < 0,
    validUntil: expiryDate,
    dueDate,
    isCheck: false,
    expiryKind: expiryDate ? 'expiry' : 'none',
  };
};

/**
 * آیا این تضمین باید در گروه «نزدیک انقضا/سررسید» دیده شود؟
 * چک منقضی نمی‌شود، اما سررسید نزدیک آن هشدار عملیاتی است.
 */
export const guaranteeIsExpiring = (row = {}, windowDays = 30) => {
  const validity = guaranteeValidity(row);
  if (validity.expired) return false;
  if (validity.days !== null && validity.days <= windowDays) return true;
  return Boolean(
    validity.isCheck
    && validity.dueDays !== null
    && validity.dueDays >= 0
    && validity.dueDays <= windowDays,
  );
};

/** سررسید عملیاتی (برای نمایش ستون «سررسید»). */
export const guaranteeDueDate = (row = {}) => (
  row.due_date || row.guarantee_expiry_date || row.check_due_date
  || row.promissory_due_date || row.expiry_date || null
);

export default guaranteeValidity;
