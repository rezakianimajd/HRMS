import React, { useMemo } from 'react';
import { Autocomplete, Box, TextField, Typography, alpha } from '@mui/material';
import { formatPersianNumber } from '../../utils/numberUtils';

const employeeLabel = (employee) => {
  if (!employee) return '';
  const name = employee.full_name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
  const code = employee.employee_id ? ` · ${employee.employee_id}` : '';
  return `${name}${code}`;
};

/**
 * انتخاب پروندهٔ پرسنلی (منابع انسانی) برای کاربر.
 * کاربر می‌تواند هیچ پرسنلی انتخاب نکند؛ در آن صورت آواتار بر اساس جنسیت
 * یا حرف اول نام نمایش داده می‌شود.
 */
const EmployeePicker = ({ employees = [], value, onChange, accent, disabled = false, loading = false }) => {
  const selected = useMemo(
    () => employees.find((item) => String(item.id) === String(value ?? '')) || null,
    [employees, value],
  );

  return (
    <Autocomplete
      size="small"
      disabled={disabled}
      loading={loading}
      options={employees}
      value={selected}
      onChange={(_event, next) => onChange(next ? next.id : null)}
      getOptionLabel={employeeLabel}
      isOptionEqualToValue={(option, current) => String(option.id) === String(current.id)}
      noOptionsText="پرسنلی با این مشخصات پیدا نشد"
      loadingText="در حال دریافت پرسنل…"
      clearText="حذف ارتباط"
      openText="انتخاب پرسنل"
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id} sx={{ gap: 1 }}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: 12, fontWeight: 800 }}>
              {option.full_name || `${option.first_name} ${option.last_name}`}
            </Typography>
            <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary' }}>
              {[
                option.employee_id ? `کد پرسنلی ${formatPersianNumber(option.employee_id)}` : null,
                option.department_name,
                option.job_title_name,
              ].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
          {option.gender_display ? (
            <Typography sx={{ fontSize: 10, color: 'text.secondary', flexShrink: 0 }}>
              {option.gender_display}
            </Typography>
          ) : null}
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="پروندهٔ پرسنلی در منابع انسانی"
          placeholder="جستجوی نام یا کد پرسنلی…"
          helperText="با انتخاب پرسنل، عکس پرسنلی و جنسیت او در آواتار کاربر استفاده می‌شود."
          FormHelperTextProps={{ sx: { fontSize: 10.5, mx: 0.25 } }}
          sx={{
            '& .MuiOutlinedInput-root': { borderRadius: '10px' },
            '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: accent, borderWidth: 1.5,
            },
            '& .MuiInputLabel-root.Mui-focused': { color: accent },
          }}
        />
      )}
      componentsProps={{ clearIndicator: { sx: { color: accent } }, popupIndicator: { sx: { color: accent } } }}
    />
  );
};

export default EmployeePicker;
