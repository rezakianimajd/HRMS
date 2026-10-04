import React from 'react';
import { TextField } from '@mui/material';
import { formatPersianNumber, toEnglishDigits } from '../../utils/numberUtils';

/**
 * Money input: shows Persian digits with thousands separators while typing,
 * and emits a raw numeric string (English digits) to onChange.
 */
const MoneyInput = ({ value, onChange, ...rest }) => {
  const displayValue = value === '' || value == null ? '' : formatPersianNumber(value);

  const handleChange = (e) => {
    const cleaned = toEnglishDigits(e.target.value).replace(/[^\d.]/g, '');
    if (onChange) onChange(cleaned);
  };

  return (
    <TextField
      {...rest}
      value={displayValue}
      onChange={handleChange}
      inputProps={{ inputMode: 'decimal', dir: 'ltr', style: { textAlign: 'left' }, ...(rest.inputProps || {}) }}
    />
  );
};

export default MoneyInput;
