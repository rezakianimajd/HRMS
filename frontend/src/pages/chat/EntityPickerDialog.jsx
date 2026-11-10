import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, InputAdornment, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import FolderCopyOutlinedIcon from '@mui/icons-material/FolderCopyOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import axiosInstance from '../../core/api/axiosConfig';

const MUTED = '#64748b';
const INK = '#0f172a';

export const ENTITY_MODULE_META = {
  contracts: { label: 'قراردادها', icon: DescriptionOutlinedIcon, color: '#f59e0b' },
  projects: { label: 'پروژه‌ها', icon: AccountTreeOutlinedIcon, color: '#8b5cf6' },
  procurement: { label: 'خرید و تدارکات', icon: ShoppingCartOutlinedIcon, color: '#06b6d4' },
  accounting: { label: 'حسابداری', icon: CalculateOutlinedIcon, color: '#3b82f6' },
  treasury: { label: 'خزانه‌داری', icon: AccountBalanceOutlinedIcon, color: '#14b8a6' },
  documents: { label: 'کتابخانهٔ اسناد', icon: FolderCopyOutlinedIcon, color: '#0f766e' },
  correspondence: { label: 'مکاتبات', icon: MailOutlinedIcon, color: '#0ea5e9' },
  hr: { label: 'منابع انسانی', icon: PeopleAltOutlinedIcon, color: '#db2777' },
};

export const entityKey = (entity) => `${entity.module}:${entity.object_type}:${entity.object_id}`;

/**
 * «الصاق رکورد» در چت: جست‌وجو **داخل همان ماژول** (قرارداد/پروژه/سند/نامه/…) و
 * افزودن نتیجه به‌عنوان ارجاع پیام. داده کپی نمی‌شود؛ فقط لینک به رکورد اصلی.
 */
const EntityPickerDialog = ({ open, onClose, onPick, accent = '#0ea5e9', existing = [] }) => {
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setDebounced('');
      setSelected([]);
      setModuleFilter('');
      return undefined;
    }
    const timer = setTimeout(() => setDebounced(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query, open]);

  const searchQuery = useQuery({
    queryKey: ['chat-entity-search', debounced, moduleFilter],
    queryFn: () => axiosInstance.get('/chat/entity-search/', {
      params: { q: debounced, module: moduleFilter || undefined },
    }).then((response) => response.data),
    enabled: open && debounced.length >= 2,
    staleTime: 30_000,
  });

  const results = useMemo(
    () => (Array.isArray(searchQuery.data?.results) ? searchQuery.data.results : []),
    [searchQuery.data],
  );
  const existingKeys = useMemo(
    () => new Set((existing || []).map((row) => entityKey(row))),
    [existing],
  );

  const toggle = (entity) => {
    const key = entityKey(entity);
    setSelected((previous) => (
      previous.some((row) => entityKey(row) === key)
        ? previous.filter((row) => entityKey(row) !== key)
        : [...previous, entity]
    ));
  };

  const confirm = () => {
    if (!selected.length) return;
    onPick(selected);
    setSelected([]);
    onClose();
  };

  const moduleChips = [''].concat(Object.keys(ENTITY_MODULE_META));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 13.5, fontWeight: 900, pb: 0.5 }}>
        الصاق رکورد از ماژول‌ها
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 1 }}>
        <TextField
          autoFocus size="small" fullWidth value={query}
          placeholder="مثلاً شمارهٔ قرارداد 1405/125 یا نام پروژه…"
          onChange={(event) => setQuery(event.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 17 }} />
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiInputBase-input': { fontSize: 11.5 }, mb: 1 }}
        />
        <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
          {moduleChips.map((key) => {
            const meta = ENTITY_MODULE_META[key];
            const active = moduleFilter === key;
            return (
              <Chip
                key={key || 'all'}
                size="small"
                label={meta ? meta.label : 'همه'}
                onClick={() => setModuleFilter(key)}
                sx={{
                  height: 22, fontSize: 10, fontWeight: 800, cursor: 'pointer',
                  bgcolor: active ? alpha(meta?.color || accent, 0.16) : 'action.hover',
                  color: active ? (meta?.color || accent) : MUTED,
                }}
              />
            );
          })}
        </Stack>

        {debounced.length < 2 ? (
          <Typography sx={{ fontSize: 11, color: MUTED, py: 2, textAlign: 'center' }}>
            حداقل ۲ حرف بنویسید تا در ماژول‌های مجاز جست‌وجو شود.
          </Typography>
        ) : searchQuery.isFetching ? (
          <Box sx={{ py: 3, textAlign: 'center' }}><CircularProgress size={20} /></Box>
        ) : results.length ? (
          <Stack spacing={0.4}>
            {results.map((entity) => {
              const meta = ENTITY_MODULE_META[entity.module] || {};
              const Icon = meta.icon || LinkOutlinedIcon;
              const key = entityKey(entity);
              const isSelected = selected.some((row) => entityKey(row) === key);
              const already = existingKeys.has(key);
              return (
                <Stack
                  key={key} direction="row" alignItems="center" spacing={0.75}
                  onClick={() => { if (!already) toggle(entity); }}
                  sx={{
                    p: 0.75, borderRadius: '10px', cursor: already ? 'default' : 'pointer',
                    bgcolor: isSelected ? alpha(meta.color || accent, 0.1) : 'transparent',
                    '&:hover': {
                      bgcolor: isSelected ? alpha(meta.color || accent, 0.14) : 'action.hover',
                    },
                  }}
                >
                  <Box sx={{
                    width: 28, height: 28, borderRadius: '8px', display: 'grid',
                    placeItems: 'center', flexShrink: 0,
                    bgcolor: alpha(meta.color || accent, 0.14), color: meta.color || accent,
                  }}>
                    <Icon sx={{ fontSize: 16 }} />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>
                      {entity.label || '—'}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>
                      {[entity.subtitle, meta.label].filter(Boolean).join(' · ')}
                    </Typography>
                  </Box>
                  {already ? (
                    <Chip size="small" label="قبلاً اضافه شده"
                      sx={{ height: 18, fontSize: 9, fontWeight: 800 }} />
                  ) : (
                    <Checkbox size="small" checked={isSelected} sx={{ p: 0.3 }} />
                  )}
                </Stack>
              );
            })}
          </Stack>
        ) : (
          <Typography sx={{ fontSize: 11, color: MUTED, py: 2, textAlign: 'center' }}>
            نتیجه‌ای در ماژول‌های مجاز پیدا نشد.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Tooltip title="رکوردها به‌عنوان ارجاع به پیام الصاق می‌شوند و داده کپی نمی‌شود">
          <Typography sx={{ fontSize: 10, color: MUTED, flex: 1, pl: 1 }}>
            {selected.length ? `${selected.length} مورد انتخاب شد` : 'رکوردی انتخاب نشده'}
          </Typography>
        </Tooltip>
        <Button onClick={onClose}>انصراف</Button>
        <Button
          variant="contained" disabled={!selected.length} onClick={confirm}
          sx={{ bgcolor: accent, '&:hover': { bgcolor: accent } }}
        >
          الصاق به پیام
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EntityPickerDialog;

