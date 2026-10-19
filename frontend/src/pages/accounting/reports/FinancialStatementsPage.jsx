import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert, Box, Button, ButtonBase, Chip, CircularProgress, Divider, FormControl, Grid,
  InputLabel, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DescriptionIcon from '@mui/icons-material/Description';
import EditIcon from '@mui/icons-material/Edit';
import FunctionsIcon from '@mui/icons-material/Functions';
import ListAltIcon from '@mui/icons-material/ListAlt';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TableChartIcon from '@mui/icons-material/TableChart';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import axiosInstance from '../../../core/api/axiosConfig';
import CompanyEngine from '../../../core/engines/companyEngine';
import PageHeader from '../../../core/components/ui/PageHeader';
import { ProgressBar, SurfaceCard } from '../AccountingDashboardUI';
import { useModulePalette } from '../../../core/context/ModulePaletteContext';
import { DEFAULT_TYPOGRAPHY } from '../../../core/theme/appearanceDefaults';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';
import { toJalali } from '../../../core/utils/dateUtils';
import {
  EQUITY_COLUMNS, NOTE_SECTIONS, REPORT_EDITION, REPORT_PAGES,
  REPORT_TITLE, STATEMENTS,
  buildInitialValues, buildNoteDefaults, parseNumericInput, recalculateStatements,
} from './financialStatementsTemplate';

const ICONS = {
  book: MenuBookIcon,
  list: ListAltIcon,
  income: TrendingUpIcon,
  comprehensive: ShowChartIcon,
  assets: AccountBalanceWalletIcon,
  liabilities: AccountBalanceIcon,
  equity: TableChartIcon,
  cash: AccountBalanceWalletIcon,
  notes: DescriptionIcon,
};

const money = (value) => {
  if (value === '' || value === null || value === undefined) return '—';
  return formatPersianNumber(value);
};
const labelKey = (statementId, rowId) => `${statementId}:${rowId}`;

const PageFrame = ({ page, companyName, yearLabel, accent, children }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const PageIcon = ICONS[page.icon] || DescriptionIcon;
  return (
    <Paper elevation={0} sx={{
      bgcolor: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`,
      borderRadius: '18px', overflow: 'hidden', position: 'relative',
      boxShadow: '0 12px 32px rgba(15,23,42,0.045)',
      '@media print': { boxShadow: 'none', border: 'none', borderRadius: 0 },
    }}>
      <Box sx={{ height: 4, bgcolor: accent }} />
      <Box sx={{ p: { xs: 2, sm: 2.5, md: 3.5 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 2.25 }}>
          <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 0 }}>
            <Box sx={{
              width: 40, height: 40, flexShrink: 0, borderRadius: '11px', color: accent,
              bgcolor: alpha(accent, 0.08), border: `1px solid ${alpha(accent, 0.17)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PageIcon sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: Math.max(type.bodySize - 2, 9.5), color: theme.palette.text.secondary }}>
                {companyName}
              </Typography>
              <Typography sx={{ fontSize: Math.max(type.cardSize - 1, 12.5), fontWeight: 900, color: theme.palette.text.primary }}>
                {page.title}
              </Typography>
            </Box>
          </Stack>
          <Box sx={{ textAlign: 'left', flexShrink: 0 }}>
            <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.5), color: theme.palette.text.secondary }}>
              {yearLabel}
            </Typography>
            <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 800, color: accent }}>
              صفحه {page.page}
            </Typography>
          </Box>
        </Stack>
        {children}
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
          <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
            یادداشت‌های توضیحی، بخش جدایی‌ناپذیر صورت‌های مالی است.
          </Typography>
          <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
            {REPORT_EDITION}
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
};

const MiniStat = ({ label, value, suffix = 'ریال', color }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  return (
    <Box sx={{
      p: 1.25, borderRadius: '12px', bgcolor: alpha(color, 0.045),
      border: `1px solid ${alpha(color, 0.14)}`, height: '100%',
    }}>
      <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
        {label}
      </Typography>
      <Typography sx={{
        mt: 0.25, fontSize: Math.max(type.cardSize + 1, 15), fontWeight: 900,
        color, fontVariantNumeric: 'tabular-nums', lineHeight: 1.35,
      }}>
        {value} <Typography component="span" sx={{ fontSize: Math.max(type.bodySize - 3, 9), fontWeight: 500, color: theme.palette.text.secondary }}>{suffix}</Typography>
      </Typography>
    </Box>
  );
};

