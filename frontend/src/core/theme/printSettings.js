/**
 * تنظیمات چاپ (سربرگ/پاورقی/کاغذ) — آینهٔ `settings_app/print_settings.py`.
 *
 * این مقادیر در همان payload «ظاهر» (`/settings/appearance/` کلید `print`) ذخیره
 * می‌شوند و موتور چاپ سرور هنگام رندر هر سند از آن‌ها استفاده می‌کند.
 */
export const PRINT_PAPERS = ['A4', 'A5', 'A3', 'Letter'];
export const LETTER_LIST_COLUMNS = [
  { key: 'number', label: 'شماره' },
  { key: 'date', label: 'تاریخ' },
  { key: 'direction', label: 'جهت' },
  { key: 'subject', label: 'موضوع' },
  { key: 'party', label: 'طرف مکاتبه' },
  { key: 'status', label: 'وضعیت' },
  { key: 'attachments', label: 'پیوست' },
];
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
    show_meta: false,
    logo_width: 28,
    logo_height: 18,
    company_font_size: 13,
    title_font_size: 13,
    subtitle_font_size: 9.5,
    space_top: 0,
    space_bottom: 6,
    space_side: 0,
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
    font_size: 7.5,
    space_bottom: 2,
  },
  columns: {
    'letter-list': [
      'number', 'date', 'direction', 'subject', 'party', 'status', 'attachments',
    ],
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
      logo_width: clamp(header.logo_width, 8, 90, base.header.logo_width),
      logo_height: clamp(header.logo_height, 6, 60, base.header.logo_height),
      company_font_size: clamp(
        header.company_font_size, 8, 24, base.header.company_font_size,
      ),
      title_font_size: clamp(header.title_font_size, 8, 24, base.header.title_font_size),
      subtitle_font_size: clamp(
        header.subtitle_font_size, 6, 20, base.header.subtitle_font_size,
      ),
      space_top: clamp(header.space_top, 0, 40, base.header.space_top),
      space_bottom: clamp(header.space_bottom, 0, 40, base.header.space_bottom),
      space_side: clamp(header.space_side, 0, 30, base.header.space_side),
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
      font_size: clamp(footer.font_size, 5, 14, base.footer.font_size),
      space_bottom: clamp(footer.space_bottom, 0, 20, base.footer.space_bottom),
    },
    columns: {
      'letter-list': Array.isArray(data?.columns?.['letter-list'])
        && data.columns['letter-list'].length
        ? data.columns['letter-list']
        : base.columns['letter-list'],
    },
  };
};

export default DEFAULT_PRINT_SETTINGS;
