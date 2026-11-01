import React, { useEffect, useRef, useState } from 'react';
import { TextField } from '@mui/material';
import { toEnglishDigits, toPersianDigits } from '../../utils/numberUtils';
import { toGregorian, toJalali } from '../../utils/dateUtils';

/**
 * ورودی تاریخ شمسی با همان متد «ورود اطلاعات معاملات فصلی» در حسابداری:
 *  - ارقام فارسی، ماسک YYYY/MM/DD
 *  - با تایپ ۸ رقم، اسلش‌ها خودکار اضافه می‌شوند
 *  - تاریخ معتبر شمسی بلافاصله به میلادی (YYYY-MM-DD) تبدیل و به onChange داده می‌شود
 *  - با خروج از فیلد، مقدار نمایشی به تاریخ معتبر بازنویسی می‌شود
 *
 * value: تاریخ میلادی ISO (YYYY-MM-DD) — onChange(gregorianIso)
 */
const JalaliMaskedDateInput = ({
  value,
  onChange,
  label,
  placeholder = '1405/01/01',
  variant = 'standard',
  size = 'small',
  sx,
  inputSx,
  disabled = false,
  ariaLabel,
  onEnter,
}) => {
  const [text, setText] = useState(() => (value && value !== '—' ? toJalali(value) : ''));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setText(value && value !== '—' ? toJalali(value) : '');
    }
  }, [value]);

  const handleChange = (raw) => {
    let latin = toEnglishDigits(String(raw ?? '')).replace(/[^\d/]/g, '');
    if (!latin.includes('/') && latin.length === 8) {
      latin = `${latin.slice(0, 4)}/${latin.slice(4, 6)}/${latin.slice(6)}`;
    }
    setText(toPersianDigits(latin));
    const parts = latin.split('/');
    if (
      parts.length === 3
      && /^\d{4}$/.test(parts[0])
      && /^\d{1,2}$/.test(parts[1])
      && /^\d{1,2}$/.test(parts[2])
    ) {
      const gregorian = toGregorian(latin);
      if (/^\d{4}-\d{2}-\d{2}$/.test(gregorian) && gregorian !== value) onChange(gregorian);
    }
  };

  const handleBlur = () => {
    focusedRef.current = false;
    setText(value && value !== '—' ? toJalali(value) : '');
  };

  const commonProps = {
    value: text,
    onChange: (e) => handleChange(e.target.value),
    onFocus: () => { focusedRef.current = true; },
    onBlur: handleBlur,
    onKeyDown: (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
        if (onEnter) onEnter();
      }
    },
    placeholder: toPersianDigits(placeholder),
    disabled,
    fullWidth: true,
    inputProps: {
      inputMode: 'numeric',
      'aria-label': ariaLabel || label,
      style: { textAlign: variant === 'standard' ? 'center' : 'right' },
    },
  };

  if (variant === 'outlined') {
    return (
      <TextField
        {...commonProps}
        size={size}
        label={label}
        variant="outlined"
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' }, ...(sx || {}) }}
      />
    );
  }

  return (
    <TextField
      {...commonProps}
      variant="standard"
      InputProps={{ disableUnderline: true }}
      sx={{
        '& .MuiInputBase-input': { py: 0.25, px: 0.25 },
        ...(inputSx || {}),
        ...(sx || {}),
      }}
    />
  );
};

export default JalaliMaskedDateInput;
