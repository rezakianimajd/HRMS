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
  EQUITY_COLUMNS, REPORT_EDITION, REPORT_PAGES,
  REPORT_TITLE, STATEMENTS,
  buildInitialValues, parseNumericInput, recalculateStatements,
} from './financialStatementsTemplate';
import { applyNoteOverrides, buildNotePages, NOTE_AMOUNT_COLUMNS } from './financialNotes';

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
const pageById = (pages, id) => pages.find((page) => page.id === id)
  || REPORT_PAGES.find((page) => page.id === id)
  || pages[0];
const roundPercent = (value) => Math.round((Number(value) || 0) * 1000) / 10;

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
              صفحه {toPersianDigits(page.page)}
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

const PageNavigator = ({ pages, activeIndex, setActiveIndex }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const page = pages[activeIndex] || pages[0];
  return (
    <Stack spacing={0.9}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} useFlexGap>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
            مرحله {toPersianDigits(activeIndex + 1)} از {toPersianDigits(pages.length)}
          </Typography>
          <Typography noWrap sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 800, color: theme.palette.text.primary }}>
            {page.title}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', md: 'flex' }, overflowX: 'auto', maxWidth: '52%', py: 0.5 }}>
          {pages.map((item, index) => {
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
            disabled={activeIndex === pages.length - 1}
            onClick={() => setActiveIndex((index) => Math.min(pages.length - 1, index + 1))}
            sx={{ minWidth: 0, px: 1 }}>
            بعدی
          </Button>
        </Stack>
      </Stack>
      <ProgressBar value={((activeIndex + 1) / Math.max(pages.length, 1)) * 100} height={5} />
    </Stack>
  );
};

const TocPage = ({ pages, companyName, yearLabel, accent, onNavigate, activePageId }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const components = pages.filter((page) => (
    page.kind === 'statement' || page.kind === 'notes' || page.kind === 'note'
  ));
  const noteCount = pages.filter((page) => page.kind === 'note').length;
  return (
    <PageFrame page={pageById(pages, 'toc')} companyName={companyName} yearLabel={yearLabel} accent={accent}>
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
              {toPersianDigits(page.page)}
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
              بخش جدایی‌ناپذیر صورت‌های مالی — صفحات ۱۰ تا ۵۷ و یادداشت‌های تکمیلی
            </Typography>
          </Box>
          <Chip size="small" label={`${toPersianDigits(noteCount)} صفحهٔ یادداشت`}
            sx={{ bgcolor: alpha(accent, 0.08), color: accent, fontWeight: 800 }} />
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.55, mt: 1.25 }}>
          {pages.filter((page) => page.kind === 'note').map((note) => (
            <ButtonBase key={note.id} onClick={() => onNavigate(note.id)}
              sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, width: '100%', textAlign: 'right', px: 0.5, py: 0.2, borderRadius: '7px' }}>
              <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.primary }}>
                {note.number}. {note.title}
              </Typography>
              <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary, flexShrink: 0 }}>
                {toPersianDigits(note.page)}
              </Typography>
            </ButtonBase>
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

const CoverPage = ({ pages, companyName, yearLabel, data, summary, accent, onNavigate, generatedAt }) => {
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
    <PageFrame page={pageById(pages, 'cover')} companyName={companyName} yearLabel={yearLabel} accent={accent}>
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
          {pages.filter((page) => page.kind === 'statement' || page.kind === 'notes').map((page) => (
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
                  صفحه {toPersianDigits(page.page)}
                </Typography>
              </Box>
            </ButtonBase>
          ))}
        </Box>
      </Box>
    </PageFrame>
  );
};

