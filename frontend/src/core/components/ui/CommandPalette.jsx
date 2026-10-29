import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, ButtonBase, CircularProgress, Dialog, Divider, InputAdornment,
  Skeleton, Stack, TextField, Tooltip, Typography, alpha,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import HistoryIcon from '@mui/icons-material/History';
import { useApplication } from '../../context/ApplicationContext';
import { useDesignTokens } from '../../context/DesignTokenContext';
import { useModulePalette } from '../../context/ModulePaletteContext';
import { getMenuForApp } from '../../config/menuConfig';
import { useModuleSearch } from '../../hooks/useModuleSearch';
import { toPersianDigits } from '../../utils/numberUtils';
import { resolveToolbarTheme } from '../../theme/toolbarStyles';
import { resolveTableTheme } from '../../theme/tableStyles';

const RECENTS_KEY = 'hrms.quicksearch.recent';

const MODULE_META = {
  hrms: { label: 'منابع انسانی', color: '#db2777' },
  hr: { label: 'منابع انسانی', color: '#db2777' },
  contracts: { label: 'مدیریت قراردادها', color: '#f59e0b' },
  projects: { label: 'مدیریت پروژه‌ها', color: '#8b5cf6' },
  accounting: { label: 'حسابداری', color: '#3b82f6' },
  payroll: { label: 'حقوق و دستمزد', color: '#10b981' },
  pettycash: { label: 'تنخواه', color: '#f97316' },
  'petty-cash': { label: 'تنخواه', color: '#f97316' },
  procurement: { label: 'خرید و تدارکات', color: '#06b6d4' },
  treasury: { label: 'خزانه‌داری', color: '#0f766e' },
  documents: { label: 'مدیریت اسناد و مدارک', color: '#0d9488' },
  correspondence: { label: 'مکاتبات رسمی', color: '#0ea5e9' },
  settings: { label: 'تنظیمات', color: '#64748b' },
};

const RESULT_ICONS = {
  person: PersonOutlineIcon,
  employee: PersonOutlineIcon,
  document: DescriptionOutlinedIcon,
  folder: FolderOutlinedIcon,
  contract: DescriptionOutlinedIcon,
  project: AccountTreeOutlinedIcon,
  structure: AccountTreeOutlinedIcon,
  activity: AssignmentOutlinedIcon,
  risk: GavelOutlinedIcon,
  quality: VerifiedUserOutlinedIcon,
  change: AccountTreeOutlinedIcon,
  certificate: ReceiptLongOutlinedIcon,
  invoice: ReceiptLongOutlinedIcon,
  statement: ReceiptLongOutlinedIcon,
  payment: PaymentsOutlinedIcon,
  guarantee: ShieldOutlinedIcon,
  dispute: GavelOutlinedIcon,
  accounting: ReceiptLongOutlinedIcon,
  account: AccountTreeOutlinedIcon,
  tags: Inventory2OutlinedIcon,
  book: DescriptionOutlinedIcon,
  cost: Inventory2OutlinedIcon,
  payroll: PaymentsOutlinedIcon,
  loan: PaymentsOutlinedIcon,
  cash: AccountBalanceOutlinedIcon,
  supplier: BusinessOutlinedIcon,
  item: Inventory2OutlinedIcon,
  request: AssignmentOutlinedIcon,
  order: LocalShippingOutlinedIcon,
  bank: AccountBalanceOutlinedIcon,
  treasury: AccountBalanceOutlinedIcon,
  check: ReceiptLongOutlinedIcon,
  receipt: ReceiptLongOutlinedIcon,
  mail: MailOutlineIcon,
  announcement: MailOutlineIcon,
  building: BusinessOutlinedIcon,
  leave: EventBusyOutlinedIcon,
};

const normalize = (value) => String(value ?? '').trim().toLowerCase();
/* منو در ماژول‌ها بخش‌محور است (sections با items) و در برخی ماژول‌ها children دارد */
const flattenMenu = (items = [], group = '') => items.flatMap((item) => {
  const children = item.items || item.children || [];
  const nextGroup = item.path ? group : (item.title || group);
  const self = item.path ? [{ ...item, group }] : [];
  return [...self, ...flattenMenu(children, nextGroup)];
});
const resultIcon = (name) => RESULT_ICONS[name] || SearchIcon;

