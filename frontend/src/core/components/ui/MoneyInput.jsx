import React from 'react';
import { TextField } from '@mui/material';
import { formatPersianNumber, toEnglishDigits } from '../../utils/numberUtils';

/**
 * Money input: shows Persian digits with thousands separators while typing,
 * and emits a raw numeric string (English digits) to onChange.
 *
 * `allowDecimals={false}` برای مبالغ ریالی استفاده می‌شود؛ نرخ ارز و مبالغ
 * ارزی می‌توانند اعشار داشته باشند.
 */
const MoneyInput = ({ value, onChange, allowDecimals = true, maxDecimals = 6, inputProps, ...rest }) => {
  const displayValue = value === '' || value == null ? '' : formatPersianNumber(value);

  const handleChange = (event) => {
    let cleaned = toEnglishDigits(event.target.value);
    cleaned = allowDecimals
      ? cleaned.replace(/[^\d.]/g, '')
      : cleaned.replace(/[^\d]/g, '');
    if (allowDecimals && cleaned.includes('.')) {
      const [integerPart, ...decimalParts] = cleaned.split('.');
      const decimals = decimalParts.join('').slice(0, Math.max(0, Number(maxDecimals) || 0));
      cleaned = cleaned.endsWith('.')
        ? `${integerPart}.`
        : (decimals ? `${integerPart}.${decimals}` : integerPart);
    }
    if (onChange) onChange(cleaned);
  };

  return (
    <TextField
      {...rest}
      value={displayValue}
      onChange={handleChange}
      inputProps={{
        inputMode: allowDecimals ? 'decimal' : 'numeric',
        dir: 'ltr',
        style: { textAlign: 'left' },
        ...(inputProps || {}),
      }}
    />
  );
};

export default MoneyInput;
