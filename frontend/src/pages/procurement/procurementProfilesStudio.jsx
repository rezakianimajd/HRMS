/** پرونده خرید — فهرست طرف حساب‌ها با همان کیت مدیریت قراردادها (هدر/سرچ/جدول/صفحه‌بندی). */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import BusinessIcon from '@mui/icons-material/Business';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import PageHeader from '../../core/components/ui/PageHeader';
import { printElement } from '../../core/print/printEngine';
import {
  ModulePager, ModuleTable, ModuleToolbar,
  useModuleTableState, useModuleTheme, useRowHeight,
} from '../contracts/contractModuleUi';
import { formatPersianNumber, toPersianDigits } from '../../core/utils/numberUtils';
import { useList } from './procurementUi';

const STATUS_LABELS = { active: 'فعال', inactive: 'غیرفعال', blacklisted: 'لیست سیاه' };
const STATUS_COLORS = { active: '#0f766e', inactive: '#64748b', blacklisted: '#be123c' };

const money = (value) => `${formatPersianNumber(Math.round(Number(value) || 0))} ریال`;

const cardSx = {
  p: 1.25, mb: 2, borderRadius: '16px', border: '1px solid', borderColor: 'divider',
  bgcolor: 'background.paper', boxShadow: 'none',
};
const tableCardSx = {
  borderRadius: 'var(--hrms-table-radius, 16px)', overflow: 'hidden', border: '1px solid',
  borderColor: 'divider', bgcolor: 'background.paper', boxShadow: 'none',
};