const readRecents = () => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string').slice(0, 5) : [];
  } catch (error) {
    return [];
  }
};

/* یک ردیف نتیجه (صفحه یا رکورد) */
const ResultRow = ({ row, active, accent, tableTheme, onSelect, onHover }) => {
  const Icon = row.kind === 'page'
    ? (React.isValidElement(row.icon) ? null : SearchIcon)
    : resultIcon(row.icon);
  return (
    <ButtonBase
      role="option"
      aria-selected={active}
      onMouseEnter={onHover}
      onClick={() => onSelect(row.path)}
      sx={{
        width: '100%', justifyContent: 'flex-start', textAlign: 'right',
        px: 1, py: 0.55, borderRadius: `${Math.max(6, Math.min(14, (tableTheme.radius || 16) - 6))}px`,
        border: '1px solid', borderColor: active ? alpha(accent, 0.35) : 'transparent',
        bgcolor: active ? alpha(accent, 0.08) : 'transparent',
        transition: 'background-color .14s ease, border-color .14s ease',
      }}
    >
      <Box sx={{
        width: 30, height: 30, borderRadius: '9px', flexShrink: 0, ml: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: alpha(row.color || accent, active ? 0.16 : 0.08), color: row.color || accent,
        border: `1px solid ${alpha(row.color || accent, 0.16)}`,
        transition: 'background-color .14s ease',
      }}>
        {row.kind === 'page' && React.isValidElement(row.icon)
          ? React.cloneElement(row.icon, { sx: { fontSize: 16 } })
          : <Icon sx={{ fontSize: 16 }} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: 'text.primary' }}>{row.title}</Typography>
      </Box>
      {active ? <ChevronLeftIcon sx={{ fontSize: 15, color: alpha(accent, 0.7), flexShrink: 0 }} /> : null}
    </ButtonBase>
  );
};

const SectionHeader = ({ label, accent }) => (
  <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1, pt: 0.75, pb: 0.4 }}>
    <Typography sx={{ fontSize: 10.5, fontWeight: 900, color: accent }}>{label}</Typography>
    <Divider sx={{ flex: 1, borderColor: alpha(accent, 0.14) }} />
  </Stack>
);

const SkeletonRows = ({ count = 3 }) => (
  <Stack spacing={0.6} sx={{ p: 1 }}>
    {Array.from({ length: count }).map((_item, index) => (
      <Stack key={index} direction="row" alignItems="center" spacing={1}>
        <Skeleton variant="rounded" width={30} height={30} sx={{ borderRadius: '9px' }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={14} />
          <Skeleton variant="text" width="38%" height={11} />
        </Box>
      </Stack>
    ))}
  </Stack>
);


/* ریل کناری: محدودهٔ جستجو، شمارش‌ها و جستجوهای اخیر */
const ScopeRail = ({ theme, accent, moduleLabel, counts, recents, onRecent, onClearRecents, tone }) => (
  <Box sx={{
    width: { md: 202 }, flexShrink: 0, p: 1.15, display: 'flex', flexDirection: 'column', gap: 0.9,
    borderLeft: { md: '1px solid' }, borderColor: { md: 'divider' },
    bgcolor: theme.palette.mode === 'dark' ? alpha(accent, 0.07) : alpha(accent, 0.028),
  }}>
    <Box>
      <Typography sx={{ fontSize: 10, fontWeight: 900, color: tone }}>محدودهٔ جستجو</Typography>
      <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'text.primary', mt: 0.15 }}>{moduleLabel}</Typography>
    </Box>
    <Divider />
    <Stack spacing={0.5}>
      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>دسترسی‌ها</Typography>
        <Typography sx={{ fontSize: 10, fontWeight: 900, color: tone, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
          {toPersianDigits(counts.pages)}
        </Typography>
      </Stack>
      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>نتایج داده</Typography>
        <Typography sx={{ fontSize: 10, fontWeight: 900, color: tone, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
          {toPersianDigits(counts.records)}
        </Typography>
      </Stack>
    </Stack>
    {recents.length ? (
      <>
        <Divider />
        <Box>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.35 }}>
            <Stack direction="row" alignItems="center" spacing={0.4}>
              <HistoryIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
              <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'text.secondary' }}>اخیر</Typography>
            </Stack>
            <ButtonBase onClick={onClearRecents} sx={{ fontSize: 9, color: 'text.disabled', borderRadius: '5px', px: 0.4 }}>
              پاک‌سازی
            </ButtonBase>
          </Stack>
          <Stack spacing={0.2}>
            {recents.map((item) => (
              <ButtonBase key={item} onClick={() => onRecent(item)} sx={{
                justifyContent: 'flex-start', borderRadius: '7px', px: 0.6, py: 0.3,
                fontSize: 10.5, color: 'text.secondary', transition: 'background-color .14s ease',
                '&:hover': { bgcolor: alpha(accent, 0.09), color: 'text.primary' },
              }}>{item}</ButtonBase>
            ))}
          </Stack>
        </Box>
      </>
    ) : null}
  </Box>
);

