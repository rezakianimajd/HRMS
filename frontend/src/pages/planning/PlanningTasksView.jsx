/**
 * نمای وظایف: فهرست سروری (جدول تم‌محور) + تختهٔ کانبان با کشیدن‌ورهاکردن.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Button, Chip, IconButton, Paper, Stack, ToggleButton, ToggleButtonGroup,
  Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import axiosInstance from '../../core/api/axiosConfig';
import { toPersianDigits } from '../../core/utils/numberUtils';
import { ModulePager, ModuleTable, ModuleToolbar, useRowHeight } from '../contracts/contractModuleUi';
import {
  AssigneeStack, DueChip, EmptyState, LoadingBlock, PriorityChip, StatusChip, TagChipList,
  TaskCard,
} from './planningUi';
import {
  TASK_PRIORITY_META, TASK_PRIORITY_ORDER, TASK_SORT_OPTIONS, TASK_STATUS_FILTERS,
  TASK_STATUS_META, TASK_STATUS_ORDER, timeLabel, toneColor,
} from './planningTheme';

export const TASKS_PAGE_SIZE = 20;
export const BOARD_COLUMN_SIZE = 12;
export const TASK_TABLE_VISIBLE_ROWS = 12;

const pickRows = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const statusParams = (filter) => {
  if (filter === 'overdue') return { due: 'overdue' };
  if (filter === 'today') return { due: 'today' };
  if (filter === 'all') return {};
  if (TASK_STATUS_ORDER.includes(filter)) return { status: filter };
  return { open: 1 };
};

const filterCount = (summary, filter) => {
  if (!summary) return null;
  if (filter === 'open') return summary.open_tasks;
  if (filter === 'overdue') return summary.overdue;
  if (filter === 'today') return summary.due_today;
  if (filter === 'all') return summary.tasks;
  if (filter === 'todo') return summary.todo;
  if (filter === 'doing') return summary.doing;
  if (filter === 'done') return summary.done_tasks;
  return null;
};

/* ------------------------------------------------------------ ستون تخته (کانبان) */
const BoardColumn = ({
  theme, status, scope, search, priority, dragging, onDragStart, onDrop, onEdit,
  onShare, onDelete, onToggle, onCreate, onSeeAll,
}) => {
  const meta = TASK_STATUS_META[status];
  const color = toneColor(theme, meta.tone);
  const [over, setOver] = useState(false);
  const params = useMemo(() => {
    const next = { status, page_size: BOARD_COLUMN_SIZE, ordering: 'default' };
    if (search.trim()) next.q = search.trim();
    if (scope !== 'all') next.scope = scope;
    if (priority) next.priority = priority;
    return next;
  }, [status, scope, search, priority]);

  const { data, isLoading } = useQuery({
    queryKey: ['planning', 'board', params],
    queryFn: () => axiosInstance.get('/planning/tasks/', { params }).then((response) => response.data),
    placeholderData: (previous) => previous,
    staleTime: 30000,
  });
  const rows = pickRows(data);
  const total = Number(data?.count ?? rows.length);

  return (
    <Paper
      elevation={0}
      onDragOver={(event) => { event.preventDefault(); if (!over) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => { event.preventDefault(); setOver(false); onDrop(status); }}
      sx={{
        p: 0.9, borderRadius: theme.radii.large,
        border: '1px solid',
        borderColor: over ? alpha(color, 0.55) : theme.cardBorderColor,
        bgcolor: over ? alpha(color, 0.05) : alpha(theme.tones.neutral, 0.025),
        display: 'flex', flexDirection: 'column', gap: 0.75, minHeight: 280,
        transition: 'border-color .15s ease, background-color .15s ease',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.6}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 11.5, fontWeight: 900, color: theme.tones.text, flex: 1 }} noWrap>
          {meta.label}
        </Typography>
        <Chip
          size="small"
          label={toPersianDigits(total)}
          sx={{ height: 19, fontSize: 10, fontWeight: 800, bgcolor: alpha(color, 0.1), color }}
        />
        <Tooltip title={`افزودن وظیفه در «${meta.label}»`}>
          <IconButton size="small" aria-label={`افزودن وظیفه ${meta.label}`} onClick={() => onCreate(status)}
            sx={{ p: 0.3, color: theme.tones.muted }}>
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {isLoading && !rows.length ? (
        <LoadingBlock height={90} />
      ) : rows.length ? (
        rows.map((task) => (
          <TaskCard
            key={task.id}
            theme={theme}
            task={task}
            dragging={dragging?.id === task.id}
            onDragStart={onDragStart}
            onEdit={onEdit}
            onShare={onShare}
            onDelete={onDelete}
            onToggle={onToggle}
          />
        ))
      ) : (
        <Typography sx={{ fontSize: 10.5, color: theme.tones.muted, textAlign: 'center', py: 3 }}>
          چیزی در این ستون نیست.
        </Typography>
      )}

      {total > rows.length ? (
        <Button size="small" variant="text" onClick={() => onSeeAll(status)} sx={{ fontSize: 10.5 }}>
          {`+${toPersianDigits(total - rows.length)} مورد دیگر`}
        </Button>
      ) : null}
    </Paper>
  );
};

