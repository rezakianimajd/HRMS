import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Grid, Paper, Stack,
  Tooltip, Typography, alpha,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageHeader from '../core/components/ui/PageHeader';
import EmployeeAvatar from '../core/components/ui/EmployeeAvatar';
import fetchAllPages from '../core/api/fetchAllPages';
import downloadFile from '../core/utils/downloadUtils';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import { KpiTile, INK, MUTED } from './accounting/AccountingDashboardUI';
import {
  ModulePager, ModuleTable, ModuleToolbar, useModuleTableState, useModuleTheme, useRowHeight,
} from './contracts/contractModuleUi';
import {
  INSURANCE_STATUS, RELATION_LABELS, RELATION_OPTIONS,
  dependentHasAttachment, dependentName, statusOf,
} from './supplementaryInsuranceHelpers';

const ACCENT = '#8b5cf6';
const BLUE = '#2563eb';
const TEAL = '#0f766e';
const RED = '#be123c';
const AMBER = '#b45309';

const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

const ageOf = (value) => {
  if (!value) return null;
  const birth = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

const RELATION_FILTER_OPTIONS = [
  { value: 'all', label: 'همه' },
  ...RELATION_OPTIONS.map((item) => ({ value: item.value, label: item.label })),
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'همه' },
  ...Object.values(INSURANCE_STATUS).map((status) => ({ value: status.key, label: status.label })),
];

/** ردیف‌های گزارش: هر فرد تحت تکفل در کنار اطلاعات پرسنل و بیمهٔ خودش. */
const reportRows = (insurances = []) => insurances.flatMap((insurance) => (
  (insurance.dependents || []).map((dependent) => ({
    key: `${insurance.id}-${dependent.id || dependentName(dependent)}`,
    insuranceId: insurance.id,
    employeeName: insurance.employee_name || '',
    employeeCode: insurance.employee_code || '',
    employeePhoto: insurance.employee_photo_url || '',
    employeeGender: insurance.employee_gender || '',
    department: insurance.department_name || '',
    jobTitle: insurance.job_title_name || '',
    insuranceName: insurance.insurance_name || '',
    insuranceType: insurance.insurance_type || '',
    plan: insurance.plan || '',
    startDate: insurance.start_date || '',
    endDate: insurance.end_date || '',
    status: statusOf(insurance),
    dependentId: dependent.id,
    dependentName: dependentName(dependent),
    firstName: dependent.first_name || '',
    lastName: dependent.last_name || '',
    relation: dependent.relation || 'other',
    relationLabel: dependent.relation_display || RELATION_LABELS[dependent.relation] || '—',
    nationalId: dependent.national_id || '',
    birthDate: dependent.birth_date || '',
    attachmentUrl: dependent.attachment_url || dependent.attachment || '',
    attachmentName: dependent.attachment_name || '',
    hasAttachment: dependentHasAttachment(dependent),
    age: ageOf(dependent.birth_date),
  }))
));

const searchTextOf = (row) => [
  row.employeeName, row.employeeCode, row.department, row.jobTitle,
  row.insuranceName, row.insuranceType, row.plan,
  row.dependentName, row.nationalId, row.relationLabel,
].filter(Boolean).join(' ').toLowerCase();