/**
 * جستجوی سریع (Ctrl+K) محدود به ماژول فعال.
 * طراحی روی توکن‌های استودیوی تم: سطح/شعاع/شعاع جستجو/چگالی ردیف‌ها از توکن‌ها،
 * رنگ لهجه از پالت ماژول و ناوبری کامل با کیبورد (↑ ↓ Enter Esc).
 */
const CommandPalette = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { tokens } = useDesignTokens();
  const { getPalette } = useModulePalette();
  const { currentApp } = useApplication();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recents, setRecents] = useState([]);
  const rowRefs = useRef([]);

  const moduleSlug = currentApp?.slug || 'hrms';
  const moduleMeta = MODULE_META[moduleSlug] || {
    label: currentApp?.title || 'ماژول جاری', color: '#6366f1',
  };
  const modulePalette = typeof getPalette === 'function' ? getPalette(moduleSlug) : null;
  const toolbarTheme = resolveToolbarTheme(tokens);
  const tableTheme = resolveTableTheme(tokens);
  const accent = tokens?.colors?.moduleAccent
    || modulePalette?.accent
    || modulePalette?.primary
    || moduleMeta.color;
  const isDark = theme.palette.mode === 'dark';
  const surface = isDark
    ? alpha(theme.palette.background.paper, 0.98)
    : (tokens?.surfaces?.dialog?.background || theme.palette.background.paper);
  const dialogRadius = tokens?.surfaces?.dialog?.radius ?? tokens?.shape?.large ?? 18;
  const query = q.trim();
  const { data, isFetching, isError, refetch } = useModuleSearch(debouncedQuery, moduleSlug);

  useEffect(() => {
    if (open) setRecents(readRecents());
  }, [open]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((previous) => !previous);
        setQ('');
      } else if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const navigationItems = useMemo(() => {
    const menu = getMenuForApp(moduleSlug);
    return flattenMenu(menu).filter((item) => item.path && item.ready !== false);
  }, [moduleSlug]);

  const navigationResults = useMemo(() => {
    const search = normalize(query);
    const rows = search
      ? navigationItems.filter((item) => normalize(`${item.title} ${item.group}`).includes(search))
      : navigationItems;
    return rows.slice(0, query ? 6 : 8);
  }, [navigationItems, query]);

  const groupedResults = useMemo(() => {
    const groups = new Map();
    (data?.results || []).forEach((row) => {
      const key = row.section || 'نتایج';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return [...groups.entries()];
  }, [data]);

  /* فهرست تخت برای ناوبری کیبورد */
  const flatRows = useMemo(() => {
    const pages = navigationResults.map((item) => ({
      kind: 'page', id: `page-${item.path}`, title: item.title, subtitle: item.group,
      path: item.path, icon: item.icon, group: item.group, color: accent,
    }));
    const records = (data?.results || []).map((row) => ({
      kind: 'record', id: row.id, title: row.title, subtitle: row.subtitle || row.type,
      path: row.path, icon: row.icon, section: row.section, color: row.color,
    }));
    return [...pages, ...records];
  }, [navigationResults, data, accent]);

  useEffect(() => { setActiveIndex(0); }, [query, flatRows.length, open]);

  const remember = (term) => {
    const value = String(term || '').trim();
    if (value.length < 2) return;
    try {
      const next = [value, ...readRecents().filter((item) => item !== value)].slice(0, 5);
      window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      setRecents(next);
    } catch (error) {
      /* بی‌اهمیت: نبود localStorage نباید جستجو را بشکند */
    }
  };

  const select = (path, term) => {
    if (!path) return;
    remember(term || query);
    setOpen(false);
    navigate(path);
  };

  const clearRecents = () => {
    try { window.localStorage.removeItem(RECENTS_KEY); } catch (error) { /* noop */ }
    setRecents([]);
  };

  const handleKeyDown = (event) => {
    if (!flatRows.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(flatRows.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const row = flatRows[activeIndex];
      if (row) select(row.path);
    }
  };

  useEffect(() => {
    const node = rowRefs.current[activeIndex];
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, open]);

  const recordCount = data?.results?.length || 0;


  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      fullWidth
      maxWidth="md"
      aria-label="جستجوی سریع ماژول"
      onKeyDown={handleKeyDown}
      PaperProps={{
        dir: 'rtl',
        sx: {
          borderRadius: `${dialogRadius}px`,
          overflow: 'hidden',
          bgcolor: surface,
          border: `1px solid ${alpha(accent, isDark ? 0.28 : 0.18)}`,
          boxShadow: isDark
            ? `0 28px 90px ${alpha('#000000', 0.6)}`
            : `0 26px 80px ${alpha(accent, 0.22)}`,
        },
      }}
    >
      {/* ---------- هدر: عنوان + محدوده + میان‌بر ---------- */}
      <Box sx={{
        px: 1.75, pt: 1.5, pb: 1.15,
        background: `linear-gradient(135deg, ${alpha(accent, isDark ? 0.2 : 0.12)}, ${alpha(accent, 0.015)})`,
        borderBottom: '1px solid', borderColor: alpha(accent, 0.16),
      }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: alpha(accent, 0.14), color: accent, border: `1px solid ${alpha(accent, 0.28)}`,
          }}>
            <SearchIcon sx={{ fontSize: 19 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: 'text.primary', lineHeight: 1.5 }}>
              جستجو در {moduleMeta.label}
            </Typography>
          </Box>
        </Stack>

        <TextField
          autoFocus
          fullWidth
          size="small"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={`جستجو در ${moduleMeta.label}…`}
          inputProps={{ 'aria-label': 'عبارت جستجو', autoComplete: 'off' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: accent }} />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Stack direction="row" alignItems="center" spacing={0.4}>
                  {isFetching ? <CircularProgress size={14} sx={{ color: accent }} /> : null}
                  {q ? (
                    <Tooltip title="پاک کردن">
                      <ButtonBase
                        aria-label="پاک کردن جستجو"
                        onClick={() => setQ('')}
                        sx={{
                          width: 20, height: 20, borderRadius: '6px', color: 'text.secondary',
                          '&:hover': { bgcolor: alpha(accent, 0.1), color: accent },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </ButtonBase>
                    </Tooltip>
                  ) : null}
                </Stack>
              </InputAdornment>
            ),
            sx: {
              height: `${Math.max(38, toolbarTheme.searchHeight)}px`,
              borderRadius: `${toolbarTheme.searchRadius}px`,
              bgcolor: toolbarTheme.searchSurface === 'transparent' ? 'transparent' : toolbarTheme.searchBg,
              fontSize: 13,
              border: `1px solid ${alpha(accent, 0.2)}`,
              transition: 'border-color .16s ease, box-shadow .16s ease',
              '& fieldset': { border: 'none' },
              '&:hover': { borderColor: alpha(accent, 0.35) },
              '&.Mui-focused': { borderColor: alpha(accent, 0.6), boxShadow: `0 0 0 3px ${alpha(accent, 0.12)}` },
            },
          }}
        />
      </Box>


      {/* ---------- بدنه: نتایج + ریل محدوده ---------- */}
      <Box sx={{ display: 'flex', minHeight: 320, maxHeight: 'min(64vh, 540px)' }}>
        <Box sx={{ flex: 1, minWidth: 0, overflowY: 'auto', p: 0.75 }}>
          {isError ? (
            <Alert
              severity="error"
              sx={{ mb: 0.75, fontSize: 11.5, borderRadius: '10px' }}
              action={(
                <ButtonBase onClick={() => refetch()} sx={{ fontSize: 11, fontWeight: 800 }}>
                  تلاش دوباره
                </ButtonBase>
              )}
            >
              جستجو با خطا مواجه شد؛ دوباره تلاش کنید.
            </Alert>
          ) : null}

          {navigationResults.length ? (
            <>
              <SectionHeader label={`صفحه‌های ${moduleMeta.label}`} accent={accent} />
              <Box role="listbox" aria-label="صفحه‌های ماژول">
                {navigationResults.map((item, index) => (
                  <Box key={`${item.group}-${item.id || item.path}`} ref={(node) => { rowRefs.current[index] = node; }}>
                    <ResultRow
                      row={flatRows[index]}
                      active={activeIndex === index}
                      accent={accent}
                      tableTheme={tableTheme}
                      onHover={() => setActiveIndex(index)}
                      onSelect={() => select(item.path)}
                    />
                  </Box>
                ))}
              </Box>
            </>
          ) : null}

          {query.length >= 2 ? (
            isFetching && !recordCount ? (
              <SkeletonRows count={3} />
            ) : !groupedResults.length ? (
              <Box sx={{ py: 5, textAlign: 'center' }}>
                <SearchIcon sx={{ fontSize: 34, color: alpha(accent, 0.35) }} />
                <Typography sx={{ mt: 0.5, fontSize: 12.5, fontWeight: 800, color: 'text.primary' }}>
                  نتیجه‌ای در این ماژول پیدا نشد
                </Typography>
                <Typography sx={{ mt: 0.3, fontSize: 11, color: 'text.secondary' }}>
                  عبارت دیگری را امتحان کنید یا از صفحه‌های بالا استفاده کنید.
                </Typography>
              </Box>
            ) : (
              groupedResults.map(([section, rows], groupIndex) => (
                <Box key={section}>
                  <SectionHeader label={section} accent={accent} />
                  <Box role="listbox" aria-label={section}>
                    {rows.map((row, rowIndex) => {
                      const index = navigationResults.length
                        + groupedResults.slice(0, groupIndex).reduce((sum, [, items]) => sum + items.length, 0)
                        + rowIndex;
                      return (
                        <Box key={row.id} ref={(node) => { rowRefs.current[index] = node; }}>
                          <ResultRow
                            row={flatRows[index]}
                            active={activeIndex === index}
                            accent={accent}
                            tableTheme={tableTheme}
                            onHover={() => setActiveIndex(index)}
                            onSelect={() => select(row.path)}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              ))
            )
          ) : (
            <Typography sx={{ p: 1.25, fontSize: 11, color: 'text.secondary' }}>
              برای جستجوی داده‌های این ماژول حداقل دو حرف وارد کنید.
            </Typography>
          )}
        </Box>

        <ScopeRail
          theme={theme}
          accent={accent}
          tone={accent}
          moduleLabel={moduleMeta.label}
          counts={{ pages: navigationItems.length, records: recordCount }}
          recents={recents}
          onRecent={(term) => { setQ(term); setDebouncedQuery(term); }}
          onClearRecents={clearRecents}
        />
      </Box>

      {/* ---------- فوتر: راهنما و شمارش ---------- */}
      <Box sx={{
        px: 1.5, py: 0.85, borderTop: '1px solid', borderColor: 'divider',
        bgcolor: isDark ? alpha('#ffffff', 0.02) : alpha(accent, 0.025),
      }}>
        <Stack direction="row" alignItems="center" spacing={1.25} useFlexGap flexWrap="wrap">
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>Enter انتخاب · ↑↓ جابجایی · Esc بستن</Typography>
          <Typography sx={{ mr: 'auto', fontSize: 10, color: 'text.disabled' }}>
            {`${toPersianDigits(navigationResults.length)} صفحه · ${toPersianDigits(recordCount)} نتیجهٔ داده`}
          </Typography>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default CommandPalette;