const PageNavigator = ({ activeIndex, setActiveIndex }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const page = REPORT_PAGES[activeIndex];
  return (
    <Stack spacing={0.9}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} useFlexGap>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
            مرحله {toPersianDigits(activeIndex + 1)} از {toPersianDigits(REPORT_PAGES.length)}
          </Typography>
          <Typography noWrap sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 800, color: theme.palette.text.primary }}>
            {page.title}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' } }}>
          {REPORT_PAGES.map((item, index) => {
            const active = index === activeIndex;
            const done = index < activeIndex;
            return (
              <Tooltip key={item.id} title={item.title}>
                <Box
                  onClick={() => setActiveIndex(index)}
                  sx={{
                    width: active ? 22 : 9, height: 9, borderRadius: 5, cursor: 'pointer',
                    bgcolor: active ? theme.palette.primary.main : (done ? alpha(theme.palette.primary.main, 0.38) : theme.palette.divider),
                    transition: 'all .18s ease',
                  }}
                />
              </Tooltip>
            );
          })}
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <Button size="small" variant="outlined" startIcon={<ChevronRightIcon />}
            disabled={activeIndex === 0} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
            sx={{ minWidth: 0, px: 1 }}>
            قبلی
          </Button>
          <Button size="small" variant="outlined" endIcon={<ChevronLeftIcon />}
            disabled={activeIndex === REPORT_PAGES.length - 1}
            onClick={() => setActiveIndex((index) => Math.min(REPORT_PAGES.length - 1, index + 1))}
            sx={{ minWidth: 0, px: 1 }}>
            بعدی
          </Button>
        </Stack>
      </Stack>
      <ProgressBar value={((activeIndex + 1) / REPORT_PAGES.length) * 100} height={5} />
    </Stack>
  );
};

const TocPage = ({ companyName, yearLabel, accent, onNavigate, activePageId }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const components = REPORT_PAGES.filter((page) => page.kind === 'statement' || page.kind === 'notes');
  return (
    <PageFrame page={REPORT_PAGES[1]} companyName={companyName} yearLabel={yearLabel} accent={accent}>
      <Typography sx={{ fontSize: Math.max(type.cardSize - 1, 12.5), fontWeight: 900, color: theme.palette.text.primary, mb: 0.35 }}>
        اجزای صورت‌های مالی
      </Typography>
      <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.8), color: theme.palette.text.secondary, mb: 1.5 }}>
        فهرست زیر بر اساس ساختار استاندارد صورت‌های مالی تهیه شده و هر ردیف قابل انتخاب است.
      </Typography>

      <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '12px', overflow: 'hidden' }}>
        <Box sx={{
          display: 'grid', gridTemplateColumns: '42px minmax(0, 1fr) 90px 70px',
          bgcolor: theme.palette.action.hover, px: 1.25, py: 0.75,
          fontSize: Math.max(type.bodySize - 3, 9), fontWeight: 800, color: theme.palette.text.secondary,
        }}>
          <span>#</span><span>عنوان</span><span>یادداشت</span><span>صفحه</span>
        </Box>
        {components.map((page, index) => (
          <ButtonBase key={page.id} onClick={() => onNavigate(page.id)} sx={{
            width: '100%', display: 'grid', gridTemplateColumns: '42px minmax(0, 1fr) 90px 70px',
            alignItems: 'center', textAlign: 'right', px: 1.25, py: 1.05,
            borderTop: `1px solid ${theme.palette.divider}`,
            bgcolor: activePageId === page.id ? alpha(accent, 0.055) : 'transparent',
            '&:hover': { bgcolor: alpha(accent, 0.035) },
          }}>
            <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.5), fontWeight: 800, color: accent }}>
              {toPersianDigits(index + 1)}
            </Typography>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 800, color: theme.palette.text.primary }}>
                {page.title}
              </Typography>
              <Typography noWrap sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
                {page.subtitle}
              </Typography>
            </Box>
            <Typography noWrap sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
              {page.noteRefs || '—'}
            </Typography>
            <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 900, color: accent }}>
              {page.page}
            </Typography>
          </ButtonBase>
        ))}
      </Box>

      <Box sx={{ mt: 2, p: 1.5, borderRadius: '12px', bgcolor: alpha(accent, 0.035), border: `1px solid ${alpha(accent, 0.12)}` }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
          <Box>
            <Typography sx={{ fontSize: Math.max(type.bodySize, 11), fontWeight: 900, color: theme.palette.text.primary }}>
              یادداشت‌های توضیحی
            </Typography>
            <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
              بخش جدایی‌ناپذیر صورت‌های مالی — صفحات ۱۰ تا ۷۹
            </Typography>
          </Box>
          <Chip size="small" label={`${toPersianDigits(NOTE_SECTIONS.length)} سرفصل`}
            sx={{ bgcolor: alpha(accent, 0.08), color: accent, fontWeight: 800 }} />
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.55, mt: 1.25 }}>
          {NOTE_SECTIONS.map((note) => (
            <Stack key={note.id} direction="row" justifyContent="space-between" spacing={1}>
              <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.primary }}>
                {note.number}. {note.title}
              </Typography>
              <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary, flexShrink: 0 }}>
                {note.page}
              </Typography>
            </Stack>
          ))}
        </Box>
      </Box>
    </PageFrame>
  );
};

