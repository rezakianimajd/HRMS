import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  Box, Chip, TextField, InputAdornment, Stack, IconButton, Avatar, Paper,
  Accordion, AccordionSummary, AccordionDetails, Grid, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import SearchRoundedIcon from '@mui/icons-material/Search';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CategoryIcon from '@mui/icons-material/Category';
import InputIcon from '@mui/icons-material/Input';
import MailIcon from '@mui/icons-material/Mail';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';

const HELP_SECTIONS = [
  {
    id: 'dashboard',
    icon: <DashboardIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#6366f1',
    title: 'داشبورد',
    intro: 'نمای کلی و سریع سازمان در یک نگاه.',
    content: [
      'تعداد پرسنل فعال، نرخ ورود/خروج و میانگین سنی به‌صورت کارت‌های KPI.',
      'هشدارهای مهم: قراردادهای در شرف انقضا، مدارک منقضی و فعالیت‌های اخیر.',
    ],
  },
  {
    id: 'employees',
    icon: <PeopleIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#ec4899',
    title: 'پرسنل',
    intro: 'مدیریت کامل اطلاعات کارکنان سازمان.',
    content: [
      'لیست با جستجو + فیلترهای ترکیبی (دپارتمان، شغل، محل، وضعیت، جنسیت).',
      'افزودن پرسنل: فرم تک‌صفحه با کارت‌های شیشه‌ای — فردی، تماس، شغلی، ارزیابی، سوابق، مدارک.',
      'پرونده پرسنلی: ۶ تب (فردی، شغلی، دریافتی‌ها، کارکرد، تغییرات، مدارک).',
      'عکس پرسنلی از تب مدارک آپلود می‌شود و در کل برنامه نمایش داده می‌شود.',
      'تغییرات شغلی: تاریخچه ارتقا/تنزل/تغییر دپارتمان/حقوق + نسخه‌های قرارداد.',
    ],
  },
  {
    id: 'phonebook',
    icon: <ContactPhoneIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#10b981',
    title: 'دفترچه تلفن',
    intro: 'دسترسی سریع به اطلاعات تماس کارکنان.',
    content: [
      'کارت‌های تماس شیشه‌ای با عکس، موبایل، تلفن، ایمیل و تماس اضطراری.',
      'دو نمای کارتی/لیستی + جستجو + فیلتر دپارتمان + خروجی اکسل.',
    ],
  },
  {
    id: 'search',
    icon: <SearchRoundedIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#f59e0b',
    title: 'جستجوی پیشرفته',
    intro: 'یافتن هر چیزی در پرسنل و مدارک.',
    content: [
      'جستجوی همزمان در پرسنل و مدارک.',
      'فیلترها: دپارتمان، عنوان شغلی، محل، جنسیت، تأهل، وضعیت، نوع مدرک.',
      'جستجوی فازی (Trigram) روی PostgreSQL — نام ناقص هم پیدا می‌شود.',
    ],
  },
  {
    id: 'orgchart',
    icon: <AccountTreeIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#8b5cf6',
    title: 'چارت سازمانی',
    intro: 'ساختار سازمانی به‌صورت درخت تعاملی.',
    content: [
      'درخت سلسله‌مراتبی با اتصالات خودکار و رنگ‌بندی بر اساس عمق.',
      'تمرکز بر شاخه: زنجیره بالادستی + زیرمجموعه کامل.',
      'ویرایش: افزودن/حذف جایگاه + تخصیص نفرات.',
      'چاپ/PDF با مقیاس خودکار و بدون برش.',
    ],
  },
  {
    id: 'reports',
    icon: <AssessmentIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#3b82f6',
    title: 'گزارشات',
    intro: 'تحلیل‌های آماری و بصری سازمان.',
    content: [
      '۱۵+ نمودار: جنسیت، دپارتمان، عنوان شغلی، محل، بیمه، سن، نرخ خروج.',
      'تولدهای ۷ روز آینده (شمسی) + خلاصه مکاتبات و حقوق.',
      'دستیار هوشمند برای پرسش و پاسخ متنی.',
    ],
  },
  {
    id: 'definitions',
    icon: <CategoryIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#14b8a6',
    title: 'تعاریف اولیه',
    intro: 'داده‌های مرجع و پایه سیستم.',
    content: [
      'مشخصات شرکت: لوگو، اطلاعات حقوقی و تماس.',
      'دپارتمان‌ها، عناوین شغلی، محل‌ها، لیست بیمه.',
      'انواع مدارک و قرارداد (پویا) + سازمان‌های خارجی.',
    ],
  },
  {
    id: 'data-entry',
    icon: <InputIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#f97316',
    title: 'ورود اطلاعات',
    intro: 'ثبت تراکنش‌های پرسنلی روزانه.',
    content: [
      '۵ تب: مرخصی، غیبت، حقوق، مزایا، کسورات.',
      'حقوق: ثبت فیش ماهانه + درون‌ریزی اکسل.',
      'مزایای رفاهی: عیدی، بن کارت، وام.',
    ],
  },
  {
    id: 'correspondences',
    icon: <MailIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#06b6d4',
    title: 'مکاتبات',
    intro: 'مدیریت نامه‌ها و اسناد سازمانی.',
    content: [
      'نامه‌های وارده، صادره، ابلاغ‌ها و فرم‌ها.',
      'هر مورد: شماره، تاریخ شمسی، اولویت و پیوست.',
      'تب سازمانی: مکاتبات با ادارات.',
    ],
  },
  {
    id: 'scoring',
    icon: <EmojiEventsIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#f59e0b',
    title: 'ارزیابی و امتیازدهی',
    intro: 'سنجش عملکرد کارکنان با ۱۲ معیار.',
    content: [
      'معیارها: عملکرد، رضایت، تحصیلات، حضور، انضباط، مسافت، سابقه، رشد حقوق، مزایا، مأموریت، قرارداد، نوبت کاری.',
      'رتبه‌بندی + نوار پیشرفت رنگی + تفکیک جزئیات.',
    ],
  },
  {
    id: 'settings',
    icon: <SettingsIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#64748b',
    title: 'تنظیمات',
    intro: 'پیکربندی سیستم و شخصی‌سازی.',
    content: [
      'تنظیمات عمومی، کاربران/نقش‌ها، درون‌ریزی اکسل.',
      'ظاهر: ۵ مد نمایش (روشن، تاریک، F مود، F مود روشن، کوراساوا سیاه‌وسفید).',
    ],
  },
  {
    id: 'assistant',
    icon: <SmartToyIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#f43f5e',
    title: 'دستیار منابع انسانی',
    intro: 'دستیار هوشمند آفلاین با پاسخ از داده‌های واقعی.',
    content: [
      '«تاریخ استخدام / آدرس / کارکرد / حقوق / مزایا / مرخصی / جرائم / مدارک / سوابق [نام]»',
      '«چه کسانی احتمال استعفا دارند؟» — «بهترین کارمند کیه؟»',
      '«نمودار دپارتمان‌ها رو نشون بده» (تصویر SVG)',
      'سؤال مرکب: «کارکرد و حقوق و مزایای [نام] در ۱۴۰۴»',
    ],
  },
  {
    id: 'shortcuts',
    icon: <KeyboardIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#0ea5e9',
    title: 'میانبرهای صفحه‌کلید',
    intro: 'سریع‌تر کار کنید.',
    content: [
      'F1 — باز/بسته کردن این راهنما.',
      'Enter — ارسال پیام در دستیار.',
    ],
  },
];

