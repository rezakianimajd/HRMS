/* راه‌اندازی مشترک تست‌ها (CRA این فایل را خودکار اجرا می‌کند). */

/* recharts برای ResponsiveContainer به ResizeObserver نیاز دارد؛ jsdom آن را ندارد. */
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}

    unobserve() {}

    disconnect() {}
  };
}
