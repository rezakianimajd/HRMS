import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, Chip, CircularProgress, Grid, Paper, Stack, Tooltip, Typography, alpha,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import BadgeIcon from '@mui/icons-material/Badge';
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
  FAMILY_RELATIONS, FAMILY_SOURCES, familyAgeOf, relationColor, relationLabel, sourceColor, sourceLabel,
} from '../core/utils/familyMembers';

const ACCENT = '#be185d';
const BLUE = '#2563eb';
const TEAL = '#0f766e';
const RED = '#be123c';
const AMBER = '#b45309';
const VIOLET = '#7c3aed';

const INSURANCE_STATUS_META = {
  active: { label: 'فعال', color: TEAL },
  expiring: { label: 'نزدیک انقضا', color: AMBER },
  expired: { label: 'منقضی', color: RED },
  upcoming: { label: 'آینده', color: BLUE },
  none: { label: 'بدون بیمه', color: MUTED },
};

const dateLabel = (value) => (value ? toJalali(String(value).slice(0, 10)) : '—');

const RELATION_FILTER_OPTIONS = [
  { value: 'all', label: 'همه' },
  ...FAMILY_RELATIONS.map((item) => ({ value: item.value, label: item.label })),
];

const SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'همه' },
  ...Object.entries(FAMILY_SOURCES).map(([value, meta]) => ({ value, label: meta.label })),
];

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'همه' },
  { value: 'active', label: 'فعال' },
  { value: 'expiring', label: 'نزدیک انقضا' },
  { value: 'expired', label: 'منقضی' },
  { value: 'upcoming', label: 'آینده' },
  { value: 'none', label: 'بدون بیمه' },
];

const DEPENDENT_FILTER_OPTIONS = [
  { value: 'all', label: 'همه' },
  { value: 'yes', label: 'تحت تکفل' },
  { value: 'no', label: 'بدون تکفل' },
];

const NATIONAL_ID_FILTER_OPTIONS = [
  { value: 'all', label: 'همه' },
  { value: 'with', label: 'دارای کد ملی' },
  { value: 'missing', label: 'بدون کد ملی' },
];

const ATTACHMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'همه' },
  { value: 'with', label: 'دارای پیوست' },
  { value: 'missing', label: 'بدون پیوست' },
];

/** ردیف گزارش: هر عضو خانواده یک سطر با اطلاعات پرسنل، بیمه و پیوست خودش. */
const reportRows = (members = []) => members.map((member) => ({
  key: member.id,
  memberName: member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || 'بدون نام',
  relation: member.relation || 'other',
  relationLabel: member.relation_display || relationLabel(member.relation),
  nationalId: member.national_id || '',
  birthDate: member.birth_date || '',
  birthDateLabel: dateLabel(member.birth_date),
  age: member.age ?? familyAgeOf(member.birth_date),
  isDependent: member.is_dependent !== false,
  source: member.source || 'manual',
  sourceLabel: member.source_display || sourceLabel(member.source),
  phone: member.phone || '',
  notes: member.notes || '',
  employeeName: member.employee_name || '',
  employeeCode: member.employee_code || '',
  employeePhoto: member.employee_photo_url || '',
  employeeGender: member.employee_gender || '',
  employeeId: member.employee,
  department: member.department_name || '',
  jobTitle: member.job_title_name || '',
  insuranceName: member.insurance_name || '',
  insuranceStatus: member.insurance_status || 'none',
  insuranceStatusLabel: member.insurance_status_label
    || (INSURANCE_STATUS_META[member.insurance_status] || INSURANCE_STATUS_META.none).label,
  insurancePeriod: member.insurance_period || '',
  attachmentUrl: member.attachment_url || '',
  attachmentName: member.attachment_name || '',
  hasAttachment: Boolean(member.attachment_url || member.attachment_name),
}));

