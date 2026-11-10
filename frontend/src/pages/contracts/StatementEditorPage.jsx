import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, FormControl,
  FormControlLabel, Grid, IconButton, InputAdornment, InputLabel, MenuItem,
  Paper, Select, Snackbar, Stack, Switch, TextField, ToggleButton,
  ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import PaymentsIcon from '@mui/icons-material/Payments';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import SaveIcon from '@mui/icons-material/Save';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import html2canvas from 'html2canvas';
import { printElement, printHtml } from '../../core/print/printEngine';
import {
  formatPersianNumber, formatStatementNumber, normalizeCurrencyLabel,
  normalizeStatementNumber, toEnglishDigits, toPersianDigits,
} from '../../core/utils/numberUtils';
import { getJalaliParts, toJalali } from '../../core/utils/dateUtils';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import ContractListPicker from '../../core/components/ui/ContractListPicker';
import MoneyInput from '../../core/components/ui/MoneyInput';
import PageHeader from '../../core/components/ui/PageHeader';
import useCompany from '../../core/hooks/useCompany';
import {
  KpiTileLine, SurfaceCard, INK, MUTED, SOFT_BG,
} from '../accounting/AccountingDashboardUI';
import { AttachmentPicker } from './AddendumWorkspaceUI';
import {
  StatementDetailDrawer, STATEMENT_ACCENT,
  contractAmountOf, dateLabel, money, rowMetrics,
} from './StatementWorkspaceUI';
import {
  ContractPickerLanding, ModulePager, ModuleTable, ModuleToolbar, moneyCell,
  useModuleTableState, useModuleTheme, useRowHeight,
} from './contractModuleUi';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  cumulativeRialFromForeign, displayAmount, fromRial, isRialCurrency, normalizeRate, rateOfStatement, toRial,
} from './statementCurrency';
import {
  STATEMENT_KIND_DECREASE, STATEMENT_KIND_INCREASE, STATEMENT_KIND_MULTI, STATEMENT_KIND_STATEMENT,
  adjustmentSummaryOf, isAdjustmentKind, isMultiKind, latestNormalStatement, statementDisplayTitle, statementKindOf,
} from './statementKinds';
import {
  paymentStatusOf, rowPaid, rowRemaining, invalidateContractFinanceQueries,
} from './contractPaymentsSummary';
import {
  adjustmentCumulativeFor, adjustmentForeignCumulativeFor, contractHasMultiLevels,
  foreignCumulativeFor, previousCumulativeFor, previousPeriodRows, seedLevelsFrom,
} from './statementChain';

const COLOR = '#6366f1';
const COLOR_DARK = '#4f46e5';
const KIND_OPTIONS = [
  { key: STATEMENT_KIND_STATEMENT, label: 'صورت‌وضعیت عادی (پیش‌فرض)', color: '#2563eb', icon: ReceiptLongIcon },
  { key: STATEMENT_KIND_MULTI, label: 'صورت‌وضعیت چند سطحی', color: '#7c3aed', icon: LayersOutlinedIcon },
  { key: STATEMENT_KIND_INCREASE, label: 'صورت‌وضعیت تعدیل (افزایشی)', color: '#15803d', icon: TrendingUpIcon },
  { key: STATEMENT_KIND_DECREASE, label: 'صورت‌وضعیت تعدیل (کاهشی)', color: '#be123c', icon: TrendingDownIcon },
];

const num = (v) => Math.max(0, Number(v) || 0);

/* چاپ صورت‌وضعیت: پیش‌نمایش زنده رستر می‌شود (html2canvas) و از موتور چاپ
   یکپارچه چاپ می‌شود؛ نتیجه پیکسل‌به‌پیکسل مثل پیش‌نمایش و همیشه یک صفحهٔ A4 است. */
const printStatement = async () => {
  const node = document.getElementById('statement-print-area');
  if (!node) {
    printElement('main', { title: 'صورت‌وضعیت' });
    return;
  }

  const prev = {
    boxShadow: node.style.boxShadow,
    border: node.style.border,
    borderRadius: node.style.borderRadius,
  };
  node.style.boxShadow = 'none';
  node.style.border = 'none';
  node.style.borderRadius = '0';

  try {
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // چیدمان روی یک صفحهٔ A4 ثابت: وسط‌چین افقی و بالا‌چین (حاشیهٔ سفید بقیه را پر می‌کند)
    const A4_W = 794;   // 210mm @ 96dpi
    const A4_H = 1123;  // 297mm @ 96dpi
    const RATIO = 2;
    const a4 = document.createElement('canvas');
    a4.width = A4_W * RATIO;
    a4.height = A4_H * RATIO;
    const ctx = a4.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, a4.width, a4.height);

    const PAD_X = 40;    // حاشیهٔ افقی (~5mm)
    const PAD_TOP = 24;  // حاشیهٔ بالا (~3mm)
    const availW = a4.width - PAD_X * 2;
    const availH = a4.height - PAD_TOP;
    const fit = Math.min(availW / canvas.width, availH / canvas.height);
    const w = canvas.width * fit;
    const h = canvas.height * fit;
    ctx.drawImage(canvas, (a4.width - w) / 2, PAD_TOP, w, h);

    const imgData = a4.toDataURL('image/png');
    printHtml(
      '<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8">'
      + '<title>صورت‌وضعیت</title><style>'
      + '@page{size:A4;margin:0}'
      + 'html,body{margin:0;padding:0;width:210mm;height:297mm;overflow:hidden;background:#fff}'
      + 'img{position:fixed;top:0;left:0;width:210mm;height:297mm;display:block}'
      + `</style></head><body><img src="${imgData}" /></body></html>`,
      { title: 'صورت‌وضعیت' },
    );
  } catch (error) {
    printElement('main', { title: 'صورت‌وضعیت' });
  } finally {
    node.style.boxShadow = prev.boxShadow;
    node.style.border = prev.border;
    node.style.borderRadius = prev.borderRadius;
  }
};

/* ------------------------------------------------------------------ */
/* A4-style statement preview                                          */
/* ------------------------------------------------------------------ */
const StatementPreview = ({
  form, contract, company, currencies, rate: rateProp,
  isMultiForm = false, levels = [], levelPreviousMap = {}, levelTotals = null,
  totalWork = 0, totalWorkForeign = 0, chargesBase = 0, chargesBaseForeign = 0,
  netAmount: netAmountProp = null, netAmountForeign: netAmountForeignProp = null,
}) => {
  const rate = num(rateProp) || 1;
  const kind = statementKindOf(form);
  const isAdjustment = kind.isAdjustment;
  const addendums = contract?.addendums || [];
  const baseAmount = num(contract?.amount);
  const totalAddendumChange = addendums.reduce((s, a) => s + num(a.amount_change), 0);
  const contractAmount = baseAmount + totalAddendumChange;
  const lastAddendum = addendums.length
    ? addendums.reduce((m, a) => (a.date > m.date ? a : m), addendums[0])
    : null;
  const endDateWithAddendum = lastAddendum?.new_end_date || contract?.end_date;

  const additions = Array.isArray(form.additions) ? form.additions : [];
  const deductions = Array.isArray(form.deductions) ? form.deductions : [];
  const additionsTotal = additions.reduce((s, a) => s + num(a.amount), 0);
  const deductionsTotal = deductions.reduce((s, d) => s + num(d?.amount), 0);
  const cumulativeThis = num(form.amount);
  const cumulativePrev = num(form.cumulative_previous_amount);
  const workDone = cumulativeThis - cumulativePrev;
  const adjustmentPrevious = num(form.adjustment_previous_amount);
  const adjustmentWork = kind.sign * Math.abs(num(form.adjustment_work_done));
  const adjustmentAmount = adjustmentPrevious + adjustmentWork;
  const netAmount = isAdjustment
    ? adjustmentWork + additionsTotal - deductionsTotal
    : (isMultiForm && netAmountProp != null
      ? num(netAmountProp)
      : workDone + additionsTotal - deductionsTotal);

  const cur = currencies.find((c) => String(c.id) === String(form.currency)) || null;
  const currencyLabel = normalizeCurrencyLabel(cur?.name || cur?.symbol);
  const fx = (v) => (rate > 1 ? v / rate : null);
  const cumulativeThisForeign = rate > 1
    ? (form.amount_foreign != null ? num(form.amount_foreign) : fx(cumulativeThis))
    : null;
  const cumulativePrevForeign = rate > 1
    ? (form.cumulative_previous_foreign != null ? num(form.cumulative_previous_foreign) : fx(cumulativePrev))
    : null;
  const workDoneForeign = rate > 1
    ? Math.max(0, cumulativeThisForeign - cumulativePrevForeign)
    : null;
  const adjustmentPreviousForeign = rate > 1 ? num(form.adjustment_previous_foreign) : null;
  const adjustmentWorkForeign = rate > 1
    ? kind.sign * Math.abs(num(form.adjustment_work_foreign))
    : null;
  const adjustmentAmountForeign = rate > 1
    ? (adjustmentPreviousForeign || 0) + (adjustmentWorkForeign || 0)
    : null;

  /** سطرهای سطوح کارکرد (هر سطح یک بلوک کامل «کارکرد و مبالغ») */
  const levelRows = (isMultiForm && Array.isArray(levels) ? levels : []).map((level) => {
    const key = String(level?.title || '')
      .replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const previous = (levelPreviousMap || {})[key] || { amount: 0, amount_foreign: 0 };
    const amountRial = num(level?.amount);
    const previousRial = num(previous.amount);
    const amountForeign = rate > 1
      ? (level?.amount_foreign != null ? num(level.amount_foreign) : fx(amountRial))
      : null;
    const previousForeign = rate > 1 ? num(previous.amount_foreign) : null;
    return {
      title: level?.title || '—',
      includesCharges: Boolean(level?.includes_charges),
      amountRial,
      previousRial,
      workRial: Math.max(0, amountRial - previousRial),
      amountForeign,
      previousForeign,
      workForeign: amountForeign != null && previousForeign != null
        ? Math.max(0, amountForeign - previousForeign)
        : null,
    };
  });
  const levelsWorkTotal = isMultiForm ? num(levelTotals?.work) : 0;
  const levelsWorkTotalForeign = rate > 1 && isMultiForm ? num(levelTotals?.workForeign) : null;
  const grandWorkTotal = isMultiForm ? num(totalWork) : 0;
  const grandWorkTotalForeign = rate > 1 && isMultiForm ? num(totalWorkForeign) : null;
  const chargesBaseValue = isMultiForm ? num(chargesBase) : workDone;
  const chargesBaseForeignValue = rate > 1 && isMultiForm ? num(chargesBaseForeign) : workDoneForeign;
  const netForeignDisplay = isMultiForm && netAmountForeignProp != null
    ? num(netAmountForeignProp)
    : fx(netAmount);

  return (
    <Box id="statement-print-area" dir="rtl" sx={{
      background: '#ffffff', borderRadius: '16px', p: 2,
      boxShadow: '0 20px 54px rgba(15,23,42,0.16)', border: '1px solid rgba(15,23,42,0.06)',
      position: 'relative', overflow: 'hidden',
      '&::before': { content: '""', position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% -10%, ${COLOR}1f, transparent 55%)`, pointerEvents: 'none' },
    }}>
      {/* Top-centered logo + company title (from primary definitions) */}
      <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', pb: 1 }}>
        {company?.logo_url ? (
          <Box component="img" src={company.logo_url} alt="logo"
            sx={{ width: 46, height: 46, borderRadius: '12px', objectFit: 'contain', background: '#fff', border: `1px solid ${COLOR}22`, boxShadow: `0 4px 12px ${COLOR}1f` }} />
        ) : (
          <Box sx={{ width: 46, height: 46, borderRadius: '12px', background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${COLOR}55` }}>
            <Typography fontWeight={900} color="#fff" fontSize={22}>{company?.name?.[0] || 'ش'}</Typography>
          </Box>
        )}
        <Typography variant="subtitle1" fontWeight={900} sx={{ color: '#1e293b', mt: 0.4, textAlign: 'center', fontSize: 15 }}>
          {company?.name || 'نام شرکت'}
        </Typography>
      </Box>

      <Divider sx={{ borderStyle: 'dashed', borderColor: `${COLOR}44`, my: 1 }} />

      {/* Section 1: statement number + date + currency */}
      <Grid container spacing={1.5}>
        <Grid item xs={4}><Field label={isAdjustment ? 'شماره تعدیل' : 'شماره صورت‌وضعیت'} value={formatStatementNumber(form.number) || '—'} /></Grid>
        <Grid item xs={4}><Field label={isAdjustment ? 'تاریخ تعدیل' : 'تاریخ'} value={form.date ? toJalali(form.date) : '—'} /></Grid>
        <Grid item xs={4}><Field label="واحد ارز" value={currencyLabel || '—'} /></Grid>
        <Grid item xs={12}><Field label="نوع سند" value={kind.label} strong color={kind.color} /></Grid>
      </Grid>

      <Divider sx={{ borderStyle: 'dashed', borderColor: `${COLOR}44`, my: 1 }} />

      {/* Section 2: contract / party info */}
      <Grid container spacing={1.5}>
        <Grid item xs={6}><Field label="نام پیمانکار" value={contract?.party_name || '—'} /></Grid>
        <Grid item xs={6}><Field label="شماره قرارداد" value={contract?.number || '—'} /></Grid>
        <Grid item xs={12}><Field label="موضوع قرارداد" value={contract?.subject || '—'} /></Grid>
        <Grid item xs={6}><Field label="تاریخ شروع" value={contract?.start_date ? toJalali(contract.start_date) : '—'} /></Grid>
        <Grid item xs={6}><Field label="تاریخ پایان" value={endDateWithAddendum ? toJalali(endDateWithAddendum) : '—'} /></Grid>
        <Grid item xs={6}><Field label="آخرین الحاقیه" value={lastAddendum?.date ? toJalali(lastAddendum.date) : '—'} /></Grid>
        <Grid item xs={6}><Field label="مبلغ قرارداد" value={`${formatPersianNumber(contractAmount)} ${currencyLabel || 'ریال'}`} strong color={COLOR_DARK} /></Grid>
      </Grid>

      <Divider sx={{ borderStyle: 'dashed', borderColor: `${COLOR}44`, my: 1 }} />

      {/* Section 3: financial breakdown */}
      <Box sx={{ borderRadius: '12px', p: 2, background: `linear-gradient(135deg, ${COLOR}0e, ${COLOR}05)`, border: `1px solid ${COLOR}22` }}>
        {isAdjustment ? (
          <>
            <Row label="مبلغ تجمعی صورت‌وضعیت (بدون تغییر)" value={cumulativeThis} strong foreign={cumulativeThisForeign} foreignSymbol={currencyLabel} />
            <Row label="تعدیل تجمعی دوره قبل" value={adjustmentPrevious} foreign={adjustmentPreviousForeign} foreignSymbol={currencyLabel} />
            <Row label={`${kind.label} این دوره`} value={adjustmentWork} highlight foreign={adjustmentWorkForeign} foreignSymbol={currencyLabel} />
            <Row label="تعدیل تجمعی" value={adjustmentAmount} strong foreign={adjustmentAmountForeign} foreignSymbol={currencyLabel} />
          </>
        ) : (
          <>
            <Row label="مبلغ تجمعی این صورت‌وضعیت" value={cumulativeThis} strong foreign={cumulativeThisForeign} foreignSymbol={currencyLabel} />
            <Row label="مبلغ تجمعی صورت‌وضعیت قبلی" value={cumulativePrev} foreign={cumulativePrevForeign} foreignSymbol={currencyLabel} />
            <Row label={isMultiForm ? 'کارکرد سطح اصلی' : 'کارکرد دوره'} value={workDone} highlight foreign={workDoneForeign} foreignSymbol={currencyLabel} />
            {isMultiForm ? (
              <>
                <Row label="جمع کارکرد سطوح" value={levelsWorkTotal} foreign={levelsWorkTotalForeign} foreignSymbol={currencyLabel} />
                <Row label="کارکرد کل (سطح اصلی + سطوح)" value={grandWorkTotal} strong foreign={grandWorkTotalForeign} foreignSymbol={currencyLabel} />
              </>
            ) : null}
          </>
        )}
      </Box>

      {/* سطوح کارکرد — صورت‌وضعیت چند سطحی */}
      {isMultiForm ? (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={800} sx={{ color: kind.color, mb: 0.5 }}>
            سطوح کارکرد
          </Typography>
          <Box sx={{ borderRadius: '10px', border: `1px solid ${kind.color}33`, overflow: 'hidden' }}>
            <Box sx={{
              display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 0.9fr',
              bgcolor: `${kind.color}0f`, px: 1, py: 0.5,
            }}>
              {['عنوان سطح', `مبلغ تجمعی (${currencyLabel || 'ریال'})`, 'دوره قبل', 'کارکرد'].map((heading) => (
                <Typography key={heading} variant="caption" sx={{ fontWeight: 800, fontSize: 11, color: '#334155' }}>{heading}</Typography>
              ))}
            </Box>
            {levelRows.length === 0 ? (
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', px: 1, py: 0.6 }}>
                سطحی ثبت نشده است.
              </Typography>
            ) : levelRows.map((row, index) => (
              <Box key={`preview-level-${index}`} sx={{
                display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 0.9fr',
                px: 1, py: 0.45, alignItems: 'center', borderTop: '1px dashed #e2e8f0',
              }}>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
                  <Typography variant="caption" noWrap sx={{ fontWeight: 800, fontSize: 11.5 }}>{row.title}</Typography>
                  <Chip size="small" label={row.includesCharges ? 'در مبنا' : 'مستقل'}
                    sx={{
                      height: 16, fontSize: 9.5,
                      bgcolor: row.includesCharges ? `${kind.color}18` : '#f1f5f9',
                      color: row.includesCharges ? kind.color : '#64748b',
                    }} />
                </Stack>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontSize: 11 }}>{formatPersianNumber(row.amountRial)}</Typography>
                  {row.amountForeign != null ? (
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontSize: 10 }}>
                      ≈ {formatPersianNumber(row.amountForeign)} {currencyLabel}
                    </Typography>
                  ) : null}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontSize: 11 }}>{formatPersianNumber(row.previousRial)}</Typography>
                  {row.previousForeign != null ? (
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontSize: 10 }}>
                      ≈ {formatPersianNumber(row.previousForeign)} {currencyLabel}
                    </Typography>
                  ) : null}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 800, color: '#0ea5e9' }}>
                    {formatPersianNumber(row.workRial)}
                  </Typography>
                  {row.workForeign != null ? (
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', fontSize: 10 }}>
                      ≈ {formatPersianNumber(row.workForeign)} {currencyLabel}
                    </Typography>
                  ) : null}
                </Box>
              </Box>
            ))}
            <Box sx={{ px: 1, py: 0.6, borderTop: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
              <Row label="جمع کارکرد سطوح" value={levelsWorkTotal} foreign={levelsWorkTotalForeign} foreignSymbol={currencyLabel} />
              <Row label="کارکرد کل (سطح اصلی + سطوح)" value={grandWorkTotal} strong
                foreign={grandWorkTotalForeign} foreignSymbol={currencyLabel} />
              <Row label="مبنای اضافات و کسورات (سطح اصلی + سطوح «در مبنا»)"
                value={chargesBaseValue} foreign={chargesBaseForeignValue} foreignSymbol={currencyLabel} />
            </Box>
          </Box>
        </Box>
      ) : null}

      {/* Additions */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#059669', mb: 0.5 }}>اضافات</Typography>
        {additions.length === 0 ? (
          <Typography variant="caption" color="textSecondary">افزودنی ثبت نشده</Typography>
        ) : (
          additions.map((a, i) => <Row key={i} label={a.description || 'اضافه'} value={num(a.amount)} foreign={fx(num(a.amount))} foreignSymbol={currencyLabel} />)
        )}
        <Box sx={{ borderTop: '1px solid #34d39933', mt: 0.5, pt: 0.5 }}>
          <Row label="جمع اضافات" value={additionsTotal} green strong foreign={fx(additionsTotal)} foreignSymbol={currencyLabel} />
        </Box>
      </Box>

      {/* Deductions */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" fontWeight={800} sx={{ color: '#b91c1c', mb: 0.5 }}>کسورات</Typography>
        {deductions.length === 0 ? (
          <Typography variant="caption" color="textSecondary">کسوری ثبت نشده</Typography>
        ) : (
          deductions.map((d, i) => <Row key={i} label={d.title || 'کسور'} value={num(d.amount)} foreign={fx(num(d.amount))} foreignSymbol={currencyLabel} />)
        )}
        <Box sx={{ borderTop: '1px solid #fca5a533', mt: 0.5, pt: 0.5 }}>
          <Row label="جمع کسورات" value={deductionsTotal} red strong foreign={fx(deductionsTotal)} foreignSymbol={currencyLabel} />
        </Box>
      </Box>

      <Divider sx={{ my: 1, borderStyle: 'dashed', borderColor: `${COLOR}44` }} />

      {/* Net payable */}
      <Box sx={{ borderRadius: '12px', p: 1.2, background: 'linear-gradient(135deg,#10b98114,#0ea5e912)', border: '1px solid #10b98140' }}>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', mb: 0.8 }}>
          {isAdjustment
            ? `مبلغ قابل پرداخت ${kind.label}`
            : (isMultiForm ? 'مبلغ قابل پرداخت (کارکرد سطح اصلی + سطوح + اضافات − کسورات)' : 'مبلغ قابل پرداخت این دوره')}
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Box sx={{ borderRadius: '10px', p: 1, background: '#05966912', border: '1px solid #05966933', textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary">ریال</Typography>
              <Typography variant="body1" fontWeight={900} sx={{ color: '#059669', direction: 'rtl', fontSize: 15 }}>{formatPersianNumber(netAmount)}</Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ borderRadius: '10px', p: 1, background: '#4338ca0f', border: '1px solid #4338ca33', textAlign: 'center' }}>
              <Typography variant="caption" color="textSecondary">{currencyLabel || 'ارز'}</Typography>
              <Typography variant="body1" fontWeight={900} sx={{ color: '#4338ca', direction: 'rtl', fontSize: 15 }}>{netForeignDisplay != null ? formatPersianNumber(netForeignDisplay) : '—'}</Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Signatures */}
      <Grid container spacing={2} sx={{ mt: 1.5 }}>
        {['تهیه‌کننده', 'تأییدکننده', 'مدیر مالی'].map((s) => (
          <Grid item xs={4} key={s}>
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ height: 26, borderBottom: `1px dashed ${COLOR}55`, mb: 0.5 }} />
              <Typography variant="caption" color="textSecondary">{s}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const Row = ({ label, value, strong, red, green, highlight, foreign, foreignSymbol }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 0.35, px: 1, mb: 0.35, borderRadius: '8px', background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(15,23,42,0.05)' }}>
    <Typography variant="caption" color="textSecondary" sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>{label}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
      <Typography variant="body2" fontWeight={strong || highlight ? 800 : 700} fontSize={13}
        sx={{ direction: 'rtl', color: red ? '#b91c1c' : green ? '#059669' : highlight ? '#0ea5e9' : strong ? COLOR_DARK : 'text.primary' }}>
        {formatPersianNumber(value)}
      </Typography>
      {foreign != null && (
        <Typography variant="caption" color="textSecondary" sx={{ direction: 'rtl', whiteSpace: 'nowrap', fontSize: 12 }}>
          ≈ {formatPersianNumber(foreign)} {foreignSymbol || ''}
        </Typography>
      )}
    </Box>
  </Box>
);

const Field = ({ label, value, strong, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, minWidth: 0 }}>
    <Typography variant="caption" color="textSecondary" sx={{ whiteSpace: 'nowrap', fontSize: 12 }}>{label}:</Typography>
    <Typography variant="body2" fontWeight={strong ? 800 : 700} sx={{ color: color || '#1e293b', fontSize: 13 }} noWrap>{value}</Typography>
  </Box>
);

/* ------------------------------------------------------------------ */
/* Main editor page                                                    */
/* ------------------------------------------------------------------ */
const MONTH_NAMES = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const GREEN = '#0f766e';
const AMBER = '#b45309';
const RED = '#be123c';
const BLUE = '#2563eb';
const compactMoney = (value, currency = '') => {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1000000000) return `${formatPersianNumber((amount / 1000000000).toFixed(1))} میلیارد ${currency}`.trim();
  if (Math.abs(amount) >= 1000000) return `${formatPersianNumber((amount / 1000000).toFixed(1))} میلیون ${currency}`.trim();
  return `${formatPersianNumber(amount)} ${currency}`.trim();
};
const todayIso = () => new Date().toISOString().slice(0, 10);
const asArray = (value) => (Array.isArray(value) ? value : value?.results || []);