const DependentsReportPage = () => {
  const moduleTheme = useModuleTheme();
  const pageSize = moduleTheme.tableTheme.rowsPerPage;

  const [search, setSearch] = useState('');
  const [relationFilter, setRelationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [attachmentFilter, setAttachmentFilter] = useState('all');
  const [nationalIdFilter, setNationalIdFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('employee');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const insurancesQuery = useQuery({
    queryKey: ['dependents-report-insurances'],
    queryFn: () => fetchAllPages('/supplementary-insurances/'),
    staleTime: 2 * 60 * 1000,
  });

  const rows = useMemo(
    () => reportRows(Array.isArray(insurancesQuery.data) ? insurancesQuery.data : []),
    [insurancesQuery.data],
  );

  const departments = useMemo(() => {
    const list = [...new Set(rows.map((row) => row.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fa'));
    return [{ value: 'all', label: 'همه واحدها' }, ...list.map((name) => ({ value: name, label: name }))];
  }, [rows]);

  const relationOptions = useMemo(() => RELATION_FILTER_OPTIONS.map((option) => ({
    ...option,
    label: option.value === 'all'
      ? `همه (${formatPersianNumber(rows.length)})`
      : `${option.label} (${formatPersianNumber(rows.filter((row) => row.relation === option.value).length)})`,
  })), [rows]);

  const statusOptions = useMemo(() => STATUS_FILTER_OPTIONS.map((option) => ({
    ...option,
    label: option.value === 'all'
      ? `همه (${formatPersianNumber(rows.length)})`
      : `${option.label} (${formatPersianNumber(rows.filter((row) => row.status.key === option.value).length)})`,
  })), [rows]);

  const summary = useMemo(() => {
    const withAttachment = rows.filter((row) => row.hasAttachment).length;
    const withNationalId = rows.filter((row) => row.nationalId).length;
    const activeInsurances = new Set(
      rows.filter((row) => ['active', 'expiring'].includes(row.status.key)).map((row) => row.insuranceId),
    ).size;
    return {
      total: rows.length,
      withAttachment,
      withoutNationalId: rows.length - withNationalId,
      activeInsurances,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = rows.filter((row) => {
      if (relationFilter !== 'all' && row.relation !== relationFilter) return false;
      if (statusFilter !== 'all' && row.status.key !== statusFilter) return false;
      if (departmentFilter !== 'all' && row.department !== departmentFilter) return false;
      if (attachmentFilter === 'with' && !row.hasAttachment) return false;
      if (attachmentFilter === 'missing' && row.hasAttachment) return false;
      if (nationalIdFilter === 'with' && !row.nationalId) return false;
      if (nationalIdFilter === 'missing' && row.nationalId) return false;
      if (!term) return true;
      return searchTextOf(row).includes(term);
    });
    return [...result].sort((a, b) => {
      if (sortBy === 'dependent') return a.dependentName.localeCompare(b.dependentName, 'fa');
      if (sortBy === 'relation') return a.relationLabel.localeCompare(b.relationLabel, 'fa');
      if (sortBy === 'birth') return String(a.birthDate || '9999-12-31').localeCompare(String(b.birthDate || '9999-12-31'));
      if (sortBy === 'newest') return String(b.startDate || '').localeCompare(String(a.startDate || ''));
      return a.employeeName.localeCompare(b.employeeName, 'fa') || a.dependentName.localeCompare(b.dependentName, 'fa');
    });
  }, [rows, search, relationFilter, statusFilter, departmentFilter, attachmentFilter, nationalIdFilter, sortBy]);

  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    filtered.length, pageSize,
    [search, relationFilter, statusFilter, departmentFilter, attachmentFilter, nationalIdFilter, sortBy, pageSize],
  );
  const pagedRows = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, pagedRows.length);


  const activeChips = [
    relationFilter !== 'all'
      ? { key: 'relation', label: `نسبت: ${RELATION_LABELS[relationFilter] || relationFilter}`, clear: () => setRelationFilter('all') }
      : null,
    statusFilter !== 'all'
      ? { key: 'status', label: `وضعیت بیمه: ${INSURANCE_STATUS[statusFilter]?.label || ''}`, clear: () => setStatusFilter('all') }
      : null,
    departmentFilter !== 'all'
      ? { key: 'department', label: `واحد: ${departmentFilter}`, clear: () => setDepartmentFilter('all') }
      : null,
    attachmentFilter !== 'all'
      ? { key: 'attachment', label: attachmentFilter === 'with' ? 'دارای پیوست' : 'بدون پیوست', clear: () => setAttachmentFilter('all') }
      : null,
    nationalIdFilter !== 'all'
      ? { key: 'national', label: nationalIdFilter === 'with' ? 'دارای کد ملی' : 'بدون کد ملی', clear: () => setNationalIdFilter('all') }
      : null,
  ].filter(Boolean);

  const exportExcel = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError('');
    try {
      await downloadFile('/supplementary-insurance-dependents/export-excel/', {
        params: {
          q: search.trim(),
          relation: relationFilter,
          status: statusFilter,
          department: departmentFilter,
          attachment: attachmentFilter,
          national_id: nationalIdFilter,
        },
        fallbackName: `dependents-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
      });
    } catch (error) {
      setExportError(error?.message || 'تهیهٔ فایل اکسل انجام نشد.');
    } finally {
      setExporting(false);
    }
  };

  if (insurancesQuery.isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress sx={{ color: ACCENT }} /></Box>;
  }

  if (insurancesQuery.isError) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: '12px' }}>
          دریافت گزارش افراد تحت تکفل انجام نشد.
          <Button size="small" onClick={() => insurancesQuery.refetch()} sx={{ ml: 1 }}>تلاش دوباره</Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<FamilyRestroomIcon />}
        color={ACCENT}
        title="گزارش افراد تحت تکفل"
        subtitle="فهرست کامل افراد تحت تکفل بیمهٔ تکمیلی به همراه مشخصات پرسنل و مدارک"
        badge={(
          <Chip
            size="small"
            label={`${formatPersianNumber(summary.total)} نفر`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }}
          />
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button
                  variant="outlined"
                  onClick={() => insurancesQuery.refetch()}
                  disabled={insurancesQuery.isFetching}
                  sx={{ minWidth: 40, px: 1 }}
                >
                  <RefreshIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            <Tooltip title="چاپ">
              <Button variant="outlined" onClick={() => window.print()} sx={{ minWidth: 40, px: 1 }}>
                <PrintIcon fontSize="small" />
              </Button>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={14} /> : <DownloadIcon />}
              onClick={exportExcel}
              disabled={exporting}
            >
              {exporting ? 'در حال تهیه…' : 'خروجی اکسل'}
            </Button>
          </>
        )}
      />

      <Grid container spacing={1.5} sx={{ mb: 1.75 }}>
        <Grid item xs={6} md={3}>
          <KpiTile icon={PeopleAltIcon} label="کل افراد تحت تکفل" value={formatPersianNumber(summary.total)} suffix="نفر" color={ACCENT} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={AttachFileIcon} label="دارای پیوست مدارک" value={formatPersianNumber(summary.withAttachment)} suffix="نفر" color={RED} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={FamilyRestroomIcon} label="بدون کد ملی" value={formatPersianNumber(summary.withoutNationalId)} suffix="نفر" color={AMBER} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={HealthAndSafetyIcon} label="بیمه‌های فعال" value={formatPersianNumber(summary.activeInsurances)} suffix="بیمه" color={TEAL} />
        </Grid>
      </Grid>


      {exportError ? (
        <Alert severity="error" sx={{ mb: 1.25, borderRadius: '12px' }} onClose={() => setExportError('')}>
          {exportError}
        </Alert>
      ) : null}

      <ModuleToolbar
        theme={moduleTheme}
        search={search}
        onSearch={setSearch}
        searchPlaceholder="جست‌وجو در نام پرسنل، کد پرسنلی، نام فرد، کد ملی، بیمه یا طرح…"
        sort={sortBy}
        sortOptions={[
          { value: 'employee', label: 'نام پرسنل' },
          { value: 'dependent', label: 'نام فرد تحت تکفل' },
          { value: 'relation', label: 'نسبت' },
          { value: 'birth', label: 'تاریخ تولد' },
          { value: 'newest', label: 'جدیدترین پوشش' },
        ]}
        onSort={setSortBy}
        filters={[
          { label: 'نسبت', value: relationFilter, options: relationOptions, onChange: setRelationFilter },
          { label: 'وضعیت بیمه', value: statusFilter, options: statusOptions, onChange: setStatusFilter },
          { label: 'واحد سازمانی', value: departmentFilter, options: departments, onChange: setDepartmentFilter },
          {
            label: 'پیوست',
            value: attachmentFilter,
            options: [{ value: 'all', label: 'همه' }, { value: 'with', label: 'دارای پیوست' }, { value: 'missing', label: 'بدون پیوست' }],
            onChange: setAttachmentFilter,
          },
          {
            label: 'کد ملی',
            value: nationalIdFilter,
            options: [{ value: 'all', label: 'همه' }, { value: 'with', label: 'دارای کد ملی' }, { value: 'missing', label: 'بدون کد ملی' }],
            onChange: setNationalIdFilter,
          },
        ]}
        activeChips={activeChips}
        activeFilterCount={activeChips.length}
        onReset={() => {
          setSearch('');
          setRelationFilter('all');
          setStatusFilter('all');
          setDepartmentFilter('all');
          setAttachmentFilter('all');
          setNationalIdFilter('all');
          setSortBy('employee');
        }}
        filtersOpen={filtersOpen}
        setFiltersOpen={setFiltersOpen}
      />﻿
      <Paper elevation={0} sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        overflow: 'hidden',
        px: `${moduleTheme.cardPadX}px`, py: `${moduleTheme.cardPadY}px`,
        border: '1px solid', borderColor: moduleTheme.cardBorderColor,
        bgcolor: 'background.paper', boxShadow: 'none',
      }}>
        <ModuleTable
          tableTheme={moduleTheme.tableTheme}
          ariaLabel="گزارش افراد تحت تکفل"
          containerRef={tableRef}
          tableHeight={tableHeight}
          rowHeight={rowHeight}
          dimmed={insurancesQuery.isFetching}
          rows={pagedRows}
          rowKey={(row) => row.key}
          emptyText="فرد تحت تکفلی با این مشخصات پیدا نشد؛ فیلترها یا عبارت جست‌وجو را تغییر دهید."
          columns={[
            {
              key: 'photo',
              label: 'عکس',
              width: '5%',
              align: 'center',
              render: (row) => (
                <EmployeeAvatar
                  employee={{
                    full_name: row.employeeName,
                    photo_url: row.employeePhoto,
                    gender: row.employeeGender,
                  }}
                  size={32}
                  sx={{ borderRadius: '9px' }}
                />
              ),
            },
            {
              key: 'employee',
              label: 'نام و نام خانوادگی پرسنل',
              width: '18%',
              align: 'right',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }} title={row.employeeName}>
                  {row.employeeName || '—'}
                </Typography>
              ),
            },
            {
              key: 'employee_code',
              label: 'کد پرسنلی',
              width: '7%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                  {toPersianDigits(row.employeeCode || '—')}
                </Typography>
              ),
            },
            {
              key: 'department',
              label: 'واحد سازمانی',
              width: '10%',
              align: 'right',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: INK }} title={row.department}>
                  {row.department || '—'}
                </Typography>
              ),
            },
            {
              key: 'insurance',
              label: 'بیمه / طرح',
              width: '12%',
              align: 'right',
              render: (row) => (
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }} title={row.insuranceName}>
                    {row.insuranceName || 'بیمه تکمیلی'}
                  </Typography>
                  <Stack direction="row" spacing={0.3} useFlexGap flexWrap="wrap" sx={{ mt: 0.2 }}>
                    {row.plan ? (
                      <Chip
                        size="small"
                        label={row.plan}
                        sx={{ height: 18, fontSize: 9.5, fontWeight: 800, bgcolor: alpha(ACCENT, 0.07), color: ACCENT }}
                      />
                    ) : null}
                    <Chip
                      size="small"
                      label={row.status.label}
                      sx={{ height: 18, fontSize: 9.5, fontWeight: 800, bgcolor: alpha(row.status.color, 0.08), color: row.status.color }}
                    />
                  </Stack>
                </Box>
              ),
            },
            {
              key: 'dependent',
              label: 'نام و نام خانوادگی فرد تحت تکفل',
              width: '13%',
              align: 'right',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }} title={row.dependentName}>
                  {row.dependentName}
                </Typography>
              ),
            },
            {
              key: 'relation',
              label: 'نسبت',
              width: '8%',
              align: 'center',
              render: (row) => (
                <Chip
                  size="small"
                  label={row.relationLabel}
                  sx={{ height: 19, fontSize: 10, fontWeight: 800, bgcolor: alpha(BLUE, 0.07), color: BLUE }}
                />
              ),
            },
            {
              key: 'national_id',
              label: 'کد ملی',
              width: '9%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: row.nationalId ? INK : MUTED, direction: 'ltr' }}>
                  {row.nationalId ? toPersianDigits(row.nationalId) : '—'}
                </Typography>
              ),
            },
            {
              key: 'birth_date',
              label: 'تاریخ تولد',
              width: '8%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: row.birthDate ? INK : MUTED }}>
                  {dateLabel(row.birthDate)}
                </Typography>
              ),
            },
            {
              key: 'age',
              label: 'سن',
              width: '5%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: row.age === null ? MUTED : INK }}>
                  {row.age === null ? '—' : toPersianDigits(row.age)}
                </Typography>
              ),
            },
            {
              key: 'attachment',
              label: 'پیوست',
              width: '5%',
              align: 'center',
              render: (row) => (
                row.hasAttachment ? (
                  <Tooltip title={row.attachmentName || 'مشاهدهٔ پیوست'}>
                    <Chip
                      component="a"
                      href={row.attachmentUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                      clickable
                      size="small"
                      icon={<AttachFileIcon sx={{ fontSize: 12 }} />}
                      label="دارد"
                      onClick={(event) => event.stopPropagation()}
                      sx={{ height: 19, fontSize: 10, fontWeight: 800, bgcolor: alpha(RED, 0.07), color: RED }}
                    />
                  </Tooltip>
                ) : (
                  <Typography sx={{ fontSize: 11, color: MUTED }}>—</Typography>
                )
              ),
            },
          ]}
        />
        <ModulePager
          tableTheme={moduleTheme.tableTheme}
          page={page}
          onPage={setPage}
          totalPages={totalPages}
          pageNumbers={pageNumbers}
          total={filtered.length}
          pageSize={pageSize}
          unit="فرد تحت تکفل"
        />
      </Paper>
    </Box>
  );
};

export default DependentsReportPage;
