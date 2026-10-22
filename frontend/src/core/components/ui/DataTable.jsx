import React from 'react';
import {
  Box, CircularProgress, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';

/**
 * جدول مشترک و توکن‌محور.
 *
 * columns: [{ key, label, align, width, render(row, index), headerSx, cellSx }]
 * تمام رنگ، شعاع، سایه و فاصله‌ها از CSS Variables مربوط به طراحی خوانده
 * می‌شوند؛ صفحات فقط ساختار داده و استایل‌های استثنایی خود را می‌دهند.
 */
const DataTable = ({
  rows = [],
  columns = [],
  getRowId = (row) => row.id,
  loading = false,
  emptyText = 'موردی ثبت نشده است.',
  emptyComponent = null,
  loadingText = 'در حال دریافت اطلاعات…',
  maxHeight,
  stickyHeader = false,
  showHeader = true,
  size = 'small',
  minWidth,
  onRowClick,
  activeRowId = null,
  rowSx,
  getRowSx,
  tableSx,
  containerSx,
  paperSx,
  footer = null,
  ariaLabel = 'جدول داده‌ها',
  loadingComponent = null,
}) => {
  const colSpan = Math.max(columns.length, 1);
  const interactive = typeof onRowClick === 'function';

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 'var(--hrms-radius-large, 16px)',
        overflow: 'hidden',
        border: 'var(--hrms-border-table, 1px solid #e8edf4)',
        bgcolor: 'var(--hrms-region-table-bg, #ffffff)',
        boxShadow: 'var(--hrms-shadow-table, none)',
        ...paperSx,
      }}
    >
      {loading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          {loadingComponent || <CircularProgress size={28} />}
          {loadingText ? (
            <Typography sx={{ mt: 1, fontSize: 12, color: 'text.secondary' }}>{loadingText}</Typography>
          ) : null}
        </Box>
      ) : (
        <>
          <TableContainer sx={{ maxHeight, ...containerSx }}>
            <Table
              size={size}
              stickyHeader={stickyHeader}
              aria-label={ariaLabel}
              sx={{
                minWidth,
                '& td, & th': { px: 1.25, py: 'var(--hrms-table-cell-padding, 8px)' },
                ...tableSx,
              }}
            >
              {showHeader && columns.length > 0 ? (
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        align={column.align || 'right'}
                        sx={{
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          bgcolor: 'var(--hrms-region-table-header-bg, #f8fafc)',
                          ...column.headerSx,
                        }}
                        style={column.width ? { width: column.width } : undefined}
                      >
                        {column.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
              ) : null}
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} align="center" sx={{ color: 'text.secondary', py: 6 }}>
                      {emptyComponent || emptyText}
                    </TableCell>
                  </TableRow>
                ) : rows.map((row, index) => {
                  const rowId = getRowId(row);
                  const selected = activeRowId != null && String(rowId) === String(activeRowId);
                  const extraSx = typeof getRowSx === 'function' ? getRowSx(row, index) : rowSx;
                  return (
                    <TableRow
                      key={rowId ?? index}
                      hover
                      onClick={interactive ? (event) => onRowClick(row, event) : undefined}
                      onKeyDown={interactive ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onRowClick(row, event);
                        }
                      } : undefined}
                      tabIndex={interactive ? 0 : undefined}
                      sx={{
                        cursor: interactive ? 'pointer' : 'default',
                        bgcolor: selected ? 'action.hover' : 'transparent',
                        ...(extraSx || {}),
                      }}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={column.key}
                          align={column.align || 'right'}
                          sx={{ verticalAlign: 'middle', ...column.cellSx }}
                        >
                          {column.render ? column.render(row, index) : row[column.key] ?? '—'}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {footer}
        </>
      )}
    </Paper>
  );
};

export default DataTable;