const TocSidebar = ({ pages, activePageId, onNavigate, accent, currentIndex }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const groups = [...new Set(pages.map((page) => page.group))];
  return (
    <SurfaceCard
      title="فهرست گزارش"
      icon={ListAltIcon}
      color={accent}
      contentSx={{ p: 0.9, maxHeight: '72vh', overflowY: 'auto' }}
      action={(
        <Chip size="small" label={`${toPersianDigits(pages.length)} صفحه`}
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
            {pages.filter((page) => page.group === group).map((page) => {
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
                      صفحه {toPersianDigits(page.page)}
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
          <ProgressBar value={((currentIndex + 1) / Math.max(pages.length, 1)) * 100} color={accent} height={5} />
          <Typography sx={{ mt: 0.4, fontSize: Math.max(type.bodySize - 4, 8.5), color: theme.palette.text.secondary }}>
            {toPersianDigits(currentIndex + 1)} از {toPersianDigits(pages.length)} صفحه
          </Typography>
        </Box>
      </Box>
    </SurfaceCard>
  );
};

const NotesIndexPage = ({ pages, companyName, yearLabel, accent, onNavigate, editMode }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const notePages = pages.filter((page) => page.kind === 'note');
  const withTables = notePages.filter((page) => page.tables?.some((table) => table.hasData));
  return (
    <PageFrame page={pageById(pages, 'notes')} companyName={companyName} yearLabel={yearLabel} accent={accent}>
      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
        <Chip size="small" label={`${toPersianDigits(notePages.length)} صفحهٔ یادداشت`}
          sx={{ bgcolor: alpha(accent, 0.07), color: accent, fontWeight: 700 }} />
        <Chip size="small" label={`${toPersianDigits(withTables.length)} یادداشت دارای جدول خودکار`}
          sx={{ bgcolor: theme.palette.action.hover, color: theme.palette.text.secondary, fontWeight: 700 }} />
        <Chip size="small" label={editMode ? 'ویرایش متن و اعداد' : 'تولید خودکار از دفاتر'} variant="outlined" sx={{ fontWeight: 700 }} />
      </Stack>
      <Box sx={{
        p: 1.35, mb: 1.5, borderRadius: '12px', bgcolor: alpha(accent, 0.035),
        border: `1px solid ${alpha(accent, 0.12)}`,
      }}>
        <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 900, color: theme.palette.text.primary }}>
          یادداشت‌های توضیحی، بخش جدایی‌ناپذیر صورت‌های مالی
        </Typography>
        <Typography sx={{ mt: 0.35, fontSize: Math.max(type.bodySize - 2, 9.8), color: theme.palette.text.secondary, lineHeight: 1.85 }}>
          هر یادداشت از همان گروه‌های حساب دفاتر ساخته می‌شود که جمع آن در صورت‌های مالی اساسی استفاده شده است.
          یادداشت‌های بدون داده به‌صورت خودکار حذف می‌شوند و یادداشت‌های الزامی رویه‌های حسابداری همیشه ارائه می‌شوند.
        </Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.8 }}>
        {notePages.map((note) => (
          <ButtonBase key={note.id} onClick={() => onNavigate(note.id)} sx={{
            display: 'block', width: '100%', textAlign: 'right', p: 1.1, borderRadius: '11px',
            border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper,
            '&:hover': { bgcolor: alpha(accent, 0.035), borderColor: alpha(accent, 0.22) },
          }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Chip size="small" label={note.number}
                sx={{ height: 21, minWidth: 23, fontWeight: 900, bgcolor: alpha(accent, 0.08), color: accent }} />
              <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
                صفحه {toPersianDigits(note.page)}
              </Typography>
            </Stack>
            <Typography sx={{ mt: 0.6, fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 900, color: theme.palette.text.primary }}>
              {note.title}
            </Typography>
            <Typography noWrap sx={{ mt: 0.15, fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
              {note.tables?.length ? `${toPersianDigits(note.tables.length)} جدول · ${note.tables.some((table) => table.hasData) ? 'دارای داده' : 'بدون داده'}` : 'متن استاندارد'}
            </Typography>
          </ButtonBase>
        ))}
      </Box>
    </PageFrame>
  );
};

const NoteTable = ({ table, accent, editMode, onCellChange }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const cellSx = {
    fontSize: Math.max(type.bodySize - 2, 9.5), borderBottom: `1px solid ${theme.palette.divider}`,
    py: 0.45, px: 0.75, whiteSpace: 'nowrap',
  };
  const headSx = {
    ...cellSx, bgcolor: theme.palette.action.hover, fontWeight: 800,
    color: theme.palette.text.primary, fontSize: Math.max(type.bodySize - 3, 9),
  };
  const columns = table.columns || NOTE_AMOUNT_COLUMNS;
  const display = (row, column) => {
    const raw = row.values?.[column.key];
    if (raw === '' || raw === null || raw === undefined) return '—';
    if (row.percent) return `${formatPersianNumber(roundPercent(raw))}٪`;
    if (table.expense) return `(${formatPersianNumber(Math.abs(Number(raw) || 0))})`;
    return formatPersianNumber(raw);
  };
  return (
    <Box sx={{ mt: 1.25 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
        <Box sx={{ width: 4, height: 16, borderRadius: 2, bgcolor: accent }} />
        <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), fontWeight: 900, color: theme.palette.text.primary }}>
          {table.title}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Chip size="small" label="مبالغ به ریال" sx={{ height: 20, fontSize: Math.max(type.bodySize - 4, 8.5), fontWeight: 700 }} />
      </Stack>
      <TableContainer sx={{ overflowX: 'auto', '@media print': { overflow: 'visible' } }}>
        <Table size="small" sx={{ minWidth: Math.max(480, 190 + columns.length * 105) }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...headSx, minWidth: 210 }}>شرح</TableCell>
              {columns.map((column) => (
                <TableCell key={column.key} align="left" sx={{ ...headSx, minWidth: 96 }}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {table.rows.map((row) => {
              if (row.kind === 'section') {
                return (
                  <TableRow key={row.id}>
                    <TableCell colSpan={columns.length + 1} sx={{
                      ...cellSx, whiteSpace: 'normal', py: 0.65, fontWeight: 800,
                      bgcolor: alpha(theme.palette.primary.main, 0.045), color: theme.palette.text.primary,
                    }}>
                      {row.label}
                    </TableCell>
                  </TableRow>
                );
              }
              const isTotal = row.kind === 'total';
              return (
                <TableRow key={row.id} hover sx={{ bgcolor: isTotal ? alpha(accent, 0.055) : 'transparent' }}>
                  <TableCell sx={{
                    ...cellSx, whiteSpace: 'normal', minWidth: 210,
                    fontWeight: isTotal ? 900 : 500, pl: 0.75 + (row.child ? 1.5 : 0),
                    color: theme.palette.text.primary,
                  }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.5), fontWeight: isTotal ? 900 : 500 }}>
                        {row.label}
                      </Typography>
                      {row.code ? (
                        <Typography component="span" sx={{ fontSize: Math.max(type.bodySize - 4, 8.5), color: theme.palette.text.disabled }}>
                          {toPersianDigits(row.code)}
                        </Typography>
                      ) : null}
                    </Stack>
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column.key} align="left" sx={{
                      ...cellSx, fontVariantNumeric: 'tabular-nums',
                      fontWeight: isTotal ? 800 : 500, color: isTotal ? theme.palette.text.primary : theme.palette.text.secondary,
                    }}>
                      {editMode && !isTotal && !row.child ? (
                        <TextField
                          variant="standard" size="small"
                          value={row.values?.[column.key] ?? ''}
                          onChange={(event) => onCellChange(table.id, row.id, column.key, event.target.value)}
                          inputProps={{
                            style: {
                              textAlign: 'left', direction: 'ltr',
                              fontSize: Math.max(type.bodySize - 2, 9.5), paddingLeft: 8, minWidth: 70,
                            },
                          }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.5), fontWeight: isTotal ? 800 : 500, direction: 'ltr', textAlign: 'left' }}>
                          {display(row, column)}
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
    </Box>
  );
};

const isHeadingParagraph = (text) => {
  const clean = String(text || '').trim();
  return /^[۰-۹0-9]+\s*[-ـ]/.test(clean) || (clean.length < 110 && !/[.؛:]$/.test(clean));
};

const NoteSummary = ({ tables, accent }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const summaries = (tables || [])
    .map((table) => ({ table, total: table.rows.find((row) => row.kind === 'total') }))
    .filter((item) => item.total);
  if (!summaries.length) return null;
  return (
    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
      {summaries.map(({ table, total }) => (
        <Chip
          key={table.id}
          size="small"
          label={`${table.title} — جمع دفتری: ${money(total.values?.current)}`}
          sx={{
            height: 'auto', py: 0.55, borderRadius: '8px', fontWeight: 700,
            bgcolor: alpha(accent, 0.055), color: theme.palette.text.primary,
            '& .MuiChip-label': { whiteSpace: 'normal', lineHeight: 1.6, fontSize: Math.max(type.bodySize - 3, 9) },
          }}
        />
      ))}
    </Stack>
  );
};

const ExcelNoteGrid = ({ grid, editMode, onCellChange }) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  if (!grid?.rows?.length) return null;
  const occupied = new Set();
  grid.rows.forEach((row) => row.cells.forEach((cell) => {
    for (let r = row.r; r < row.r + (cell.rs || 1); r += 1) {
      for (let c = cell.c; c < cell.c + (cell.cs || 1); c += 1) {
        if (r !== row.r || c !== cell.c) occupied.add(`${r}-${c}`);
      }
    }
  }));
  const cellSx = {
    fontSize: Math.max(type.bodySize - 2, 9.2),
    border: `1px solid ${theme.palette.divider}`,
    py: 0.4, px: 0.55, verticalAlign: 'middle', whiteSpace: 'normal',
  };
  return (
    <TableContainer sx={{ mt: 1, overflowX: 'auto', '@media print': { overflow: 'visible' } }}>
      <Table
        size="small"
        sx={{
          minWidth: Math.max(520, grid.maxCol * 72),
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          '& .MuiTableCell-root': { border: `1px solid ${theme.palette.divider}` },
        }}
      >
        <TableBody>
          {grid.rows.map((row) => {
            const hasNumber = row.cells.some((cell) => cell.x);
            const header = !hasNumber;
            const cellMap = new Map(row.cells.map((cell) => [cell.c, cell]));
            const rendered = [];
            let col = 1;
            while (col <= grid.maxCol) {
              if (occupied.has(`${row.r}-${col}`)) {
                col += 1;
                continue;
              }
              const cell = cellMap.get(col);
              if (!cell) {
                rendered.push(<TableCell key={`empty-${row.r}-${col}`} sx={cellSx} />);
                col += 1;
                continue;
              }
              const span = Math.max(cell.cs || 1, 1);
              if (cell.x) {
                rendered.push(
                  <TableCell
                    key={`${row.r}-${cell.c}`}
                    colSpan={span}
                    rowSpan={cell.rs || 1}
                    align="left"
                    sx={{
                      ...cellSx, fontVariantNumeric: 'tabular-nums',
                      bgcolor: header ? theme.palette.action.hover : 'transparent',
                      color: theme.palette.text.secondary,
                    }}
                  >
                    {editMode ? (
                      <TextField
                        variant="standard" size="small"
                        value={cell.v ?? ''}
                        onChange={(event) => onCellChange(row.r, cell.c, event.target.value)}
                        inputProps={{
                          style: {
                            textAlign: 'left', direction: 'ltr',
                            fontSize: Math.max(type.bodySize - 2, 9.2), paddingLeft: 6, minWidth: 54,
                          },
                        }}
                      />
                    ) : (
                      <Typography sx={{ fontSize: Math.max(type.bodySize - 2, 9.2), direction: 'ltr', textAlign: 'left' }}>
                        {cell.v === null || cell.v === undefined || cell.v === '' ? '—' : formatPersianNumber(cell.v)}
                      </Typography>
                    )}
                  </TableCell>,
                );
              } else {
                rendered.push(
                  <TableCell
                    key={`${row.r}-${cell.c}`}
                    colSpan={span}
                    rowSpan={cell.rs || 1}
                    sx={{
                      ...cellSx,
                      fontWeight: cell.b || header ? 800 : 500,
                      bgcolor: header ? alpha(theme.palette.primary.main, 0.035) : 'transparent',
                      color: theme.palette.text.primary,
                    }}
                  >
                    {cell.t}
                  </TableCell>,
                );
              }
              col += span;
            }
            return <TableRow key={row.r} hover={!header}>{rendered}</TableRow>;
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const NotePage = ({
  page, companyName, yearLabel, accent, editMode, onCellChange, onGridCellChange, onParagraphChange,
}) => {
  const theme = useTheme();
  const { typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  return (
    <PageFrame page={page} companyName={companyName} yearLabel={yearLabel} accent={accent}>
      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
        <Chip size="small" label={`یادداشت ${page.number}`}
          sx={{ bgcolor: alpha(accent, 0.08), color: accent, fontWeight: 800 }} />
        <Chip size="small" label={`صفحه ${toPersianDigits(page.page)}`}
          sx={{ bgcolor: theme.palette.action.hover, color: theme.palette.text.secondary, fontWeight: 700 }} />
        {page.supplemental ? (
          <Chip size="small" label="یادداشت تکمیلی" variant="outlined" sx={{ fontWeight: 700 }} />
        ) : null}
        <Chip size="small" label={editMode ? 'قابل ویرایش' : 'تولید خودکار از دفاتر'} variant="outlined" sx={{ fontWeight: 700 }} />
      </Stack>
      <Divider sx={{ my: 1.1 }} />
      {page.paragraphs?.length ? (
        <Stack spacing={0.9}>
          {page.paragraphs.map((paragraph, index) => (
            editMode ? (
              <TextField
                key={`${page.id}-p-${index}`}
                fullWidth multiline minRows={2} size="small"
                value={paragraph}
                onChange={(event) => onParagraphChange(page.page, index, event.target.value)}
                inputProps={{ style: { fontSize: Math.max(type.bodySize - 1, 10.5), lineHeight: 1.9 } }}
              />
            ) : (
              <Typography key={`${page.id}-p-${index}`} sx={{
                fontSize: Math.max(type.bodySize - 1, 10.5),
                fontWeight: isHeadingParagraph(paragraph) ? 800 : 400,
                color: isHeadingParagraph(paragraph) ? theme.palette.text.primary : theme.palette.text.secondary,
                lineHeight: 1.95, whiteSpace: 'pre-wrap',
              }}>
                {paragraph}
              </Typography>
            )
          ))}
        </Stack>
      ) : (
        <Typography sx={{ fontSize: Math.max(type.bodySize - 1, 10.5), color: theme.palette.text.secondary }}>
          این یادداشت به‌صورت خودکار از دفاتر حسابداری تهیه شده است.
        </Typography>
      )}
      <NoteSummary tables={page.tables} accent={accent} />
      {page.grid?.hasNumber ? (
        <ExcelNoteGrid
          grid={page.grid}
          editMode={editMode}
          onCellChange={onGridCellChange}
        />
      ) : (
        page.tables?.filter((table) => table.rows?.length).map((table) => (
          <NoteTable
            key={table.id}
            table={table}
            accent={accent}
            editMode={editMode}
            onCellChange={onCellChange}
          />
        ))
      )}
      {page.grid?.hasNumber ? (
        <Typography sx={{ mt: 0.75, fontSize: Math.max(type.bodySize - 4, 8.5), color: theme.palette.text.secondary }}>
          ساختار ردیف‌ها، ستون‌ها و ادغام‌ها عیناً از فایل ۳۸۴-v1 آمده است. علامت «—» یعنی مقدار آن خانه از دفاتر قابل استخراج نبوده و در حالت ویرایش قابل تکمیل است.
        </Typography>
      ) : null}
      {page.grid?.hasNumber && page.grid.coverage < 0.35
        && page.tables?.some((table) => table.rows?.length) ? (
          <Box sx={{ mt: 1.75 }}>
            <Typography sx={{ mb: 0.5, fontSize: Math.max(type.bodySize - 2, 9.8), fontWeight: 800, color: theme.palette.text.secondary }}>
              جمع‌بندی خودکار از گروه‌های حساب (برای کنترل و تکمیل جدول بالا)
            </Typography>
            {page.tables.filter((table) => table.rows?.length).map((table) => (
              <NoteTable
                key={`fallback-${table.id}`}
                table={table}
                accent={accent}
                editMode={editMode}
                onCellChange={onCellChange}
              />
            ))}
          </Box>
        ) : null}
      {page.grid?.hasNumber || page.tables?.some((table) => table.rows?.length) ? (
        <Box sx={{
          mt: 1.75, p: 1, borderRadius: '9px', bgcolor: alpha(accent, 0.035),
          border: `1px solid ${alpha(accent, 0.1)}`,
        }}>
          <Typography sx={{ fontSize: Math.max(type.bodySize - 3, 9), color: theme.palette.text.secondary }}>
            جمع این یادداشت با ردیف متناظر در صورت‌های مالی اساسی از یک منبع (گروه‌های حساب دفاتر) محاسبه شده است.
          </Typography>
        </Box>
      ) : null}
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
  const [noteValues, setNoteValues] = useState({});
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
  const openingYear = useMemo(() => {
    if (!priorYear?.start_date) return null;
    return yearList
      .filter((year) => year.end_date && String(year.end_date) < String(priorYear.start_date))
      .sort((a, b) => String(b.end_date).localeCompare(String(a.end_date)))[0] || null;
  }, [yearList, priorYear]);

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
  const openingBalanceQuery = useQuery({
    queryKey: ['acc-fs-balance-detail-opening', openingYear?.id],
    enabled: Boolean(openingYear?.id),
    queryFn: () => axiosInstance.get('/accounting/reports/balance-sheet/', {
      params: { fiscal_year: openingYear.id },
    }).then((response) => response.data),
  });

  const data = fsQuery.data;
  const detailLoading = balanceQuery.isLoading
    || (Boolean(priorYear?.id) && (priorQuery.isLoading || priorBalanceQuery.isLoading))
    || (Boolean(openingYear?.id) && openingBalanceQuery.isLoading);
  const yearLabel = data?.fiscal_year?.end_date
    ? `سال مالی منتهی به ${toJalali(data.fiscal_year.end_date)}`
    : (selectedYear?.end_date ? `سال مالی منتهی به ${toJalali(selectedYear.end_date)}` : 'همهٔ دوره‌ها');
  const generatedAt = data?.generated_at ? toJalali(String(data.generated_at).slice(0, 10)) : '—';
  const storageKey = `fs-workspace:${company?.id || 'company'}:${yearId || 'all'}:v1`;

  const autoValues = useMemo(
    () => buildInitialValues(
      data, priorQuery.data, balanceQuery.data, priorBalanceQuery.data,
      openingBalanceQuery.data,
    ),
    [data, priorQuery.data, balanceQuery.data, priorBalanceQuery.data, openingBalanceQuery.data],
  );
  const autoNotePages = useMemo(() => buildNotePages({
    api: data,
    prior: priorQuery.data,
    balanceData: balanceQuery.data,
    priorBalanceData: priorBalanceQuery.data,
    openingBalanceData: openingBalanceQuery.data,
    companyName,
  }), [
    data, priorQuery.data, balanceQuery.data, priorBalanceQuery.data, openingBalanceQuery.data,
    companyName,
  ]);
  const notePages = useMemo(
    () => applyNoteOverrides(autoNotePages, noteValues, notesText),
    [autoNotePages, noteValues, notesText],
  );
  const pages = useMemo(() => {
    const base = REPORT_PAGES.filter((page) => page.kind !== 'note');
    return [...base, ...notePages];
  }, [notePages]);
  const activePage = pages[activeIndex] || pages[0];
  useEffect(() => {
    if (activeIndex > pages.length - 1) setActiveIndex(Math.max(0, pages.length - 1));
  }, [activeIndex, pages.length]);
  const computedValues = useMemo(() => recalculateStatements(manualValues), [manualValues]);
  const summary = useMemo(() => ({
    totalAssets: computedValues?.balanceAssets?.total_assets?.current ?? data?.balance_sheet?.total_assets,
    netProfit: computedValues?.income?.net_profit?.current ?? data?.income_statement?.net_profit,
    totalEquity: computedValues?.balanceLiabilities?.total_equity?.current ?? data?.balance_sheet?.total_equity,
    netChange: computedValues?.cashflow?.net_change?.current ?? data?.cash_flow?.net_change,
  }), [computedValues, data]);

  useEffect(() => {
    if (!data || detailLoading || loadedKey === storageKey) return;
    const initial = buildInitialValues(
      data, priorQuery.data, balanceQuery.data, priorBalanceQuery.data,
      openingBalanceQuery.data,
    );
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
    setNoteValues(draft?.noteValues || {});
    setNotesText(draft?.notes || {});
    setLoadedKey(storageKey);
    setLastSaved(draft?.savedAt ? new Date(draft.savedAt) : null);
  }, [
    data, priorQuery.data, balanceQuery.data, priorBalanceQuery.data, openingBalanceQuery.data,
    detailLoading, storageKey, loadedKey,
  ]);

  useEffect(() => {
    if (loadedKey !== storageKey) return undefined;
    const timer = setTimeout(() => {
      window.localStorage.setItem(storageKey, JSON.stringify({
        values: manualValues, labels, noteValues, notes: notesText,
        savedAt: new Date().toISOString(),
      }));
      setLastSaved(new Date());
    }, 600);
    return () => clearTimeout(timer);
  }, [manualValues, labels, noteValues, notesText, storageKey, loadedKey]);

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

  const handleNoteCellChange = (notePage, tableId, rowId, columnKey, raw) => {
    setNoteValues((previous) => {
      const pageValues = { ...(previous[notePage] || {}) };
      const tableValues = { ...(pageValues[tableId] || {}) };
      const rowValues = { ...(tableValues[rowId] || {}) };
      rowValues[columnKey] = parseNumericInput(raw);
      tableValues[rowId] = rowValues;
      pageValues[tableId] = tableValues;
      return { ...previous, [notePage]: pageValues };
    });
  };

  const handleGridCellChange = (notePage, rowNumber, columnNumber, raw) => {
    setNoteValues((previous) => {
      const pageValues = { ...(previous[notePage] || {}) };
      const gridValues = { ...(pageValues.__grid__ || {}) };
      gridValues[`${rowNumber}-${columnNumber}`] = parseNumericInput(raw);
      pageValues.__grid__ = gridValues;
      return { ...previous, [notePage]: pageValues };
    });
  };

  const handleParagraphChange = (notePage, index, value) => {
    setNotesText((previous) => ({ ...previous, [`${notePage}:${index}`]: value }));
  };

  const goToPage = (pageId) => {
    const index = pages.findIndex((page) => page.id === pageId);
    if (index >= 0) setActiveIndex(index);
  };

  const saveNow = () => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      values: manualValues, labels, noteValues, notes: notesText,
      savedAt: new Date().toISOString(),
    }));
    setLastSaved(new Date());
    setNotice({ type: 'success', text: 'پیش‌نویس گزارش در همین مرورگر ذخیره شد.' });
  };

  const resetReport = () => {
    window.localStorage.removeItem(storageKey);
    setManualValues(autoValues);
    setLabels({});
    setNoteValues({});
    setNotesText({});
    setLastSaved(null);
    setNotice({ type: 'success', text: 'مقادیر و ساختار گزارش به خروجی خودکار سیستم بازگشت.' });
  };

  const isLoading = yearsQuery.isLoading || (yearId === null && yearList.length > 0)
    || fsQuery.isLoading || detailLoading;
  const isError = yearsQuery.isError || fsQuery.isError;
  const isFetching = fsQuery.isFetching || priorQuery.isFetching
    || balanceQuery.isFetching || priorBalanceQuery.isFetching
    || openingBalanceQuery.isFetching;
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
                  if (openingYear?.id) openingBalanceQuery.refetch();
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
              pages={pages}
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
              <PageNavigator pages={pages} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
            </Paper>

            {isLoading ? (
              <Paper elevation={0} sx={{ py: 9, borderRadius: '18px', border: `1px solid ${theme.palette.divider}`, textAlign: 'center' }}>
                <CircularProgress size={30} sx={{ color: accent }} />
              </Paper>
            ) : isError ? (
              <Alert severity="error" sx={{ borderRadius: '12px' }}
                action={<Button size="small" onClick={() => {
                  yearsQuery.refetch(); fsQuery.refetch(); priorQuery.refetch();
                  balanceQuery.refetch(); priorBalanceQuery.refetch();
                  if (openingYear?.id) openingBalanceQuery.refetch();
                }}>تلاش دوباره</Button>}>
                خطا در بارگذاری صورت‌های مالی. لطفاً دوباره تلاش کنید.
              </Alert>
            ) : activePage.kind === 'cover' ? (
              <CoverPage
                pages={pages}
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
                pages={pages}
                companyName={companyName}
                yearLabel={yearLabel}
                accent={accent}
                onNavigate={goToPage}
                activePageId={activePage.id}
              />
            ) : activePage.kind === 'notes' ? (
              <NotesIndexPage
                pages={pages}
                companyName={companyName}
                yearLabel={yearLabel}
                accent={accent}
                onNavigate={goToPage}
                editMode={editMode}
              />
            ) : activePage.kind === 'note' ? (
              <NotePage
                page={activePage}
                companyName={companyName}
                yearLabel={yearLabel}
                accent={accent}
                editMode={editMode}
                onCellChange={(tableId, rowId, columnKey, raw) => (
                  handleNoteCellChange(activePage.page, tableId, rowId, columnKey, raw)
                )}
                onGridCellChange={(rowNumber, columnNumber, raw) => (
                  handleGridCellChange(activePage.page, rowNumber, columnNumber, raw)
                )}
                onParagraphChange={handleParagraphChange}
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