const StatementTable = ({
  statementId, definition, values, editMode, labels, onCellChange, onLabelChange,
}) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const columns = definition.columns;
  const statementValues = values?.[statementId] || {};
  const cellSx = {
    fontSize: Math.max(type.bodySize - 2, 10), borderBottom: `1px solid ${theme.palette.divider}`,
    whiteSpace: 'nowrap', py: 0.5, px: 0.9,
  };
  const headSx = {
    ...cellSx, bgcolor: theme.palette.action.hover, fontWeight: 800,
    color: theme.palette.text.primary, fontSize: Math.max(type.bodySize - 3, 9),
  };
  const displayLabel = (row) => labels[labelKey(statementId, row.id)] ?? row.label;
  const displayValue = (row, columnKey) => {
    const raw = statementValues[row.id]?.[columnKey];
    if (raw === '' || raw === null || raw === undefined) return '—';
    if (row.expense) return `(${formatPersianNumber(Math.abs(Number(raw) || 0))})`;
    return formatPersianNumber(raw);
  };
  return (
    <TableContainer sx={{ overflowX: 'auto', '@media print': { overflow: 'visible' } }}>
      <Table size="small" sx={{ minWidth: definition.columns === EQUITY_COLUMNS ? 1160 : 620 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...headSx, minWidth: 230 }}>شرح</TableCell>
            <TableCell sx={{ ...headSx, width: 92, display: { xs: 'none', md: 'table-cell' } }}>مبنای استاندارد</TableCell>
            <TableCell sx={{ ...headSx, width: 54 }}>یادداشت</TableCell>
            {columns.map((column) => (
              <TableCell key={column.key} align="left" sx={{ ...headSx, minWidth: column.totalColumn ? 108 : 96 }}>
                {definition.columns === EQUITY_COLUMNS ? column.short : column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {definition.rows.map((row) => {
            const isSection = row.kind === 'section';
            const computed = Array.isArray(row.formula);
            const isStrong = row.kind === 'subtotal' || row.kind === 'total';
            if (isSection) {
              return (
                <TableRow key={row.id}>
                  <TableCell colSpan={3 + columns.length} sx={{
                    ...cellSx, py: 0.75, bgcolor: alpha(theme.palette.primary.main, 0.045),
                    fontWeight: 800, color: theme.palette.text.primary, whiteSpace: 'normal',
                  }}>
                    {displayLabel(row)}
                    {row.standard ? (
                      <Typography component="span" sx={{ mr: 1, fontSize: Math.max(type.bodySize - 3, 8.5), color: theme.palette.text.secondary }}>
                        ({row.standard})
                      </Typography>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            }
            return (
              <TableRow key={row.id} hover sx={{
                bgcolor: row.kind === 'total' ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
              }}>
                <TableCell sx={{
                  ...cellSx, whiteSpace: 'normal', minWidth: 230,
                  fontWeight: isStrong ? 900 : 500, pl: 0.9 + (row.indent || 0) * 1.4,
                  color: theme.palette.text.primary,
                }}>
                  <Stack direction="row" spacing={0.5} alignItems="center" useFlexGap>
                    {editMode && row.kind === 'item' ? (
                      <TextField
                        variant="standard" size="small" value={displayLabel(row)}
                        onChange={(event) => onLabelChange(row.id, event.target.value)}
                        inputProps={{ style: { fontSize: Math.max(type.bodySize - 2, 10) } }}
                        sx={{ minWidth: 190, '& .MuiInputBase-root': { fontSize: Math.max(type.bodySize - 2, 10) } }}
                      />
                    ) : (
                      <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 10), fontWeight: isStrong ? 900 : 500 }}>
                        {displayLabel(row)}
                      </Typography>
                    )}
                    {computed ? (
                      <Tooltip title="محاسبه خودکار از ردیف‌های مرتبط">
                        <FunctionsIcon sx={{ fontSize: 13, color: theme.palette.text.disabled }} />
                      </Tooltip>
                    ) : null}
                  </Stack>
                </TableCell>
                <TableCell sx={{ ...cellSx, display: { xs: 'none', md: 'table-cell' }, color: theme.palette.text.secondary }}>
                  {row.standard || '—'}
                </TableCell>
                <TableCell sx={{ ...cellSx, color: theme.palette.text.secondary }}>
                  {row.note || '—'}
                </TableCell>
                {columns.map((column) => (
                  <TableCell key={column.key} align="left" sx={{
                    ...cellSx, fontVariantNumeric: 'tabular-nums',
                    color: row.kind === 'total' ? theme.palette.text.primary : theme.palette.text.secondary,
                    fontWeight: isStrong ? 800 : 500,
                  }}>
                    {editMode && !computed ? (
                      <TextField
                        variant="standard" size="small"
                        value={statementValues[row.id]?.[column.key] ?? ''}
                        onChange={(event) => onCellChange(row.id, column.key, event.target.value)}
                        inputProps={{
                          inputMode: 'decimal',
                          style: {
                            textAlign: 'left', direction: 'ltr',
                            fontSize: Math.max(type.bodySize - 2, 10),
                            paddingLeft: 12, minWidth: 74,
                          },
                        }}
                      />
                    ) : (
                      <Typography sx={{
                        fontSize: Math.max(type.bodySize - 2, 10), fontWeight: isStrong ? 800 : 500,
                        direction: 'ltr', textAlign: 'left',
                      }}>
                        {displayValue(row, column.key)}
                      </Typography>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const StatementPage = ({
  page, companyName, yearLabel, accent, values, editMode, labels,
  onCellChange, onLabelChange,
}) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const definition = STATEMENTS[page.statement];
  return (
    <PageFrame page={page} companyName={companyName} yearLabel={yearLabel} accent={accent}>
      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
        <Chip size="small" label={definition.unit}
          sx={{ bgcolor: alpha(accent, 0.07), color: accent, fontWeight: 700 }} />
        <Chip size="small" label={`${toPersianDigits(definition.rows.filter((row) => row.kind === 'item').length)} ردیف قابل ویرایش`}
          sx={{ bgcolor: theme.palette.action.hover, color: theme.palette.text.secondary, fontWeight: 700 }} />
        {editMode ? (
          <Chip size="small" label="حالت ویرایش فعال" color="warning" variant="outlined" sx={{ fontWeight: 700 }} />
        ) : (
          <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: 14 }} />} label="مقادیر خودکار" variant="outlined" sx={{ fontWeight: 700 }} />
        )}
      </Stack>
      <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary, mb: 0.6 }}>
        {page.noteRefs ? `یادداشت‌های مرتبط: ${page.noteRefs}` : definition.footnote}
      </Typography>
      <StatementTable
        statementId={page.statement}
        definition={definition}
        values={values}
        editMode={editMode}
        labels={labels}
        onCellChange={onCellChange}
        onLabelChange={onLabelChange}
      />
    </PageFrame>
  );
};

const CoverPage = ({ companyName, yearLabel, data, summary, accent, onNavigate, generatedAt }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const bs = data?.balance_sheet || {};
  const inc = data?.income_statement || {};
  const cf = data?.cash_flow || {};
  const totalAssets = summary?.totalAssets ?? bs.total_assets;
  const netProfit = summary?.netProfit ?? inc.net_profit;
  const totalEquity = summary?.totalEquity ?? bs.total_equity;
  const netChange = summary?.netChange ?? cf.net_change;
  return (
    <PageFrame page={REPORT_PAGES[0]} companyName={companyName} yearLabel={yearLabel} accent={accent}>
      <Box sx={{
        position: 'relative', overflow: 'hidden', borderRadius: '16px', p: { xs: 2.5, md: 4 },
        background: `linear-gradient(135deg, ${accent} 0%, ${alpha(accent, 0.78)} 58%, ${alpha(accent, 0.62)} 100%)`,
        color: '#fff', mb: 2.5,
      }}>
        <Box sx={{
          position: 'absolute', width: 260, height: 260, borderRadius: '50%', top: -150, left: -80,
          bgcolor: 'rgba(255,255,255,0.12)',
        }} />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Chip size="small" label={REPORT_EDITION}
            sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', fontWeight: 800, mb: 2 }} />
          <Typography sx={{ fontSize: Math.max(type.bodySize, 11.5), opacity: 0.8 }}>
            {companyName}
          </Typography>
          <Typography sx={{ fontSize: { xs: 27, md: 38 }, fontWeight: 900, mt: 0.5, lineHeight: 1.35 }}>
            {REPORT_TITLE}
          </Typography>
          <Typography sx={{ fontSize: Math.max(type.cardSize, 13), opacity: 0.92, mt: 0.75 }}>
            {yearLabel}
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
            <Chip size="small" label="تولید خودکار از دفاتر" sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', fontWeight: 700 }} />
            <Chip size="small" label="قابل ویرایش" sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', fontWeight: 700 }} />
            {generatedAt ? <Chip size="small" label={`تولید: ${generatedAt}`} sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: '#fff', fontWeight: 700 }} /> : null}
          </Stack>
        </Box>
      </Box>

      <Grid container spacing={1}>
        <Grid item xs={12} sm={6} md={3}><MiniStat label="جمع دارایی‌ها" value={money(totalAssets)} color={accent} /></Grid>
        <Grid item xs={12} sm={6} md={3}><MiniStat label="سود / زیان خالص" value={money(netProfit)} color={(netProfit || 0) >= 0 ? '#0f766e' : theme.palette.error.main} /></Grid>
        <Grid item xs={12} sm={6} md={3}><MiniStat label="حقوق مالکانه" value={money(totalEquity)} color="#7c3aed" /></Grid>
        <Grid item xs={12} sm={6} md={3}><MiniStat label="خالص تغییر نقد" value={money(netChange)} color="#0e7490" /></Grid>
      </Grid>

      <Box sx={{ mt: 2.5 }}>
        <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 800, color: theme.palette.text.primary, mb: 1 }}>
          اجزای گزارش
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.75 }}>
          {REPORT_PAGES.filter((page) => page.kind === 'statement' || page.kind === 'notes').map((page) => (
            <ButtonBase key={page.id} onClick={() => onNavigate(page.id)}
              sx={{
                p: 1.1, borderRadius: '11px', border: `1px solid ${theme.palette.divider}`,
                textAlign: 'right', display: 'flex', justifyContent: 'flex-start', gap: 1,
                '&:hover': { bgcolor: alpha(accent, 0.04), borderColor: alpha(accent, 0.24) },
              }}>
              <Box sx={{
                width: 30, height: 30, flexShrink: 0, borderRadius: '9px', bgcolor: alpha(accent, 0.08),
                color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {React.createElement(ICONS[page.icon] || DescriptionIcon, { sx: { fontSize: 16 } })}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 800, color: theme.palette.text.primary }}>
                  {page.title}
                </Typography>
                <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
                  صفحه {page.page}
                </Typography>
              </Box>
            </ButtonBase>
          ))}
        </Box>
      </Box>
    </PageFrame>
  );
};

const TocSidebar = ({ activePageId, onNavigate, accent, currentIndex }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const groups = [...new Set(REPORT_PAGES.map((page) => page.group))];
  return (
    <SurfaceCard
      title="فهرست گزارش"
      icon={ListAltIcon}
      color={accent}
      contentSx={{ p: 0.9 }}
      action={(
        <Chip size="small" label={`${toPersianDigits(REPORT_PAGES.length)} صفحه`}
          sx={{ height: 22, fontSize: Math.max(type.bodySize - 3, 9), fontWeight: 800, bgcolor: alpha(accent, 0.08), color: accent }} />
      )}
    >
      <Stack spacing={0.25}>
        {groups.map((group) => (
          <Box key={group}>
            <Typography sx={{
              px: 0.85, pt: 1, pb: 0.5, fontSize: Math.max(type.bodySize - 3, 9),
              fontWeight: 800, color: theme.palette.text.secondary,
            }}>
              {group}
            </Typography>
            {REPORT_PAGES.filter((page) => page.group === group).map((page) => {
              const active = page.id === activePageId;
              const Icon = ICONS[page.icon] || DescriptionIcon;
              return (
                <ButtonBase key={page.id} onClick={() => onNavigate(page.id)} sx={{
                  width: '100%', p: 0.75, borderRadius: '10px', textAlign: 'right',
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  bgcolor: active ? alpha(accent, 0.075) : 'transparent',
                  border: `1px solid ${active ? alpha(accent, 0.18) : 'transparent'}`,
                  '&:hover': { bgcolor: alpha(accent, 0.04) },
                }}>
                  <Box sx={{
                    width: 29, height: 29, flexShrink: 0, borderRadius: '8px',
                    color: active ? accent : theme.palette.text.secondary,
                    bgcolor: active ? alpha(accent, 0.1) : theme.palette.action.hover,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon sx={{ fontSize: 16 }} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{
                      fontSize: Math.max(type.bodySize - 2, 9.8), fontWeight: active ? 900 : 600,
                      color: active ? accent : theme.palette.text.primary,
                    }}>
                      {page.short}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: Math.max(type.bodySize - 4, 8.5), color: theme.palette.text.secondary }}>
                      صفحه {page.page}
                    </Typography>
                  </Box>
                  {active ? <CheckCircleIcon sx={{ fontSize: 15, color: accent }} /> : null}
                </ButtonBase>
              );
            })}
          </Box>
        ))}
      </Stack>
      <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Typography sx={{ px: 0.85, fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
          پیشرفت مرور گزارش
        </Typography>
        <Box sx={{ px: 0.85, mt: 0.5 }}>
          <ProgressBar value={((currentIndex + 1) / REPORT_PAGES.length) * 100} color={accent} height={5} />
          <Typography sx={{ mt: 0.4, fontSize: Math.max(type.bodySize - 4, 8.5), color: theme.palette.text.secondary }}>
            {toPersianDigits(currentIndex + 1)} از {toPersianDigits(REPORT_PAGES.length)} صفحه
          </Typography>
        </Box>
      </Box>
    </SurfaceCard>
  );
};

const NotesPage = ({ companyName, yearLabel, accent, notesText, setNote, editMode }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  return (
    <PageFrame page={REPORT_PAGES[REPORT_PAGES.length - 1]} companyName={companyName} yearLabel={yearLabel} accent={accent}>
      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
        <Chip size="small" label={`${toPersianDigits(NOTE_SECTIONS.length)} سرفصل`}
          sx={{ bgcolor: alpha(accent, 0.07), color: accent, fontWeight: 700 }} />
        <Chip size="small" label="صفحات ۱۰ تا ۷۹"
          sx={{ bgcolor: theme.palette.action.hover, color: theme.palette.text.secondary, fontWeight: 700 }} />
        <Chip size="small" label={editMode ? 'قابل ویرایش' : 'متن خودکار'} variant="outlined" sx={{ fontWeight: 700 }} />
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.1 }}>
        {NOTE_SECTIONS.map((note) => (
          <Box key={note.id} sx={{
            p: 1.25, borderRadius: '12px', border: `1px solid ${theme.palette.divider}`,
            bgcolor: theme.palette.background.paper, minWidth: 0,
          }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Chip size="small" label={note.number}
                sx={{ height: 21, minWidth: 23, fontWeight: 900, bgcolor: alpha(accent, 0.08), color: accent }} />
              <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
                صفحه {note.page}
              </Typography>
            </Stack>
            <Typography sx={{ mt: 0.65, fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 900, color: theme.palette.text.primary }}>
              {note.title}
            </Typography>
            <Typography sx={{ mt: 0.2, fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary, mb: 0.75 }}>
              {note.hint}
            </Typography>
            {editMode ? (
              <TextField
                fullWidth multiline minRows={3} size="small"
                value={notesText?.[note.id] || ''}
                onChange={(event) => setNote(note.id, event.target.value)}
                placeholder="متن یادداشت را وارد کنید…"
                inputProps={{ style: { fontSize: Math.max(type.bodySize - 1, 10.5), lineHeight: 1.9 } }}
              />
            ) : (
              <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.8), color: theme.palette.text.secondary, lineHeight: 1.9 }}>
                {notesText?.[note.id] || 'برای این یادداشت متنی ثبت نشده است.'}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </PageFrame>
  );
};

const FinancialStatementsPage = () => {
  const theme = useTheme();
  const { typography, getPalette } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const accent = getPalette('accounting')?.accent || '#2563eb';
  const company = useMemo(() => CompanyEngine.getStoredCompany() || {}, []);
  const companyName = company?.name || 'شرکت جاری';

  const [activeIndex, setActiveIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [manualValues, setManualValues] = useState({});
  const [labels, setLabels] = useState({});
  const [notesText, setNotesText] = useState({});
  const [loadedKey, setLoadedKey] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [notice, setNotice] = useState(null);
  const [yearId, setYearId] = useState(null);

  const yearsQuery = useQuery({
    queryKey: ['acc-fs-years'],
    queryFn: () => axiosInstance.get('/accounting/fiscal-years/').then((response) => response.data),
  });
  const yearList = Array.isArray(yearsQuery.data) ? yearsQuery.data : yearsQuery.data?.results || [];

  useEffect(() => {
    if (yearId === null && yearList.length) {
      const current = yearList.find((year) => year.is_current) || yearList[0];
      setYearId(String(current.id));
    }
  }, [yearId, yearList]);

  const selectedYear = yearList.find((year) => String(year.id) === String(yearId));
  const priorYear = useMemo(() => {
    if (!selectedYear?.start_date) return null;
    return yearList
      .filter((year) => year.end_date && String(year.end_date) < String(selectedYear.start_date))
      .sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)))[0] || null;
  }, [yearList, selectedYear]);

  const fsQuery = useQuery({
    queryKey: ['acc-fs-workspace', yearId],
    enabled: !yearsQuery.isLoading && (yearId !== null || yearList.length === 0),
    queryFn: () => axiosInstance.get('/accounting/reports/financial-statements/', {
      params: yearId ? { fiscal_year: yearId } : {},
    }).then((response) => response.data),
  });
  const priorQuery = useQuery({
    queryKey: ['acc-fs-workspace-prior', priorYear?.id],
    enabled: Boolean(priorYear?.id),
    queryFn: () => axiosInstance.get('/accounting/reports/financial-statements/', {
      params: { fiscal_year: priorYear.id },
    }).then((response) => response.data),
  });
  const balanceQuery = useQuery({
    queryKey: ['acc-fs-balance-detail', yearId],
    enabled: !yearsQuery.isLoading && (yearId !== null || yearList.length === 0),
    queryFn: () => axiosInstance.get('/accounting/reports/balance-sheet/', {
      params: yearId ? { fiscal_year: yearId } : {},
    }).then((response) => response.data),
  });
  const priorBalanceQuery = useQuery({
    queryKey: ['acc-fs-balance-detail-prior', priorYear?.id],
    enabled: Boolean(priorYear?.id),
    queryFn: () => axiosInstance.get('/accounting/reports/balance-sheet/', {
      params: { fiscal_year: priorYear.id },
    }).then((response) => response.data),
  });

  const data = fsQuery.data;
  const detailLoading = balanceQuery.isLoading
    || (Boolean(priorYear?.id) && (priorQuery.isLoading || priorBalanceQuery.isLoading));
  const yearName = data?.fiscal_year?.name || selectedYear?.name || '';
  const yearLabel = data?.fiscal_year?.end_date
    ? `سال مالی منتهی به ${toJalali(data.fiscal_year.end_date)}`
    : (selectedYear?.end_date ? `سال مالی منتهی به ${toJalali(selectedYear.end_date)}` : 'همهٔ دوره‌ها');
  const generatedAt = data?.generated_at ? toJalali(String(data.generated_at).slice(0, 10)) : '—';
  const storageKey = `fs-workspace:${company?.id || 'company'}:${yearId || 'all'}:v1`;
  const activePage = REPORT_PAGES[activeIndex];

  const autoValues = useMemo(
    () => buildInitialValues(data, priorQuery.data, balanceQuery.data, priorBalanceQuery.data),
    [data, priorQuery.data, balanceQuery.data, priorBalanceQuery.data],
  );
  const computedValues = useMemo(() => recalculateStatements(manualValues), [manualValues]);
  const defaultsNotes = useMemo(
    () => buildNoteDefaults({ api: data, companyName, yearName }),
    [data, companyName, yearName],
  );
  const summary = useMemo(() => ({
    totalAssets: computedValues?.balanceAssets?.total_assets?.current ?? data?.balance_sheet?.total_assets,
    netProfit: computedValues?.income?.net_profit?.current ?? data?.income_statement?.net_profit,
    totalEquity: computedValues?.balanceLiabilities?.total_equity?.current ?? data?.balance_sheet?.total_equity,
    netChange: computedValues?.cashflow?.net_change?.current ?? data?.cash_flow?.net_change,
  }), [computedValues, data]);

  useEffect(() => {
    if (!data || detailLoading || loadedKey === storageKey) return;
    const initial = buildInitialValues(data, priorQuery.data, balanceQuery.data, priorBalanceQuery.data);
    let draft = null;
    try {
      draft = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
    } catch {
      draft = null;
    }
    const merged = { ...initial };
    if (draft?.values) {
      Object.entries(draft.values).forEach(([statementId, rows]) => {
        merged[statementId] = { ...(initial[statementId] || {}), ...(rows || {}) };
      });
    }
    setManualValues(merged);
    setLabels(draft?.labels || {});
    setNotesText(draft?.notes || defaultsNotes);
    setLoadedKey(storageKey);
    setLastSaved(draft?.savedAt ? new Date(draft.savedAt) : null);
  }, [data, priorQuery.data, balanceQuery.data, priorBalanceQuery.data, detailLoading, storageKey, loadedKey, defaultsNotes]);

  useEffect(() => {
    if (loadedKey !== storageKey) return undefined;
    const timer = setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify({
        values: manualValues, labels, notes: notesText, savedAt: new Date().toISOString(),
      }));
      setLastSaved(new Date());
    }, 600);
    return () => clearTimeout(timer);
  }, [manualValues, labels, notesText, storageKey, loadedKey]);

  const handleCellChange = (statementId, rowId, columnKey, raw) => {
    setManualValues((previous) => {
      const statement = { ...(previous[statementId] || {}) };
      const row = { ...(statement[rowId] || {}) };
      row[columnKey] = parseNumericInput(raw);
      statement[rowId] = row;
      return { ...previous, [statementId]: statement };
    });
  };

  const handleLabelChange = (statementId, rowId, value) => {
    setLabels((previous) => ({ ...previous, [labelKey(statementId, rowId)]: value }));
  };

  const handleNoteChange = (noteId, value) => {
    setNotesText((previous) => ({ ...previous, [noteId]: value }));
  };

  const goToPage = (pageId) => {
    const index = REPORT_PAGES.findIndex((page) => page.id === pageId);
    if (index >= 0) setActiveIndex(index);
  };

  const saveNow = () => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      values: manualValues, labels, notes: notesText, savedAt: new Date().toISOString(),
    }));
    setLastSaved(new Date());
    setNotice({ type: 'success', text: 'پیش‌نویس گزارش در همین مرورگر ذخیره شد.' });
  };

  const resetReport = () => {
    window.localStorage.removeItem(storageKey);
    setManualValues(autoValues);
    setLabels({});
    setNotesText(defaultsNotes);
    setLastSaved(null);
    setNotice({ type: 'success', text: 'مقادیر و ساختار گزارش به خروجی خودکار سیستم بازگشت.' });
  };

  const isLoading = yearsQuery.isLoading || (yearId === null && yearList.length > 0)
    || fsQuery.isLoading || detailLoading;
  const isError = yearsQuery.isError || fsQuery.isError;
  const isFetching = fsQuery.isFetching || priorQuery.isFetching
    || balanceQuery.isFetching || priorBalanceQuery.isFetching;
  const lastSavedLabel = lastSaved
    ? lastSaved.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<DescriptionIcon />}
        title={REPORT_TITLE}
        badge={<Chip size="small" label={editMode ? 'حالت ویرایش' : 'نسخهٔ قابل ویرایش'} sx={{ height: 23, fontWeight: 800, bgcolor: alpha(accent, 0.08), color: accent }} />}
        actions={(
          <>
            <FormControl size="small" sx={{ minWidth: 145 }}>
              <InputLabel>سال مالی</InputLabel>
              <Select value={yearId ?? ''} label="سال مالی" onChange={(event) => setYearId(event.target.value)}
                disabled={yearsQuery.isLoading}>
                <MenuItem value="">همهٔ دوره‌ها</MenuItem>
                {yearList.map((year) => (
                  <MenuItem key={year.id} value={String(year.id)}>
                    {toPersianDigits(year.name)}{year.is_current ? ' (جاری)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="به‌روزرسانی داده‌های گزارش">
              <span>
                <Button variant="outlined" onClick={() => {
                  fsQuery.refetch(); priorQuery.refetch();
                  balanceQuery.refetch(); priorBalanceQuery.refetch();
                }}
                  disabled={isFetching} sx={{ minWidth: 40, px: 1 }}>
                  <RefreshIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            <Button variant={editMode ? 'contained' : 'outlined'} startIcon={<EditIcon />}
              onClick={() => setEditMode((value) => !value)}>
              {editMode ? 'پایان ویرایش' : 'ویرایش'}
            </Button>
            <Button variant="outlined" startIcon={<SaveIcon />} onClick={saveNow}
              disabled={loadedKey !== storageKey}>
              ذخیره پیش‌نویس
            </Button>
            <Tooltip title="بازگشت به مقادیر خودکار سیستم">
              <span>
                <Button variant="outlined" onClick={resetReport} disabled={loadedKey !== storageKey}
                  sx={{ minWidth: 40, px: 1 }}>
                  <RestartAltIcon fontSize="small" />
                </Button>
              </span>
            </Tooltip>
            <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
              چاپ
            </Button>
          </>
        )}
      />

      {notice ? (
        <Alert severity={notice.type} sx={{ mb: 1.5, borderRadius: '12px' }} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      ) : null}

      {balanceQuery.isError ? (
        <Alert severity="warning" sx={{ mb: 1.5, borderRadius: '12px' }}>
          جزئیات گروه‌های حساب بارگذاری نشد؛ جمع‌های کلیدی از گزارش یکپارچه نمایش داده می‌شود.
        </Alert>
      ) : null}

      <Paper elevation={0} sx={{
        p: 1.25, mb: 1.5, borderRadius: '16px', bgcolor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
      }}>
        <Stack direction="row" spacing={1.25} useFlexGap flexWrap="wrap" alignItems="center">
          <Box sx={{
            width: 38, height: 38, borderRadius: '11px', color: accent,
            bgcolor: alpha(accent, 0.08), border: `1px solid ${alpha(accent, 0.16)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DescriptionIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 900, color: theme.palette.text.primary }}>
              {companyName}
            </Typography>
            <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.5), color: theme.palette.text.secondary }}>
              {yearLabel} · {REPORT_EDITION}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 8 }} />
          <Chip size="small" icon={<CalendarMonthIcon sx={{ fontSize: 14 }} />} label={`تولید: ${generatedAt}`}
            sx={{ fontWeight: 700, bgcolor: theme.palette.action.hover, color: theme.palette.text.secondary }} />
          {lastSavedLabel ? (
            <Chip size="small" icon={<CheckCircleIcon sx={{ fontSize: 14 }} />} label={`ذخیره: ${lastSavedLabel}`}
              sx={{ fontWeight: 700, bgcolor: alpha('#0f766e', 0.07), color: '#0f766e' }} />
          ) : null}
          <Chip size="small" label={priorYear ? `مقایسه با ${toPersianDigits(priorYear.name)}` : 'بدون سال مقایسه‌ای'}
            sx={{ fontWeight: 700, bgcolor: alpha(accent, 0.06), color: accent }} />
        </Stack>
      </Paper>

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={3} sx={{ '@media print': { display: 'none' } }}>
          <Box sx={{ position: { lg: 'sticky' }, top: 16 }}>
            <TocSidebar
              activePageId={activePage.id}
              onNavigate={goToPage}
              accent={accent}
              currentIndex={activeIndex}
            />
          </Box>
        </Grid>
        <Grid item xs={12} lg={9}>
          <Stack spacing={1.25}>
            <Paper elevation={0} sx={{
              p: 1.25, borderRadius: '16px', border: `1px solid ${theme.palette.divider}`,
              '@media print': { display: 'none' },
            }}>
              <PageNavigator activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
            </Paper>

            {isLoading ? (
              <Paper elevation={0} sx={{ py: 9, borderRadius: '18px', border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
                <CircularProgress size={30} sx={{ color: accent }} />
              </Paper>
            ) : isError ? (
              <Alert severity="error" sx={{ borderRadius: '12px' }}
                action={<Button size="small" onClick={() => {
                  yearsQuery.refetch(); fsQuery.refetch(); balanceQuery.refetch();
                }}>تلاش دوباره</Button>}>
                خطا در بارگذاری صورت‌های مالی. لطفاً دوباره تلاش کنید.
              </Alert>
            ) : activePage.kind === 'cover' ? (
              <CoverPage
                companyName={companyName}
                yearLabel={yearLabel}
                data={data}
                summary={summary}
                accent={accent}
                onNavigate={goToPage}
                generatedAt={generatedAt}
              />
            ) : activePage.kind === 'toc' ? (
              <TocPage
                companyName={companyName}
                yearLabel={yearLabel}
                accent={accent}
                onNavigate={goToPage}
                activePageId={activePage.id}
              />
            ) : activePage.kind === 'notes' ? (
              <NotesPage
                companyName={companyName}
                yearLabel={yearLabel}
                accent={accent}
                notesText={notesText}
                setNote={handleNoteChange}
                editMode={editMode}
              />
            ) : (
              <StatementPage
                page={activePage}
                companyName={companyName}
                yearLabel={yearLabel}
                accent={accent}
                values={computedValues}
                editMode={editMode}
                labels={labels}
                onCellChange={(rowId, columnKey, raw) => handleCellChange(activePage.statement, rowId, columnKey, raw)}
                onLabelChange={(rowId, value) => handleLabelChange(activePage.statement, rowId, value)}
              />
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FinancialStatementsPage;
