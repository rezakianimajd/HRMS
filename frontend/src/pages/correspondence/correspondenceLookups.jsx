import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Autocomplete, Box, Chip, CircularProgress, TextField, Typography,
} from '@mui/material';
import axiosInstance from '../../core/api/axiosConfig';

/**
 * جستجوهای مشترک ماژول مکاتبات:
 *  - پرسنل (منابع انسانی) برای فرستنده/گیرنده/تحویل‌دهنده و ارجاع
 *  - طرف‌های حساب (مدیریت قراردادها) برای ارسال‌کننده و طرف حساب
 */

const asList = (payload) => (Array.isArray(payload) ? payload : payload?.results || []);

const useDebounced = (value, delay = 320) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

/** بارگذاری گزینه‌ها با جستجوی سرور و دی‌بانس. */
export const useLookup = (endpoint, { limit = 20, enabled = true } = {}) => {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    axiosInstance
      .get(endpoint, { params: { q: debounced, limit } })
      .then((response) => {
        if (requestRef.current === requestId) setOptions(asList(response.data));
      })
      .catch(() => {
        if (requestRef.current === requestId) setOptions([]);
      })
      .finally(() => {
        if (requestRef.current === requestId) setLoading(false);
      });
    return undefined;
  }, [endpoint, debounced, limit, enabled]);

  return { options, loading, setQuery, query };
};

export const personOption = (employee) => {
  if (!employee) return null;
  return {
    ...employee,
    id: employee.id,
    full_name: employee.full_name || employee.label || '',
    label: employee.label || employee.full_name || '',
  };
};

export const personValue = (id, label, code) => (
  id ? { id, label: label || '', full_name: label || '', employee_id: code || '' } : null
);

export const partyValue = (id, name) => (id ? { id, name: name || '', label: name || '' } : null);

const mergeOption = (list, value) => {
  if (!value?.id) return list;
  return list.some((item) => item.id === value.id) ? list : [value, ...list];
};

const PickOption = ({ primary, secondary, badge }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, width: '100%' }}>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 800 }}>{primary}</Typography>
      <Typography noWrap sx={{ fontSize: 11, color: 'text.secondary' }}>
        {secondary || '—'}
      </Typography>
    </Box>
    {badge ? (
      <Chip size="small" label={badge} sx={{ height: 18, fontSize: 10.5, fontWeight: 700 }} />
    ) : null}
  </Box>
);

/** انتخاب پرسنل با جستجوی نام/کد پرسنلی/واحد. */
export const PersonnelPicker = ({
  value = null, onChange, label = 'پرسنل', size = 'small', variant = 'outlined',
  disabled = false, helperText = '', placeholder = 'نام یا کد پرسنلی…', sx,
}) => {
  const { options, loading, setQuery } = useLookup('/letters/personnel/');
  const merged = useMemo(
    () => mergeOption(options.map(personOption), value),
    [options, value],
  );

  return (
    <Autocomplete
      size={size}
      sx={sx}
      disabled={disabled}
      options={merged}
      loading={loading}
      value={value || null}
      onChange={(_event, option) => onChange?.(option || null)}
      onInputChange={(_event, text, reason) => {
        if (reason === 'input') setQuery(text);
      }}
      getOptionLabel={(option) => option?.label || option?.full_name || ''}
      isOptionEqualToValue={(a, b) => a?.id === b?.id}
      noOptionsText="پرسنلی یافت نشد"
      loadingText="در حال جستجو…"
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <PickOption
            primary={option.full_name}
            secondary={[option.job_title, option.department].filter(Boolean).join(' · ')}
            badge={option.employee_id}
          />
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant={variant}
          disabled={disabled}
          placeholder={placeholder}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={14} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};
/** انتخاب چند پرسنل (ارجاع هم‌زمان به چند نفر). */
export const MultiPersonnelPicker = ({
  value = [], onChange, label = 'گیرندگان دیگر (چند نفر)', size = 'small',
  variant = 'outlined', disabled = false, helperText = '', sx,
}) => {
  const { options, loading, setQuery } = useLookup('/letters/personnel/');
  const merged = useMemo(() => {
    const chosen = (value || []).map(personOption).filter(Boolean);
    const rest = options.map(personOption)
      .filter((option) => !chosen.some((item) => item.id === option.id));
    return [...chosen, ...rest];
  }, [options, value]);

  return (
    <Autocomplete
      multiple
      size={size}
      sx={sx}
      disabled={disabled}
      options={merged}
      loading={loading}
      value={(value || []).map(personOption).filter(Boolean)}
      onChange={(_event, next) => onChange?.(next || [])}
      onInputChange={(_event, text, reason) => {
        if (reason === 'input') setQuery(text);
      }}
      getOptionLabel={(option) => option?.label || option?.full_name || ''}
      isOptionEqualToValue={(a, b) => a?.id === b?.id}
      noOptionsText="پرسنلی یافت نشد"
      loadingText="در حال جستجو…"
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <PickOption
            primary={option.full_name}
            secondary={[option.job_title, option.department].filter(Boolean).join(' · ')}
            badge={option.employee_id}
          />
        </Box>
      )}
      renderTags={(selected, getTagProps) => selected.map((option, index) => (
        <Chip
          size="small"
          label={option.full_name || option.label}
          {...getTagProps({ index })}
          key={option.id}
          sx={{ height: 20, fontSize: 10.5 }}
        />
      ))}
      renderInput={(params) => (
        <TextField {...params} variant={variant} label={label} helperText={helperText} />
      )}
    />
  );
};



