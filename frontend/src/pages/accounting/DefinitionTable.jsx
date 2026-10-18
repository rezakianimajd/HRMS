import React from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, CircularProgress,
} from '@mui/material';
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
  <Paper sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
    {loading ? (
      <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
    ) : (
      <TableContainer sx={{ maxHeight }}>
        <Table size="small" stickyHeader sx={{ '& td, & th': { px: 1.25, py: 0.9 } }}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align || 'right'}
                  sx={{ fontWeight: 600, whiteSpace: 'nowrap', bgcolor: 'background.paper' }}
                  style={column.width ? { width: column.width } : undefined}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ color: 'text.secondary', py: 6 }}>
                  {emptyText}
                </TableCell>
              </TableRow>
            ) : rows.map((row) => {
              const id = getRowId(row);
              return (
                <TableRow
                  key={id}
                  hover
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  sx={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    bgcolor: activeId === id ? 'action.hover' : 'transparent',
                  }}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key} align={column.align || 'right'}>
                      {column.render ? column.render(row) : row[column.key] ?? '—'}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    )}
  </Paper>
);

export default DefinitionTable;
