/**
 * نمای یادداشت‌ها: نوار ابزار تم‌محور + فیلترها + شبکهٔ کارت‌ها + صفحه‌بندی سروری.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, IconButton, InputAdornment, MenuItem, Paper, Stack, TextField,
  Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import axiosInstance from '../../core/api/axiosConfig';
import { toPersianDigits } from '../../core/utils/numberUtils';
import { ModulePager, ModuleToolbar } from '../contracts/contractModuleUi';
import { EmptyState, LoadingBlock, NoteCard } from './planningUi';
import { NOTE_SORT_OPTIONS, notePalette } from './planningTheme';

export const NOTES_PAGE_SIZE = 24;

const pickRows = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const PlanningNotesView = ({
  theme, scope, search, apiSearch, onSearch, onCreate, onEdit, onShare, onDelete, onTogglePin,
  onCreateTask, onQuickAdd,
}) => {
  const [sort, setSort] = useState('-updated_at');
  const [color, setColor] = useState('');
  const [tag, setTag] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [apiSearch, scope, sort, color, tag, pinnedOnly]);

  const params = useMemo(() => {
    const next = { page: page + 1, page_size: NOTES_PAGE_SIZE, ordering: sort };
    if (apiSearch.trim()) next.q = apiSearch.trim();
    if (scope !== 'all') next.scope = scope;
    if (color) next.color = color;
    if (tag) next.tag = tag;
    if (pinnedOnly) next.pinned = 1;
    return next;
  }, [page, apiSearch, scope, sort, color, tag, pinnedOnly]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['planning', 'notes', params],
    queryFn: () => axiosInstance.get('/planning/notes/', { params }).then((response) => response.data),
    placeholderData: (previous) => previous,
    staleTime: 30000,
  });

  const rows = pickRows(data);
  const total = Number(data?.count ?? rows.length);
  const totalPages = Math.max(1, Math.ceil(total / NOTES_PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);
  const pageNumbers = useMemo(() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, totalPages - size));
    const end = Math.min(totalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_value, index) => start + index);
  }, [page, totalPages]);

  const tagOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((note) => (note.tags || []).forEach((item) => set.add(item)));
    return Array.from(set).slice(0, 18);
  }, [rows]);

  const palette = notePalette(theme);
  const activeFilters = (color ? 1 : 0) + (tag ? 1 : 0) + (pinnedOnly ? 1 : 0);
  const resetFilters = () => { setColor(''); setTag(''); setPinnedOnly(false); };

  const chips = [
    color ? { key: 'color', label: 'فیلتر رنگ', clear: () => setColor('') } : null,
    tag ? { key: 'tag', label: `برچسب: ${tag}`, clear: () => setTag('') } : null,
    pinnedOnly ? { key: 'pinned', label: 'فقط سنجاق‌شده', clear: () => setPinnedOnly(false) } : null,
  ].filter(Boolean);

  const submitQuick = () => {
    const title = quickTitle.trim();
    if (!title) return;
    onQuickAdd(title);
    setQuickTitle('');
  };

  return (
    <Box>
      <ModuleToolbar
        theme={theme}
        search={search}
        onSearch={onSearch}
        searchPlaceholder="جستجو در عنوان، متن و برچسب یادداشت‌ها…"
        sort={sort}
        sortOptions={NOTE_SORT_OPTIONS}
        onSort={setSort}
        activeChips={chips}
        activeFilterCount={activeFilters}
        onReset={resetFilters}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      >
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon fontSize="small" />}
          onClick={onCreate}
          sx={{ height: `${theme.toolbar.searchHeight}px !important`, minWidth: 'auto', px: 2 }}
        >
          یادداشت جدید
        </Button>
      </ModuleToolbar>

      {filtersOpen ? (
        <Paper elevation={0} sx={{
          p: 1.25, mb: 1.5, borderRadius: theme.radii.large,
          border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
        }}>
          <Box sx={{
            display: 'grid', gap: 1.25, alignItems: 'center',
            gridTemplateColumns: { xs: '1fr', md: 'auto 1fr auto' },
          }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: theme.tones.muted }}>رنگ:</Typography>
              {palette.map((item) => (
                <Tooltip key={item.key} title={item.key}>
                  <Box
                    role="button"
                    tabIndex={0}
                    aria-label={`فیلتر رنگ ${item.key}`}
                    onClick={() => setColor(color === item.color ? '' : item.color)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        setColor(color === item.color ? '' : item.color);
                      }
                    }}
                    sx={{
                      width: 20, height: 20, borderRadius: '50%', bgcolor: item.color, cursor: 'pointer',
                      border: color === item.color ? `2px solid ${theme.tones.text}` : '2px solid transparent',
                      boxShadow: color === item.color ? `0 0 0 2px ${alpha(item.color, 0.25)}` : 'none',
                    }}
                  />
                </Tooltip>
              ))}
            </Stack>
            <TextField
              size="small"
              select
              label="برچسب"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              sx={{ minWidth: { xs: '100%', sm: 200 } }}
            >
              <MenuItem value="">همهٔ برچسب‌ها</MenuItem>
              {tagOptions.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Button
                size="small"
                variant={pinnedOnly ? 'contained' : 'outlined'}
                startIcon={<PushPinOutlinedIcon fontSize="small" />}
                onClick={() => setPinnedOnly((previous) => !previous)}
              >
                فقط سنجاق‌شده
              </Button>
              <IconButton size="small" aria-label="پاک‌کردن فیلترها" onClick={resetFilters}
                disabled={!activeFilters}>
                <ClearAllIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>
        </Paper>
      ) : null}

      <Paper elevation={0} sx={{
        p: 1, mb: 1.5, borderRadius: theme.radii.large, border: '1px dashed',
        borderColor: alpha(theme.accent, 0.35), bgcolor: alpha(theme.accent, 0.035),
      }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            value={quickTitle}
            onChange={(event) => setQuickTitle(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') submitQuick(); }}
            placeholder="یادداشت سریع… (Enter برای افزودن)"
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: theme.radii.medium } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <StickyNote2OutlinedIcon sx={{ fontSize: 17, color: theme.accent }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            disabled={!quickTitle.trim()}
            onClick={submitQuick}
          >
            افزودن یادداشت
          </Button>
        </Stack>
      </Paper>

      <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 900, color: theme.tones.text }}>
          یادداشت‌ها
        </Typography>
        <Chip
          size="small"
          label={`${toPersianDigits(total)} یادداشت`}
          sx={{
            height: 21, fontSize: 10.5, fontWeight: 800,
            bgcolor: alpha(theme.accent, 0.08), color: theme.accent,
          }}
        />
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="text" startIcon={<FilterAltIcon />}
          onClick={() => setFiltersOpen((value) => !value)}>
          {filtersOpen ? 'بستن فیلترها' : 'فیلتر پیشرفته'}
        </Button>
      </Stack>

      {isLoading && !rows.length ? (
        <LoadingBlock />
      ) : rows.length ? (
        <Box sx={{ opacity: isFetching ? 0.65 : 1, transition: 'opacity .15s ease' }}>
          <Box sx={{
            display: 'grid', gap: 1.25,
            gridTemplateColumns: {
              xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))',
              xl: 'repeat(4, minmax(0, 1fr))',
            },
          }}>
            {rows.map((note) => (
              <NoteCard
                key={note.id}
                theme={theme}
                note={note}
                onEdit={onEdit}
                onShare={onShare}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
                onCreateTask={onCreateTask}
              />
            ))}
          </Box>
          <Paper elevation={0} sx={{
            mt: 1.5, borderRadius: theme.radii.large, border: '1px solid',
            borderColor: 'divider', bgcolor: 'background.paper',
          }}>
            <ModulePager
              tableTheme={theme.tableTheme}
              page={page}
              onPage={setPage}
              totalPages={totalPages}
              pageNumbers={pageNumbers}
              total={total}
              pageSize={NOTES_PAGE_SIZE}
              unit="یادداشت"
            />
          </Paper>
        </Box>
      ) : (
        <EmptyState
          theme={theme}
          icon={StickyNote2OutlinedIcon}
          title="یادداشتی با این شرایط پیدا نشد"
          hint="اولین یادداشت را از کادر بالا یا دکمهٔ «یادداشت جدید» بسازید؛ یادداشت‌ها رمزنگاری‌شده و خصوصی هستند."
          action={(
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onCreate}>
              یادداشت جدید
            </Button>
          )}
        />
      )}
    </Box>
  );
};

export default PlanningNotesView;
