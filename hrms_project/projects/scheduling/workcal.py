"""تقویم کاری برای محاسبات زمان‌بندی (فاز ۱).

این ماژول **خالص** است (بدون وابستگی به مدل/دیتابیس) تا موتور CPM قابل تست
و قابل اتکا باشد. مبنا: تاریخ‌ها + مجموعهٔ روزهای کاری + استثناها.
"""
from datetime import date as date_cls, timedelta

# هفتهٔ کاری ایران: شنبه(5) … چهارشنبه(2) و پنجشنبه(3) نیمه‌کاری
IRAN_WORKING_DAYS = (5, 6, 0, 1, 2, 3)
IRAN_HALF_DAYS = (3,)
MAX_WALK_DAYS = 4000  # سقف پیمایش (≈ ۱۱ سال) برای جلوگیری از حلقهٔ بی‌پایان


class CalendarSpec:
    """تقویم کاری سبک برای عملیات تاریخ/مدت.

    working_days: شمارهٔ روز هفتهٔ پایتون (0=دوشنبه … 5=شنبه، 6=یکشنبه)
    half_days: روزهای نیمه‌کاری
    exceptions: {date: {'is_working': bool, 'hours': float}}
    """

    def __init__(self, working_days=None, half_days=None, exceptions=None, hours_per_day=8):
        self.working_days = set(working_days if working_days is not None else IRAN_WORKING_DAYS)
        self.half_days = set(half_days if half_days is not None else [])
        self.exceptions = dict(exceptions or {})
        self.hours_per_day = float(hours_per_day or 8)

    # ---------------------------------------------------------------- پایه
    def is_working(self, day):
        exc = self.exceptions.get(day)
        if exc is not None:
            return bool(exc.get('is_working'))
        return day.weekday() in self.working_days

    def hours(self, day):
        exc = self.exceptions.get(day)
        if exc is not None:
            return float(exc.get('hours') or 0)
        if not self.is_working(day):
            return 0.0
        if day.weekday() in self.half_days:
            return self.hours_per_day / 2
        return self.hours_per_day

    def next_working(self, day):
        cur = day
        for _ in range(MAX_WALK_DAYS):
            if self.is_working(cur):
                return cur
            cur += timedelta(days=1)
        return day

    def prev_working(self, day):
        cur = day
        for _ in range(MAX_WALK_DAYS):
            if self.is_working(cur):
                return cur
            cur -= timedelta(days=1)
        return day

    # --------------------------------------------------- محاسبهٔ روز کاری
    def add_working_days(self, day, n):
        """`n` روز کاری جلو/عقب (n=0 → همان روز یا نخستین روز کاری بعد آن).

        افزودن با شمارش «روز کاری بعدی = ۱» انجام می‌شود؛ عدد منفی هم پشتیبانی می‌شود.
        """
        n = int(round(float(n or 0)))
        cur = self.next_working(day)
        if n == 0:
            return cur
        step = 1 if n > 0 else -1
        remaining = abs(n)
        while remaining:
            cur = cur + timedelta(days=step)
            cur = self.next_working(cur) if step > 0 else self.prev_working(cur)
            remaining -= 1
        return cur

    def finish_from(self, start, duration):
        """تاریخ پایان بر پایهٔ مدت (روز کاری) — مدت ۰ = نقطهٔ عطف (همان روز)."""
        duration = float(duration or 0)
        if duration <= 0:
            return self.next_working(start)
        return self.add_working_days(self.next_working(start), duration - 1)

    def start_from_finish(self, finish, duration):
        """تاریخ شروع از پایان و مدت (معکوس `finish_from`)."""
        duration = float(duration or 0)
        if duration <= 0:
            return self.prev_working(finish)
        return self.add_working_days(self.prev_working(finish), -(duration - 1))

    def working_days_between(self, start, finish):
        """تعداد روزهای کاری از `start` تا `finish` (شامل دو سر)."""
        if not start or not finish or finish < start:
            return 0.0
        count = 0
        cur = start
        while cur <= finish:
            if self.is_working(cur):
                count += 1
            cur += timedelta(days=1)
        return float(count)

    def span_days(self, start, finish):
        """تعداد روز تقویمی از start تا finish (شامل دو سر)."""
        if not start or not finish or finish < start:
            return 0
        return (finish - start).days + 1


def build_calendar_spec(calendar_obj, exceptions=None):
    """ساخت `CalendarSpec` از نمونهٔ مدل (یا تقویم پیش‌فرض ایران در نبود مدل)."""
    if calendar_obj is None:
        return CalendarSpec(exceptions=exceptions)
    return CalendarSpec(
        working_days=calendar_obj.working_days or IRAN_WORKING_DAYS,
        half_days=calendar_obj.half_working_days or [],
        exceptions=exceptions or {},
        hours_per_day=calendar_obj.hours_per_day or 8,
    )