const QUICK_TIPS = [
  { icon: '🔍', text: 'از فیلترهای ترکیبی برای یافتن سریع پرسنل استفاده کنید' },
  { icon: '📸', text: 'عکس پرسنلی را در تب مدارک آپلود کنید تا همه‌جا دیده شود' },
  { icon: '🎨', text: 'از تنظیمات → ظاهر، حالت نمایش را عوض کنید (حتی کوراساوا)' },
  { icon: '🤖', text: 'سؤال‌های دستیار را با F1 ببینید' },
  { icon: '📊', text: 'نمودار را از دستیار با «نمودار ...» درخواست کنید' },
  { icon: '⌨️', text: 'با Enter پیام دستیار را ارسال کنید' },
];

const FAQ = [
  { q: 'چطور عکس پرسنل اضافه کنم؟', a: 'در پرونده پرسنل → تب مدارک، دکمه «آپلود عکس پرسنلی».' },
  { q: 'چطور خروجی اکسل بگیرم؟', a: 'در دفترچه تلفن، دکمه «خروجی اکسل». برای درون‌ریزی، تنظیمات → درون‌ریزی اکسل.' },
  { q: 'چطور حالت نمایش را عوض کنم؟', a: 'تنظیمات → تب ظاهر → انتخاب از ۵ مد نمایش.' },
  { q: 'چطور احتمال استعفا را ببینم؟', a: 'از دستیار بپرسید: «چه کسانی احتمال استعفا دارند؟» یا صفحه ارزیابی.' },
  { q: 'چارت سازمانی را چطور چاپ کنم؟', a: 'در صفحه چارت، دکمه «چاپ / PDF».' },
];