/** ترتیب قطعی صورت‌وضعیت‌ها: تاریخ، سپس شناسه (برای تاریخ‌های یکسان) */
const compareStatements = (a, b) => {
  const dateCompare = String(a?.date || '').localeCompare(String(b?.date || ''));
  if (dateCompare) return dateCompare;
  return Number(a?.id || 0) - Number(b?.id || 0);
};

const StatementEditorPage = () => {
  const qc = useQueryClient();
  const theme = useTheme();
  const moduleTheme = useModuleTheme();
  const navigate = useNavigate();
  const { currentCompany } = useCompany();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlContract = searchParams.get('contract') || '';
  const [contractId, setContractId] = useState(urlContract);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [mode, setMode] = useState('list');
  const [form, setForm] = useState({});
  const [rateOverride, setRateOverride] = useState('');
  const [printPending, setPrintPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const { data: companyProfile } = useQuery({
    queryKey: ['company-profile'],
    queryFn: () => axiosInstance.get('/settings/company-profile/').then((response) => response.data),
  });
  const company = {
    name: companyProfile?.company_name || companyProfile?.legal_name || currentCompany?.name || '',
    code: currentCompany?.code || '',
    logo_url: companyProfile?.logo_url || currentCompany?.logo_url || null,
  };

  const { data: contracts, isLoading: contractsLoading } = useQuery({
    queryKey: ['external-contracts', 'statement-workspace'],
    queryFn: () => axiosInstance.get('/external-contracts/', { params: { page_size: 500 } }).then((response) => response.data),
  });
  const contractList = asArray(contracts);

  const { data: statementsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['contract-statements'],
    queryFn: () => axiosInstance.get('/contract-statements/', { params: { page_size: 500 } }).then((response) => response.data),
  });
  const allStatements = asArray(statementsData);

  const { data: contractDetail } = useQuery({
    queryKey: ['contract-statement-detail', contractId],
    queryFn: () => axiosInstance.get(`/external-contracts/${contractId}/`).then((response) => response.data),
    enabled: Boolean(contractId),
  });

  const { data: additionsDef } = useQuery({ queryKey: ['additions'], queryFn: () => axiosInstance.get('/additions/').then((response) => response.data) });
  const { data: deductionsDef } = useQuery({ queryKey: ['deductions'], queryFn: () => axiosInstance.get('/deductions/').then((response) => response.data) });
  const { data: currencies } = useQuery({ queryKey: ['currencies'], queryFn: () => axiosInstance.get('/currencies/').then((response) => response.data) });
  const additionList = asArray(additionsDef);
  const deductionList = asArray(deductionsDef);
  const currencyList = asArray(currencies);

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['contract-statement-payments', contractId],
    queryFn: () => axiosInstance.get('/contract-payments/', { params: { contract: contractId, page_size: 500 } }).then((response) => response.data),
    enabled: Boolean(contractId),
  });
  const payments = asArray(paymentsData);

  const selectedContract = contractDetail
    || contractList.find((contract) => String(contract.id) === String(contractId))
    || null;
  const scopedList = useMemo(
    () => (contractId ? allStatements.filter((row) => String(row.contract) === String(contractId)) : []),
    [allStatements, contractId],
  );
  const currenciesById = useMemo(
    () => currencyList.reduce((map, currency) => ({ ...map, [String(currency.id)]: currency }), {}),
    [currencyList],
  );
  const currencyLabel = normalizeCurrencyLabel(
    selectedContract?.currency_name || selectedContract?.currency_symbol
    || currenciesById[String(selectedContract?.currency)]?.name || 'ریال',
  );
  const selectedContractAmount = contractAmountOf(selectedContract);
  const lastStatement = useMemo(() => latestNormalStatement(scopedList), [scopedList]);
  const statementFallbackRate = useMemo(() => {
    const foreignRows = scopedList.filter((row) => Number(row.exchange_rate) > 1);
    const latestForeign = [...foreignRows].sort((a, b) => Number(b.id || 0) - Number(a.id || 0))[0];
    return latestForeign?.exchange_rate || 0;
  }, [scopedList]);
  const selectedContractRate = normalizeRate(
    statementFallbackRate
    || selectedContract?.exchange_rate
    || currencyList.find((currency) => String(currency.id) === String(selectedContract?.currency))?.exchange_rate
    || 1,
  );

  const counts = useMemo(() => {
    const next = { all: scopedList.length, approved: 0, pending: 0, adjustments: 0 };
    scopedList.forEach((row) => {
      if (isAdjustmentKind(row)) next.adjustments += 1;
      if (row.is_approved) next.approved += 1;
      else next.pending += 1;
    });
    return next;
  }, [scopedList]);

  const totals = useMemo(() => {
    const metrics = scopedList.map((row) => rowMetrics(row));
    const net = metrics.reduce((sum, item) => sum + item.net, 0);
    // کارکرد دوره = سطح اصلی + سطوح (فقط برای نمایش جمع می‌شود)
    const work = metrics.reduce((sum, item) => sum + item.totalWork, 0);
    const cumulative = lastStatement ? rowMetrics(lastStatement).amount : 0;
    const adjustments = adjustmentSummaryOf(scopedList);
    const foreignOf = (row, value) => displayAmount(row, value, selectedContractRate);
    const netForeign = scopedList.reduce((sum, row) => sum + foreignOf(row, rowMetrics(row).net), 0);
    const workForeign = scopedList.reduce((sum, row) => sum + foreignOf(row, rowMetrics(row).totalWork), 0);
    const cumulativeForeign = lastStatement ? foreignOf(lastStatement, cumulative) : 0;
    // «پرداخت‌شده» و «مانده» از API خوانده می‌شوند (جمع تخصیص‌های پرداخت) تا با
    // ثبت پرداخت در صفحهٔ پرداخت‌ها، این صفحه هم به‌صورت پویا به‌روز شود.
    const paid = scopedList.reduce((sum, row) => sum + rowPaid(row), 0);
    const remainingTotal = scopedList.reduce((sum, row) => sum + rowRemaining(row), 0);
    const paidForeign = selectedContractRate > 1 ? paid / selectedContractRate : paid;
    const remainingForeign = selectedContractRate > 1 ? remainingTotal / selectedContractRate : remainingTotal;
    return {
      net, work, cumulative, paid, netForeign, workForeign, cumulativeForeign, paidForeign, adjustments,
      outstanding: remainingTotal || Math.max(0, net - paid),
      outstandingForeign: remainingForeign || Math.max(0, netForeign - paidForeign),
      approvedCount: counts.approved,
      pendingCount: counts.pending,
      adjustmentCount: counts.adjustments,
      overContract: Math.max(0, cumulative - selectedContractAmount * selectedContractRate),
      overContractForeign: Math.max(0, cumulativeForeign - selectedContractAmount),
    };
  }, [scopedList, counts, selectedContractAmount, selectedContractRate, lastStatement]);
  const contractProgress = selectedContractAmount > 0
    ? Math.min(100, (totals.cumulativeForeign / selectedContractAmount) * 100)
    : 0;
  const displayTotals = {
    ...totals,
    net: totals.netForeign,
    work: totals.workForeign,
    cumulative: totals.cumulativeForeign,
    paid: totals.paidForeign,
    outstanding: totals.outstandingForeign,
    overContract: totals.overContractForeign,
  };

  const statementCountByContract = useMemo(
    () => allStatements.reduce((acc, row) => {
      const key = String(row.contract);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    [allStatements],
  );

  const pendingRows = useMemo(
    () => [...allStatements]
      .filter((row) => !row.is_approved)
      .sort((a, b) => compareStatements(b, a))
      .slice(0, 6),
    [allStatements],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = scopedList.filter((row) => {
      if (statusFilter === 'approved' && !row.is_approved) return false;
      if (statusFilter === 'pending' && row.is_approved) return false;
      if (statusFilter === 'adjustments' && !isAdjustmentKind(row)) return false;
      if (!query) return true;
      return [row.number, formatStatementNumber(row.number), statementKindOf(row).label, row.contract_subject, row.description, ...(row.documents || []).map((doc) => doc.title)]
        .some((value) => String(value || '').toLowerCase().includes(query));
    });
    result = [...result].sort((a, b) => {
      if (sortBy === 'amount') return Number(b.amount || 0) - Number(a.amount || 0);
      if (sortBy === 'net') return rowMetrics(b).net - rowMetrics(a).net;
      if (sortBy === 'work') return rowMetrics(b).totalWork - rowMetrics(a).totalWork;
      return compareStatements(b, a);
    });
    return result;
  }, [scopedList, search, statusFilter, sortBy]);

  /* صفحه‌سطحی و اندازه‌گیری جدول تک‌ردیفه (الگوی تضامین) */
  const scopedPageSize = moduleTheme.tableTheme.rowsPerPage;
  const { page, setPage, totalPages, pageNumbers } = useModuleTableState(
    filtered.length, scopedPageSize, [search, statusFilter, sortBy, contractId, scopedPageSize],
  );
  const pagedStatements = useMemo(
    () => filtered.slice(page * scopedPageSize, (page + 1) * scopedPageSize),
    [filtered, page, scopedPageSize],
  );
  const { ref: tableRef, rowHeight, tableHeight } = useRowHeight(moduleTheme.tableTheme, pagedStatements.length);
  const statusOptions = [
    { value: 'all', label: `همه (${formatPersianNumber(counts.all)})` },
    { value: 'approved', label: `تأییدشده (${formatPersianNumber(counts.approved)})` },
    { value: 'pending', label: `در انتظار تأیید (${formatPersianNumber(counts.pending)})` },
    { value: 'adjustments', label: `تعدیل‌ها (${formatPersianNumber(counts.adjustments)})` },
  ];
  const activeFilterCount = statusFilter !== 'all' ? 1 : 0;
  const statusLabelOf = (key) => ({
    approved: 'تأییدشده', pending: 'در انتظار تأیید', adjustments: 'تعدیل‌ها',
  }[key] || key);
  const activeChips = statusFilter !== 'all'
    ? [{ key: 'status', label: `وضعیت: ${statusLabelOf(statusFilter)}`, clear: () => setStatusFilter('all') }]
    : [];
  const scopedMode = Boolean(contractId);

  const monthlyData = useMemo(() => {
    const buckets = new Map();
    scopedList.forEach((row) => {
      if (!row.date) return;
      const parts = getJalaliParts(row.date);
      if (!parts) return;
      const key = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`;
      buckets.set(key, (buckets.get(key) || 0) + rowMetrics(row).net);
    });
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, value]) => {
        const month = Number(key.split('-')[1]);
        return { label: MONTH_NAMES[month - 1] || key, value };
      });
  }, [scopedList]);

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['contract-statements'] });
    qc.invalidateQueries({ queryKey: ['contract-statement-payments', contractId] });
    // تغییر صورت‌وضعیت، ماندهٔ قرارداد و گزارش‌های مالی را هم تحت تأثیر می‌گذارد.
    invalidateContractFinanceQueries(qc);
  };

  const withCalculationMode = (items) => (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    mode: item?.mode || (Number(item?.percent || 0) > 0 ? 'percent' : 'amount'),
  }));

  const sanitizeStatement = (payload) => {
    const additions = (Array.isArray(payload.additions) ? payload.additions : [])
      .map((item) => ({ ...item, percent: Number(item.percent) || 0, amount: Math.round(Number(item.amount) || 0) }));
    const deductions = (Array.isArray(payload.deductions) ? payload.deductions : [])
      .map((item) => ({ ...item, percent: Number(item.percent) || 0, amount: Math.round(Number(item.amount) || 0) }));
    const kind = payload.kind || STATEMENT_KIND_STATEMENT;
    const number = normalizeStatementNumber(payload.number);
    if (isAdjustmentKind(kind)) {
      const sign = statementKindOf(kind).sign;
      const magnitudeRial = Math.abs(Math.round(Number(payload.adjustment_work_done) || 0));
      const magnitudeForeign = Math.abs(Number(payload.adjustment_work_foreign) || 0)
        || fromRial(magnitudeRial, displayRate);
      // اضافات/کسورات تعدیل هم مثل صورت‌وضعیت عادی باید ذخیره شوند؛ مبنای
      // درصد، قدرمطلق مبلغ تعدیل همین دوره است (هم‌راستا با بک‌اند).
      const valueAddedTax = Math.max(0, Math.round(Number(payload.value_added_tax) || 0));
      const otherAdditions = Math.max(0, Math.round(Number(payload.other_additions) || 0));
      const additionsTotal = additions.reduce((sum, item) => sum + item.amount, 0) + valueAddedTax + otherAdditions;
      const deductionsTotal = deductions.reduce((sum, item) => sum + item.amount, 0);
      const signedRial = sign * magnitudeRial;
      const signedForeign = sign * magnitudeForeign;
      return {
        contract: Number(payload.contract) || null,
        number,
        kind,
        date: payload.date || null,
        amount: 0,
        foreign_amount: 0,
        cumulative_previous_amount: 0,
        work_done: signedRial,
        foreign_work_done: signedForeign,
        adjustment_work_done: signedRial,
        adjustment_foreign_work_done: signedForeign,
        value_added_tax: valueAddedTax,
        other_additions: otherAdditions,
        additions: additions.map(({ code, description, percent, amount: itemAmount, mode }) => ({ code, description, percent, amount: itemAmount, mode })),
        additions_total: additionsTotal,
        deductions: deductions.map(({ title, description, percent, amount: itemAmount, note, mode }) => ({ title, description, percent, amount: itemAmount, note, mode })),
        deductions_total: deductionsTotal,
        net_amount: Math.round(signedRial + additionsTotal - deductionsTotal),
        levels: [],
        currency: payload.currency || null,
        exchange_rate: normalizeRate(rate),
        is_approved: Boolean(payload.is_approved),
        description: payload.description || '',
      };
    }
    if (isMultiKind(kind)) {
      // سطح سند مثل صورت‌وضعیت عادی است؛ هر سطح فقط کارکرد و تجمعی خودش را
      // دارد و با تیک «شامل اضافات و کسورات» به مبنای درصد سند اضافه می‌شود.
      const cleanLevels = (Array.isArray(payload.levels) ? payload.levels : [])
        .map((level) => ({
          title: String(level.title || '').trim(),
          amount: Math.max(0, Math.round(Number(level.amount) || 0)),
          amount_foreign: Math.max(0, Number(level.amount_foreign) || 0),
          includes_charges: Boolean(level.includes_charges),
        }))
        .filter((level) => level.title);
      const amount = Math.max(0, Math.round(Number(payload.amount) || 0));
      const previous = Math.max(0, Math.round(Number(payload.cumulative_previous_amount) || 0));
      const work = Math.max(0, amount - previous);
      // کارکرد سطوح فقط در «خالص قابل پرداخت» با کارکرد سند جمع می‌شود.
      const levelsWork = cleanLevels.reduce((sum, level) => {
        const levelPrevious = Number(
          (levelPreviousMap[levelKeyOf(level.title)] || {}).amount || 0,
        );
        return sum + Math.max(0, level.amount - levelPrevious);
      }, 0);
      const valueAddedTax = Math.max(0, Math.round(Number(payload.value_added_tax) || 0));
      const otherAdditions = Math.max(0, Math.round(Number(payload.other_additions) || 0));
      const additionsTotalValue = additions.reduce((sum, item) => sum + item.amount, 0) + valueAddedTax + otherAdditions;
      const deductionsTotalValue = deductions.reduce((sum, item) => sum + item.amount, 0);
      return {
        contract: Number(payload.contract) || null,
        number,
        kind,
        date: payload.date || null,
        amount,
        foreign_amount: Math.max(0, Number(payload.amount_foreign) || 0),
        cumulative_previous_amount: previous,
        work_done: work,
        value_added_tax: valueAddedTax,
        other_additions: otherAdditions,
        additions: additions.map(({ code, description, percent, amount: itemAmount, mode }) => ({ code, description, percent, amount: itemAmount, mode })),
        additions_total: additionsTotalValue,
        deductions: deductions.map(({ title, description, percent, amount: itemAmount, note, mode }) => ({ title, description, percent, amount: itemAmount, note, mode })),
        deductions_total: deductionsTotalValue,
        net_amount: Math.round(work + levelsWork + additionsTotalValue - deductionsTotalValue),
        levels: cleanLevels,
        currency: payload.currency || null,
        exchange_rate: normalizeRate(rate),
        is_approved: Boolean(payload.is_approved),
        description: payload.description || '',
      };
    }
    // تمام فیلدهای مالی در دیتابیس ریالی و بدون اعشار ذخیره می‌شوند.
    const amount = Math.max(0, Math.round(Number(payload.amount) || 0));
    const previous = Math.max(0, Math.round(Number(payload.cumulative_previous_amount) || 0));
    const work = Math.max(0, amount - previous);
    const valueAddedTax = Math.max(0, Math.round(Number(payload.value_added_tax) || 0));
    const otherAdditions = Math.max(0, Math.round(Number(payload.other_additions) || 0));
    const additionsTotal = additions.reduce((sum, item) => sum + item.amount, 0) + valueAddedTax + otherAdditions;
    const deductionsTotal = deductions.reduce((sum, item) => sum + item.amount, 0);
    return {
      contract: Number(payload.contract) || null,
      number,
      kind: STATEMENT_KIND_STATEMENT,
      date: payload.date || null,
      amount,
      foreign_amount: Math.max(0, Number(payload.amount_foreign) || 0),
      cumulative_previous_amount: previous,
      work_done: work,
      value_added_tax: valueAddedTax,
      other_additions: otherAdditions,
      additions: additions.map(({ code, description, percent, amount: itemAmount, mode }) => ({ code, description, percent, amount: itemAmount, mode })),
      additions_total: additionsTotal,
      deductions: deductions.map(({ title, description, percent, amount: itemAmount, note, mode }) => ({ title, description, percent, amount: itemAmount, note, mode })),
      deductions_total: deductionsTotal,
      net_amount: Math.round(work + additionsTotal - deductionsTotal),
      levels: [],
      currency: payload.currency || null,
      exchange_rate: normalizeRate(rate),
      is_approved: Boolean(payload.is_approved),
      description: payload.description || '',
    };
  };

  const uploadStatementFiles = async (statementId, contract, files = []) => {
    await Promise.all(files.map((file) => {
      const body = new FormData();
      body.append('contract', contract);
      body.append('statement', statementId);
      body.append('title', (file.name.replace(/\.[^.]+$/, '') || 'مدرک صورت‌وضعیت').slice(0, 200));
      body.append('file', file);
      return axiosInstance.post('/contract-documents/', body);
    }));
  };

  const save = useMutation({
    mutationFn: async (payload) => {
      const clean = sanitizeStatement(payload);
      const response = payload.id
        ? await axiosInstance.patch(`/contract-statements/${payload.id}/`, clean)
        : await axiosInstance.post('/contract-statements/', clean);
      const statementId = response.data?.id || payload.id;
      let uploadError = '';
      if (payload.pendingFiles?.length) {
        try {
          await uploadStatementFiles(statementId, clean.contract, payload.pendingFiles);
        } catch (uploadFailure) {
          const data = uploadFailure.response?.data;
          uploadError = typeof data === 'string'
            ? data
            : (data?.file?.[0] || data?.statement?.[0] || data?.detail || 'بارگذاری مدارک انجام نشد');
        }
      }
      return { response, uploadError };
    },
    onSuccess: ({ uploadError }) => {
      invalidateAll();
      setMode('list');
      setForm({});
      setRateOverride('');
      setError('');
      setToast(uploadError
        ? `صورت‌وضعیت ذخیره شد اما بارگذاری مدارک ناقص بود: ${uploadError}`
        : 'صورت‌وضعیت و مدارک ذخیره شدند');
    },
    onError: (event) => {
      const data = event.response?.data;
      const first = typeof data === 'string'
        ? data
        : Array.isArray(data)
          ? data[0]
          : data && Object.values(data).flat()[0];
      setError(typeof first === 'string' ? first : 'ذخیره صورت‌وضعیت انجام نشد.');
    },
  });

  const toggleApproval = useMutation({
    mutationFn: (row) => axiosInstance.patch(`/contract-statements/${row.id}/`, { is_approved: !row.is_approved }),
    onSuccess: (_data, row) => {
      invalidateAll();
      setDetail(null);
      setToast(row.is_approved ? 'تأیید صورت‌وضعیت لغو شد' : 'صورت‌وضعیت تأیید شد');
    },
    onError: () => setToast('تغییر وضعیت تأیید انجام نشد'),
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-statements/${id}/`),
    onSuccess: () => {
      invalidateAll();
      setConfirmDelete(null);
      setDetail(null);
      setToast('صورت‌وضعیت حذف شد');
    },
    onError: () => setToast('حذف صورت‌وضعیت انجام نشد'),
  });

  const removeDocument = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-documents/${id}/`),
    onSuccess: (_data, id) => {
      setForm((previous) => ({
        ...previous,
        documents: (previous.documents || []).filter((document) => document.id !== id),
      }));
      invalidateAll();
      setToast('مدرک پیوست حذف شد');
    },
    onError: () => setError('حذف مدرک پیوست انجام نشد'),
  });

  useEffect(() => { setContractId(urlContract); }, [urlContract]);

  useEffect(() => {
    setSearch('');
    setStatusFilter('all');
    setSortBy('newest');
    setDetail(null);
  }, [contractId]);

  useEffect(() => {
    if (mode === 'form' && printPending) {
      const timer = setTimeout(() => { printStatement(); setPrintPending(false); }, 550);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [mode, printPending]);

  const selectContract = (contract) => {
    const next = String(contract.id);
    setContractId(next);
    setSearchParams({ contract: next });
  };
  const clearContract = () => {
    setContractId('');
    setSearchParams({});
  };
  const selectContractById = (id) => {
    const target = contractList.find((contract) => String(contract.id) === String(id));
    if (target) selectContract(target);
  };

  const setField = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const additions = Array.isArray(form.additions) ? form.additions : [];
  const deductions = Array.isArray(form.deductions) ? form.deductions : [];
  const valueAddedTax = num(form.value_added_tax);
  const otherAdditions = num(form.other_additions);
  const additionsTotal = additions.reduce((sum, item) => sum + num(item.amount), 0) + valueAddedTax + otherAdditions;
  const previewAdditions = [
    ...additions,
    ...(valueAddedTax ? [{ description: 'ارزش افزوده', amount: valueAddedTax }] : []),
    ...(otherAdditions ? [{ description: 'سایر اضافات', amount: otherAdditions }] : []),
  ];
  const deductionsTotal = deductions.reduce((sum, item) => sum + num(item.amount), 0);
  const formKind = statementKindOf(form);
  const isAdjustmentForm = formKind.isAdjustment;
  const isMultiForm = Boolean(formKind.isMulti);
  const contractHasMulti = contractHasMultiLevels(scopedList);
  const levels = Array.isArray(form.levels) ? form.levels : [];
  const levelKeyOf = (title) => String(title || '')
    .replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  /** آخرین مبلغ تجمعی هر سطح در اسناد «دورهٔ قبل» همان قرارداد. */
  const levelPreviousMap = (() => {
    const map = {};
    previousPeriodRows(
      (Array.isArray(scopedList) ? scopedList : []).filter((row) => !isAdjustmentKind(row)),
      { excludeId: form.id, number: form.number },
    )
      .forEach((row) => {
        (Array.isArray(row.levels) ? row.levels : []).forEach((level) => {
          const key = levelKeyOf(level.title);
          if (!key) return;
          map[key] = { amount: num(level.amount), amount_foreign: num(level.amount_foreign) };
        });
      });
    return map;
  })();
  /** عنوان سطوحی قابل انتخاب (سطوحی همین قرارداد + سطوحی فرم فعلی). */
  const levelSuggestions = (() => {
    const seen = new Set();
    const list = [];
    [...(Array.isArray(scopedList) ? scopedList : []), { levels }].forEach((row) => {
      (Array.isArray(row.levels) ? row.levels : []).forEach((level) => {
        const title = String(level?.title || '').trim();
        const key = levelKeyOf(title);
        if (!key || seen.has(key)) return;
        seen.add(key);
        list.push(title);
      });
    });
    return list;
  })();
  const levelsTotals = levels.reduce((totals, level) => {
    const previous = levelPreviousMap[levelKeyOf(level.title)] || { amount: 0, amount_foreign: 0 };
    const amount = Math.max(0, num(level.amount));
    const amountForeign = num(level.amount_foreign);
    const work = Math.max(0, amount - num(previous.amount));
    const workForeign = Math.max(0, amountForeign - num(previous.amount_foreign));
    const included = Boolean(level.includes_charges);
    return {
      amount: totals.amount + amount,
      foreign: totals.foreign + amountForeign,
      previous: totals.previous + num(previous.amount),
      previousForeign: totals.previousForeign + num(previous.amount_foreign),
      work: totals.work + work,
      workForeign: totals.workForeign + workForeign,
      includedWork: totals.includedWork + (included ? work : 0),
      includedWorkForeign: totals.includedWorkForeign + (included ? workForeign : 0),
    };
  }, {
    amount: 0,
    foreign: 0,
    previous: 0,
    previousForeign: 0,
    work: 0,
    workForeign: 0,
    includedWork: 0,
    includedWorkForeign: 0,
  });
  const cumulativePrev = num(form.cumulative_previous_amount);
  const cumulativeThis = num(form.amount);
  const formCurrency = currencyList.find((currency) => String(currency.id) === String(form.currency)) || null;
  const formCurrencyLabel = normalizeCurrencyLabel(
    formCurrency?.name || formCurrency?.symbol || currencyLabel,
  );
  const isRial = isRialCurrency(formCurrencyLabel);
  const baseRate = normalizeRate(formCurrency?.exchange_rate || 1);
  const rate = rateOverride !== '' && rateOverride != null ? normalizeRate(rateOverride) : baseRate;
  const displayRate = isRial ? 1 : rate;
  const displayValue = (rialValue) => (displayRate > 1 ? fromRial(rialValue, displayRate) : num(rialValue));
  const cumulativePrevForeign = form.cumulative_previous_foreign != null
    ? num(form.cumulative_previous_foreign)
    : (displayRate > 1 ? fromRial(cumulativePrev, displayRate) : cumulativePrev);
  const cumulativeThisForeign = form.amount_foreign != null
    ? num(form.amount_foreign)
    : (displayRate > 1 ? fromRial(cumulativeThis, displayRate) : cumulativeThis);
  const adjustmentSign = formKind.sign;
  const adjustmentWorkRial = adjustmentSign * Math.abs(num(form.adjustment_work_done));
  const adjustmentWorkForeign = adjustmentSign * Math.abs(
    form.adjustment_work_foreign != null
      ? num(form.adjustment_work_foreign)
      : (displayRate > 1 ? fromRial(num(form.adjustment_work_done), displayRate) : num(form.adjustment_work_done)),
  );
  const adjustmentPrevious = num(form.adjustment_previous_amount);
  const adjustmentPreviousForeign = num(form.adjustment_previous_foreign);
  const adjustmentCumulative = adjustmentPrevious + adjustmentWorkRial;
  const adjustmentCumulativeForeign = adjustmentPreviousForeign + adjustmentWorkForeign;
  const workDoneForeign = isAdjustmentForm
    ? adjustmentWorkForeign
    : Math.max(0, cumulativeThisForeign - cumulativePrevForeign);
  const workDone = isAdjustmentForm
    ? adjustmentWorkRial
    : Math.max(0, cumulativeThis - cumulativePrev);
  // در سند چند سطحی: کارکرد کل = سطح اصلی + همهٔ سطوح، اما مبنای درصد
  // اضافات/کسورات فقط سطح اصلی + سطوحی است که تیک «شامل» دارند.
  const levelWorkRial = isMultiForm ? levelsTotals.work : 0;
  const levelWorkForeign = isMultiForm ? levelsTotals.workForeign : 0;
  const levelIncludedWork = isMultiForm ? levelsTotals.includedWork : 0;
  const levelIncludedWorkForeign = isMultiForm ? levelsTotals.includedWorkForeign : 0;
  const totalWork = workDone + levelWorkRial;
  const totalWorkForeign = workDoneForeign + levelWorkForeign;
  const chargesBase = workDone + levelIncludedWork;
  const chargesBaseForeign = workDoneForeign + levelIncludedWorkForeign;
  const netAmount = isAdjustmentForm
    ? adjustmentWorkRial + additionsTotal - deductionsTotal
    : totalWork + additionsTotal - deductionsTotal;
  const netAmountForeign = isAdjustmentForm
    ? adjustmentWorkForeign + displayValue(additionsTotal) - displayValue(deductionsTotal)
    : totalWorkForeign + displayValue(additionsTotal) - displayValue(deductionsTotal);
  const formContract = contractList.find((contract) => String(contract.id) === String(form.contract))
    || (String(form.contract) === String(contractId) ? selectedContract : null);
  const formContractAmount = contractAmountOf(formContract);
  const overContract = !isAdjustmentForm && formContractAmount > 0 && cumulativeThisForeign > formContractAmount;
  const progress = formContractAmount > 0
    ? Math.min(100, (cumulativeThisForeign / formContractAmount) * 100)
    : 0;

  /**
   * با تغییر نرخ ارز، مبالغ ارزی واردشده حفظ می‌شوند. فقط کارکرد همین دوره
   * با نرخ جدید به ریال تبدیل می‌شود؛ ریال دوره‌های قبل دست‌نخورده می‌ماند.
   */
  const syncFormAmounts = (previous, nextRateValue) => {
    if (!previous || !Object.keys(previous).length) return previous;
    const nextRate = normalizeRate(nextRateValue);
    if (isAdjustmentKind(previous)) {
      const adjustmentForeign = Math.abs(
        previous.adjustment_work_foreign != null
          ? num(previous.adjustment_work_foreign)
          : fromRial(num(previous.adjustment_work_done), nextRate),
      );
      const adjustmentRial = toRial(adjustmentForeign, nextRate);
      const percentBase = Math.abs(adjustmentRial);
      const recalcAdjustmentItem = (item) => {
        if (item?.mode === 'percent') {
          const itemRial = Math.round((percentBase * Number(item.percent || 0)) / 100);
          return { ...item, amount: itemRial, amount_foreign: fromRial(itemRial, nextRate) };
        }
        const foreign = item?.amount_foreign != null ? item.amount_foreign : fromRial(item.amount, nextRate);
        return { ...item, amount: toRial(foreign, nextRate), amount_foreign: foreign };
      };
      const taxMode = previous.value_added_tax_mode;
      const taxForeign = previous.value_added_tax_foreign != null
        ? previous.value_added_tax_foreign
        : fromRial(previous.value_added_tax, nextRate);
      const tax = taxMode === 'percent'
        ? Math.round((percentBase * Number(previous.value_added_tax_percent || 0)) / 100)
        : toRial(taxForeign, nextRate);
      const otherMode = previous.other_additions_mode;
      const otherForeign = previous.other_additions_foreign != null
        ? previous.other_additions_foreign
        : fromRial(previous.other_additions, nextRate);
      const other = otherMode === 'percent'
        ? Math.round((percentBase * Number(previous.other_additions_percent || 0)) / 100)
        : toRial(otherForeign, nextRate);
      return {
        ...previous,
        adjustment_work_foreign: adjustmentForeign,
        adjustment_work_done: adjustmentRial,
        additions: (previous.additions || []).map(recalcAdjustmentItem),
        deductions: (previous.deductions || []).map(recalcAdjustmentItem),
        value_added_tax_foreign: taxMode === 'percent' ? fromRial(tax, nextRate) : taxForeign,
        value_added_tax: tax,
        other_additions_foreign: otherMode === 'percent' ? fromRial(other, nextRate) : otherForeign,
        other_additions: other,
      };
    }
    const amountForeign = previous.amount_foreign != null
      ? previous.amount_foreign
      : fromRial(previous.amount, nextRate);
    const previousRial = num(previous.cumulative_previous_amount);
    const previousForeign = previous.cumulative_previous_foreign != null
      ? num(previous.cumulative_previous_foreign)
      : fromRial(previousRial, nextRate);
    const nextWorkForeign = Math.max(0, num(amountForeign) - previousForeign);
    const nextWork = toRial(nextWorkForeign, nextRate);
    const amount = cumulativeRialFromForeign(previousRial, previousForeign, amountForeign, nextRate);
    const recalcItem = (item) => {
      if (item?.mode === 'percent') {
        const itemRial = Math.round((nextWork * Number(item.percent || 0)) / 100);
        return { ...item, amount: itemRial, amount_foreign: fromRial(itemRial, nextRate) };
      }
      const foreign = item?.amount_foreign != null ? item.amount_foreign : fromRial(item.amount, nextRate);
      return { ...item, amount: toRial(foreign, nextRate), amount_foreign: foreign };
    };
    const taxMode = previous.value_added_tax_mode;
    const taxForeign = previous.value_added_tax_foreign != null
      ? previous.value_added_tax_foreign
      : fromRial(previous.value_added_tax, nextRate);
    const tax = taxMode === 'percent'
      ? Math.round((nextWork * Number(previous.value_added_tax_percent || 0)) / 100)
      : toRial(taxForeign, nextRate);
    const otherMode = previous.other_additions_mode;
    const otherForeign = previous.other_additions_foreign != null
      ? previous.other_additions_foreign
      : fromRial(previous.other_additions, nextRate);
    const other = otherMode === 'percent'
      ? Math.round((nextWork * Number(previous.other_additions_percent || 0)) / 100)
      : toRial(otherForeign, nextRate);
    return {
      ...previous,
      amount_foreign: amountForeign,
      amount,
      cumulative_previous_foreign: previousForeign,
      additions: (previous.additions || []).map(recalcItem),
      deductions: (previous.deductions || []).map(recalcItem),
      value_added_tax_foreign: taxMode === 'percent' ? fromRial(tax, nextRate) : taxForeign,
      value_added_tax: tax,
      other_additions_foreign: otherMode === 'percent' ? fromRial(other, nextRate) : otherForeign,
      other_additions: other,
    };
  };

  const updateAmountForeign = (field, value) => {
    setForm((previous) => {
      const previousRial = num(previous.cumulative_previous_amount);
      const previousForeign = num(previous.cumulative_previous_foreign);
      return {
        ...previous,
        [`${field}_foreign`]: value,
        [field]: cumulativeRialFromForeign(previousRial, previousForeign, value, displayRate),
      };
    });
  };

  const updateAdjustmentForeign = (value) => {
    const magnitude = Math.abs(num(value));
    setForm((previous) => ({
      ...previous,
      adjustment_work_foreign: magnitude,
      adjustment_work_done: toRial(magnitude, displayRate),
    }));
  };

  const nextNumberForKind = (kind) => {
    const rows = scopedList.filter((row) => isAdjustmentKind(row) === isAdjustmentKind(kind));
    const maxNumber = rows.reduce((max, row) => {
      const normalized = normalizeStatementNumber(row.number);
      return /^\d+$/.test(normalized) ? Math.max(max, Number(normalized)) : max;
    }, 0);
    return String(maxNumber + 1).padStart(2, '0');
  };

  const changeKind = (kind) => {
    if (contractHasMulti && !isMultiKind(kind) && !isAdjustmentKind(kind)) {
      setError('برای این قرارداد صورت‌وضعیت چند سطحی ثبت شده است؛ سند جدید باید چند سطحی باشد.');
      return;
    }
    setForm((previous) => {
      const adjustment = isAdjustmentKind(kind);
      const multi = isMultiKind(kind);
      const priorAdjustment = adjustment
        ? adjustmentCumulativeFor(scopedList, { excludeId: previous.id, number: previous.number })
        : 0;
      const priorAdjustmentForeign = adjustment
        ? adjustmentForeignCumulativeFor(scopedList, { excludeId: previous.id, number: previous.number })
        : 0;
      const existingLevels = Array.isArray(previous.levels) ? previous.levels : [];
      return {
        ...previous,
        kind,
        amount: adjustment ? previous.cumulative_previous_amount : previous.amount,
        amount_foreign: adjustment ? previous.cumulative_previous_foreign : previous.amount_foreign,
        levels: multi
          ? (existingLevels.length ? existingLevels : [emptyLevel()])
          : [],
        number: previous.id || normalizeStatementNumber(previous.number)
          ? previous.number
          : nextNumberForKind(kind),
        adjustment_previous_amount: priorAdjustment,
        adjustment_previous_foreign: priorAdjustmentForeign,
        adjustment_work_done: adjustment ? previous.adjustment_work_done || 0 : 0,
        adjustment_work_foreign: adjustment ? previous.adjustment_work_foreign || 0 : 0,
      };
    });
  };

  const emptyLevel = (title = '', amount = 0, amountForeign = 0) => ({
    title,
    amount,
    amount_foreign: amountForeign,
    includes_charges: false,
  });
  const addLevel = () => setField('levels', [...levels, emptyLevel()]);
  const removeLevel = (index) => setField('levels', levels.filter((_, current) => current !== index));
  const updateLevelTitle = (index, value) => setField('levels', levels.map((level, current) => (
    current === index ? { ...level, title: value } : level
  )));
  const updateLevelAmount = (index, value) => setField('levels', levels.map((level, current) => {
    if (current !== index) return level;
    const previous = levelPreviousMap[levelKeyOf(level.title)] || { amount: 0, amount_foreign: 0 };
    const amount = Math.max(0, Number(value) || 0);
    if (isRial) {
      const rounded = Math.round(amount);
      return { ...level, amount: rounded, amount_foreign: rounded };
    }
    const previousRial = Number(previous.amount) || 0;
    const previousForeign = Number(previous.amount_foreign) || 0;
    return {
      ...level,
      amount_foreign: amount,
      amount: Math.round(previousRial) + toRial(Math.max(0, amount - previousForeign), displayRate),
    };
  }));
  const chooseLevel = (title) => {
    const previous = levelPreviousMap[levelKeyOf(title)] || { amount: 0, amount_foreign: 0 };
    setField('levels', [...levels, emptyLevel(
      title,
      Number(previous.amount) || 0,
      Number(previous.amount_foreign) || 0,
    )]);
  };
  const toggleLevelOption = (index, key, value) => setField('levels', levels.map((level, current) => (
    current === index ? { ...level, [key]: value } : level
  )));

  const changeCurrency = (currencyId) => {
    const nextCurrency = currencyList.find((currency) => String(currency.id) === String(currencyId));
    const baseNextRate = normalizeRate(nextCurrency?.exchange_rate || 1);
    const nextRate = baseNextRate > 1
      ? baseNextRate
      : (String(currencyId) === String(selectedContract?.currency) ? selectedContractRate : baseNextRate);
    setRateOverride(nextRate > 1 ? String(nextRate) : '');
    setForm((previous) => syncFormAmounts({ ...previous, currency: currencyId }, nextRate));
  };

  const changeRate = (value) => {
    setRateOverride(value);
    const nextRate = value === '' || value == null ? baseRate : normalizeRate(value);
    setForm((previous) => syncFormAmounts(previous, nextRate));
  };


  useEffect(() => {
    setForm((previous) => {
      if (!previous || !Object.keys(previous).length) return previous;
      const percentBase = Math.abs(chargesBase);
      const recalc = (items) => (Array.isArray(items) ? items : []).map((item) => {
        if (item?.mode !== 'percent') return item;
        const itemRial = Math.round((percentBase * Number(item.percent || 0)) / 100);
        return { ...item, amount: itemRial, amount_foreign: fromRial(itemRial, displayRate) };
      });
      const additionsNext = recalc(previous.additions);
      const deductionsNext = recalc(previous.deductions);
      const taxNext = previous.value_added_tax_mode === 'percent'
        ? Math.round((percentBase * Number(previous.value_added_tax_percent || 0)) / 100)
        : previous.value_added_tax;
      const otherNext = previous.other_additions_mode === 'percent'
        ? Math.round((percentBase * Number(previous.other_additions_percent || 0)) / 100)
        : previous.other_additions;
      const taxForeignNext = previous.value_added_tax_mode === 'percent'
        ? fromRial(taxNext, displayRate)
        : previous.value_added_tax_foreign;
      const otherForeignNext = previous.other_additions_mode === 'percent'
        ? fromRial(otherNext, displayRate)
        : previous.other_additions_foreign;
      if (
        JSON.stringify(additionsNext) === JSON.stringify(previous.additions)
        && JSON.stringify(deductionsNext) === JSON.stringify(previous.deductions)
        && taxNext === previous.value_added_tax
        && otherNext === previous.other_additions
        && taxForeignNext === previous.value_added_tax_foreign
        && otherForeignNext === previous.other_additions_foreign
      ) {
        return previous;
      }
      return {
        ...previous,
        additions: additionsNext,
        deductions: deductionsNext,
        value_added_tax: taxNext,
        other_additions: otherNext,
        value_added_tax_foreign: taxForeignNext,
        other_additions_foreign: otherForeignNext,
      };
    });
  }, [chargesBase, displayRate, setForm]);

  const openNew = () => {
    const newDate = todayIso();
    const previousCumulative = previousCumulativeFor(scopedList) ?? 0;
    const previousForeign = foreignCumulativeFor(scopedList);
    const initialCurrency = currencyList.find(
      (currency) => String(currency.id) === String(selectedContract?.currency),
    ) || null;
    const initialRate = normalizeRate(
      selectedContractRate > 1 ? selectedContractRate : (initialCurrency?.exchange_rate || selectedContract?.exchange_rate || 1),
    );
    // پس از ثبت اولین سند چند سطحی، سند جدید هم چند سطحی است و سطوح قبلی
    // (با تجمعی همان سطح) برای انتقال مستقل به این دوره آماده می‌شوند.
    const forcedMulti = contractHasMultiLevels(scopedList);
    setForm({
      contract: contractId,
      number: '',
      kind: forcedMulti ? STATEMENT_KIND_MULTI : STATEMENT_KIND_STATEMENT,
      date: newDate,
      amount: previousCumulative,
      amount_foreign: previousForeign,
      cumulative_previous_amount: previousCumulative,
      cumulative_previous_foreign: previousForeign,
      adjustment_previous_amount: 0,
      adjustment_previous_foreign: 0,
      adjustment_work_done: 0,
      adjustment_work_foreign: 0,
      currency: selectedContract?.currency || '',
      value_added_tax: 0,
      value_added_tax_foreign: 0,
      other_additions: 0,
      other_additions_foreign: 0,
      value_added_tax_percent: 0,
      other_additions_percent: 0,
      value_added_tax_mode: 'amount',
      other_additions_mode: 'amount',
      additions: [],
      deductions: [],
      levels: forcedMulti ? seedLevelsFrom(scopedList) : [],
      documents: [],
      pendingFiles: [],
      is_approved: false,
      description: '',
    });
    setRateOverride(initialRate > 1 ? String(initialRate) : '');
    setError('');
    setDetail(null);
    setMode('form');
  };

  const openEdit = (row) => {
    const rowContract = contractList.find((contract) => String(contract.id) === String(row.contract))
      || selectedContract;
    const rowCurrency = currencyList.find((currency) => String(currency.id) === String(row.currency))
      || currencyList.find((currency) => String(currency.id) === String(rowContract?.currency));
    const editRate = rateOfStatement(
      row,
      rowCurrency?.exchange_rate || rowContract?.exchange_rate || selectedContractRate || 1,
    );
    const editWork = Math.max(0, Number(row.amount || 0) - Number(row.cumulative_previous_amount || 0));
    const editAdjustmentWork = Math.abs(Number(row.adjustment_work_done ?? row.work_done ?? 0) || 0);
    const editAdjustmentWorkForeign = Math.abs(
      Number(row.adjustment_foreign_work_done ?? row.foreign_work_done ?? 0)
      || fromRial(editAdjustmentWork, editRate),
    );
    const calculatedPrevious = previousCumulativeFor(
      allStatements.filter((item) => String(item.contract) === String(row.contract)),
      { excludeId: row.id, number: row.number },
    );
    const previousCumulative = calculatedPrevious == null
      ? Number(row.cumulative_previous_amount || 0)
      : calculatedPrevious;
    const previousForeign = row.foreign_previous_amount != null
      ? Number(row.foreign_previous_amount || 0)
      : foreignCumulativeFor(
        allStatements.filter((item) => String(item.contract) === String(row.contract)),
        { beforeId: row.id, number: row.number },
      );
    const rowForeignAmount = row.foreign_amount != null
      ? Number(row.foreign_amount || 0)
      : previousForeign + (editWork / editRate);
    const withForeignAmount = (items) => withCalculationMode(items).map((item) => ({
      ...item,
      amount_foreign: fromRial(item.amount, editRate),
    }));
    // فیلدهای ثابت قدیمی (ارزش افزوده/سایر اضافات) به ردیف‌های اضافات تبدیل
    // می‌شوند تا با حذف فیلدهای ثابت، مبالغ قبلی از دست نروند.
    const legacyAdditions = [
      ...(Number(row.value_added_tax || 0) > 0 ? [{
        code: 'vat',
        description: 'ارزش افزوده',
        percent: 0,
        amount: Number(row.value_added_tax || 0),
        amount_foreign: fromRial(Number(row.value_added_tax || 0), editRate),
        mode: 'amount',
      }] : []),
      ...(Number(row.other_additions || 0) > 0 ? [{
        code: 'other',
        description: 'سایر اضافات',
        percent: 0,
        amount: Number(row.other_additions || 0),
        amount_foreign: fromRial(Number(row.other_additions || 0), editRate),
        mode: 'amount',
      }] : []),
    ];
    setForm({
      ...row,
      contract: String(row.contract || ''),
      kind: row.kind || STATEMENT_KIND_STATEMENT,
      amount: Number(row.amount || 0),
      amount_foreign: rowForeignAmount,
      cumulative_previous_amount: previousCumulative,
      cumulative_previous_foreign: previousForeign,
      adjustment_previous_amount: Number(row.adjustment_previous_amount || 0),
      adjustment_previous_foreign: Number(row.adjustment_foreign_previous_amount || 0),
      adjustment_work_done: editAdjustmentWork,
      adjustment_work_foreign: editAdjustmentWorkForeign,
      value_added_tax: 0,
      value_added_tax_foreign: 0,
      other_additions: 0,
      other_additions_foreign: 0,
      value_added_tax_percent: 0,
      other_additions_percent: 0,
      value_added_tax_mode: 'amount',
      other_additions_mode: 'amount',
      additions: [...withForeignAmount(row.additions), ...legacyAdditions],
      deductions: withForeignAmount(row.deductions),
      levels: (Array.isArray(row.levels) ? row.levels : []).map((level) => ({
        title: level.title || '',
        amount: Number(level.amount) || 0,
        amount_foreign: level.amount_foreign != null
          ? Number(level.amount_foreign) || 0
          : fromRial(Number(level.amount) || 0, editRate),
        includes_charges: Boolean(
          level.includes_charges ?? level.includes_additions ?? level.includes_deductions,
        ),
      })),
      documents: Array.isArray(row.documents) ? row.documents : [],
      pendingFiles: [],
      is_approved: Boolean(row.is_approved),
    });
    setRateOverride(editRate > 1 ? String(editRate) : '');
    setError('');
    setDetail(null);
    setMode('form');
  };

  // با تغییر شماره/تاریخ/قرارداد در فرم، «مبلغ تجمعی دوره قبل» را دوباره از
  // داده‌های موجود محاسبه می‌کنیم تا زنجیرهٔ دوره (شماره‌محور) درست بماند.
  useEffect(() => {
    if (mode !== 'form' || !form.contract || !form.date) return;
    const rows = allStatements.filter((item) => String(item.contract) === String(form.contract));
    const next = previousCumulativeFor(rows, { excludeId: form.id, number: form.number }) ?? 0;
    const nextForeign = foreignCumulativeFor(rows, { beforeId: form.id, number: form.number });
    const nextAdjustment = adjustmentCumulativeFor(rows, { excludeId: form.id, number: form.number });
    const nextAdjustmentForeign = adjustmentForeignCumulativeFor(
      rows, { excludeId: form.id, number: form.number },
    );
    setForm((previous) => {
      if (
        !previous
        || (
          Number(previous.cumulative_previous_amount || 0) === next
          && Number(previous.cumulative_previous_foreign || 0) === nextForeign
          && Number(previous.adjustment_previous_amount || 0) === nextAdjustment
          && Number(previous.adjustment_previous_foreign || 0) === nextAdjustmentForeign
        )
      ) return previous;
      return {
        ...previous,
        cumulative_previous_amount: next,
        cumulative_previous_foreign: nextForeign,
        adjustment_previous_amount: nextAdjustment,
        adjustment_previous_foreign: nextAdjustmentForeign,
      };
    });
  }, [mode, form.contract, form.date, form.id, form.number, allStatements]);

  const openPrint = (row) => {
    setPrintPending(true);
    openEdit(row);
  };

  const closeEditor = () => {
    if (save.isPending) return;
    setMode('list');
    setForm({});
    setRateOverride('');
    setError('');
    setPrintPending(false);
  };

  const addDeduction = () => setField('deductions', [...deductions, { title: '', amount: 0, amount_foreign: 0, percent: 0, mode: 'amount' }]);
  const removeDeduction = (index) => setField('deductions', deductions.filter((_, current) => current !== index));
  const updateDeduction = (index, key, value) => {
    const percentBase = Math.abs(chargesBase);
    setField('deductions', deductions.map((item, current) => {
      if (current !== index) return item;
      if (key === 'percent') {
        const percent = Math.max(0, Number(value) || 0);
        const amount = Math.round((percentBase * percent) / 100);
        return {
          ...item, percent, amount, amount_foreign: fromRial(amount, displayRate), mode: 'percent',
        };
      }
      if (key === 'amount') {
        const amountForeign = Math.max(0, Number(value) || 0);
        const amount = toRial(amountForeign, displayRate);
        const percent = percentBase > 0 ? Math.round((amount / percentBase) * 10000) / 100 : 0;
        return { ...item, amount_foreign: amountForeign, amount, percent, mode: 'amount' };
      }
      return { ...item, [key]: value };
    }));
  };
  const chooseDeduction = (definition) => {
    const percent = Number(definition.default_percent || 0);
    const percentBase = Math.abs(chargesBase);
    const amount = Math.round((percentBase * percent) / 100);
    setField('deductions', [...deductions, {
      title: definition.description || definition.code,
      percent,
      amount,
      amount_foreign: fromRial(amount, displayRate),
      mode: 'percent',
    }]);
  };

  const addAddition = () => setField('additions', [...additions, { code: '', description: '', percent: 0, amount: 0, amount_foreign: 0, mode: 'amount' }]);
  const removeAddition = (index) => setField('additions', additions.filter((_, current) => current !== index));
  const updateAddition = (index, key, value) => {
    const percentBase = Math.abs(chargesBase);
    setField('additions', additions.map((item, current) => {
      if (current !== index) return item;
      if (key === 'percent') {
        const percent = Math.max(0, Number(value) || 0);
        const amount = Math.round((percentBase * percent) / 100);
        return {
          ...item, percent, amount, amount_foreign: fromRial(amount, displayRate), mode: 'percent',
        };
      }
      if (key === 'amount') {
        const amountForeign = Math.max(0, Number(value) || 0);
        const amount = toRial(amountForeign, displayRate);
        const percent = percentBase > 0 ? Math.round((amount / percentBase) * 10000) / 100 : 0;
        return { ...item, amount_foreign: amountForeign, amount, percent, mode: 'amount' };
      }
      return { ...item, [key]: value };
    }));
  };
  const chooseAddition = (definition) => {
    const percent = Number(definition.default_percent || 0);
    const percentBase = Math.abs(chargesBase);
    const amount = Math.round((percentBase * percent) / 100);
    setField('additions', [...additions, {
      code: definition.code,
      description: definition.description,
      percent,
      amount,
      amount_foreign: fromRial(amount, displayRate),
      mode: 'percent',
    }]);
  };

  const addFiles = (files) => {
    const accepted = [];
    let rejection = '';
    (files || []).forEach((file) => {
      const ext = String(file.name || '').toLowerCase().split('.').pop();
      if (!['pdf', 'jpg', 'jpeg', 'png', 'webp', 'xls', 'xlsx', 'doc', 'docx', 'zip', 'rar'].includes(ext)) {
        rejection = 'فرمت‌های مجاز: PDF، تصویر، اکسل، Word و ZIP.';
        return;
      }
      if (Number(file.size) > 25 * 1024 * 1024) {
        rejection = 'حجم هر فایل نباید بیشتر از ۲۵ مگابایت باشد.';
        return;
      }
      accepted.push(file);
    });
    if (accepted.length) {
      setField('pendingFiles', [...(form.pendingFiles || []), ...accepted].slice(0, 10));
    }
    if (rejection) setError(rejection);
  };
  const removePendingFile = (index) => setField('pendingFiles', (form.pendingFiles || []).filter((_, current) => current !== index));

  const submit = () => {
    if (!form.contract) { setError('قرارداد مرتبط را انتخاب کنید.'); return; }
    if (!form.date) { setError('تاریخ صورت‌وضعیت را وارد کنید.'); return; }
    if (!isRial && normalizeRate(rate) <= 1) {
      setError('برای قرارداد ارزی، نرخ تبدیل به ریال را وارد کنید.');
      return;
    }
    if (isAdjustmentForm && Math.abs(Number(form.adjustment_work_done) || 0) <= 0) {
      setError('مبلغ تعدیل این دوره را وارد کنید.');
      return;
    }
    if (isMultiForm) {
      const filled = levels.filter((level) => String(level.title || '').trim());
      if (!filled.length) {
        setError('برای صورت‌وضعیت چند سطحی، حداقل یک سطح با عنوان و مبلغ وارد کنید.');
        return;
      }
      const lowered = filled.find((level) => {
        const previous = levelPreviousMap[levelKeyOf(level.title)] || { amount: 0 };
        return Math.max(0, Number(level.amount) || 0) < (Number(previous.amount) || 0);
      });
      if (lowered) {
        setError(`مبلغ تجمعی سطح «${lowered.title}» نمی‌تواند کمتر از مبلغ تجمعی دوره قبل باشد.`);
        return;
      }
    }
    if (!isAdjustmentForm && cumulativeThis < cumulativePrev) {
      setError('مبلغ تجمعی این صورت‌وضعیت نمی‌تواند کمتر از مبلغ تجمعی دوره قبل باشد.');
      return;
    }
    setError('');
    save.mutate(form);
  };

  const exportCsv = () => {
    const headers = ['نوع', 'شماره', 'تاریخ', 'مبلغ تجمعی', 'کارکرد / تعدیل', 'تعدیل تجمعی', 'اضافات', 'کسورات', 'قابل پرداخت', 'وضعیت', 'توضیحات'];
    const rows = filtered.map((row) => {
      const metrics = rowMetrics(row);
      const kind = statementKindOf(row);
      return [
        kind.label,
        row.number ? formatStatementNumber(row.number) : '', row.date || '', metrics.amount, metrics.work,
        row.adjustment_amount ?? 0,
        metrics.additionsTotal, metrics.deductionsTotal, metrics.net,
        row.is_approved ? 'تأیید شده' : 'در انتظار', row.description || '',
      ];
    });
    const csv = [headers, ...rows]
      .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contract-statements-${contractId || 'all'}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const additionsTotalForeign = displayValue(additionsTotal);
  const deductionsTotalForeign = displayValue(deductionsTotal);

  if (mode === 'form') {
    return (
      <StatementEditorView
        onClose={closeEditor}
        form={form}
        setForm={setForm}
        contract={formContract || selectedContract}
        company={company}
        currencyList={currencyList}
        additionList={additionList}
        deductionList={deductionList}
        additions={additions}
        previewAdditions={previewAdditions}
        deductions={deductions}
        additionsTotal={additionsTotal}
        deductionsTotal={deductionsTotal}
        formKind={formKind}
        isAdjustmentForm={isAdjustmentForm}
        isMultiForm={isMultiForm}
        lockSimpleKind={contractHasMulti}
        totalWork={totalWork}
        totalWorkForeign={totalWorkForeign}
        chargesBase={chargesBase}
        chargesBaseForeign={chargesBaseForeign}
        levelTotals={levelsTotals}
        levelEditor={{
          levels,
          suggestions: levelSuggestions,
          previousMap: levelPreviousMap,
          onAdd: addLevel,
          onRemove: removeLevel,
          onTitle: updateLevelTitle,
          onAmount: updateLevelAmount,
          onChoose: chooseLevel,
          onToggle: toggleLevelOption,
        }}
        adjustmentPrevious={adjustmentPrevious}
        adjustmentPreviousForeign={adjustmentPreviousForeign}
        adjustmentCumulative={adjustmentCumulative}
        adjustmentCumulativeForeign={adjustmentCumulativeForeign}
        adjustmentWorkRial={adjustmentWorkRial}
        adjustmentWorkForeign={adjustmentWorkForeign}
        cumulativePrev={cumulativePrev}
        cumulativePrevForeign={cumulativePrevForeign}
        cumulativeThis={cumulativeThis}
        cumulativeThisForeign={cumulativeThisForeign}
        workDone={workDone}
        workDoneForeign={workDoneForeign}
        netAmount={netAmount}
        netAmountForeign={netAmountForeign}
        additionsTotalForeign={additionsTotalForeign}
        deductionsTotalForeign={deductionsTotalForeign}
        rate={rate}
        rateOverride={rateOverride}
        onRateChange={changeRate}
        onCurrencyChange={changeCurrency}
        onAmountChange={updateAmountForeign}
        onAdjustmentChange={updateAdjustmentForeign}
        onKindChange={changeKind}
        isRial={isRial}
        baseRate={baseRate}
        formCurrencyLabel={formCurrencyLabel}
        overContract={overContract}
        progress={progress}
        error={error}
        setError={setError}
        saving={save.isPending}
        onSave={submit}
        onAddFiles={addFiles}
        onRemovePending={removePendingFile}
        onRemoveDocument={(document) => {
          if (window.confirm(`مدرک «${document.title || 'پیوست'}» حذف شود؟`)) removeDocument.mutate(document.id);
        }}
        onAddAddition={addAddition}
        onRemoveAddition={removeAddition}
        onUpdateAddition={updateAddition}
        onChooseAddition={chooseAddition}
        onAddDeduction={addDeduction}
        onRemoveDeduction={removeDeduction}
        onUpdateDeduction={updateDeduction}
        onChooseDeduction={chooseDeduction}
      />
    );
  }

  if (isLoading || contractsLoading) {
    return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<ReceiptLongIcon />}
        title="صورت‌وضعیت‌های قرارداد"
        badge={(
          <Chip size="small" label={contractId ? `${formatPersianNumber(scopedList.length)} صورت‌وضعیت` : 'مدیریت صورت‌وضعیت‌ها'}
            sx={{ height: 23, fontWeight: 800, bgcolor: alpha(STATEMENT_ACCENT, 0.08), color: STATEMENT_ACCENT }} />
        )}
        actions={(
          <>
            {contractId ? (
              <Tooltip title="به‌روزرسانی">
                <span>
                  <Button variant="outlined" disabled={isFetching} onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ['contract-statement-payments', contractId] }); }} sx={{ minWidth: 40, px: 1 }}>
                    <RefreshIcon fontSize="small" />
                  </Button>
                </span>
              </Tooltip>
            ) : null}
            {contractId ? <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={() => navigate(`/external-contracts/${contractId}`)}>پرونده</Button> : null}
            {contractId ? <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={printStatement}>چاپ</Button> : null}
            {contractId ? <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportCsv}>خروجی</Button> : null}
            {contractId ? <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>صورت‌وضعیت جدید</Button> : null}
            {scopedMode ? (
              <Button variant="contained" startIcon={<ChevronRightIcon />} onClick={clearContract}>فهرست قراردادها</Button>
            ) : null}
          </>
        )}
      />

      {!scopedMode ? (
        <ContractPickerLanding
          theme={moduleTheme}
          contracts={contractList}
          records={allStatements}
          getContractId={(row) => row.contract}
          metrics={(row) => {
            const values = rowMetrics(row);
            return { work: values.work, net: values.net, approved: row.is_approved ? 1 : 0 };
          }}
          onSelect={selectContract}
          ariaLabel="فهرست قراردادها برای صورت‌وضعیت‌ها"
          sortOptions={[
            { value: 'net', label: 'بیشترین خالص' },
            { value: 'work', label: 'بیشترین کارکرد' },
            { value: 'approved', label: 'بیشترین تأییدشده' },
            { value: 'number', label: 'شماره قرارداد' },
          ]}
          columns={[
            {
              key: 'number',
              label: 'شماره قرارداد',
              width: '10%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                  {toPersianDigits(row.contract.number || '—')}
                </Typography>
              ),
            },
            {
              key: 'party',
              label: 'طرف قرارداد',
              width: '18%',
              render: (row) => (
                <Typography noWrap title={row.contract.party_name} sx={{ fontSize: 11.5, fontWeight: 700 }}>
                  {row.contract.party_name || '—'}
                </Typography>
              ),
            },
            {
              key: 'subject',
              label: 'موضوع قرارداد',
              width: '24%',
              render: (row) => (
                <Typography noWrap title={row.contract.subject} sx={{ fontSize: 12, fontWeight: 800 }}>
                  {row.contract.subject || '—'}
                </Typography>
              ),
            },
            {
              key: 'count',
              label: 'تعداد صورت‌وضعیت',
              width: '10%',
              align: 'center',
              render: (row) => (
                <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800 }}>{formatPersianNumber(row.count || 0)}</Typography>
              ),
            },
            { key: 'work', label: 'کارکرد', width: '13%', align: 'center', render: (row) => moneyCell(row.work, BLUE) },
            { key: 'net', label: 'خالص قابل پرداخت', width: '15%', align: 'center', render: (row) => moneyCell(row.net, GREEN) },
            { key: 'approved', label: 'تأییدشده', width: '10%', align: 'center', render: (row) => moneyCell(row.approved, AMBER) },
          ]}
        />
      ) : (
        <>
          <ModuleToolbar
            theme={moduleTheme}
            search={search}
            onSearch={setSearch}
            searchPlaceholder="جستجو در شماره، نوع و شرح صورت‌وضعیت…"
            sort={sortBy}
            sortOptions={[
              { value: 'newest', label: 'جدیدترین' },
              { value: 'amount', label: 'بیشترین مبلغ تجمعی' },
              { value: 'net', label: 'بیشترین خالص' },
              { value: 'work', label: 'بیشترین کارکرد' },
            ]}
            onSort={setSortBy}
            filters={[{ label: 'وضعیت صورت‌وضعیت', value: statusFilter, options: statusOptions, onChange: setStatusFilter }]}
            activeChips={activeChips}
            activeFilterCount={activeFilterCount}
            onReset={() => { setSearch(''); setStatusFilter('all'); setSortBy('newest'); }}
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
              ariaLabel="فهرست صورت‌وضعیت‌های قرارداد"
              containerRef={tableRef}
              tableHeight={tableHeight}
              rowHeight={rowHeight}
              dimmed={isFetching || paymentsLoading}
              rows={pagedStatements}
              rowKey={(row) => row.id}
              onRowClick={(row) => setDetail(row)}
              emptyText="صورت‌وضعیتی با این مشخصات ثبت نشده است."
              columns={[
                {
                  key: 'row',
                  label: 'ردیف',
                  width: '4%',
                  align: 'center',
                  render: (_row, index) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                      {toPersianDigits(page * scopedPageSize + index + 1)}
                    </Typography>
                  ),
                },
                {
                  key: 'number',
                  label: 'شماره',
                  width: '8%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {formatStatementNumber(row.number) || toPersianDigits(row.id)}
                    </Typography>
                  ),
                },
                {
                  key: 'kind',
                  label: 'نوع',
                  width: '8%',
                  align: 'center',
                  render: (row) => {
                    const kind = statementKindOf(row);
                    return (
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Chip size="small" label={kind.label}
                          sx={{
                            height: 20, fontSize: 10.5, fontWeight: 800,
                            bgcolor: alpha(kind.color, 0.1), color: kind.color,
                            border: `1px solid ${alpha(kind.color, 0.28)}`,
                            '& .MuiChip-label': { px: 0.8 },
                          }} />
                      </Box>
                    );
                  },
                },
                {
                  key: 'date',
                  label: 'تاریخ',
                  width: '9%',
                  align: 'center',
                  render: (row) => (
                    <Typography noWrap sx={{ fontSize: 11.5, fontFamily: 'var(--hrms-table-number-font, inherit)' }}>
                      {dateLabel(row.date)}
                    </Typography>
                  ),
                },
                {
                  key: 'work',
                  label: 'کارکرد دوره',
                  width: '9%',
                  align: 'center',
                  render: (row) => moneyCell(rowMetrics(row).totalWork, BLUE),
                },
                {
                  key: 'additions',
                  label: 'اضافات',
                  width: '8%',
                  align: 'center',
                  render: (row) => moneyCell(rowMetrics(row).additionsTotal, GREEN),
                },
                {
                  key: 'deductions',
                  label: 'کسورات',
                  width: '8%',
                  align: 'center',
                  render: (row) => moneyCell(rowMetrics(row).deductionsTotal, RED),
                },
                {
                  key: 'net',
                  label: 'خالص قابل پرداخت',
                  width: '10%',
                  align: 'center',
                  render: (row) => moneyCell(rowMetrics(row).net, GREEN),
                },
                {
                  key: 'paid',
                  label: 'پرداخت‌شده',
                  width: '9%',
                  align: 'center',
                  render: (row) => moneyCell(rowPaid(row), BLUE),
                },
                {
                  key: 'remaining',
                  label: 'مانده',
                  width: '9%',
                  align: 'center',
                  render: (row) => {
                    const remaining = rowRemaining(row);
                    return moneyCell(remaining, remaining ? AMBER : GREEN);
                  },
                },
                {
                  key: 'payment_status',
                  label: 'پرداخت',
                  width: '8%',
                  align: 'center',
                  render: (row) => {
                    const status = paymentStatusOf(row);
                    return (
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Chip size="small" label={status.label}
                          sx={{
                            height: 20, fontSize: 10.5, fontWeight: 800,
                            bgcolor: status.bg, color: status.color,
                            border: `1px solid ${alpha(status.color, 0.28)}`,
                            '& .MuiChip-label': { px: 0.8 },
                          }} />
                      </Box>
                    );
                  },
                },

                {
                  key: 'approved',
                  label: 'تأیید',
                  width: '6%',
                  align: 'center',
                  render: (row) => (
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <Chip size="small" label={row.is_approved ? 'تأییدشده' : 'در انتظار'}
                        sx={{
                          height: 20, fontSize: 10.5, fontWeight: 800,
                          bgcolor: alpha(row.is_approved ? GREEN : AMBER, 0.1),
                          color: row.is_approved ? GREEN : AMBER,
                          '& .MuiChip-label': { px: 0.8 },
                        }} />
                    </Box>
                  ),
                },
                {
                  key: 'actions',
                  label: 'عملیات',
                  width: '12%',
                  align: 'center',
                  render: (row) => (
                    <Stack direction="row" spacing={0.15} useFlexGap alignItems="center" justifyContent="center"
                      onClick={(event) => event.stopPropagation()}>
                      <Tooltip title="جزئیات"><IconButton size="small" aria-label="جزئیات" onClick={() => setDetail(row)}><VisibilityIcon sx={{ fontSize: 16 }} /></IconButton></Tooltip>
                      <Tooltip title="ویرایش"><IconButton size="small" aria-label="ویرایش" onClick={() => openEdit(row)}><EditIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                      <Tooltip title="چاپ"><IconButton size="small" aria-label="چاپ" onClick={() => openPrint(row)}><PrintOutlinedIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                      <Tooltip title={row.is_approved ? 'لغو تأیید' : 'تأیید'}>
                        <IconButton size="small" aria-label={row.is_approved ? 'لغو تأیید' : 'تأیید'}
                          sx={{ color: row.is_approved ? GREEN : MUTED }} onClick={() => toggleApproval.mutate(row)}>
                          <CheckCircleIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف"><IconButton size="small" aria-label="حذف" color="error" onClick={() => setConfirmDelete(row)}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton></Tooltip>
                    </Stack>
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
              pageSize={scopedPageSize}
              unit="صورت‌وضعیت"
            />
            <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap"
              sx={{ pt: 1.25, mt: 1.25, borderTop: '1px dashed', borderColor: 'divider' }}>
              <Chip size="small" label={`جمع خالص: ${formatPersianNumber(Math.round(displayTotals.net))} ${currencyLabel}`}
                sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(GREEN, 0.1), color: GREEN }} />
              <Chip size="small" label={`پرداخت‌شده: ${formatPersianNumber(Math.round(displayTotals.paid))}`}
                sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(BLUE, 0.1), color: BLUE }} />
              <Chip size="small" label={`مانده: ${formatPersianNumber(Math.round(displayTotals.outstanding))}`}
                sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(AMBER, 0.1), color: AMBER }} />
              <Chip size="small" label={`کارکرد تجمعی: ${formatPersianNumber(Math.round(displayTotals.cumulative))}`}
                sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(STATEMENT_ACCENT, 0.1), color: STATEMENT_ACCENT }} />
              {counts.pending ? (
                <Chip size="small" icon={<WarningAmberIcon sx={{ fontSize: 13 }} />}
                  label={`${formatPersianNumber(counts.pending)} در انتظار تأیید`}
                  sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(AMBER, 0.1), color: AMBER }} />
              ) : null}
            </Stack>
          </Paper>
        </>
      )}


      <StatementDetailDrawer row={detail} contract={selectedContract} currency={currencyLabel}
        fallbackRate={selectedContractRate}
        onClose={() => setDetail(null)} onEdit={openEdit} onDelete={setConfirmDelete}
        onPrint={openPrint} onApprove={(selected) => toggleApproval.mutate(selected)} />



      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>حذف صورت‌وضعیت</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ borderRadius: '10px' }}>
            صورت‌وضعیت {formatStatementNumber(confirmDelete?.number) || (confirmDelete ? `#${toPersianDigits(confirmDelete.id)}` : 'انتخاب‌شده')} حذف شود؟ این عملیات قابل بازگشت نیست.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>انصراف</Button>
          <Button color="error" variant="contained" disabled={remove.isPending} onClick={() => remove.mutate(confirmDelete.id)}>
            {remove.isPending ? <CircularProgress size={18} color="inherit" /> : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3400} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.includes('نشد') ? 'error' : 'success'} onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

const StatementEditorView = ({
  onClose, form, setForm, contract, company, currencyList, additionList, deductionList,
  additions, previewAdditions, deductions, additionsTotal, deductionsTotal,
  formKind, isAdjustmentForm, isMultiForm = false, levelEditor = null,
  lockSimpleKind = false,
  totalWork = 0, totalWorkForeign = 0, chargesBase = 0, chargesBaseForeign = 0,
  levelTotals = null,
  adjustmentPrevious, adjustmentPreviousForeign,
  adjustmentCumulative, adjustmentCumulativeForeign,
  adjustmentWorkRial, adjustmentWorkForeign,
  cumulativePrev, cumulativePrevForeign, cumulativeThis, cumulativeThisForeign,
  workDone, workDoneForeign, netAmount, netAmountForeign,
  additionsTotalForeign, deductionsTotalForeign,
  rate, rateOverride, onRateChange, onCurrencyChange, onAmountChange, onAdjustmentChange, onKindChange,
  isRial, baseRate, formCurrencyLabel,
  overContract, progress, error, setError, saving, onSave, onAddFiles, onRemovePending,
  onRemoveDocument, onAddAddition, onRemoveAddition, onUpdateAddition, onChooseAddition,
  onAddDeduction, onRemoveDeduction, onUpdateDeduction, onChooseDeduction,
}) => {
  const theme = useTheme();
  const displayRate = isRial ? 1 : rate;
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const documents = Array.isArray(form.documents) ? form.documents : [];
  const pendingFiles = Array.isArray(form.pendingFiles) ? form.pendingFiles : [];
  const totalDocs = documents.length + pendingFiles.length;
  const netColor = isMultiForm ? formKind.color : (isAdjustmentForm ? formKind.color : GREEN);
  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={formKind.isAdjustment ? (formKind.key === STATEMENT_KIND_INCREASE ? <TrendingUpIcon /> : <TrendingDownIcon />) : <ReceiptLongIcon />}
        title={form.id ? `ویرایش ${formKind.label}` : `ثبت ${formKind.label} جدید`}
        subtitle={`${contract?.subject || 'قرارداد'} · ${contract?.number || 'بدون شماره'} · ${form.number ? formatStatementNumber(form.number) : 'شماره‌گذاری خودکار'}`}
        badge={<Chip size="small" label={form.is_approved ? 'تأیید شده' : 'در انتظار تأیید'}
          sx={{ height: 23, fontWeight: 800, bgcolor: form.is_approved ? '#ecfdf5' : '#fffbeb', color: form.is_approved ? '#0f766e' : '#b45309' }} />}
        actions={(
          <>
            <Button variant="outlined" startIcon={<PrintOutlinedIcon />} onClick={printStatement}>چاپ</Button>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={onClose}>بازگشت به لیست</Button>
            <Button variant="contained" startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : <SaveIcon />}
              onClick={onSave} disabled={saving || !form.contract || !form.date}>
              {saving ? 'در حال ذخیره…' : `ذخیره ${formKind.label}`}
            </Button>
          </>
        )}
      />

      <Box sx={{
        display: 'grid', gap: 1, mb: 1.5,
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
      }}>
        {isAdjustmentForm ? (
          <>
            <KpiTileLine dense icon={formKind.key === STATEMENT_KIND_INCREASE ? TrendingUpIcon : TrendingDownIcon} label="قابل پرداخت تعدیل" value={compactMoney(netAmountForeign, formCurrencyLabel)} color={formKind.color} hint={isRial ? '' : `معادل ریالی ${compactMoney(netAmount, 'ریال')}`} />
            <KpiTileLine dense icon={PaymentsIcon} label="تعدیل تجمعی" value={compactMoney(adjustmentCumulativeForeign, formCurrencyLabel)} color={formKind.color} hint={isRial ? '' : `معادل ریالی ${compactMoney(adjustmentCumulative, 'ریال')}`} />
            <KpiTileLine dense icon={TrendingUpIcon} label="مبنای تجمعی صورت‌وضعیت" value={compactMoney(cumulativeThisForeign, formCurrencyLabel)} color={BLUE} hint="بدون تغییر با تعدیل" />
            <KpiTileLine dense icon={InsertDriveFileIcon} label="مدارک پیوست" value={formatPersianNumber(totalDocs)} suffix="فایل" color={AMBER} hint={`${formatPersianNumber(documents.length)} ذخیره‌شده · ${formatPersianNumber(pendingFiles.length)} جدید`} />
          </>
        ) : (
          <>
            <KpiTileLine dense icon={PaymentsIcon} label="قابل پرداخت این دوره" value={compactMoney(netAmountForeign, formCurrencyLabel)} color={GREEN} hint={isRial ? '' : `معادل ریالی ${compactMoney(netAmount, 'ریال')}`} />
            <KpiTileLine dense icon={TrendingUpIcon} label={isMultiForm ? 'کارکرد کل (سند + سطوح)' : 'کارکرد این دوره'} value={compactMoney(totalWorkForeign, formCurrencyLabel)} color={BLUE} hint={isRial ? '' : `معادل ریالی ${compactMoney(totalWork, 'ریال')}`} />
            <KpiTileLine dense icon={isMultiForm ? LayersOutlinedIcon : CheckCircleIcon} label={isMultiForm ? `سطوح (${formatPersianNumber((levelEditor?.levels || []).length)})` : 'پیشرفت قرارداد'} value={isMultiForm ? compactMoney(levelTotals?.workForeign || 0, formCurrencyLabel) : `${toPersianDigits(progress.toFixed(0))}٪`} color={isMultiForm ? formKind.color : STATEMENT_ACCENT} hint={isMultiForm ? 'کارکرد سطوح' : `کارکرد تجمعی ${compactMoney(cumulativeThisForeign, formCurrencyLabel)}`} />
            <KpiTileLine dense icon={InsertDriveFileIcon} label="مدارک پیوست" value={formatPersianNumber(totalDocs)} suffix="فایل" color={AMBER} hint={`${formatPersianNumber(documents.length)} ذخیره‌شده · ${formatPersianNumber(pendingFiles.length)} جدید`} />
          </>
        )}
      </Box>

      <Stack spacing={1.5}>
        {error ? <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: '10px', fontSize: 12 }}>{error}</Alert> : null}
        {overContract ? (
          <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ borderRadius: '10px', py: 0.2 }}>
            <Typography sx={{ fontSize: 12 }}>مبلغ تجمعی واردشده از مبلغ قرارداد بیشتر است.</Typography>
          </Alert>
        ) : null}

        <Grid container spacing={1.5}>
          <Grid item xs={12} lg={6}>
            <Paper elevation={0} sx={{
              p: { xs: 1.5, md: 2 }, borderRadius: '18px',
              border: `1px solid ${theme.palette.divider}`, bgcolor: theme.palette.background.paper,
            }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK, mb: 0.7 }}>اطلاعات پایه</Typography>
                <Grid container spacing={1.1}>
                  <Grid item xs={12} sm={4}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>نوع سند</InputLabel>
                      <Select value={form.kind || STATEMENT_KIND_STATEMENT} label="نوع سند" onChange={(event) => onKindChange(event.target.value)}>
                        {KIND_OPTIONS.map((option) => {
                          const OptionIcon = option.icon;
                          return (
                            <MenuItem key={option.key} value={option.key}
                              disabled={lockSimpleKind && option.key === STATEMENT_KIND_STATEMENT}>
                              <Stack direction="row" alignItems="center" spacing={0.7}>
                                <OptionIcon sx={{ fontSize: 17, color: option.color }} />
                                <Typography sx={{ fontSize: 12, fontWeight: 800, color: option.color }}>{option.label}</Typography>
                              </Stack>
                            </MenuItem>
                          );
                        })}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" fullWidth label={isAdjustmentForm ? 'شماره تعدیل' : 'شماره صورت‌وضعیت'}
                      value={toPersianDigits(form.number || '')}
                      onChange={(event) => update('number', toEnglishDigits(event.target.value))}
                      onBlur={(event) => update('number', normalizeStatementNumber(event.target.value))}
                      placeholder="مثلاً ۰۳" />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <JalaliDatePicker fullWidth label={isAdjustmentForm ? 'تاریخ تعدیل' : 'تاریخ صورت‌وضعیت'} value={form.date || ''} onChange={(value) => update('date', value)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>واحد ارز</InputLabel>
                      <Select value={form.currency || ''} label="واحد ارز" onChange={(event) => onCurrencyChange(event.target.value)}>
                        {currencyList.map((currency) => <MenuItem key={currency.id} value={currency.id}>{normalizeCurrencyLabel(currency.name || currency.symbol)} ({currency.code})</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" fullWidth type="number" label="نرخ تبدیل به ریال" value={rateOverride}
                      inputProps={{ step: 'any', min: 0 }} disabled={isRial}
                      placeholder={formatPersianNumber(baseRate)} onChange={(event) => onRateChange(event.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControlLabel sx={{ m: 0, height: '100%', alignItems: 'center' }}
                      control={<Switch size="small" checked={Boolean(form.is_approved)} onChange={(event) => update('is_approved', event.target.checked)} />}
                      label={<Typography sx={{ fontSize: 12, fontWeight: 800, color: INK }}>تأیید صورت‌وضعیت</Typography>} />
                  </Grid>
                </Grid>
              </Box>

              <Divider />
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK, mb: 0.7 }}>
                  {isAdjustmentForm ? 'تعدیل و مبالغ' : 'کارکرد و مبالغ'}
                </Typography>
                {isMultiForm ? (
                  <Box>
                    <Grid container spacing={1.1}>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4}
                          label={`مبلغ تجمعی این صورت‌وضعیت (${formCurrencyLabel})`}
                          value={form.amount_foreign ?? cumulativeThisForeign}
                          onChange={(value) => onAmountChange('amount', value)} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={false} label="معادل ریالی مبلغ تجمعی"
                          value={form.amount ?? 0} onChange={() => {}} InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4}
                          label={`مبلغ تجمعی دوره قبل (${formCurrencyLabel})`}
                          value={form.cumulative_previous_foreign ?? cumulativePrevForeign}
                          onChange={() => {}} InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={false} label="مبلغ تجمعی دوره قبل (ریال)"
                          value={cumulativePrev} onChange={() => {}} InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4}
                          label={`کارکرد این دوره (${formCurrencyLabel})`}
                          value={workDoneForeign} onChange={() => {}} InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={false} label="کارکرد این دوره (ریال)"
                          value={workDone} onChange={() => {}} InputProps={{ readOnly: true }} />
                      </Grid>
                    </Grid>
                    <Divider sx={{ my: 1 }} />
                    <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 0.7 }}>
                      <Typography sx={{ flex: 1, minWidth: 150, fontSize: 12, fontWeight: 900, color: formKind.color }}>
                        سطوح کارکرد (هر سطح زنجیرهٔ تجمعی مستقل)
                      </Typography>
                      <Chip size="small"
                        label={`جمع کارکرد همهٔ سطوح: ${formatPersianNumber(isRial ? (levelTotals?.work || 0) : (levelTotals?.workForeign || 0))} ${formCurrencyLabel}`}
                        sx={{ height: 20, fontSize: 10.5, bgcolor: alpha(formKind.color, 0.08), color: formKind.color }} />
                      <Chip size="small"
                        label={`مبنای اضافات/کسورات: ${formatPersianNumber(isRial ? chargesBase : chargesBaseForeign)} ${formCurrencyLabel}`}
                        sx={{ height: 20, fontSize: 10.5, bgcolor: alpha(BLUE, 0.08), color: BLUE }} />
                    </Stack>
                    {(levelEditor?.levels || []).length ? (levelEditor.levels).map((level, index) => {
                      const levelKey = String(level.title || '')
                        .replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
                      const previous = (levelEditor?.previousMap || {})[levelKey]
                        || { amount: 0, amount_foreign: 0 };
                      const previousRial = Number(previous.amount) || 0;
                      const previousForeign = Number(previous.amount_foreign) || 0;
                      const amountRial = Number(level.amount) || 0;
                      const amountForeign = Number(level.amount_foreign) || 0;
                      const workRial = Math.max(0, amountRial - previousRial);
                      const workForeign = Math.max(0, amountForeign - previousForeign);
                      return (
                        <Box key={`level-${index}`} sx={{
                          p: 0.9, mb: 0.8, borderRadius: '12px',
                          border: `1px solid ${alpha(formKind.color, 0.16)}`,
                          bgcolor: alpha(formKind.color, 0.02),
                        }}>
                          <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.7 }}>
                            <TextField size="small" fullWidth label="عنوان سطح" placeholder="مثلاً خرید یا فاز یک"
                              value={level.title || ''} onChange={(event) => levelEditor?.onTitle(index, event.target.value)} />
                            <Tooltip title="حذف سطح">
                              <IconButton size="small" color="error" aria-label="حذف سطح" onClick={() => levelEditor?.onRemove(index)}>
                                <RemoveCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                          <Grid container spacing={0.8}>
                            <Grid item xs={12} sm={6}>
                              <MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4}
                                label={`مبلغ تجمعی این سطح (${formCurrencyLabel})`}
                                value={isRial ? amountRial : amountForeign}
                                onChange={(value) => levelEditor?.onAmount(index, value)} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <MoneyInput size="small" fullWidth allowDecimals={false} label="معادل ریالی مبلغ تجمعی"
                                value={amountRial} onChange={() => {}} InputProps={{ readOnly: true }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4}
                                label={`مبلغ تجمعی دوره قبل (${formCurrencyLabel})`}
                                value={previousForeign} onChange={() => {}} InputProps={{ readOnly: true }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <MoneyInput size="small" fullWidth allowDecimals={false} label="مبلغ تجمعی دوره قبل (ریال)"
                                value={previousRial} onChange={() => {}} InputProps={{ readOnly: true }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4}
                                label={`کارکرد این سطح (${formCurrencyLabel})`}
                                value={workForeign} onChange={() => {}} InputProps={{ readOnly: true }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <MoneyInput size="small" fullWidth allowDecimals={false} label="کارکرد این سطح (ریال)"
                                value={workRial} onChange={() => {}} InputProps={{ readOnly: true }} />
                            </Grid>
                          </Grid>

                          <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center" sx={{ mt: 0.4 }}>
                            <FormControlLabel sx={{ m: 0 }}
                              control={<Switch size="small" checked={Boolean(level.includes_charges)} onChange={(event) => levelEditor?.onToggle(index, 'includes_charges', event.target.checked)} />}
                              label={<Typography sx={{ fontSize: 11.5, fontWeight: 800, color: formKind.color }}>شامل اضافات و کسورات</Typography>} />
                            <Chip size="small"
                              label={level.includes_charges
                                ? `کارکرد این سطح در مبنای اضافات/کسورات: ${formatPersianNumber(workRial)} ریال`
                                : `کارکرد این سطح: ${formatPersianNumber(workRial)} ریال`}
                              sx={{
                                height: 20,
                                fontSize: 10.5,
                                bgcolor: level.includes_charges ? alpha(formKind.color, 0.12) : SOFT_BG,
                                color: level.includes_charges ? formKind.color : MUTED,
                              }} />
                          </Stack>
                        </Box>
                      );
                    }) : <Typography sx={{ fontSize: 12, color: MUTED }}>هنوز سطحی اضافه نشده است.</Typography>}
                    {(levelEditor?.suggestions || []).length ? (
                      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 0.6 }}>
                        {levelEditor.suggestions.map((title) => (
                          <Chip key={title} size="small" label={title} onClick={() => levelEditor.onChoose(title)}
                            sx={{ height: 20, fontSize: 10.5, bgcolor: alpha(formKind.color, 0.08), color: formKind.color }} />
                        ))}
                      </Stack>
                    ) : null}
                    <Stack direction="row" alignItems="center" spacing={1} useFlexGap flexWrap="wrap">
                      <Button size="small" startIcon={<AddCircleIcon />} onClick={() => levelEditor?.onAdd()}
                        sx={{ color: formKind.color, fontSize: 12 }}>افزودن سطح</Button>
                      <Chip size="small"
                        label={`کارکرد کل (سطح اصلی + همهٔ سطوح): ${formatPersianNumber(isRial ? totalWork : totalWorkForeign)} ${formCurrencyLabel}`}
                        sx={{ height: 20, fontSize: 10.5, bgcolor: alpha(GREEN, 0.1), color: GREEN }} />
                    </Stack>
                  </Box>
                ) : isAdjustmentForm ? (
                  <>
                    <Grid container spacing={1.1}>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4}
                          label={`مبلغ تجمعی صورت‌وضعیت، بدون تغییر (${formCurrencyLabel})`}
                          value={form.amount_foreign ?? cumulativeThisForeign}
                          onChange={() => {}} InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={false} label="مبلغ تجمعی صورت‌وضعیت (ریال)"
                          value={form.amount ?? 0} onChange={() => {}} InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4}
                          label={`تعدیل تجمعی دوره قبل (${formCurrencyLabel})`}
                          value={adjustmentPreviousForeign} onChange={() => {}} InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={false} label="تعدیل تجمعی دوره قبل (ریال)"
                          value={adjustmentPrevious} onChange={() => {}} InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4}
                          label={`${formKind.label} این دوره (${formCurrencyLabel})`}
                          value={Math.abs(adjustmentWorkForeign)}
                          onChange={onAdjustmentChange} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={false} label={`${formKind.label} این دوره (ریال)`}
                          value={Math.abs(adjustmentWorkRial)} onChange={() => {}} InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4}
                          label={`تعدیل تجمعی پس از این سند (${formCurrencyLabel})`}
                          value={adjustmentCumulativeForeign} onChange={() => {}} InputProps={{ readOnly: true }} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <MoneyInput size="small" fullWidth allowDecimals={false} label="تعدیل تجمعی پس از این سند (ریال)"
                          value={adjustmentCumulative} onChange={() => {}} InputProps={{ readOnly: true }} />
                      </Grid>
                    </Grid>
                  </>
        ) : (
                  <>
                <Grid container spacing={1.1}>
                  <Grid item xs={12} sm={6}>
                    <MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4}
                      label={`مبلغ تجمعی این صورت‌وضعیت (${formCurrencyLabel})`}
                      value={form.amount_foreign ?? cumulativeThisForeign}
                      onChange={(value) => onAmountChange('amount', value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MoneyInput size="small" fullWidth allowDecimals={false} label="معادل ریالی مبلغ تجمعی"
                      value={form.amount ?? 0} onChange={() => {}} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4}
                      label={`مبلغ تجمعی دوره قبل (${formCurrencyLabel})`}
                      value={form.cumulative_previous_foreign ?? cumulativePrevForeign}
                      onChange={() => {}} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MoneyInput size="small" fullWidth allowDecimals={false} label="مبلغ تجمعی دوره قبل (ریال)"
                      value={cumulativePrev} onChange={() => {}} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4}
                      label={`کارکرد این دوره (${formCurrencyLabel})`}
                      value={workDoneForeign} onChange={() => {}} InputProps={{ readOnly: true }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <MoneyInput size="small" fullWidth allowDecimals={false} label="کارکرد این دوره (ریال)"
                      value={workDone} onChange={() => {}} InputProps={{ readOnly: true }} />
                  </Grid>
                </Grid>
                  </>
                )}
              </Box>

              <Divider />
              <Box>
                <Stack direction="row" alignItems="center" sx={{ mb: 0.6 }}>
                  <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 900, color: '#0f766e' }}>اضافات</Typography>
                  <Chip size="small" label={`${formatPersianNumber(additionsTotalForeign)} ${formCurrencyLabel}`} sx={{ height: 19, fontSize: 12, bgcolor: '#ecfdf5', color: '#0f766e' }} />
                </Stack>
                {additions.map((item, index) => (
                  <Grid container spacing={0.55} alignItems="center" key={`addition-${index}`} sx={{ mb: 0.55 }}>
                    <Grid item xs={12} sm={5}><TextField size="small" fullWidth placeholder="شرح اضافه" value={item.description || ''} onChange={(event) => onUpdateAddition(index, 'description', event.target.value)} /></Grid>
                    <Grid item xs={4} sm={2}><TextField size="small" fullWidth type="number" placeholder="٪" value={item.percent ?? 0} inputProps={{ step: 'any', min: 0 }} onChange={(event) => onUpdateAddition(index, 'percent', event.target.value)} /></Grid>
                    <Grid item xs={6} sm={4}><MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4} placeholder="مبلغ" value={item.amount_foreign ?? 0} onChange={(value) => onUpdateAddition(index, 'amount', value)} /></Grid>
                    <Grid item xs={2} sm={1}><IconButton size="small" color="error" onClick={() => onRemoveAddition(index)}><RemoveCircleIcon fontSize="small" /></IconButton></Grid>
                  </Grid>
                ))}
                {additionList.length ? (
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 0.7 }}>
                    {additionList.map((definition) => (
                      <Chip key={definition.id} size="small" label={definition.description || definition.code} onClick={() => onChooseAddition(definition)}
                        sx={{ height: 20, fontSize: 12, bgcolor: '#ecfdf5', color: '#0f766e' }} />
                    ))}
                  </Stack>
                ) : null}
                <Button size="small" startIcon={<AddCircleIcon />} onClick={onAddAddition} sx={{ color: '#0f766e', fontSize: 12 }}>افزودن اضافه</Button>
              </Box>

              <Divider />
              <Box>
                <Stack direction="row" alignItems="center" sx={{ mb: 0.6 }}>
                  <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 900, color: '#be123c' }}>کسورات</Typography>
                  <Chip size="small" label={`${formatPersianNumber(deductionsTotalForeign)} ${formCurrencyLabel}`} sx={{ height: 19, fontSize: 12, bgcolor: '#fff1f2', color: '#be123c' }} />
                </Stack>
                {deductions.map((item, index) => (
                  <Grid container spacing={0.55} alignItems="center" key={`deduction-${index}`} sx={{ mb: 0.55 }}>
                    <Grid item xs={12} sm={5}><TextField size="small" fullWidth placeholder="عنوان کسور" value={item.title || ''} onChange={(event) => onUpdateDeduction(index, 'title', event.target.value)} /></Grid>
                    <Grid item xs={4} sm={2}><TextField size="small" fullWidth type="number" placeholder="٪" value={item.percent ?? 0} inputProps={{ step: 'any', min: 0 }} onChange={(event) => onUpdateDeduction(index, 'percent', event.target.value)} /></Grid>
                    <Grid item xs={6} sm={4}><MoneyInput size="small" fullWidth allowDecimals={!isRial} maxDecimals={4} placeholder="مبلغ" value={item.amount_foreign ?? 0} onChange={(value) => onUpdateDeduction(index, 'amount', value)} /></Grid>
                    <Grid item xs={2} sm={1}><IconButton size="small" color="error" onClick={() => onRemoveDeduction(index)}><RemoveCircleIcon fontSize="small" /></IconButton></Grid>
                  </Grid>
                ))}
                {deductionList.length ? (
                  <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap" sx={{ mb: 0.7 }}>
                    {deductionList.map((definition) => (
                      <Chip key={definition.id} size="small" label={definition.description || definition.code} onClick={() => onChooseDeduction(definition)}
                        sx={{ height: 20, fontSize: 12, bgcolor: '#fff1f2', color: '#be123c' }} />
                    ))}
                  </Stack>
                ) : null}
                <Button size="small" startIcon={<AddCircleIcon />} onClick={onAddDeduction} sx={{ color: '#be123c', fontSize: 12 }}>افزودن کسور</Button>
              </Box>

              <Divider />
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 900, color: INK, mb: 0.7 }}>مدارک و پیوست‌ها</Typography>
                <AttachmentPicker
                  documents={documents}
                  pendingFiles={pendingFiles}
                  onAdd={onAddFiles}
                  onRemovePending={onRemovePending}
                  onRemoveDocument={onRemoveDocument}
                  accent={STATEMENT_ACCENT}
                  buttonLabel={isAdjustmentForm ? 'افزودن مدرک تعدیل' : 'افزودن مدرک صورت‌وضعیت'}
                  emptyText={isAdjustmentForm ? 'مدارک پشتیبان تعدیل را اینجا پیوست کنید.' : 'صورت‌وضعیت امضاشده، تأییدیه، فاکتور یا مدارک پشتیبان را اینجا پیوست کنید.'}
                  documentLabel={isAdjustmentForm ? 'تعدیل' : 'صورت‌وضعیت'}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx,.doc,.docx,.zip,.rar"
                  hint="PDF، تصویر، اکسل، Word یا ZIP · حداکثر ۲۵ مگابایت"
                  icon={InsertDriveFileIcon}
                />
              </Box>

              <Divider />
              <TextField size="small" fullWidth multiline rows={2} label="توضیحات" value={form.description || ''}
                onChange={(event) => update('description', event.target.value)} />

              <Box sx={{
                p: 1.2, borderRadius: '12px',
                bgcolor: alpha(netColor, 0.05), border: `1px solid ${alpha(netColor, 0.16)}`,
              }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 12, color: MUTED }}>
                      {isMultiForm ? 'مبلغ قابل پرداخت این صورت‌وضعیت' : (isAdjustmentForm ? 'مبلغ قابل پرداخت این تعدیل' : 'مبلغ قابل پرداخت این دوره')}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 17, fontWeight: 900, color: netColor }}>{money(netAmountForeign, formCurrencyLabel)}</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'left', flexShrink: 0 }}>
                    <Typography sx={{ fontSize: 12, color: MUTED }}>{isRial ? 'واحد پول' : 'معادل ریالی'}</Typography>
                    <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 900, color: '#4338ca' }}>{isRial ? formCurrencyLabel : money(netAmount, 'ریال')}</Typography>
                  </Box>
                </Stack>
              </Box>
            </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={6}>
            <Box sx={{ position: { lg: 'sticky' }, top: 16 }}>
              <SurfaceCard title="پیش‌نمایش صورت‌وضعیت" icon={ReceiptLongIcon} color={STATEMENT_ACCENT}
                action={<Chip size="small" label="A4" sx={{ height: 20, fontSize: 12, bgcolor: SOFT_BG, color: MUTED }} />}
                contentSx={{ p: 1 }}>
                <StatementPreview form={{ ...form, amount: cumulativeThis, cumulative_previous_amount: cumulativePrev, work_done: workDone, additions: previewAdditions, deductions }}
                  contract={contract} company={company} currencies={currencyList} rate={rate}
                  isMultiForm={isMultiForm}
                  levels={levelEditor?.levels || []}
                  levelPreviousMap={levelEditor?.previousMap || {}}
                  levelTotals={levelTotals}
                  totalWork={totalWork}
                  totalWorkForeign={totalWorkForeign}
                  chargesBase={chargesBase}
                  chargesBaseForeign={chargesBaseForeign}
                  netAmount={netAmount}
                  netAmountForeign={netAmountForeign} />
              </SurfaceCard>
            </Box>
          </Grid>
        </Grid>
      </Stack>

    </Box>
  );
};

export default StatementEditorPage;