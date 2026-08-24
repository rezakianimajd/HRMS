import React, { useState, useEffect, useRef } from 'react';
import { TextField } from '@mui/material';
import { toGregorian, toJalali } from '../../utils/dateUtils';

/**
 * Jalali (Shamsi) date picker wrapper.
 * Displays Jalali date to user, stores Gregorian date for backend.
 *
 * Props:
 *   value: Gregorian date string (YYYY-MM-DD) from backend
 *   onChange: callback receiving Gregorian date string
 *   label: TextField label
 *   ...rest: passed to TextField
 */
const JalaliDatePicker = ({ value, onChange, label, ...rest }) => {
  const [displayValue, setDisplayValue] = useState('');
  const [error, setError] = useState('');
  const focusedRef = useRef(false);

  // Only sync from external value when the field is NOT being edited.
  // This prevents the component from overwriting the user's in-progress typing.
  useEffect(() => {
    if (!focusedRef.current) {
      setDisplayValue(toJalali(value));
    }
  }, [value]);

  const normalizeDigits = (str) => {
    return str
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  };

  const isCompleteJalali = (str) => {
    const parts = (str || '').split('/').map(s => s.trim());
    if (parts.length !== 3) return false;
    const [y, m, d] = parts;
    if (!/^\d{4}$/.test(y)) return false;
    if (!/^\d{1,2}$/.test(m)) return false;
    if (!/^\d{1,2}$/.test(d)) return false;
    return true;
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    const normalized = normalizeDigits(raw);
    setDisplayValue(raw);

    // Only convert + notify parent when the date is complete.
    // This prevents partial input from triggering a round-trip that
    // changes the displayed date while the user is still typing.
    const parts = normalized.split('/').map(s => s.trim());
    if (parts.length === 3 && /^\d{4}$/.test(parts[0])) {
      const gregorian = toGregorian(normalized);
      if (gregorian && /^\d{4}-\d{2}-\d{2}$/.test(gregorian)) {
        setError('');
        onChange(gregorian);
        return;
      }
    }
    setError('فرمت تاریخ: 1403/06/15');
  };

  const handleBlur = () => {
    focusedRef.current = false;
    // On blur, re-sync with the canonical value (in case of incomplete input)
    if (!isCompleteJalali(displayValue)) {
      setDisplayValue(toJalali(value));
    }
  };

  return (
    <TextField
      {...rest}
      size="small"
      label={label}
      value={displayValue}
      onChange={handleChange}
      onFocus={() => { focusedRef.current = true; }}
      onBlur={handleBlur}
      placeholder="1403/06/15"
      helperText={error || 'مثال: 1403/06/15'}
      error={!!error}
      InputLabelProps={{ shrink: true }}
      inputProps={{
        style: { textAlign: 'right', direction: 'rtl', paddingLeft: 14 },
      }}
    />
  );
};

export default JalaliDatePicker;