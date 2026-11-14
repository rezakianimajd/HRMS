/**
 * اجزای نمایشی مشترک صفحهٔ مکاتبات.
 *
 * بخش‌بندی فرم، جدول‌های فرم/مشخصات، ورودی ساعت فارسی و ویجت‌های ویرایش درجای
 * جدول. از ``CorrespondenceLettersPage.jsx`` جدا شد تا آن فایل فقط منطق
 * فهرست/فرم/جزئیات را نگه دارد (نگهداشت‌پذیری فاز ۴).
 */
import React, { Fragment, useEffect, useRef, useState } from 'react';
import {
  Box, Divider, MenuItem, Stack, Table, TableBody, TableCell, TableRow, TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import JalaliMaskedDateInput from '../../core/components/ui/JalaliMaskedDateInput';
import { toEnglishDigits, toPersianDigits } from '../../core/utils/numberUtils';
import { ACCENT, SLATE, timeLabel } from './correspondenceUi';


/**
 * ویرایش درجا در جدول (همان الگوی «ورود اطلاعات فصلی»):
 * در حالت ویرایش، سلول‌های قابل تغییر به ورودی کوچک تبدیل می‌شوند و
 * تنها همان ردیف با «ذخیره» به سرور فرستاده می‌شود.
 */
const inlineSx = {
  minWidth: 0,
  '& .MuiInputBase-root': { fontSize: 11.5 },
  '& .MuiInputBase-input': { py: 0.4, height: '18px' },
  '& .MuiInputLabel-root': { display: 'none' },
  '& .MuiFormHelperText-root': { display: 'none' },
  '& .MuiAutocomplete-inputRoot': { py: 0.25, px: 0.25 },
};

const InlineText = ({ value, onChange, placeholder, align = 'right', onEnter, onEscape }) => (
  <TextField
    value={value ?? ''}
    onChange={(event) => onChange(event.target.value)}
    onKeyDown={(event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        onEnter?.();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
      }
    }}
    size="small"
    variant="standard"
    fullWidth
    placeholder={placeholder}
    inputProps={{ style: { textAlign: align, padding: 0 } }}
    InputProps={{ disableUnderline: true }}
    sx={inlineSx}
  />
);

const InlineSelect = ({ value, onChange, options, onEscape }) => (
  <TextField
    select
    size="small"
    variant="standard"
    fullWidth
    value={value ?? ''}
    onChange={(event) => onChange(event.target.value)}
    onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape?.();
      }
    }}
    InputProps={{ disableUnderline: true }}
    sx={inlineSx}
  >
    <MenuItem value="">—</MenuItem>
    {(options || []).map((option) => (
      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
    ))}
  </TextField>
);

const InlineDate = ({ value, onChange, onEnter }) => (
  <JalaliMaskedDateInput
    value={value || ''}
    onChange={(next) => onChange(next || '')}
    onEnter={onEnter}
    variant="standard"
    sx={inlineSx}
  />
);

/** بخش‌بندی فرم با رنگ و جداکننده (بدون توضیح زیر عنوان). */
const FormSection = ({ icon: Icon, title, color = ACCENT, children }) => (
  <Box sx={{ mb: 1.75 }}>
    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75, minWidth: 0 }}>
      <Box sx={{
        width: 28, height: 28, borderRadius: '8px', flex: '0 0 auto',
        display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.12), color,
      }}>
        <Icon sx={{ fontSize: 16 }} />
      </Box>
      <Typography noWrap sx={{ fontSize: 13, fontWeight: 900, color, flex: '0 0 auto' }}>
        {title}
      </Typography>
      <Divider sx={{ flex: 1, borderColor: alpha(color, 0.3) }} />
    </Stack>
    {children}
  </Box>
);

const chunkArray = (items, size) => {
  const rows = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
};

/* بچه‌های Fragment را هم باز می‌کند تا هر فیلد یک خانهٔ مستقل در شبکه بگیرد
   (وگرنه یک Fragment چند فیلد، همه در یک ستون روی هم می‌نشستند). */
const flattenCells = (children) => React.Children.toArray(children).flatMap((child) => (
  React.isValidElement(child) && child.type === React.Fragment
    ? flattenCells(child.props.children)
    : [child]
));

/**
 * شبکهٔ ورود اطلاعات فرم: ستون‌های مساوی و فاصلهٔ یکسان (grid) — در RTL/LTR یکسان است.
 * توضیحات زیر فیلدها (helper text) نمایش داده نمی‌شود تا ارتفاع خانه‌ها/ردیف‌ها یکدست بماند.
 */
