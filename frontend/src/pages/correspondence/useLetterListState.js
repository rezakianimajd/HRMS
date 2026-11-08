/**
 * وضعیت و کوئری فهرست نامه‌های مکاتبات (فیلترها، جست‌وجوی دی‌بانس‌شده، صفحه‌بندی،
 * مرتب‌سازی و پارامترهای سرور). از صفحه جدا شد تا صفحه فقط UI باشد.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

import axiosInstance from '../../core/api/axiosConfig';
import { LETTERS_KEY } from './correspondenceQueryKeys';
import { asList } from './correspondenceLetterForm';

export const SORT_ORDERS = {
  newest: '-effective_date',
  oldest: 'effective_date',
  due: 'due_date',
  number: 'number',
};

export const useLetterListState = ({ preset, pageSize, onNewRequested }) => {
  const [searchParams] = useSearchParams();
  const [direction, setDirection] = useState(preset.direction || 'all');
  const [statusFilter, setStatusFilter] = useState(preset.status || 'all');
  const [scope, setScope] = useState(preset.scope || 'all');
  const [overdueOnly, setOverdueOnly] = useState(Boolean(preset.overdue));
  const [archivedOnly, setArchivedOnly] = useState(Boolean(preset.archived));
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [entryMethodFilter, setEntryMethodFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [attachmentFilter, setAttachmentFilter] = useState(() => {
    const value = searchParams.get('has_attachments');
    if (value === '0') return 'without';
    if (value === '1') return 'with';
    return 'all';
  });
  const [sortBy, setSortBy] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  /* پرش از داشبورد با ?new=1 */
  useEffect(() => {
    if (searchParams.get('new') === '1') onNewRequested?.();
    // eslint-disable-next-line
  }, [searchParams]);

  /* پارامترهای ورودی از داشبورد/میان‌بُرها (جست‌وجو و وضعیت پیوست) */
  const incomingQuery = searchParams.get('q');
  const incomingAttachments = searchParams.get('has_attachments');
  useEffect(() => {
    if (incomingQuery !== null) setSearch(incomingQuery);
    setAttachmentFilter(
      incomingAttachments === '0' ? 'without' : incomingAttachments === '1' ? 'with' : 'all',
    );
  }, [incomingQuery, incomingAttachments]);

  /* جست‌وجوی دی‌بانس‌شده */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  /* با تغییر هر فیلتر به صفحهٔ اول برگرد */
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, direction, statusFilter, scope, overdueOnly, archivedOnly,
    categoryFilter, priorityFilter, entryMethodFilter, sortBy, pageSize]);

  const listParams = useMemo(() => {
    const params = { page: page + 1, page_size: pageSize, ordering: SORT_ORDERS[sortBy] || SORT_ORDERS.newest };
    if (direction !== 'all') params.direction = direction;
    if (statusFilter !== 'all') params.status = statusFilter;
    if (scope !== 'all') params.scope = scope;
    if (overdueOnly) params.overdue = '1';
    if (archivedOnly) params.archived = '1';
    if (categoryFilter !== 'all') params.category = categoryFilter;
    if (priorityFilter !== 'all') params.priority = priorityFilter;
    if (entryMethodFilter !== 'all') params.entry_method = entryMethodFilter;
    if (attachmentFilter !== 'all') params.has_attachments = attachmentFilter === 'with' ? '1' : '0';
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [page, pageSize, sortBy, direction, statusFilter, scope, overdueOnly, archivedOnly,
    categoryFilter, priorityFilter, entryMethodFilter, attachmentFilter, debouncedSearch]);

  const { data: rawLetters, isLoading, isFetching, refetch } = useQuery({
    queryKey: [...LETTERS_KEY, listParams],
    queryFn: () => axiosInstance.get('/letters/', { params: listParams })
      .then((response) => response.data),
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
  });

  const letters = useMemo(() => asList(rawLetters), [rawLetters]);
  const total = useMemo(
    () => (typeof rawLetters?.count === 'number' ? rawLetters.count : letters.length),
    [rawLetters, letters.length],
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const pageNumbers = useMemo(() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, totalPages - size));
    const end = Math.min(totalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_unused, index) => start + index);
  }, [page, totalPages]);

  return {
    archivedOnly, setArchivedOnly,
    attachmentFilter, setAttachmentFilter,
    categoryFilter, setCategoryFilter,
    debouncedSearch,
    direction, setDirection,
    entryMethodFilter, setEntryMethodFilter,
    filtersOpen, setFiltersOpen,
    isFetching, isLoading,
    letters,
    listParams,
    page, setPage,
    pageNumbers,
    priorityFilter, setPriorityFilter,
    overdueOnly, setOverdueOnly,
    refetch,
    scope, setScope,
    search, setSearch,
    sortBy, setSortBy,
    statusFilter, setStatusFilter,
    total,
    totalPages,
  };
};

export default useLetterListState;