/* ------------------------------------------------------------------ نمای وظایف */
const PlanningTasksView = ({
  theme, scope, search, apiSearch, onSearch, statusFilter, onStatusFilter, summary,
  onCreate, onEdit, onShare, onDelete, onToggle, onStatusChange,
}) => {
  const [view, setView] = useState('list');
  const [sort, setSort] = useState('default');
  const [priority, setPriority] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [dragging, setDragging] = useState(null);

  useEffect(() => { setPage(0); }, [apiSearch, scope, statusFilter, sort, priority]);

  const params = useMemo(() => {
    const next = {
      page: page + 1, page_size: TASKS_PAGE_SIZE, ordering: sort,
      ...statusParams(statusFilter),
    };
    if (apiSearch.trim()) next.q = apiSearch.trim();
    if (scope !== 'all') next.scope = scope;
    if (priority) next.priority = priority;
    return next;
  }, [page, apiSearch, scope, statusFilter, sort, priority]);

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

  const tableTheme = useMemo(() => ({
    ...theme.tableTheme,
    singleLine: true,
    visibleRows: TASK_TABLE_VISIBLE_ROWS,
    rowsPerPage: TASKS_PAGE_SIZE,
    tableHeight: Math.round(
      theme.tableTheme.headerHeight + theme.tableTheme.rowHeight * TASK_TABLE_VISIBLE_ROWS,
    ),
  }), [theme.tableTheme]);
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(tableTheme, rows.length);

  const resetFilters = () => { setPriority(''); onStatusFilter('open'); };
  const activeFilterCount = (priority ? 1 : 0) + (statusFilter !== 'open' ? 1 : 0);
  const activeChips = [
    priority ? {
      key: 'priority',
      label: `اولویت: ${TASK_PRIORITY_META[priority]?.label || priority}`,
      clear: () => setPriority(''),
    } : null,
    statusFilter !== 'open' ? {
      key: 'status',
      label: `وضعیت: ${TASK_STATUS_FILTERS.find((item) => item.value === statusFilter)?.label || statusFilter}`,
      clear: () => onStatusFilter('open'),
    } : null,
  ].filter(Boolean);

  const cellFont = tableTheme.cell.fontSize;

  const dragStart = (task, event) => {
    setDragging(task);
    try {
      event.dataTransfer.setData('text/plain', String(task.id));
      event.dataTransfer.effectAllowed = 'move';
    } catch (error) {
      /* برخی مرورگرها dataTransfer نمی‌دهند؛ وضعیت در state نگه داشته می‌شود */
    }
  };
  const dropTo = (status) => {
    const task = dragging;
    setDragging(null);
    if (!task || task.status === status) return;
    onStatusChange(task, status);
  };
  const seeAll = (status) => { onStatusFilter(status); setView('list'); };

  const columns = useMemo(() => ([
    {
      key: 'title', label: 'عنوان وظیفه', width: '34%', align: 'right',
      render: (row) => (
        <Stack direction="row" alignItems="flex-start" spacing={0.75} sx={{ minWidth: 0 }}>
          <IconButton
            size="small"
            aria-label={row.status === 'done' ? 'بازگرداندن وظیفه' : `انجام وظیفه ${row.title}`}
            onClick={(event) => { event.stopPropagation(); onToggle(row); }}
            sx={{ p: 0.4, mt: -0.3, color: row.status === 'done' ? theme.tones.success : theme.tones.muted }}
          >
            <TaskAltOutlinedIcon sx={{ fontSize: 18, opacity: row.status === 'done' ? 1 : 0.45 }} />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{
              fontSize: cellFont, fontWeight: 800, color: theme.tones.text,
              textDecoration: row.status === 'done' ? 'line-through' : 'none',
            }}>
              {row.title}
            </Typography>
            <Stack direction="row" spacing={0.4} useFlexGap flexWrap="wrap" sx={{ mt: 0.35 }}>
              {row.tags?.length ? <TagChipList theme={theme} tags={row.tags} max={2} height={18} /> : null}
              {row.checklist?.length ? (
                <Chip
                  size="small"
                  label={`چک‌لیست ${toPersianDigits(row.checklist.filter((item) => item.done).length)}/${toPersianDigits(row.checklist.length)}`}
                  sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }}
                />
              ) : null}
            </Stack>
          </Box>
        </Stack>
      ),
    },
    {
      key: 'priority', label: 'اولویت', width: '9%', align: 'center',
      render: (row) => <PriorityChip theme={theme} priority={row.priority} />,
    },
    {
      key: 'status', label: 'وضعیت', width: '10%', align: 'center',
      render: (row) => <StatusChip theme={theme} status={row.status} />,
    },
    {
      key: 'due', label: 'سررسید', width: '13%', align: 'center',
      render: (row) => (row.due_date ? (
        <Stack alignItems="center" spacing={0.2}>
          <DueChip theme={theme} dueDate={row.due_date} height={20} />
          {row.due_time ? (
            <Typography sx={{ fontSize: 9.5, color: theme.tones.muted }}>
              ساعت {timeLabel(row.due_time)}
            </Typography>
          ) : null}
        </Stack>
      ) : <Typography sx={{ fontSize: 10, color: theme.tones.muted }}>—</Typography>),
    },
    {
      key: 'people', label: 'مسئولان', width: '17%', align: 'center',
      render: (row) => (
        <Stack spacing={0.3} alignItems="center">
          <AssigneeStack theme={theme} people={row.assignees || []} size={20} max={3} />
          {(row.assignee_groups || []).length ? (
            <Stack direction="row" spacing={0.3} useFlexGap flexWrap="wrap" justifyContent="center">
              {(row.assignee_groups || []).slice(0, 2).map((group) => (
                <Chip
                  key={`group-${group.id}`}
                  size="small"
                  icon={<GroupOutlinedIcon sx={{ fontSize: 11 }} />}
                  label={group.name}
                  sx={{
                    height: 18, fontSize: 9.5, fontWeight: 700,
                    bgcolor: alpha(group.color || theme.accent, 0.1),
                    color: group.color || theme.accent,
                  }}
                />
              ))}
            </Stack>
          ) : null}
          {row.is_private ? (
            <Typography sx={{ fontSize: 9.5, color: theme.tones.muted }}>فقط من</Typography>
          ) : null}
        </Stack>
      ),
    },
    {
      key: 'owner', label: 'مالک / اشتراک', width: '8%', align: 'center',
      render: (row) => (
        <Stack alignItems="center" spacing={0.25}>
          <Typography noWrap sx={{ fontSize: 10, color: theme.tones.muted, maxWidth: '100%' }}>
            {row.is_mine ? 'من' : (row.owner_name || '—')}
          </Typography>
          {row.is_shared ? <Chip size="small" label="اشتراکی" sx={{ height: 17, fontSize: 9 }} /> : null}
        </Stack>
      ),
    },
    {
      key: 'actions', label: 'عملیات', width: '9%', align: 'center',
      render: (row) => (
        <Stack direction="row" spacing={0} justifyContent="center"
          onClick={(event) => event.stopPropagation()}>
          <Tooltip title="ویرایش">
            <IconButton size="small" aria-label="ویرایش وظیفه" onClick={() => onEdit(row)} sx={{ p: 0.35 }}>
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="اشتراک‌گذاری">
            <IconButton size="small" aria-label="اشتراک‌گذاری وظیفه" onClick={() => onShare(row)}
              sx={{ p: 0.35 }}>
              <ShareOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          {row.is_mine ? (
            <Tooltip title="حذف">
              <IconButton size="small" aria-label="حذف وظیفه" onClick={() => onDelete(row)}
                sx={{ p: 0.35, color: theme.tones.danger }}>
                <DeleteOutlineIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          ) : null}
        </Stack>
      ),
    },
  ]), [cellFont, onDelete, onEdit, onShare, onToggle, theme]);

  return (
    <Box>
      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
        {TASK_STATUS_FILTERS.map((item) => {
          const active = statusFilter === item.value;
          const count = filterCount(summary, item.value);
          return (
            <Chip
              key={item.value}
              clickable
              onClick={() => onStatusFilter(item.value)}
              label={count === null || count === undefined
                ? item.label
                : `${item.label} · ${toPersianDigits(count)}`}
              sx={{
                height: 27, fontSize: 11, fontWeight: 800,
                bgcolor: active ? alpha(theme.accent, 0.14) : 'background.paper',
                color: active ? theme.accent : theme.tones.muted,
                border: '1px solid',
                borderColor: active ? alpha(theme.accent, 0.45) : theme.cardBorderColor,
                '&:hover': { bgcolor: alpha(theme.accent, 0.08) },
              }}
            />
          );
        })}
      </Stack>

      <ModuleToolbar
        theme={theme}
        search={search}
        onSearch={onSearch}
        searchPlaceholder="جستجو در عنوان وظیفه، توضیح و برچسب…"
        sort={sort}
        sortOptions={TASK_SORT_OPTIONS}
        onSort={setSort}
        activeChips={activeChips}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={view}
          onChange={(_event, next) => { if (next) setView(next); }}
          sx={{
            height: `${theme.toolbar.searchHeight}px`,
            '& .MuiToggleButton-root': { px: 1.1, fontSize: 11, fontWeight: 800 },
          }}
          aria-label="حالت نمایش وظایف"
        >
          <ToggleButton value="list" aria-label="نمای فهرست">
            <ViewListOutlinedIcon sx={{ fontSize: 17, marginInlineEnd: 0.5 }} />
            فهرست
          </ToggleButton>
          <ToggleButton value="board" aria-label="نمای تخته">
            <ViewKanbanOutlinedIcon sx={{ fontSize: 17, marginInlineEnd: 0.5 }} />
            تخته
          </ToggleButton>
        </ToggleButtonGroup>
        <Button
          size="small"
          variant="contained"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => onCreate('todo')}
          sx={{ height: `${theme.toolbar.searchHeight}px !important`, minWidth: 'auto', px: 2 }}
        >
          افزودن وظیفه
        </Button>
      </ModuleToolbar>

      {filtersOpen ? (
        <Paper elevation={0} sx={{
          p: 1.25, mb: 1.5, borderRadius: theme.radii.large,
          border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper',
        }}>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" alignItems="center">
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: theme.tones.muted }}>
              اولویت:
            </Typography>
            <Chip
              clickable
              label="همه"
              onClick={() => setPriority('')}
              sx={{
                height: 26, fontSize: 10.5, fontWeight: 800,
                bgcolor: !priority ? alpha(theme.accent, 0.12) : 'transparent',
                color: !priority ? theme.accent : theme.tones.muted,
                border: '1px solid',
                borderColor: !priority ? alpha(theme.accent, 0.4) : theme.cardBorderColor,
              }}
            />
            {TASK_PRIORITY_ORDER.map((key) => {
              const meta = TASK_PRIORITY_META[key];
              const color = toneColor(theme, meta.tone);
              const active = priority === key;
              return (
                <Chip
                  key={key}
                  clickable
                  label={meta.label}
                  onClick={() => setPriority(active ? '' : key)}
                  sx={{
                    height: 26, fontSize: 10.5, fontWeight: 800,
                    bgcolor: active ? alpha(color, 0.14) : 'transparent',
                    color: active ? color : theme.tones.muted,
                    border: '1px solid',
                    borderColor: active ? alpha(color, 0.4) : theme.cardBorderColor,
                  }}
                />
              );
            })}
            <Box sx={{ flex: 1 }} />
            <Button size="small" variant="text" onClick={resetFilters} disabled={!activeFilterCount}>
              پاک‌کردن فیلترها
            </Button>
          </Stack>
        </Paper>
      ) : null}

      {view === 'board' ? (
        <Box sx={{
          display: 'grid', gap: 1.25,
          gridTemplateColumns: {
            xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))',
          },
        }}>
          {TASK_STATUS_ORDER.map((status) => (
            <BoardColumn
              key={status}
              theme={theme}
              status={status}
              scope={scope}
              search={apiSearch}
              priority={priority}
              dragging={dragging}
              onDragStart={dragStart}
              onDrop={dropTo}
              onEdit={onEdit}
              onShare={onShare}
              onDelete={onDelete}
              onToggle={onToggle}
              onCreate={onCreate}
              onSeeAll={seeAll}
            />
          ))}
        </Box>
      ) : isLoading && !rows.length ? (
        <LoadingBlock />
      ) : rows.length ? (
        <Paper elevation={0} sx={{
          borderRadius: theme.radii.large, border: '1px solid',
          borderColor: 'divider', bgcolor: 'background.paper', overflow: 'hidden',
        }}>
          <ModuleTable
            tableTheme={tableTheme}
            ariaLabel="فهرست وظایف"
            containerRef={tableRef}
            tableHeight={tableHeight}
            rowHeight={rowHeight}
            dimmed={isFetching}
            rows={rows}
            rowKey={(row) => row.id}
            onRowClick={onEdit}
            emptyText="وظیفه‌ای با این شرایط یافت نشد."
            minWidth={1060}
            columns={columns}
          />
          <ModulePager
            tableTheme={tableTheme}
            page={page}
            onPage={setPage}
            totalPages={totalPages}
            pageNumbers={pageNumbers}
            total={total}
            pageSize={TASKS_PAGE_SIZE}
            unit="وظیفه"
          />
        </Paper>
      ) : (
        <EmptyState
          theme={theme}
          icon={TaskAltOutlinedIcon}
          title="وظیفه‌ای با این شرایط پیدا نشد"
          hint="از دکمهٔ «افزودن وظیفه» یا ستون‌های تخته استفاده کنید؛ می‌توانید وظیفه را به همکاران یا گروه‌ها محول کنید."
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