const ProcurementProfilesPage = () => {
  const navigate = useNavigate();
  const moduleTheme = useModuleTheme();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('documents');
  const pageSize = moduleTheme.tableTheme.rowsPerPage;

  const { rows: profileRows, isLoading, isFetching, error } = useList(
    '/procurement/supplier-profiles/', { page_size: 500 },
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = (profileRows || []).filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!query) return true;
      return [row.name, row.code, row.phone].some(
        (value) => String(value || '').toLowerCase().includes(query),
      );
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'amount') return Number(b.invoices_total) - Number(a.invoices_total);
      if (sortBy === 'balance') return Number(b.invoices_balance) - Number(a.invoices_balance);
      if (sortBy === 'name') return String(a.name).localeCompare(String(b.name), 'fa');
      return Number(b.documents_count) - Number(a.documents_count);
    });
    return result;
  }, [profileRows, search, statusFilter, sortBy]);

  const totals = useMemo(() => rows.reduce((acc, row) => ({
    documents: acc.documents + Number(row.documents_count || 0),
    invoices: acc.invoices + Number(row.invoices_total || 0),
    balance: acc.balance + Number(row.invoices_balance || 0),
    guarantees: acc.guarantees + Number(row.guarantees_total || 0),
  }), { documents: 0, invoices: 0, balance: 0, guarantees: 0 }), [rows]);

  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    rows.length, pageSize, [search, statusFilter, sortBy, pageSize],
  );
  const pagedRows = rows.slice(page * pageSize, page * pageSize + pageSize);
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(
    moduleTheme.tableTheme, Math.max(1, pagedRows.length),
  );

  const activeChips = [
    statusFilter !== 'all'
      ? { label: `وضعیت: ${STATUS_LABELS[statusFilter] || statusFilter}`, onDelete: () => setStatusFilter('all') }
      : null,
    search ? { label: `جستجو: ${search}`, onDelete: () => setSearch('') } : null,
  ].filter(Boolean);

  const statusChip = (status) => (
    <Chip size="small" label={STATUS_LABELS[status] || status}
      sx={{
        height: 21, fontSize: 10.5, fontWeight: 800,
        bgcolor: alpha(STATUS_COLORS[status] || '#64748b', 0.12),
        color: STATUS_COLORS[status] || '#64748b',
      }} />
  );

  return (
    <Box>
      <PageHeader
        icon={<BusinessIcon />}
        title="پرونده خرید"
        subtitle="یک پرونده برای هر طرف حساب (تأمین‌کننده): استعلام، پیشنهاد، سفارش، پیش‌فاکتور، فاکتور، تضامین و پرداخت‌ها"
        actions={(
          <Button variant="outlined" size="small" startIcon={<PrintOutlinedIcon fontSize="small" />}
            onClick={() => printElement('main', { title: 'پرونده‌های خرید', orientation: 'landscape' })}>
            چاپ
          </Button>
        )}
      />

      <Paper sx={cardSx}>
        <ModuleToolbar
          theme={moduleTheme}
          search={search}
          onSearch={setSearch}
          searchPlaceholder="جستجو در نام، کد یا تلفن طرف حساب…"
          sort={sortBy}
          sortOptions={[
          { value: 'documents', label: 'بیشترین اسناد' },
          { value: 'amount', label: 'بیشترین مبلغ فاکتور' },
          { value: 'balance', label: 'بیشترین مانده' },
          { value: 'name', label: 'نام طرف حساب' },
          ]}
          onSort={setSortBy}
          filters={[{
          label: 'وضعیت',
          value: statusFilter,
          options: [
            { value: 'all', label: 'همه' },
            { value: 'active', label: 'فعال' },
            { value: 'inactive', label: 'غیرفعال' },
            { value: 'blacklisted', label: 'لیست سیاه' },
          ],
          onChange: setStatusFilter,
          }]}
          activeChips={activeChips}
          activeFilterCount={activeChips.length}
          onReset={() => { setSearch(''); setStatusFilter('all'); setSortBy('documents'); }}
        />
      </Paper>


      {error ? (
        <Typography sx={{ color: 'error.main', fontSize: 12, mb: 1 }}>{error}</Typography>
      ) : null}

      <Paper sx={tableCardSx}>
        <ModuleTable
        tableTheme={moduleTheme.tableTheme}
        ariaLabel="پرونده‌های خرید طرف حساب‌ها"
        containerRef={tableRef}
        tableHeight={tableHeight}
        rowHeight={rowHeight}
        dimmed={isFetching}
        rows={pagedRows}
        rowKey={(row) => row.id}
        onRowClick={(row) => navigate(`/procurement/supplier-profile?supplier=${row.id}`)}
        emptyText={isLoading ? 'در حال بارگذاری…' : 'طرف حسابی با این شرایط پیدا نشد.'}
        columns={[
          { key: 'row', label: 'ردیف', width: '4%', align: 'center',
            render: (row, index) => toPersianDigits(page * pageSize + index + 1) },
          { key: 'party', label: 'طرف حساب', width: '22%',
            render: (row) => (
              <Stack spacing={0.1}>
                <Typography sx={{ fontSize: 12, fontWeight: 800 }} noWrap>{row.name}</Typography>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }} noWrap>
                  کد {toPersianDigits(row.code || '—')}
                </Typography>
              </Stack>
            ) },
          { key: 'status', label: 'وضعیت', width: '8%', align: 'center',
            render: (row) => statusChip(row.status) },
          { key: 'orders', label: 'سفارش', width: '6%', align: 'center',
            render: (row) => toPersianDigits(row.orders_count || 0) },
          { key: 'quotations', label: 'پیشنهاد', width: '7%', align: 'center',
            render: (row) => toPersianDigits(row.quotations_count || 0) },
          { key: 'proformas', label: 'پیش‌فاکتور', width: '8%', align: 'center',
            render: (row) => toPersianDigits(row.proformas_count || 0) },
          { key: 'invoices', label: 'فاکتور', width: '7%', align: 'center',
            render: (row) => toPersianDigits(row.invoices_count || 0) },
          { key: 'amount', label: 'مبلغ فاکتورها', width: '12%',
            render: (row) => money(row.invoices_total || 0) },
          { key: 'balance', label: 'مانده', width: '11%',
            render: (row) => money(row.invoices_balance || 0) },
          { key: 'guarantees', label: 'تضامین', width: '8%', align: 'center',
            render: (row) => toPersianDigits(row.guarantees_count || 0) },
          { key: 'open', label: 'عملیات', width: '7%', align: 'center',
            render: (row) => (
              <Button size="small"
                onClick={(event) => {
                  event.stopPropagation();
                  navigate(`/procurement/supplier-profile?supplier=${row.id}`);
                }}
                sx={{ fontSize: 11 }}>پرونده</Button>
            ) },
        ]}
      />
        <ModulePager
        tableTheme={moduleTheme.tableTheme}
        page={page}
        onPage={setPage}
        totalPages={totalPages}
        pageNumbers={pageNumbers}
        total={rows.length}
        pageSize={pageSize}
          unit="طرف حساب"
        />
      </Paper>
    </Box>
  );
};

export default ProcurementProfilesPage;
