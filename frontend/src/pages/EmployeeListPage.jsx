import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Alert, Box, Button, Chip, CircularProgress, IconButton, Paper, Tooltip, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import {
  useEmployees, useDeleteEmployee, useDepartments, useJobTitles,
  useWorkLocations, useInsuranceLists,
} from '../core/hooks/useEmployees';
import StatusBadge from '../core/components/ui/StatusBadge';
import EmployeeAvatar from '../core/components/ui/EmployeeAvatar';
import PageHeader from '../core/components/ui/PageHeader';
import downloadFile from '../core/utils/downloadUtils';
import { toPersianDigits } from '../core/utils/numberUtils';
import {
  ModulePager, ModuleTable, ModuleToolbar, useModuleTheme, useRowHeight,
} from './contracts/contractModuleUi';

/** ترتیب پیش‌فرض همان ترتیب فعلی API است (جدیدترین پرونده‌ها). */
const DEFAULT_SORT = '-created_at';

const SORT_OPTIONS = [
  { value: DEFAULT_SORT, label: 'جدیدترین (پیش‌فرض)' },
  { value: 'last_name,first_name', label: 'نام خانوادگی (الف تا ی)' },
  { value: '-last_name,-first_name', label: 'نام خانوادگی (ی تا الف)' },
  { value: 'first_name,last_name', label: 'نام (الف تا ی)' },
  { value: 'employee_id', label: 'کد پرسنلی (صعودی)' },
  { value: '-employee_id', label: 'کد پرسنلی (نزولی)' },
  { value: 'department__name', label: 'دپارتمان' },
  { value: 'job_title__name', label: 'عنوان شغلی' },
  { value: 'work_location__name', label: 'محل استقرار' },
  { value: '-hire_date', label: 'تاریخ استخدام (جدیدترین)' },
  { value: 'hire_date', label: 'تاریخ استخدام (قدیمی‌ترین)' },
  { value: 'status', label: 'وضعیت' },
];

const EMPTY_FILTERS = {
  department: '', job_title: '', work_location: '', insurance_list: '', status: '', gender: '',
};

const asRows = (value) => (Array.isArray(value) ? value : value?.results || []);

const toOptions = (rows) => asRows(rows).map((row) => ({ value: String(row.id), label: row.name }));

const EmployeeListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const moduleTheme = useModuleTheme();
  const accent = moduleTheme.theme?.palette?.primary?.main || '#6366f1';

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // هر تغییر جست‌وجو/فیلتر/ترتیب، صفحه را به اول برمی‌گرداند.
  React.useEffect(() => { setPage(0); }, [
    debouncedSearch, sort,
    filters.department, filters.job_title, filters.work_location,
    filters.insurance_list, filters.status, filters.gender,
  ]);

  const pageSize = moduleTheme.tableTheme.rowsPerPage;

  const queryParams = {
    page: page + 1,
    page_size: pageSize,
    ordering: sort,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filters.department ? { department: filters.department } : {}),
    ...(filters.job_title ? { job_title: filters.job_title } : {}),
    ...(filters.work_location ? { work_location: filters.work_location } : {}),
    ...(filters.insurance_list ? { insurance_list: filters.insurance_list } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.gender ? { gender: filters.gender } : {}),
  };

  const { data, isLoading, isFetching } = useEmployees(queryParams);
  const { data: departments } = useDepartments();
  const { data: jobTitles } = useJobTitles();
  const { data: workLocations } = useWorkLocations();
  const { data: insuranceLists } = useInsuranceLists();
  const deleteMutation = useDeleteEmployee();

  const employees = asRows(data);
  const totalCount = data?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageNumbers = useMemo(() => {
    const size = 5;
    const start = Math.max(0, Math.min(page - 2, totalPages - size));
    const end = Math.min(totalPages, start + size);
    return Array.from({ length: Math.max(0, end - start) }, (_unused, index) => start + index);
  }, [page, totalPages]);

  React.useEffect(() => {
    if (page > totalPages - 1) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    moduleTheme.tableTheme, employees.length,
  );


  const filterOptions = useMemo(() => ({
    department: toOptions(departments),
    job_title: toOptions(jobTitles),
    work_location: toOptions(workLocations),
    insurance_list: toOptions(insuranceLists),
    status: [
      { value: 'active', label: t('employees.active') },
      { value: 'leave', label: t('employees.on_leave') },
      { value: 'retired', label: t('employees.retired') },
      { value: 'terminated', label: t('employees.terminated') },
    ],
    gender: [
      { value: 'male', label: t('employees.male') },
      { value: 'female', label: t('employees.female') },
    ],
  }), [departments, jobTitles, workLocations, insuranceLists, t]);

  const filterLabels = {
    department: t('employees.department'),
    job_title: t('employees.job_title'),
    work_location: t('employees.work_location'),
    insurance_list: t('employees.insurance_list'),
    status: t('employees.status'),
    gender: t('employees.gender'),
  };

  const handleFilterChange = (field, value) => {
    setFilters((previous) => ({ ...previous, [field]: value }));
  };

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSearch('');
    setSort(DEFAULT_SORT);
  };

  const activeChips = Object.keys(EMPTY_FILTERS)
    .filter((field) => filters[field])
    .map((field) => {
      const option = (filterOptions[field] || [])
        .find((item) => String(item.value) === String(filters[field]));
      return {
        key: field,
        label: `${filterLabels[field]}: ${option?.label ?? filters[field]}`,
        clear: () => handleFilterChange(field, ''),
      };
    });
  const activeFilterCount = activeChips.length;

  const handleDelete = (id) => {
    if (window.confirm(t('employees.delete_confirm'))) deleteMutation.mutate(id);
  };

  // خروجی اکسل با همان فیلترها/ترتیب فعال صفحه (بدون صفحه‌بندی)
  const exportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError('');
    try {
      const params = { ordering: sort };
      if (debouncedSearch) params.search = debouncedSearch;
      Object.keys(EMPTY_FILTERS).forEach((field) => {
        if (filters[field]) params[field] = filters[field];
      });
      await downloadFile('/employees/export-excel/', {
        params,
        fallbackName: 'employees.xlsx',
      });
    } catch (e) {
      setExportError(`خطا در تهیهٔ فایل اکسل: ${e?.message || 'نامشخص'}`);
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: 'row',
      label: t('table.row'),
      width: 56,
      render: (row, index) => (
        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
          {toPersianDigits(page * pageSize + index + 1)}
        </Typography>
      ),
    },
    {
      key: 'person',
      label: t('employees.full_name'),
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
          <EmployeeAvatar employee={row} size={32} />
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>
              {row.full_name || '—'}
            </Typography>
            <Typography noWrap sx={{ fontSize: 10, color: 'text.secondary' }}>
              {row.national_id ? `کد ملی ${toPersianDigits(row.national_id)}` : (row.mobile || '—')}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'record',
      label: 'وضعیت پرونده',
      align: 'center',
      width: 150,
      render: (row) => (row.is_record_complete ? (
        <Chip size="small" label="پرونده کامل"
          sx={{ height: 20, fontSize: 10, fontWeight: 800, bgcolor: `${accent}1c`, color: accent }} />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
          <Box sx={{ flex: 1, minWidth: 50, height: 6, borderRadius: 10, bgcolor: `${accent}26` }}>
            <Box sx={{
              width: `${Math.min(100, Number(row.completeness_percent) || 0)}%`,
              height: 6, borderRadius: 10, bgcolor: accent,
            }} />
          </Box>
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
            {toPersianDigits(row.completeness_percent ?? 0)}٪
          </Typography>
        </Box>
      )),
    },
    {
      key: 'employee_id',
      label: t('employees.employee_id'),
      align: 'center',
      width: 110,
      render: (row) => (
        <Typography sx={{ fontSize: 11.5 }}>{toPersianDigits(row.employee_id || '')}</Typography>
      ),
    },
    {
      key: 'department',
      label: t('employees.department'),
      align: 'right',
      render: (row) => (
        <Typography noWrap sx={{ fontSize: 11.5 }}>{row.department_name || '—'}</Typography>
      ),
    },
    {
      key: 'job_title',
      label: t('employees.job_title'),
      align: 'right',
      render: (row) => (
        <Typography noWrap sx={{ fontSize: 11.5 }}>{row.job_title_name || '—'}</Typography>
      ),
    },
    {
      key: 'work_location',
      label: t('employees.work_location'),
      align: 'right',
      render: (row) => (
        <Typography noWrap sx={{ fontSize: 11.5 }}>{row.work_location_name || '—'}</Typography>
      ),
    },
    {
      key: 'insurance_list',
      label: t('employees.insurance_list'),
      align: 'right',
      render: (row) => (
        <Typography noWrap sx={{ fontSize: 11.5 }}>{row.insurance_list_name || '—'}</Typography>
      ),
    },
    {
      key: 'status',
      label: t('employees.status'),
      align: 'center',
      width: 110,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: t('common.actions'),
      align: 'center',
      width: 96,
      render: (row) => (
        <Box onClick={(event) => event.stopPropagation()} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Tooltip title={t('common.edit')}>
            <IconButton size="small" onClick={() => navigate(`/employees/${row.id}/edit`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.delete')}>
            <IconButton size="small" onClick={() => handleDelete(row.id)}>
              <DeleteIcon fontSize="small" color="error" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<PeopleIcon />}
        title={t('employees.title')}
        actions={(
          <>
            <Button variant="outlined" startIcon={<FileDownloadIcon />}
              onClick={exportExcel} disabled={exporting}>
              {exporting ? <CircularProgress size={18} /> : 'خروجی اکسل'}
            </Button>
            <Button variant="contained" onClick={() => navigate('/employees/new')}>
              {t('employees.add_employee')}
            </Button>
          </>
        )}
      />

      {exportError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError('')}>
          {exportError}
        </Alert>
      ) : null}

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جست‌وجو: نام، نام خانوادگی، کد ملی، کد پرسنلی، موبایل، ایمیل…"
        sort={sort}
        sortOptions={SORT_OPTIONS}
        onSort={setSort}
        filters={Object.keys(EMPTY_FILTERS).map((field) => ({
          label: filterLabels[field],
          value: filters[field],
          options: filterOptions[field] || [],
          onChange: (value) => handleFilterChange(field, value),
        }))}
        activeChips={activeChips}
        activeFilterCount={activeFilterCount}
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
        {isLoading ? (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <ModuleTable
            tableTheme={moduleTheme.tableTheme}
            ariaLabel="فهرست پرونده‌های پرسنل"
            containerRef={tableRef}
            tableHeight={tableHeight}
            rowHeight={rowHeight}
            dimmed={isFetching}
            rows={employees}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/employees/${row.id}`)}
            emptyText="پرونده‌ای با این فیلترها پیدا نشد."
            minWidth={1120}
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
          total={totalCount}
          pageSize={pageSize}
          unit="پرونده"
        />
      </Paper>
    </Box>
  );
};

export default EmployeeListPage;