const searchTextOf = (row) => [
  row.employeeName, row.employeeCode, row.department, row.jobTitle,
  row.memberName, row.nationalId, row.phone, row.relationLabel, row.sourceLabel,
  row.insuranceName, row.notes,
].filter(Boolean).join(' ').toLowerCase();


const FamilyReportPage = () => {
  const moduleTheme = useModuleTheme();
  const navigate = useNavigate();
  const pageSize = moduleTheme.tableTheme.rowsPerPage;

  const [search, setSearch] = useState('');
  const [relationFilter, setRelationFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dependentFilter, setDependentFilter] = useState('all');
  const [attachmentFilter, setAttachmentFilter] = useState('all');
  const [nationalIdFilter, setNationalIdFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('employee');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const membersQuery = useQuery({
    queryKey: ['family-report-members'],
    queryFn: () => fetchAllPages('/family-members/'),
    staleTime: 60 * 1000,
  });

  const rows = useMemo(
    () => reportRows((Array.isArray(membersQuery.data) ? membersQuery.data : [])
      .filter((member) => member.is_active !== false)),
    [membersQuery.data],
  );

  const departments = useMemo(() => {
    const list = [...new Set(rows.map((row) => row.department).filter(Boolean))];
    list.sort((a, b) => a.localeCompare(b, 'fa'));
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
      : `${option.label} (${formatPersianNumber(rows.filter((row) => row.insuranceStatus === option.value).length)})`,
  })), [rows]);

  const summary = useMemo(() => {
    const withNationalId = rows.filter((row) => row.nationalId).length;
    const insured = rows.filter((row) => ['active', 'expiring', 'upcoming'].includes(row.insuranceStatus)).length;
    const dependents = rows.filter((row) => row.isDependent).length;
    return {
      total: rows.length,
      dependents,
      insured,
      withoutNationalId: rows.length - withNationalId,
      employees: new Set(rows.map((row) => row.employeeId).filter(Boolean)).size,
    };
  }, [rows]);


  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = rows.filter((row) => {
      if (relationFilter !== 'all' && row.relation !== relationFilter) return false;
      if (sourceFilter !== 'all' && row.source !== sourceFilter) return false;
      if (statusFilter !== 'all' && row.insuranceStatus !== statusFilter) return false;
      if (dependentFilter === 'yes' && !row.isDependent) return false;
      if (dependentFilter === 'no' && row.isDependent) return false;
      if (departmentFilter !== 'all' && row.department !== departmentFilter) return false;
      if (attachmentFilter === 'with' && !row.hasAttachment) return false;
      if (attachmentFilter === 'missing' && row.hasAttachment) return false;
      if (nationalIdFilter === 'with' && !row.nationalId) return false;
      if (nationalIdFilter === 'missing' && row.nationalId) return false;
      if (!term) return true;
      return searchTextOf(row).includes(term);
    });
    return [...result].sort((a, b) => {
      if (sortBy === 'member') return a.memberName.localeCompare(b.memberName, 'fa');
      if (sortBy === 'relation') {
        const order = FAMILY_RELATIONS.map((item) => item.value);
        return order.indexOf(a.relation) - order.indexOf(b.relation);
      }
      if (sortBy === 'birth') {
        if (!a.birthDate) return 1;
        if (!b.birthDate) return -1;
        return a.birthDate.localeCompare(b.birthDate);
      }
      if (sortBy === 'newest') return (b.key || 0) - (a.key || 0);
      return a.employeeName.localeCompare(b.employeeName, 'fa')
        || a.memberName.localeCompare(b.memberName, 'fa');
    });
  }, [
    rows, search, relationFilter, sourceFilter, statusFilter, dependentFilter,
    departmentFilter, attachmentFilter, nationalIdFilter, sortBy,
  ]);

  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    filtered.length, pageSize,
    [search, relationFilter, sourceFilter, statusFilter, dependentFilter, departmentFilter,
      attachmentFilter, nationalIdFilter, sortBy, pageSize],
  );
  const pagedRows = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, pagedRows.length);

  const activeChips = [
    relationFilter !== 'all'
      ? { key: 'relation', label: `نسبت: ${relationLabel(relationFilter)}`, clear: () => setRelationFilter('all') }
      : null,
    sourceFilter !== 'all'
      ? { key: 'source', label: `منبع: ${sourceLabel(sourceFilter)}`, clear: () => setSourceFilter('all') }
      : null,
    statusFilter !== 'all'
      ? {
        key: 'status',
        label: `وضعیت بیمه: ${(INSURANCE_STATUS_META[statusFilter] || {}).label || statusFilter}`,
        clear: () => setStatusFilter('all'),
      }
      : null,
    dependentFilter !== 'all'
      ? { key: 'dependent', label: dependentFilter === 'yes' ? 'تحت تکفل' : 'بدون تکفل', clear: () => setDependentFilter('all') }
      : null,
    departmentFilter !== 'all'
      ? { key: 'department', label: `واحد: ${departmentFilter}`, clear: () => setDepartmentFilter('all') }
      : null,
    attachmentFilter !== 'all'
      ? { key: 'attachment', label: attachmentFilter === 'with' ? 'دارای پیوست' : 'بدون پیوست', clear: () => setAttachmentFilter('all') }
      : null,
    nationalIdFilter !== 'all'
      ? { key: 'national_id', label: nationalIdFilter === 'with' ? 'دارای کد ملی' : 'بدون کد ملی', clear: () => setNationalIdFilter('all') }
      : null,
  ].filter(Boolean);

  const exportExcel = async () => {
    setExporting(true);
    setExportError('');
    try {
      await downloadFile('/family-members/export-excel/', {
        params: {
          q: search.trim(),
          relation: relationFilter,
          source: sourceFilter,
          status: statusFilter,
          dependent: dependentFilter,
          department: departmentFilter,
          attachment: attachmentFilter,
          national_id: nationalIdFilter,
        },
        fallbackName: `family-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
      });
    } catch (error) {
      setExportError(error?.message || 'تهیهٔ فایل اکسل انجام نشد.');
    } finally {
      setExporting(false);
    }
  };


  if (membersQuery.isLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress sx={{ color: ACCENT }} /></Box>;
  }

  if (membersQuery.isError) {
    return (
      <Box sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: '12px' }}>
          دریافت گزارش خانوادهٔ پرسنل انجام نشد.
          <Button size="small" onClick={() => membersQuery.refetch()} sx={{ ml: 1 }}>تلاش دوباره</Button>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<FamilyRestroomIcon />}
        color={ACCENT}
        title="گزارش خانوادهٔ پرسنل"
        subtitle="فهرست اعضای خانوادهٔ پرسنل از پروندهٔ پرسنلی، همراه با اطلاعات بیمهٔ تکمیلی و مدارک"
        badge={(
          <Chip
            size="small"
            label={`${formatPersianNumber(summary.total)} نفر · ${formatPersianNumber(summary.employees)} پرسنل`}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }}
          />
        )}
        actions={(
          <>
            <Tooltip title="به‌روزرسانی">
              <span>
                <Button
                  variant="outlined"
                  onClick={() => membersQuery.refetch()}
                  disabled={membersQuery.isFetching}
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
              startIcon={<DownloadIcon />}
              onClick={() => navigate('/employees')}
            >
              پرونده‌های پرسنلی
            </Button>
            <Button
              variant="contained"
              startIcon={exporting ? <CircularProgress size={14} sx={{ color: '#fff' }} /> : <DownloadIcon />}
              onClick={exportExcel}
              disabled={exporting}
              sx={{ bgcolor: ACCENT, '&:hover': { bgcolor: '#9d174d' } }}
            >
              {exporting ? 'در حال تهیه…' : 'خروجی اکسل'}
            </Button>
          </>
        )}
      />

      <Grid container spacing={1.5} sx={{ mb: 1.75 }}>
        <Grid item xs={6} md={3}>
          <KpiTile icon={PeopleAltIcon} label="کل اعضای خانواده" value={formatPersianNumber(summary.total)} suffix="نفر" color={ACCENT} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={FamilyRestroomIcon} label="تحت تکفل" value={formatPersianNumber(summary.dependents)} suffix="نفر" color={BLUE} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={HealthAndSafetyIcon} label="دارای بیمهٔ تکمیلی" value={formatPersianNumber(summary.insured)} suffix="نفر" color={TEAL} />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiTile icon={BadgeIcon} label="بدون کد ملی" value={formatPersianNumber(summary.withoutNationalId)} suffix="نفر" color={AMBER} />
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
        searchPlaceholder="جست‌وجو در نام پرسنل، کد پرسنلی، نام عضو خانواده، کد ملی، بیمه یا واحد…"
        sort={sortBy}
        sortOptions={[
          { value: 'employee', label: 'نام پرسنل' },
          { value: 'member', label: 'نام عضو خانواده' },
          { value: 'relation', label: 'نسبت' },
          { value: 'birth', label: 'تاریخ تولد' },
          { value: 'newest', label: 'جدیدترین' },
        ]}
        onSort={setSortBy}
        filters={[
          { label: 'نسبت', value: relationFilter, options: relationOptions, onChange: setRelationFilter },
          { label: 'منبع ثبت', value: sourceFilter, options: SOURCE_FILTER_OPTIONS, onChange: setSourceFilter },
          { label: 'وضعیت بیمه', value: statusFilter, options: statusOptions, onChange: setStatusFilter },
          { label: 'تحت تکفل', value: dependentFilter, options: DEPENDENT_FILTER_OPTIONS, onChange: setDependentFilter },
          { label: 'واحد سازمانی', value: departmentFilter, options: departments, onChange: setDepartmentFilter },
          { label: 'کد ملی', value: nationalIdFilter, options: NATIONAL_ID_FILTER_OPTIONS, onChange: setNationalIdFilter },
          { label: 'پیوست', value: attachmentFilter, options: ATTACHMENT_FILTER_OPTIONS, onChange: setAttachmentFilter },
        ]}
        activeChips={activeChips}
        activeFilterCount={activeChips.length}
        onReset={() => {
          setSearch('');
          setRelationFilter('all');
          setSourceFilter('all');
          setStatusFilter('all');
          setDependentFilter('all');
          setDepartmentFilter('all');
          setAttachmentFilter('all');
          setNationalIdFilter('all');
          setSortBy('employee');
        }}
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
        <ModuleTable
          tableTheme={moduleTheme.tableTheme}
          ariaLabel="گزارش خانوادهٔ پرسنل"
          containerRef={tableRef}
          tableHeight={tableHeight}
          rowHeight={rowHeight}
          dimmed={membersQuery.isFetching}
          rows={pagedRows}
          rowKey={(row) => row.key}
          onRowClick={(row) => row.employeeId && navigate(`/employees/${row.employeeId}`)}
          emptyText="عضوی با این مشخصات پیدا نشد؛ فیلترها را تغییر دهید یا از پروندهٔ پرسنلی عضو خانواده اضافه کنید."
          columns={[
            {
              key: 'photo',
              label: 'عکس',
              width: '5%',
              align: 'center',
              render: (row) => (
                <EmployeeAvatar
                  employee={{ full_name: row.employeeName, photo_url: row.employeePhoto, gender: row.employeeGender }}
                  size={32}
                />
              ),
            },
            {
              key: 'employee',
              label: 'پرسنل',
              width: '19%',
              align: 'right',
              render: (row) => (
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }} title={row.employeeName}>
                    {row.employeeName || '—'}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>
                    {row.employeeCode ? `کد ${toPersianDigits(row.employeeCode)}` : ''}
                    {row.employeeCode && row.department ? ' · ' : ''}
                    {row.department || ''}
                  </Typography>
                </Box>
              ),
            },
            {
              key: 'member',
              label: 'عضو خانواده',
              width: '17%',
              align: 'right',
              render: (row) => (
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }} title={row.memberName}>
                    {row.memberName}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 10, color: MUTED }}>
                    {row.notes || row.phone || ''}
                  </Typography>
                </Box>
              ),
            },
            {
              key: 'relation',
              label: 'نسبت',
              width: '9%',
              align: 'center',
              render: (row) => (
                <Chip
                  size="small"
                  label={row.relationLabel}
                  sx={{
                    height: 19, fontSize: 10, fontWeight: 800,
                    bgcolor: alpha(relationColor(row.relation), 0.09), color: relationColor(row.relation),
                  }}
                />
              ),
            },
            {
              key: 'national_id',
              label: 'کد ملی',
              width: '10%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{
                  fontSize: 11, fontWeight: 700, direction: 'ltr',
                  color: row.nationalId ? INK : MUTED,
                }}>
                  {row.nationalId ? toPersianDigits(row.nationalId) : '—'}
                </Typography>
              ),
            },
            {
              key: 'birth_date',
              label: 'تاریخ تولد',
              width: '9%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: row.birthDate ? INK : MUTED }}>
                  {row.birthDateLabel}
                </Typography>
              ),
            },
            {
              key: 'age',
              label: 'سن',
              width: '5%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{
                  fontSize: 11, fontWeight: 700,
                  color: row.age === null || row.age === undefined ? MUTED : INK,
                }}>
                  {row.age === null || row.age === undefined ? '—' : toPersianDigits(row.age)}
                </Typography>
              ),
            },
            {
              key: 'dependent',
              label: 'تحت تکفل',
              width: '6%',
              align: 'center',
              render: (row) => (
                <Chip
                  size="small"
                  label={row.isDependent ? 'بله' : 'خیر'}
                  sx={{
                    height: 19, fontSize: 10, fontWeight: 800,
                    bgcolor: alpha(row.isDependent ? TEAL : MUTED, 0.09),
                    color: row.isDependent ? TEAL : MUTED,
                  }}
                />
              ),
            },
            {
              key: 'source',
              label: 'منبع',
              width: '9%',
              align: 'center',
              render: (row) => (
                <Chip
                  size="small"
                  label={row.sourceLabel}
                  sx={{
                    height: 19, fontSize: 10, fontWeight: 800,
                    bgcolor: alpha(sourceColor(row.source), 0.09), color: sourceColor(row.source),
                  }}
                />
              ),
            },
            {
              key: 'insurance',
              label: 'بیمهٔ تکمیلی',
              width: '13%',
              align: 'center',
              render: (row) => {
                const meta = INSURANCE_STATUS_META[row.insuranceStatus] || INSURANCE_STATUS_META.none;
                return (
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: 11, fontWeight: 700, color: row.insuranceName ? INK : MUTED }}>
                      {row.insuranceName || '—'}
                    </Typography>
                    <Chip
                      size="small"
                      label={row.insuranceStatusLabel}
                      sx={{
                        mt: 0.2, height: 17, fontSize: 9.5, fontWeight: 800,
                        bgcolor: alpha(meta.color, 0.09), color: meta.color,
                      }}
                    />
                  </Box>
                );
              },
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
          unit="عضو خانواده"
        />
      </Paper>

      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.5, px: 0.5 }}>
        <FamilyRestroomIcon sx={{ fontSize: 14, color: VIOLET }} />
        <Typography sx={{ fontSize: 10.5, color: MUTED }}>
          دادهٔ این گزارش از بخش «خانواده» پروندهٔ پرسنلی خوانده می‌شود؛ اطلاعات بیمهٔ تکمیلی هر عضو نیز از همان پرونده است.
        </Typography>
      </Stack>
    </Box>
  );
};

export default FamilyReportPage;

