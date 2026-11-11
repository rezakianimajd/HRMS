/**
 * تنظیمات چاپ (سربرگ/پاورقی/کاغذ) — آینهٔ `settings_app/print_settings.py`.
 *
 * این مقادیر در همان payload «ظاهر» (`/settings/appearance/` کلید `print`) ذخیره
 * می‌شوند و موتور چاپ سرور هنگام رندر هر سند از آن‌ها استفاده می‌کند.
 */
export const PRINT_PAPERS = ['A4', 'A5', 'A3', 'Letter'];
export const PRINT_ALIGNMENTS = [
  { value: 'right', label: 'راست' },
  { value: 'center', label: 'وسط' },
  { value: 'left', label: 'چپ' },
];

export const DEFAULT_PRINT_SETTINGS = {
  paper: 'A4',
  orientation: 'portrait',
  font_size: 9.5,
  margin: '10mm 9mm 12mm 9mm',
  header: {
    enabled: true,
    show_logo: true,
    title: '',
    subtitle: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    extra: '',
    align: 'center',
    show_border: true,
    show_meta: true,
  },
  footer: {
    enabled: true,
    text: '',
    extra: '',
    show_page_number: true,
    show_printed_at: true,
    signatures: true,
    align: 'center',
    show_border: true,
  },
};

const text = (value, limit) => String(value ?? '').trim().slice(0, limit);

export const normalizePrintSettings = (raw) => {
  const data = raw && typeof raw === 'object' ? raw : {};
  const header = data.header && typeof data.header === 'object' ? data.header : {};
  const footer = data.footer && typeof data.footer === 'object' ? data.footer : {};
  const base = DEFAULT_PRINT_SETTINGS;
  const clamp = (value, low, high, fallback) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(high, Math.max(low, Math.round(numeric * 100) / 100));
  };
  return {
    paper: PRINT_PAPERS.includes(data.paper) ? data.paper : base.paper,
    orientation: data.orientation === 'landscape' ? 'landscape' : 'portrait',
    font_size: clamp(data.font_size, 7, 14, base.font_size),
    margin: text(data.margin, 60) || base.margin,
    header: {
      enabled: header.enabled ?? base.header.enabled,
      show_logo: header.show_logo ?? base.header.show_logo,
      title: text(header.title, 120),
      subtitle: text(header.subtitle, 160),
      address: text(header.address, 200),
      phone: text(header.phone, 60),
      email: text(header.email, 120),
      website: text(header.website, 120),
      extra: text(header.extra, 240),
      align: ['right', 'center', 'left'].includes(header.align) ? header.align : base.header.align,
      show_border: header.show_border ?? base.header.show_border,
      show_meta: header.show_meta ?? base.header.show_meta,
    },
    footer: {
      enabled: footer.enabled ?? base.footer.enabled,
      text: text(footer.text, 200),
      extra: text(footer.extra, 240),
      show_page_number: footer.show_page_number ?? base.footer.show_page_number,
      show_printed_at: footer.show_printed_at ?? base.footer.show_printed_at,
      signatures: footer.signatures ?? base.footer.signatures,
      align: ['right', 'center', 'left', 'space-between'].includes(footer.align)
        ? footer.align
        : base.footer.align,
      show_border: footer.show_border ?? base.footer.show_border,
    },
  };
};

export default DEFAULT_PRINT_SETTINGS;