const FormTable = ({ children, columns = 3 }) => {
  const cells = flattenCells(children);
  const columnCount = Math.max(1, Number(columns) || 1);
  const fullColumns = `repeat(${columnCount}, minmax(0, 1fr))`;
  const twoColumns = `repeat(${Math.min(2, columnCount)}, minmax(0, 1fr))`;
  return (
    <Box sx={{
      display: 'grid',
      gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: twoColumns, md: fullColumns },
      gap: 1,
      alignItems: 'stretch',
      '& > *': { minWidth: 0 },
      '& .MuiFormControl-root, & .MuiTextField-root, & .MuiAutocomplete-root': {
        width: '100%',
        m: 0,
      },
      '& .MuiInputBase-root': { minHeight: 38 },
      '& .MuiFormHelperText-root': { display: 'none' },
    }}>
      {cells.map((node, index) => (
        <Box key={`form-cell-${index}`} sx={{ minWidth: 0 }}>{node}</Box>
      ))}
    </Box>
  );
};

/** جدول مشخصات در نمای جزئیات نامه (برچسب/مقدار، فونت خوانا). */
const InfoTable = ({ rows, columns = 3 }) => {
  const pairs = rows.filter(Boolean);
  return (
    <Table size="small" sx={{
      tableLayout: 'fixed',
      '& td': { border: '1px solid', borderColor: 'divider', px: 1.1, py: 0.9 },
    }}>
      <TableBody>
        {chunkArray(pairs, columns).map((group, rowIndex) => (
          <TableRow key={`info-row-${rowIndex}`}>
            {group.map(([label, value]) => (
              <Fragment key={`info-${rowIndex}-${label}`}>
                <TableCell sx={{
                  width: '16%',
                  bgcolor: alpha(SLATE, 0.04),
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'text.secondary',
                  whiteSpace: 'nowrap',
                }}>
                  {label}
                </TableCell>
                <TableCell sx={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {value || '—'}
                </TableCell>
              </Fragment>
            ))}
            {Array.from({ length: columns - group.length }).map((_unused, padIndex) => (
              <Fragment key={`info-pad-${rowIndex}-${padIndex}`}>
                <TableCell />
                <TableCell />
              </Fragment>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const InfoGroup = ({ icon: Icon, title, color = ACCENT, children }) => (
  <Box sx={{
    border: '1px solid', borderColor: dividerColor(color), borderRadius: '12px',
    mb: 1.5, minWidth: 0, overflow: 'hidden',
  }}>
    <Stack direction="row" alignItems="center" spacing={0.6}
      sx={{ px: 1.25, py: 0.75, bgcolor: alpha(color, 0.07) }}>
      <Icon sx={{ fontSize: 17, color }} />
      <Typography sx={{ fontSize: 13, fontWeight: 900, color }}>{title}</Typography>
      <Divider sx={{ flex: 1, borderColor: dividerColor(color) }} />
    </Stack>
    {children}
  </Box>
);

const dividerColor = (color) => alpha(color, 0.22);

/** ورودی ساعت با نمایش و پذیرش اعداد فارسی (HH:MM). */
const PersianTimeInput = ({ value, onChange, label }) => {
  const [text, setText] = useState(value ? timeLabel(value) : '');
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) setText(value ? timeLabel(value) : '');
  }, [value]);

  const handleChange = (event) => {
    const digits = toEnglishDigits(String(event.target.value || ''))
      .replace(/[^\d]/g, '')
      .slice(0, 4);
    let formatted = digits;
    if (digits.length >= 3) formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    setText(toPersianDigits(formatted));
    if (digits.length === 4) {
      const hour = Math.min(23, Number(digits.slice(0, 2)));
      const minute = Math.min(59, Number(digits.slice(2)));
      onChange(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    } else if (!digits) {
      onChange('');
    }
  };

  return (
    <TextField
      size="small"
      fullWidth
      label={label}
      value={text}
      onChange={handleChange}
      onFocus={() => { focusedRef.current = true; }}
      onBlur={() => {
        focusedRef.current = false;
        setText(value ? timeLabel(value) : '');
      }}
      placeholder="۰۹:۳۰"
      InputLabelProps={{ shrink: true }}
      inputProps={{ inputMode: 'numeric', style: { textAlign: 'center', direction: 'ltr' } }}
    />
  );
};

/** یک خط متن جدول استاندارد (بدون شکستن خط، فونت از تم جدول). */
const CellText = ({ children, title, weight = 700, color, mono, size }) => (
  <Typography
    noWrap
    title={title || (typeof children === 'string' ? children : undefined)}
    sx={{ color, fontSize: size ? `${size}px` : 'inherit', lineHeight: 1.5, minWidth: 0 }}
  >
    <Box
      component="span"
      sx={{
        fontWeight: weight,
        fontFamily: mono ? 'var(--hrms-table-number-font, inherit)' : 'inherit',
        fontVariantNumeric: mono ? 'tabular-nums' : undefined,
      }}
    >
      {children}
    </Box>
  </Typography>
);

const joinParts = (...parts) => parts
  .filter((part) => part !== null && part !== undefined && part !== '')
  .join(' · ');


export {
  CellText, FormSection, FormTable, InfoGroup, InfoTable, InlineDate, InlineSelect,
  InlineText, PersianTimeInput, chunkArray, dividerColor, inlineSx, joinParts,
};
