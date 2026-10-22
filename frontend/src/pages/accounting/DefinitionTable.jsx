import React from 'react';
import { Box, Typography } from '@mui/material';
import DataTable from '../../core/components/ui/DataTable';
import { toPersianDigits } from '../../core/utils/numberUtils';

export const CodeName = ({ code, name }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
    <Typography
      component="span"
      sx={{ fontWeight: 500, color: 'text.primary', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
    >
      {toPersianDigits(code ?? '—')}
    </Typography>
    <Typography component="span" noWrap sx={{ color: 'text.primary', minWidth: 0 }}>
      {name || '—'}
    </Typography>
  </Box>
);

/**
 * جدول استاندارد تعاریف حسابداری — یک‌ردیفی، بدون آیکون در ردیف‌ها و بدون سایه.
 */
const DefinitionTable = ({
  rows = [],
  columns = [],
  loading = false,
  emptyText = 'موردی ثبت نشده است.',
  onRowClick,
  activeId,
  getRowId = (row) => row.id,
  maxHeight = 'calc(100vh - 360px)',
}) => (
  <DataTable
    rows={rows}
    columns={columns}
    loading={loading}
    emptyText={emptyText}
    onRowClick={onRowClick}
    activeRowId={activeId}
    getRowId={getRowId}
    maxHeight={maxHeight}
    stickyHeader
    ariaLabel="جدول تعاریف"
    tableSx={{ '& td, & th': { px: 1.25, py: 0.9 } }}
  />
);

export default DefinitionTable;
