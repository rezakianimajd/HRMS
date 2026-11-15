/**
 * نمای وظایف به‌صورت کارتی (مثل یادداشت‌ها) با نوار جستجو/فیلتر استاندارد.
 *
 * فیلترها (دامنه، وضعیت، اولویت) داخل پنل فیلتر نوار ابزار هستند؛ دکمهٔ افزودن
 * فقط در هدر صفحه قرار دارد.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Button, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import axiosInstance from '../../core/api/axiosConfig';
import { ModulePager, ModuleToolbar } from '../contracts/contractModuleUi';
import { EmptyState, LoadingBlock, TaskCard } from './planningUi';
import {
  SCOPES, TASK_PRIORITY_META, TASK_PRIORITY_ORDER, TASK_SORT_OPTIONS,
} from './planningTheme';

export const TASKS_PAGE_SIZE = 24;

export const TASK_STATUS_OPTIONS = [
  { value: 'open', label: 'بازها' },
  { value: 'todo', label: 'انجام‌نشده' },
  { value: 'doing', label: 'در حال انجام' },
  { value: 'today', label: 'سررسید امروز' },
  { value: 'overdue', label: 'معوق' },
  { value: 'done', label: 'انجام‌شده' },
  { value: 'cancelled', label: 'لغو‌شده' },
  { value: 'all', label: 'همه' },
];

const pickRows = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const statusParams = (filter) => {
  if (filter === 'overdue') return { due: 'overdue' };
  if (filter === 'today') return { due: 'today' };
  if (filter === 'all') return {};
  if (['todo', 'doing', 'done', 'cancelled'].includes(filter)) return { status: filter };
  return { open: 1 };
};

const PlanningTasksView = ({
  theme, search, apiSearch, onSearch, onCreate, onEdit, onShare, onDelete, onToggle,
}) => {
  const [scope, setScope] = useState('mine');
  const [statusFilter, setStatusFilter] = useState('open');
  const [priority, setPriority] = useState('');
  const [sort, setSort] = useState('default');
  const [page, setPage] = useState(0);

  useEffect(() => { setPage(0); }, [apiSearch, scope, statusFilter, priority, sort]);

  const params = useMemo(() => {
    const next = {
      page: page + 1, page_size: TASKS_PAGE_SIZE, ordering: sort,
      ...statusParams(statusFilter),
    };
    if (apiSearch.trim()) next.q = apiSearch.trim();
    if (scope !== 'all') next.scope = scope;
    if (priority) next.priority = priority;
    return next;
  }, [page, apiSearch, scope, statusFilter, priority, sort]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['planning', 'tasks', params],
    queryFn: () => axiosInstance.get('/planning/tasks/', { params }).then((response) => response.data),
    placeholderData: (previous) => previous,
    staleTime: 30000,
  });

  const rows = pickRows(data);
  const total = Number(data?.count ?? rows.length);
  const totalPages = Math.max(1, Math.ceil(total / TASKS_PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);
  const pageNumbers = useMemo(() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, totalPages - size));
    const end = Math.min(totalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_value, index) => start + index);
  }, [page, totalPages]);

  const activeFilterCount = (scope !== 'mine' ? 1 : 0)
    + (statusFilter !== 'open' ? 1 : 0) + (priority ? 1 : 0);
  const resetFilters = () => {
    setScope('mine');
    setStatusFilter('open');
    setPriority('');
  };

  const filters = [
    { label: 'دامنه', value: scope, options: SCOPES, onChange: setScope },
    { label: 'وضعیت', value: statusFilter, options: TASK_STATUS_OPTIONS, onChange: setStatusFilter },
    {
      label: 'اولویت',
      value: priority,
      options: [
        { value: '', label: 'همهٔ اولویت‌ها' },
        ...TASK_PRIORITY_ORDER.map((key) => ({ value: key, label: TASK_PRIORITY_META[key].label })),
      ],
      onChange: setPriority,
    },
  ];

  const activeChips = [
    scope !== 'mine' ? {
      key: 'scope',
      label: `دامنه: ${SCOPES.find((item) => item.value === scope)?.label || scope}`,
      clear: () => setScope('mine'),
    } : null,
    statusFilter !== 'open' ? {
      key: 'status',
      label: `وضعیت: ${TASK_STATUS_OPTIONS.find((item) => item.value === statusFilter)?.label || statusFilter}`,
      clear: () => setStatusFilter('open'),
    } : null,
    priority ? {
      key: 'priority',
      label: `اولویت: ${TASK_PRIORITY_META[priority]?.label || priority}`,
      clear: () => setPriority(''),
    } : null,
  ].filter(Boolean);

  return (
    <Box>
      <ModuleToolbar
        theme={theme}
        search={search}
        onSearch={onSearch}
        searchPlaceholder="جستجو در عنوان وظیفه و برچسب‌ها…"
        sort={sort}
        sortOptions={TASK_SORT_OPTIONS}
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          }}>
            {rows.map((task) => (
              <TaskCard
                key={task.id}
                theme={theme}
                task={task}
                onEdit={onEdit}
                onShare={onShare}
                onDelete={onDelete}
                onToggle={onToggle}
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
              pageSize={TASKS_PAGE_SIZE}
              unit="وظیفه"
            />
          </Paper>
        </Box>
      ) : (
        <EmptyState
          theme={theme}
          icon={TaskAltOutlinedIcon}
          title="وظیفه‌ای با این شرایط پیدا نشد"
          hint="برای ساخت وظیفه از دکمهٔ «وظیفه جدید» در بالای صفحه استفاده کنید؛ می‌توانید آن را به افراد یا گروه‌ها محول کنید."
          action={(
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => onCreate('todo')}>
              وظیفه جدید
            </Button>
          )}
        />
      )}
    </Box>
  );
};

export default PlanningTasksView;