const HelpDialog = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setOpen(p => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const normalized = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    let result = HELP_SECTIONS;
    if (activeCategory !== 'all') result = result.filter(s => s.id === activeCategory);
    if (normalized) {
      result = result.filter(s =>
        s.title.toLowerCase().includes(normalized) ||
        s.intro.toLowerCase().includes(normalized) ||
        s.content.some(c => c.toLowerCase().includes(normalized))
      );
    }
    return result;
  }, [activeCategory, normalized]);

  const showQuickTips = activeCategory === 'all' && !normalized;

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 24px 80px rgba(99,102,241,0.18)',
        },
      }}
    >
      {/* Header */}
      <DialogTitle sx={{
        m: 0, p: 0,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(236,72,153,0.08))',
        borderBottom: '1px solid rgba(99,102,241,0.14)',
      }}>
        <Box sx={{ px: 3.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
            boxShadow: '0 6px 18px rgba(99,102,241,0.4)',
          }}>
            <HelpOutlineIcon sx={{ fontSize: 30, color: '#fff' }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>راهنمای جامع HRMS</Typography>
            <Typography variant="body2" color="textSecondary">هر آنچه برای استفاده از سیستم نیاز دارید</Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} aria-label="بستن"
            sx={{ border: '1px solid rgba(0,0,0,0.1)', '&:hover': { background: 'rgba(99,102,241,0.08)' } }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3.5, py: 3 }}>
        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="جستجو در راهنما... (مثلاً: جستجو، نمودار، دستیار، مرخصی)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>,
          }}
          sx={{ mb: 1.5 }}
        />

        {/* Category chips */}
        <Paper sx={{
          p: 1.5, mb: 2,
          display: 'flex', gap: 1, flexWrap: 'wrap',
          maxHeight: 104, overflowY: 'auto',
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: 2.5,
        }}>
          <Chip
            label="همه"
            onClick={() => setActiveCategory('all')}
            variant={activeCategory === 'all' ? 'filled' : 'outlined'}
            color={activeCategory === 'all' ? 'primary' : 'default'}
            clickable
          />
          {HELP_SECTIONS.filter(s => s.id !== 'shortcuts').map(s => (
            <Chip
              key={s.id}
              label={s.title}
              onClick={() => setActiveCategory(activeCategory === s.id ? 'all' : s.id)}
              variant={activeCategory === s.id ? 'filled' : 'outlined'}
              sx={{
                ...(activeCategory === s.id && {
                  background: s.color,
                  color: '#fff',
                  '&:hover': { background: s.color },
                }),
              }}
              clickable
            />
          ))}
        </Paper>

        {/* Category intro banner */}
        {activeCategory !== 'all' && !normalized && (
          <Paper sx={{
            mb: 2, px: 2, py: 1.25,
            background: `linear-gradient(135deg, ${HELP_SECTIONS.find(s => s.id === activeCategory)?.color}0d, transparent)`,
            border: `1px solid ${HELP_SECTIONS.find(s => s.id === activeCategory)?.color}20`,
            borderRadius: 2,
          }}>
            <Typography variant="body2" fontWeight={600} color="textSecondary">
              {HELP_SECTIONS.find(s => s.id === activeCategory)?.intro}
            </Typography>
          </Paper>
        )}

        {/* Sections */}
        {filtered.length === 0 ? (
          <Box textAlign="center" py={5}>
            <HelpOutlineIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
            <Typography color="textSecondary">نتیجه‌ای یافت نشد</Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {filtered.map(section => (
              <Accordion
                key={section.id}
                defaultExpanded={!normalized && activeCategory === 'all'}
                sx={{
                  borderRadius: '16px !important',
                  background: `linear-gradient(135deg, ${section.color}10, ${section.color}04)`,
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: `1px solid ${section.color}22`,
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { my: 1 },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: section.color }} />}>
                  <Avatar sx={{
                    width: 30, height: 30, mr: 1.5,
                    background: `linear-gradient(135deg, ${section.color}, ${section.color}90)`,
                    boxShadow: `0 2px 8px ${section.color}40`,
                  }}>
                    {section.icon}
                  </Avatar>
                  <Typography fontWeight={700} sx={{ color: section.color }}>{section.title}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={0.6}>
                    {section.intro && (
                      <Typography variant="caption" fontWeight={600} color="textSecondary">
                        {section.intro}
                      </Typography>
                    )}
                    {section.content.map((c, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: 15, color: section.color, mt: '2px', flexShrink: 0 }} />
                        <Typography variant="body2" color="textSecondary">{c}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}

        {/* Quick tips */}
        {showQuickTips && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <LightbulbIcon sx={{ color: '#f59e0b' }} />
              <Typography variant="subtitle1" fontWeight={700}>نکات سریع</Typography>
            </Box>
            <Grid container spacing={1.5}>
              {QUICK_TIPS.map((tip, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Paper sx={{
                    p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
                    background: 'rgba(255,255,255,0.6)', borderRadius: 2,
                    border: '1px solid rgba(99,102,241,0.12)',
                  }}>
                    <Typography variant="h6">{tip.icon}</Typography>
                    <Typography variant="body2">{tip.text}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* FAQ */}
        {showQuickTips && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <QuestionAnswerIcon sx={{ color: '#10b981' }} />
              <Typography variant="subtitle1" fontWeight={700}>سؤالات متداول</Typography>
            </Box>
            <Stack spacing={1}>
              {FAQ.map((f, i) => (
                <Accordion key={i} sx={{ borderRadius: '12px !important', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" fontWeight={600}>{f.q}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="textSecondary">{f.a}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{
        px: 3.5, py: 2,
        borderTop: '1px solid rgba(99,102,241,0.12)',
      }}>
        <Chip
          size="small"
          icon={<KeyboardIcon sx={{ fontSize: 14 }} />}
          label="F1 برای باز/بسته کردن"
          variant="outlined"
          sx={{ mr: 'auto', borderColor: 'rgba(99,102,241,0.3)', color: '#6366f1' }}
        />
        <Button variant="contained" onClick={() => setOpen(false)}>بستن</Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;