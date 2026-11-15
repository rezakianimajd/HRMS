/**
 * گزارش رویدادهای منابع انسانی.
 *
 * تولد پرسنل و افراد تحت تکفل، سالگرد استخدام و پایان قرارداد در یک فهرست
 * قابل فیلتر (شخصیت اصلی، نسبت، واحد، ماه، بازهٔ آینده) با چاپ استاندارد
 * استودیو تم و خروجی اکسل.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Grid, Paper, Stack, Tooltip, Typography, alpha,
} from '@mui/material';
import CakeIcon from '@mui/icons-material/Cake';
import DownloadIcon from '@mui/icons-material/Download';
import EventIcon from '@mui/icons-material/Event';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import RefreshIcon from '@mui/icons-material/Refresh';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';

import axiosInstance from '../core/api/axiosConfig';
import PageHeader from '../core/components/ui/PageHeader';
import PrintButton from '../core/print/PrintButton';
import downloadFile from '../core/utils/downloadUtils';
import { FAMILY_RELATIONS } from '../core/utils/familyMembers';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { KpiTile, INK, MUTED } from './accounting/AccountingDashboardUI';
import {
  ModulePager, ModuleTable, ModuleToolbar, useModuleTableState, useModuleTheme, useRowHeight,
} from './contracts/contractModuleUi';

const ACCENT = '#0ea5e9';
const ROSE = '#be185d';
const AMBER = '#b45309';
const TEAL = '#0f766e';
const VIOLET = '#7c3aed';

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const EVENT_TYPE_OPTIONS = [
  { value: 'all', label: 'همهٔ رویدادها' },
  { value: 'birthdays', label: 'همهٔ تولدها (پرسنل و تحت تکفل)' },
  { value: 'employee_birthday', label: 'تولد پرسنل' },
  { value: 'dependent_birthday', label: 'تولد تحت تکفل' },
  { value: 'contract_end', label: 'پایان قرارداد' },
  { value: 'hire_anniversary', label: 'سالگرد استخدام' },
];

const KIND_PARAMS = {
  all: 'employee_birthday,dependent_birthday,contract_end,hire_anniversary',
  birthdays: 'employee_birthday,dependent_birthday',
  employee_birthday: 'employee_birthday',
  dependent_birthday: 'dependent_birthday',
  contract_end: 'contract_end',
  hire_anniversary: 'hire_anniversary',
};

const SORT_OPTIONS = [
  { value: 'date', label: 'نزدیک‌ترین رویداد' },
  { value: 'name', label: 'نام شخص' },
  { value: 'employee', label: 'نام پرسنل' },
  { value: 'kind', label: 'نوع رویداد' },
];

const CellText = ({ children, title, strong, color, mono }) => (
  <Typography
    noWrap
    title={title || (typeof children === 'string' ? children : undefined)}
    sx={{
      color,
      fontSize: 'inherit',
      lineHeight: 1.6,
      fontWeight: strong ? 800 : 600,
      fontVariantNumeric: mono ? 'tabular-nums' : undefined,
    }}
  >
    {children}
  </Typography>
);

const daysMeta = (days) => {
  if (days === null || days === undefined) return { label: '—', color: MUTED, bg: 'transparent' };
  if (days < 0) return { label: `${toPersianDigits(Math.abs(days))} روز گذشته`, color: '#be123c', bg: alpha('#be123c', 0.07) };
  if (days === 0) return { label: 'امروز', color: '#be123c', bg: alpha('#be123c', 0.1) };
  if (days <= 7) return { label: `${toPersianDigits(days)} روز`, color: AMBER, bg: alpha(AMBER, 0.08) };
  if (days <= 30) return { label: `${toPersianDigits(days)} روز`, color: TEAL, bg: alpha(TEAL, 0.08) };
  return { label: `${toPersianDigits(days)} روز`, color: MUTED, bg: alpha(MUTED, 0.06) };
};
const EventsReportPage = () => {
  const moduleTheme = useModuleTheme();
  const pageSize = moduleTheme.tableTheme.rowsPerPage;

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [eventType, setEventType] = useState('all');
  const [scope, setScope] = useState('all');
  const [relation, setRelation] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [withinDays, setWithinDays] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const employeesQuery = useQuery({
    queryKey: ['events-report-employees'],
    queryFn: () => axiosInstance.get('/employees/', { params: { page_size: 1000 } })
      .then((response) => response.data),
    staleTime: 120 * 1000,
  });
  const employeeList = Array.isArray(employeesQuery.data)
    ? employeesQuery.data
    : employeesQuery.data?.results || [];

  const params = useMemo(() => ({
    kinds: KIND_PARAMS[eventType] || KIND_PARAMS.all,
    scope,
    relation,
    employee: employeeFilter,
    department: departmentFilter,
    month: monthFilter,
    within_days: withinDays,
    q: debouncedSearch,
  }), [eventType, scope, relation, employeeFilter, departmentFilter, monthFilter, withinDays, debouncedSearch]);

  const eventsQuery = useQuery({
    queryKey: ['hr-events-report', params],
    queryFn: () => axiosInstance.get('/reports/events/', { params })
      .then((response) => response.data),
    placeholderData: (previous) => previous,
    staleTime: 30 * 1000,
  });

  const rows = useMemo(() => {
    const list = Array.isArray(eventsQuery.data?.results) ? eventsQuery.data.results : [];
    const sorted = [...list];
    if (sortBy === 'name') {
      sorted.sort((a, b) => String(a.person_name || '').localeCompare(String(b.person_name || ''), 'fa'));
    } else if (sortBy === 'employee') {
      sorted.sort((a, b) => String(a.employee_name || '').localeCompare(String(b.employee_name || ''), 'fa'));
    } else if (sortBy === 'kind') {
      sorted.sort((a, b) => String(a.kind_label || '').localeCompare(String(b.kind_label || ''), 'fa')
        || String(a.event_date || '').localeCompare(String(b.event_date || '')));
    }
    return sorted;
  }, [eventsQuery.data, sortBy]);

  const summary = eventsQuery.data?.summary || {};
  const departmentOptions = useMemo(() => {
    const names = [...new Set(employeeList.map((item) => item.department_name).filter(Boolean))];
    names.sort((a, b) => a.localeCompare(b, 'fa'));
    return [{ value: '', label: 'همهٔ واحدها' }, ...names.map((name) => ({ value: name, label: name }))];
  }, [employeeList]);

  const employeeOptions = useMemo(() => {
    const list = [...employeeList]
      .sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || ''), 'fa'));
    return [{
      value: '',
      label: 'همهٔ پرسنل',
    }, ...list.map((item) => ({
      value: String(item.id),
      label: `${item.full_name || '—'}${item.employee_id ? ` (${toPersianDigits(item.employee_id)})` : ''}`,
    }))];
  }, [employeeList]);

  const relationOptions = useMemo(() => ([
    { value: '', label: 'همهٔ نسبت‌ها' },
    { value: 'employee', label: 'پرسنل' },
    ...FAMILY_RELATIONS.map((item) => ({ value: item.value, label: item.label })),
  ]), []);

  const monthOptions = useMemo(() => ([
    { value: '', label: 'همهٔ ماه‌ها' },
    ...JALALI_MONTHS.map((label, index) => ({ value: String(index + 1), label })),
  ]), []);

  const withinOptions = [
    { value: '', label: 'همهٔ زمان‌ها' },
    { value: '7', label: '۷ روز آینده' },
    { value: '30', label: '۳۰ روز آینده' },
    { value: '90', label: '۹۰ روز آینده' },
    { value: '365', label: 'یک سال آینده' },
  ];

  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    rows.length, pageSize,
    [params, sortBy, pageSize],
  );
  const pagedRows = useMemo(
    () => rows.slice(page * pageSize, (page + 1) * pageSize),
    [rows, page, pageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, pagedRows.length);


  const activeChips = useMemo(() => {
    const chips = [];
    if (eventType !== 'all') {
      chips.push({
        key: 'kind',
        label: `رویداد: ${EVENT_TYPE_OPTIONS.find((item) => item.value === eventType)?.label || eventType}`,
        clear: () => setEventType('all'),
      });
    }
    if (scope !== 'all') {
      chips.push({
        key: 'scope',
        label: scope === 'employees' ? 'فقط پرسنل' : 'فقط تحت تکفل',
        clear: () => setScope('all'),
      });
    }
    if (relation) {
      chips.push({
        key: 'relation',
        label: `نسبت: ${relationOptions.find((item) => item.value === relation)?.label || relation}`,
        clear: () => setRelation(''),
      });
    }
    if (employeeFilter) {
      chips.push({
        key: 'employee',
        label: `پرسنل: ${employeeOptions.find((item) => item.value === employeeFilter)?.label || employeeFilter}`,
        clear: () => setEmployeeFilter(''),
      });
    }
    if (departmentFilter) {
      chips.push({ key: 'department', label: `واحد: ${departmentFilter}`, clear: () => setDepartmentFilter('') });
    }
    if (monthFilter) {
      chips.push({
        key: 'month',
        label: `ماه: ${JALALI_MONTHS[Number(monthFilter) - 1]}`,
        clear: () => setMonthFilter(''),
      });
    }
    if (withinDays) {
      chips.push({
        key: 'within',
        label: withinOptions.find((item) => item.value === withinDays)?.label || withinDays,
        clear: () => setWithinDays(''),
      });
    }
    return chips;
  }, [eventType, scope, relation, employeeFilter, departmentFilter, monthFilter, withinDays, relationOptions, employeeOptions]);

  const resetFilters = () => {
    setSearch('');
    setEventType('all');
    setScope('all');
    setRelation('');
    setEmployeeFilter('');
    setDepartmentFilter('');
    setMonthFilter('');
    setWithinDays('');
    setSortBy('date');
  };

  const exportExcel = async () => {
    setExporting(true);
    setError('');
    try {
      await downloadFile('/reports/events/', {
        params: { ...params, export: 'xlsx' },
        fallbackName: 'hr-events.xlsx',
      });
    } catch (exportError) {
      setError(exportError?.message || 'تهیهٔ فایل اکسل انجام نشد.');
    } finally {
      setExporting(false);
    }
  };


  const columns = [
    {
      key: 'row', label: 'ردیف', width: '4%', align: 'center',
      render: (_row, index) => (
        <CellText mono color={MUTED}>{toPersianDigits(page * pageSize + index + 1)}</CellText>
      ),
    },
    {
      key: 'kind', label: 'رویداد', width: '14%',
      render: (row) => (
        <Stack direction="row" alignItems="center" spacing={0.6} sx={{ minWidth: 0 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: row.kind_color || ACCENT, flexShrink: 0 }} />
          <CellText strong title={row.kind_label}>{row.kind_label || '—'}</CellText>
        </Stack>
      ),
    },
    {
      key: 'date', label: 'تاریخ رویداد', width: '11%', align: 'center',
      render: (row) => (
        <CellText mono strong>{row.event_jalali || '—'}</CellText>
      ),
    },
    {
      key: 'days', label: 'مانده', width: '10%', align: 'center',
      render: (row) => {
        const meta = daysMeta(row.days_until);
        return (
          <Chip size="small" label={meta.label}
            sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: meta.bg, color: meta.color }} />
        );
      },
    },
    {
      key: 'person', label: 'شخص', width: '17%',
      render: (row) => (
        <Stack spacing={0} sx={{ minWidth: 0 }}>
          <CellText strong title={row.person_name}>{row.person_name || '—'}</CellText>
          <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>
            {[row.person_type_label, row.is_dependent === false && row.person_type === 'dependent' ? 'بدون تکفل' : '']
              .filter(Boolean).join(' · ') || '—'}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'relation', label: 'نسبت', width: '9%', align: 'center',
      render: (row) => <CellText>{row.relation_label || '—'}</CellText>,
    },
    {
      key: 'employee', label: 'پرسنل اصلی', width: '16%',
      render: (row) => (
        <Stack spacing={0} sx={{ minWidth: 0 }}>
          <CellText strong title={row.employee_name}>{row.employee_name || '—'}</CellText>
          <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>
            {row.employee_code ? `کد ${toPersianDigits(row.employee_code)}` : '—'}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'department', label: 'واحد', width: '12%',
      render: (row) => <CellText title={row.department}>{row.department || '—'}</CellText>,
    },
    {
      key: 'position', label: 'عنوان شغلی', width: '12%',
      render: (row) => <CellText title={row.position}>{row.position || '—'}</CellText>,
    },
    {
      key: 'mobile', label: 'همراه', width: '9%', align: 'center',
      render: (row) => <CellText mono>{row.mobile ? toPersianDigits(row.mobile) : '—'}</CellText>,
    },
  ];


  return (
    <Box sx={{ pb: 1 }} data-testid="events-report">
      <PageHeader
        icon={<EventIcon />}
        color={ACCENT}
        title="گزارش رویدادها"
        subtitle="تولد پرسنل و افراد تحت تکفل، سالگرد استخدام و پایان قرارداد در یک نگاه"
        badge={(
          <Chip
            size="small"
            label={`${formatPersianNumber(summary.total || 0)} رویداد · ${formatPersianNumber(summary.employees || 0)} پرسنل`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }}
          />
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button variant="outlined" disabled={eventsQuery.isFetching}
                  onClick={() => eventsQuery.refetch()} sx={{ minWidth: 40, px: 1 }}>
                  <RefreshIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="چاپ گزارش">
              <span>
                <PrintButton
                  label=""
                  icon
                  title="گزارش رویدادها"
                  orientation="landscape"
                  sx={{ minWidth: 40, px: 1 }}
                />
              </span>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={exporting ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <DownloadIcon />}
              onClick={exportExcel}
              disabled={exporting || eventsQuery.isLoading}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#0284c7' } }}
            >
              {exporting ? 'در حال تهیه…' : 'خروجی اکسل'}
            </Button>
          </>
        )}
      />

      <Grid container spacing={1.5} sx={{ mb: 1.75 }}>
        <Grid item xs={6} sm={4} md={2}>
          <KpiTile icon={PeopleAltIcon} label="کل رویدادها" value={formatPersianNumber(summary.total || 0)} suffix="مورد" color={ACCENT} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiTile icon={FamilyRestroomIcon} label="تحت تکفل" value={formatPersianNumber(summary.dependents || 0)} suffix="رویداد" color={ROSE} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiTile icon={CakeIcon} label="تولدهای این ماه" value={formatPersianNumber(summary.birthdays_this_month || 0)} suffix="نفر" color={VIOLET} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiTile icon={EventIcon} label="رویداد ۳۰ روز آینده" value={formatPersianNumber(summary.upcoming_30 || 0)} suffix="مورد" color={TEAL} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiTile icon={EventBusyIcon} label="پایان قرارداد (۹۰ روز)" value={formatPersianNumber(summary.contract_end_90 || 0)} suffix="قرارداد" color={AMBER} />
        </Grid>
      </Grid>

      {error ? (
        <Alert severity="error" sx={{ mb: 1.25, borderRadius: '12px' }} onClose={() => setError('')}>
          {error}
        </Alert>
      ) : null}

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جست‌وجو در نام شخص، پرسنل اصلی، کد پرسنلی، واحد یا نسبت…"
        sort={sortBy}
        sortOptions={SORT_OPTIONS}
        onSort={setSortBy}
        filters={[
          { label: 'نوع رویداد', value: eventType, options: EVENT_TYPE_OPTIONS, onChange: setEventType },
          { label: 'شخص', value: scope, options: [
            { value: 'all', label: 'همه' },
            { value: 'employees', label: 'فقط پرسنل' },
            { value: 'dependents', label: 'فقط تحت تکفل' },
          ], onChange: setScope },
          { label: 'نسبت', value: relation, options: relationOptions, onChange: setRelation },
          { label: 'پرسنل اصلی', value: employeeFilter, options: employeeOptions, onChange: setEmployeeFilter },
          { label: 'واحد سازمانی', value: departmentFilter, options: departmentOptions, onChange: setDepartmentFilter },
          { label: 'ماه تولد / رویداد', value: monthFilter, options: monthOptions, onChange: setMonthFilter },
          { label: 'بازه', value: withinDays, options: withinOptions, onChange: setWithinDays },
        ]}
        activeChips={activeChips}
        activeFilterCount={activeChips.length}
        onReset={resetFilters}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      />

      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        overflow: 'hidden',
        px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
        border: '1px solid', borderColor: moduleTheme.cardBorderColor,
        bgcolor: 'background.paper', boxShadow: 'none',
      }}>
        {eventsQuery.isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={26} sx={{ color: ACCENT }} />
            <Typography sx={{ mt: 1, fontSize: 12, color: MUTED }}>در حال تهیهٔ گزارش رویدادها…</Typography>
          </Box>
        ) : (
          <ModuleTable
            tableTheme={moduleTheme.tableTheme}
            ariaLabel="گزارش رویدادهای پرسنل و تحت تکفل"
            containerRef={tableRef}
            tableHeight={tableHeight}
            rowHeight={rowHeight}
            dimmed={eventsQuery.isFetching}
            rows={pagedRows}
            rowKey={(row) => `${row.kind}-${row.person_id}-${row.event_date}`}
            emptyText="رویدادی با این فیلترها پیدا نشد."
            minWidth={1280}
            tableLayout="auto"
            columns={columns}
          />
        )}
        <ModulePager
          tableTheme={moduleTheme.tableTheme}
          page={page}
          onPage={setPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          total={rows.length}
          pageSize={pageSize}
          unit="رویداد"
        />
      </Paper>
    </Box>
  );
};

export default EventsReportPage;