/** انتخاب طرف حساب از مدیریت قراردادها؛ امکان ثبت سریع نام جدید. */
export const PartyPicker = ({
  value = null, onChange, label = 'طرف حساب', size = 'small', variant = 'outlined',
  allowCreate = true, disabled = false, helperText = '', placeholder = 'نام طرف حساب…', sx,
}) => {
  const { options, loading, setQuery } = useLookup('/letters/parties/');
  const [creating, setCreating] = useState(false);
  const merged = useMemo(() => mergeOption(options, value), [options, value]);

  const handleChange = async (_event, option) => {
    if (typeof option === 'string') {
      const name = option.trim();
      if (!name) return;
      if (!allowCreate) {
        onChange?.(null, { error: 'طرف حساب انتخاب‌شده در مدیریت قراردادها یافت نشد.' });
        return;
      }
      setCreating(true);
      try {
        const response = await axiosInstance.post('/letters/quick-party/', { name });
        const party = {
          id: response.data.id,
          name: response.data.name,
          label: response.data.name,
        };
        onChange?.(party, { created: Boolean(response.data.created) });
      } catch (error) {
        onChange?.(null, {
          error: error?.response?.data?.detail || 'ثبت طرف حساب جدید ممکن نشد.',
        });
      } finally {
        setCreating(false);
      }
      return;
    }
    onChange?.(option || null, {});
  };

  const busy = loading || creating;

  return (
    <Autocomplete
      size={size}
      sx={sx}
      disabled={disabled}
      freeSolo
      autoSelect
      options={merged}
      loading={busy}
      value={value || null}
      onChange={handleChange}
      onInputChange={(_event, text, reason) => {
        if (reason === 'input') setQuery(text);
      }}
      getOptionLabel={(option) => (
        typeof option === 'string' ? option : (option?.name || option?.label || '')
      )}
      isOptionEqualToValue={(a, b) => a?.id === b?.id}
      noOptionsText={allowCreate ? 'موردی یافت نشد — با Enter ثبت می‌شود' : 'موردی یافت نشد'}
      loadingText="در حال جستجو…"
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <PickOption
            primary={option.name || option.label}
            secondary={[option.party_type_display, option.contact_person].filter(Boolean).join(' · ')}
            badge={option.national_id}
          />
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant={variant}
          disabled={disabled}
          placeholder={placeholder}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {busy ? <CircularProgress color="inherit" size={14} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

