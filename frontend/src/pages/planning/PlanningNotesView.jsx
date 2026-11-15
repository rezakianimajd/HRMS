/**
 * نمای یادداشت‌ها: نوار جستجو/فیلتر استاندارد + شبکهٔ کارت‌ها + صفحه‌بندی سروری.
 *
 * همهٔ فیلترها (دامنه، رنگ، برچسب، سنجاق) داخل پنل فیلتر نوار ابزار هستند؛
 * دکمه‌های «افزودن» فقط در هدر صفحه قرار دارند.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Paper } from '@mui/material';
import axiosInstance from '../../core/api/axiosConfig';
import { ModulePager, ModuleToolbar } from '../contracts/contractModuleUi';
import { EmptyState, LoadingBlock, NoteCard } from './planningUi';
import { NOTE_SORT_OPTIONS, SCOPES, notePalette } from './planningTheme';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import AddIcon from '@mui/icons-material/Add';

export const NOTES_PAGE_SIZE = 24;

const COLOR_LABELS = {
  accent: 'رنگ اصلی',
  info: 'آبی',
  success: 'سبز',
  warning: 'نارنجی',
  danger: 'قرمز',
  neutral: 'خنثی',
};

const pickRows = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const PlanningNotesView = ({
  theme, search, apiSearch, onSearch, onCreate, onEdit, onShare, onDelete, onTogglePin,
  onCreateTask,
}) => {
  const [scope, setScope] = useState('mine');
  const [sort, setSort] = useState('-updated_at');
  const [color, setColor] = useState('');
  const [tag, setTag] = useState('');
  const [pinnedOnly, setPinnedOnly] = useState(false);
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

  const palette = notePalette(theme);
  const tagOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((note) => (note.tags || []).forEach((item) => set.add(item)));
    return Array.from(set).slice(0, 20);
  }, [rows]);

  const activeFilterCount = (scope !== 'mine' ? 1 : 0) + (color ? 1 : 0)
    + (tag ? 1 : 0) + (pinnedOnly ? 1 : 0);
  const resetFilters = () => {
    setScope('mine');
    setColor('');
    setTag('');
    setPinnedOnly(false);
  };

  const filters = [
    {
      label: 'دامنه',
      value: scope,
      options: SCOPES,
      onChange: setScope,
    },
    {
      label: 'رنگ',
      value: color,
      options: [{ value: '', label: 'همهٔ رنگ‌ها' }, ...palette.map((item) => ({
        value: item.color,
        label: COLOR_LABELS[item.key] || item.key,
      }))],
      onChange: setColor,
    },
    {
      label: 'برچسب',
      value: tag,
      options: [{ value: '', label: 'همهٔ برچسب‌ها' }, ...tagOptions.map((item) => ({
        value: item,
        label: item,
      }))],
      onChange: setTag,
    },
    {
      label: 'سنجاق',
      value: pinnedOnly ? '1' : '',
      options: [{ value: '', label: 'همه' }, { value: '1', label: 'فقط سنجاق‌شده' }],
      onChange: (value) => setPinnedOnly(value === '1'),
    },
  ];

  const activeChips = [
    scope !== 'mine' ? {
      key: 'scope',
      label: `دامنه: ${SCOPES.find((item) => item.value === scope)?.label || scope}`,
      clear: () => setScope('mine'),
    } : null,
    color ? {
      key: 'color',
      label: 'فیلتر رنگ',
      clear: () => setColor(''),
    } : null,
    tag ? { key: 'tag', label: `برچسب: ${tag}`, clear: () => setTag('') } : null,
    pinnedOnly ? { key: 'pinned', label: 'فقط سنجاق‌شده', clear: () => setPinnedOnly(false) } : null,
  ].filter(Boolean);

  return (
    <Box>
      <ModuleToolbar
        theme={theme}
        search={search}
        onSearch={onSearch}
        searchPlaceholder="جستجو در عنوان و برچسب یادداشت‌ها…"
        sort={sort}
        sortOptions={NOTE_SORT_OPTIONS}
        onSort={setSort}
        filters={filters}
        activeChips={activeChips}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
      />

      {isLoading && !rows.length ? (
        <LoadingBlock />
      ) : rows.length ? (
        <Box sx={{ opacity: isFetching ? 0.65 : 1, transition: 'opacity .15s ease' }}>
          <Box sx={{
            display: 'grid', gap: 1.25,
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
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
          hint="برای ساخت یادداشت از دکمهٔ «یادداشت جدید» در بالای صفحه استفاده کنید؛ یادداشت‌ها رمزنگاری‌شده و خصوصی هستند."
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
