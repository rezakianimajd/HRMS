import React from 'react';
import {
  Box, CircularProgress, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { useDesignTokens } from '../../context/DesignTokenContext';
import { tableBackground } from '../../theme/designTokens';
import { resolveTableTheme, tableTypographySx } from '../../theme/tableStyles';

/**
 * جدول مشترک و توکن‌محور.
 *
 * columns: [{ key, label, align, width, render(row, index), headerSx, cellSx }]
 * تمام رنگ، شعاع، سایه و فاصله‌ها از CSS Variables مربوط به طراحی خوانده
 * می‌شوند؛ صفحات فقط ساختار داده و استایل‌های استثنایی خود را می‌دهند.
 *
 * گزینهٔ `themed`: توکن‌های پیشرفتهٔ استودیوی تم را روی جدول اعمال می‌کند
 * (تراز عنوان ستون‌ها، سبک/رنگ/شدت خط جداکنندهٔ ردیف‌ها، قاب کارت با حاشیهٔ
 * کناری، سلول‌های تک‌خطی و حداقل عرض ستون). این گزینه برای حفظ ظاهر فعلی
 * سایر صفحات، پیش‌فرض خاموش است و هر صفحه می‌تواند آن را روشن کند.
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
  themed = false,
}) => {
  const colSpan = Math.max(columns.length, 1);
  const interactive = typeof onRowClick === 'function';
  const { tokens } = useDesignTokens();
  const tableCfg = tokens.tables || {};
  const effectiveTable = { ...tableCfg, surface: tableCfg.variant === 'glass' ? 'glass' : tableCfg.surface };
  const isGlass = effectiveTable.surface === 'glass';
  const background = tableBackground(tokens, effectiveTable);
  const cellPadding = tableCfg.variant === 'compact' ? 6 : tableCfg.variant === 'spacious' ? 12 : (tableCfg.cellPadding ?? 8);
  const rowHover = tableCfg.hover !== false;
  const showBorders = tableCfg.showBorders !== false;

  /* --- توکن‌های جدول (استودیوی تم) — فقط با themed فعال می‌شوند --- */
  const themedTable = themed ? resolveTableTheme(tokens) : null;
  const headerAlign = themedTable ? themedTable.headerAlign : null;
  const headerTextAlign = themedTable ? themedTable.headerTextAlign : null;
  const singleLine = themedTable ? themedTable.singleLine : false;
  const framed = Boolean(themedTable && themedTable.frame);
  const themedTypography = themedTable ? { header: themedTable.header, cell: themedTable.cell } : null;

  return (
    <Paper
      elevation={0}
      className="hrms-data-table"
      data-themed={themed ? 'true' : undefined}
      sx={{
        borderRadius: 'var(--hrms-table-radius, 16px)',
        overflow: 'hidden',
        border: themed ? 'var(--hrms-table-border, 1px solid #e8edf4)' : 'var(--hrms-table-border-color, 1px solid #e8edf4)',
        background,
        boxShadow: 'var(--hrms-table-shadow, none)',
        backdropFilter: isGlass ? 'var(--hrms-table-backdrop, blur(12px))' : 'none',
        WebkitBackdropFilter: isGlass ? 'var(--hrms-table-backdrop, blur(12px))' : 'none',
        ...(framed ? {
          px: 'var(--hrms-table-frame-margin, 0px)',
          py: 'var(--hrms-table-frame-padding, 0px)',
        } : null),
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
                '& td, & th': themed ? {
                  px: 1.25,
                  py: `${cellPadding}px`,
                  borderBottom: themedTable.divider,
                  whiteSpace: singleLine ? 'nowrap' : 'normal',
                  overflow: singleLine ? 'hidden' : 'visible',
                  textOverflow: singleLine ? 'ellipsis' : 'clip',
                } : {
                  px: 1.25,
                  py: `${cellPadding}px`,
                  borderBottomColor: showBorders ? 'var(--hrms-table-border-color, #e8edf4)' : 'transparent',
                },
                ...(themed ? {
                  ...(themedTable.columnMinWidth > 0
                    ? { '& thead th': { minWidth: 'var(--hrms-table-column-min-width, 110px)' } }
                    : null),
                  '& tbody td': { height: `${themedTable.rowHeight}px` },
                  '& tbody tr.MuiTableRow-hover:hover': { backgroundColor: themedTable.hoverBg },
                  ...tableTypographySx(themedTable),
                } : null),
                ...tableSx,
              }}
            >
              {showHeader && columns.length > 0 ? (
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        align={headerTextAlign || column.align || 'right'}
                        sx={{
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          bgcolor: 'var(--hrms-table-header-bg, #f8fafc)',
                          ...column.headerSx,
                        }}
                        style={{
                          ...(column.width ? { width: column.width } : null),
                          ...(headerTextAlign ? { textAlign: headerTextAlign } : null),
                          ...(themedTypography ? themedTypography.header : null),
                        }}
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
                      hover={rowHover}
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
                          style={themed ? {
                            textAlign: column.align === 'left' ? 'left' : (column.align === 'right' ? 'right' : (column.align === 'center' ? 'center' : (themedTable.cellTextAlign || 'right'))),
                            ...themedTypography.cell,
                          } : undefined}
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
