import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Avatar, Box, Chip, CircularProgress, Dialog, Divider, InputAdornment,
  List, ListItemButton, ListItemText, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
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
import { useApplication } from '../../context/ApplicationContext';
import { getMenuForApp } from '../../config/menuConfig';
import { useModuleSearch } from '../../hooks/useModuleSearch';

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
const flattenMenu = (items = [], group = '') => items.flatMap((item) => [
  { ...item, group },
  ...flattenMenu(item.children || [], group),
]);
const resultIcon = (name) => RESULT_ICONS[name] || SearchIcon;

/**
 * جستجوی سریع (Ctrl+K) محدود به ماژول فعال.
 * نتایج شامل دسترسی‌های همان ماژول و رکوردهای واقعی آن است.
 */
const CommandPalette = () => {
  const navigate = useNavigate();
  const { currentApp } = useApplication();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const moduleSlug = currentApp?.slug || 'hrms';
  const moduleMeta = MODULE_META[moduleSlug] || {
    label: currentApp?.title || 'ماژول جاری', color: '#6366f1',
  };
  const query = q.trim();
  const { data, isFetching, isError } = useModuleSearch(debouncedQuery, moduleSlug);

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

  const select = (path) => {
    if (!path) return;
    setOpen(false);
    navigate(path);
  };

  const openCount = data?.results?.length || 0;

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: '18px', overflow: 'hidden', bgcolor: 'background.default',
          border: '1px solid', borderColor: alpha(moduleMeta.color, 0.16),
          boxShadow: `0 24px 80px ${alpha(moduleMeta.color, 0.2)}`,
        },
      }}
    >
      <Box sx={{
        px: 2.25, pt: 2, pb: 1.5,
        background: `linear-gradient(135deg, ${alpha(moduleMeta.color, 0.13)}, ${alpha(moduleMeta.color, 0.03)})`,
        borderBottom: '1px solid', borderColor: alpha(moduleMeta.color, 0.12),
      }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.25 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: moduleMeta.color, fontSize: 15, fontWeight: 900 }}>
            {moduleMeta.label.charAt(0)}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 900, color: moduleMeta.color }}>
              جستجو در {moduleMeta.label}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              فقط داده‌ها و صفحه‌های همین ماژول نمایش داده می‌شوند
            </Typography>
          </Box>
          <Chip size="small" label="Ctrl + K" sx={{ mr: 'auto', fontSize: 10, bgcolor: 'background.paper', color: 'text.secondary' }} />
        </Stack>
        <TextField
          autoFocus
          fullWidth
          size="small"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={`جستجو در ${moduleMeta.label}…`}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: moduleMeta.color }} />
              </InputAdornment>
            ),
            endAdornment: isFetching ? <CircularProgress size={16} /> : null,
            sx: { bgcolor: 'background.paper', borderRadius: '12px', fontSize: 13 },
          }}
        />
      </Box>


      <Box sx={{ maxHeight: 'min(66vh, 560px)', overflowY: 'auto', p: 1.25 }}>
        {isError ? (
          <Alert severity="error" sx={{ mb: 1, fontSize: 12 }}>جستجو با خطا مواجه شد؛ دوباره تلاش کنید.</Alert>
        ) : null}

        {navigationResults.length ? (
          <Box sx={{ mb: 1 }}>
            <Typography sx={{ px: 1, py: 0.6, fontSize: 11, fontWeight: 900, color: 'text.secondary' }}>
              صفحه‌های {moduleMeta.label}
            </Typography>
            <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', borderColor: alpha(moduleMeta.color, 0.12) }}>
              <List dense disablePadding>
                {navigationResults.map((item) => (
                  <ListItemButton key={`${item.group}-${item.id || item.path}`} onClick={() => select(item.path)}>
                    <Box sx={{
                      width: 28, height: 28, borderRadius: '8px', mr: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: alpha(moduleMeta.color, 0.09), color: moduleMeta.color,
                    }}>
                      {React.isValidElement(item.icon)
                        ? React.cloneElement(item.icon, { sx: { fontSize: 16 } })
                        : <SearchIcon sx={{ fontSize: 16 }} />}
                    </Box>
                    <ListItemText
                      primary={item.title}
                      secondary={item.group}
                      primaryTypographyProps={{ fontSize: 12.5, fontWeight: 700 }}
                      secondaryTypographyProps={{ fontSize: 10.5 }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          </Box>
        ) : null}

        {query.length >= 2 ? (
          isFetching && !openCount ? (
            <Stack alignItems="center" spacing={1} py={4}>
              <CircularProgress size={24} />
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>در حال جستجو…</Typography>
            </Stack>
          ) : !groupedResults.length ? (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: '12px' }}>
              <SearchIcon sx={{ fontSize: 32, color: alpha(moduleMeta.color, 0.4) }} />
              <Typography sx={{ mt: 0.5, fontSize: 12.5, fontWeight: 800 }}>نتیجه‌ای در این ماژول پیدا نشد</Typography>
              <Typography sx={{ mt: 0.4, fontSize: 11.5, color: 'text.secondary' }}>
                عبارت دیگری را امتحان کنید یا از صفحه‌های بالا استفاده کنید.
              </Typography>
            </Paper>
          ) : (
            groupedResults.map(([section, rows]) => (
              <Box key={section} sx={{ mb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1, py: 0.5 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 900, color: moduleMeta.color }}>{section}</Typography>
                  <Chip size="small" label={rows.length} sx={{ height: 17, fontSize: 9.5, bgcolor: alpha(moduleMeta.color, 0.1), color: moduleMeta.color }} />
                  <Divider sx={{ flex: 1, borderColor: alpha(moduleMeta.color, 0.12) }} />
                </Stack>
                <Paper variant="outlined" sx={{ borderRadius: '12px', overflow: 'hidden', borderColor: alpha(moduleMeta.color, 0.12) }}>
                  <List dense disablePadding>
                    {rows.map((row) => {
                      const Icon = resultIcon(row.icon);
                      return (
                        <ListItemButton key={row.id} onClick={() => select(row.path)}>
                          <Box sx={{
                            width: 30, height: 30, borderRadius: '9px', mr: 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: alpha(row.color || moduleMeta.color, 0.1), color: row.color || moduleMeta.color,
                          }}>
                            <Icon sx={{ fontSize: 17 }} />
                          </Box>
                          <ListItemText
                            primary={row.title}
                            secondary={row.subtitle || row.type}
                            primaryTypographyProps={{ noWrap: true, fontSize: 12.5, fontWeight: 800 }}
                            secondaryTypographyProps={{ noWrap: true, fontSize: 10.5 }}
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </Paper>
              </Box>
            ))
          )
        ) : (
          <Typography sx={{ px: 1, py: 1, fontSize: 11.5, color: 'text.secondary', textAlign: 'center' }}>
            برای جستجوی داده‌های این ماژول حداقل دو حرف وارد کنید.
          </Typography>
        )}
      </Box>

      <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Stack direction="row" spacing={1.25} sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
          <Chip size="small" label="Enter انتخاب" sx={{ fontSize: 9.5 }} />
          <Chip size="small" label="Esc بستن" sx={{ fontSize: 9.5 }} />
          <Typography sx={{ mr: 'auto', fontSize: 10.5, color: 'text.disabled' }}>
            محدودهٔ جستجو: {moduleMeta.label}
          </Typography>
        </Stack>
      </Box>
    </Dialog>
  );
};

export default CommandPalette;
