import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, FormControl, FormControlLabel, InputLabel, LinearProgress,
  MenuItem, Select, Stack, Switch, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../../core/api/axiosConfig';
import { formatPersianNumber, toPersianDigits } from '../../../core/utils/numberUtils';

const STATE_COLUMN = 'StateCode';
const CITY_COLUMN = 'CityCode';
const MAIN_COLUMNS = [
  STATE_COLUMN, CITY_COLUMN, 'KalaType', 'HCForoushandeType1Code',
  'Price', 'MaliatArzeshAfzoodeh', 'ForoushandePostCode',
  'ForoushandeNationalCode', 'KalaKhadamatName', 'FactorNo', 'FactorDate',
];
const EXTRA_COLUMNS = [
  'HCForoushandeTypeCode', 'ForoushandeName', 'ForoushandeLastNameSherkatName',
  'ForoushandeAddress', 'ArzType', 'SanadNO', 'SanadDate',
];
const BULK_COLUMNS = [STATE_COLUMN, CITY_COLUMN, 'KalaType', 'HCForoushandeType1Code',
  'ArzType', 'FactorDate', 'KalaKhadamatName'];

const useProvinceCities = (apiBase, stateCode) => useQuery({
  queryKey: ['ttms-cities', stateCode],
  queryFn: async () => {
    const response = await axiosInstance.get(`${apiBase}/ttms-zones/`, {
      params: { province: stateCode },
    });
    return response.data?.cities || [];
  },
  enabled: stateCode !== null && stateCode !== undefined && stateCode !== '',
  staleTime: 30 * 60 * 1000,
});

const CitySelect = ({ apiBase, stateCode, value, onChange }) => {
  const { data: cities = [], isFetching } = useProvinceCities(apiBase, stateCode);
  return (
    <Select
      size="small"
      displayEmpty
      value={value === null || value === undefined ? '' : String(value)}
      onChange={(event) => onChange(event.target.value)}
      sx={{ fontSize: 11, minWidth: 130 }}
      disabled={!stateCode || isFetching}
    >
      <MenuItem value="" sx={{ fontSize: 11 }}>—</MenuItem>
      {cities.map((city) => (
        <MenuItem key={city.code} value={String(city.code)} sx={{ fontSize: 11 }}>
          {`${toPersianDigits(city.code)} — ${city.name}`}
        </MenuItem>
      ))}
    </Select>
  );
};

const SeasonalTtmsPreview = ({
  apiBase, preview, loading, error, provinces = [], kalaTypes = [], statusCodes = [],
  currencies = [], overrides, defaults, onOverride, onDefault, onRefresh, onDownloadCsv,
}) => {
  const [showExtra, setShowExtra] = useState(false);
  const [onlyNeedsFix, setOnlyNeedsFix] = useState(false);
  const [bulkColumn, setBulkColumn] = useState(STATE_COLUMN);
  const [bulkValue, setBulkValue] = useState('');

  const columns = useMemo(() => {
    const map = {};
    (preview?.columns || []).forEach((column) => { map[column.name] = column; });
    return map;
  }, [preview]);

  const label = (name) => columns[name]?.label || name;

  const valueOf = (row, column) => {
    const local = overrides[row.key];
    if (local && Object.prototype.hasOwnProperty.call(local, column)) return local[column];
    if (Object.prototype.hasOwnProperty.call(defaults, column)) return defaults[column];
    return row.values[column];
  };

  const visibleColumns = showExtra ? [...MAIN_COLUMNS, ...EXTRA_COLUMNS] : MAIN_COLUMNS;
  const allRows = preview?.rows || [];
  const rows = onlyNeedsFix ? allRows.filter((row) => row.needs_fix) : allRows;

  const renderEditor = (row, column) => {
    const value = valueOf(row, column);
    const text = value === null || value === undefined ? '' : String(value);

    if (column === STATE_COLUMN) {
      return (
        <Select
          size="small"
          displayEmpty
          value={text}
          onChange={(event) => onOverride(row.key, column, event.target.value)}
          sx={{ fontSize: 11, minWidth: 130 }}
        >
          <MenuItem value="" sx={{ fontSize: 11 }}>—</MenuItem>
          {provinces.map((province) => (
            <MenuItem key={province.code} value={String(province.code)} sx={{ fontSize: 11 }}>
              {`${toPersianDigits(province.code)} — ${province.name}`}
            </MenuItem>
          ))}
        </Select>
      );
    }
    if (column === CITY_COLUMN) {
      return (
        <CitySelect
          apiBase={apiBase}
          stateCode={valueOf(row, STATE_COLUMN)}
          value={value}
          onChange={(next) => onOverride(row.key, column, next)}
        />
      );
    }
    if (column === 'KalaType') {
      return (
        <Select size="small" value={text}
                onChange={(event) => onOverride(row.key, column, event.target.value)}
                sx={{ fontSize: 11, minWidth: 130 }}>
          {kalaTypes.map((item) => (
            <MenuItem key={item.value} value={String(item.value)} sx={{ fontSize: 11 }}>
              {`${toPersianDigits(item.value)} — ${item.label}`}
            </MenuItem>
          ))}
        </Select>
      );
    }
    if (column === 'HCForoushandeType1Code') {
      return (
        <Select size="small" value={text}
                onChange={(event) => onOverride(row.key, column, event.target.value)}
                sx={{ fontSize: 11, minWidth: 150 }}>
          {statusCodes.map((item) => (
            <MenuItem key={item.value} value={String(item.value)} sx={{ fontSize: 11 }}>
              {`${toPersianDigits(item.value)} — ${item.label}`}
            </MenuItem>
          ))}
        </Select>
      );
    }
    if (column === 'ArzType') {
      return (
        <Select size="small" displayEmpty value={text}
                onChange={(event) => onOverride(row.key, column, event.target.value)}
                sx={{ fontSize: 11, minWidth: 140 }}>
          <MenuItem value="" sx={{ fontSize: 11 }}>—</MenuItem>
          {currencies.map((item) => (
            <MenuItem key={item.code} value={String(item.code)} sx={{ fontSize: 11 }}>
              {`${toPersianDigits(item.code)} — ${item.name}`}
            </MenuItem>
          ))}
        </Select>
      );
    }
    return (
      <TextField
        size="small"
        value={text}
        onChange={(event) => onOverride(row.key, column, event.target.value)}
        sx={{ minWidth: 110 }}
        inputProps={{ style: { fontSize: 11, padding: '6px 8px' } }}
      />
    );
  };

  const bulkState = bulkColumn === STATE_COLUMN
    ? (bulkValue || defaults[STATE_COLUMN] || '')
    : '';

  const applyBulk = () => onDefault(bulkColumn, bulkValue);

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        <Chip size="small" color="primary" variant="outlined"
              label={`ردیف‌ها: ${toPersianDigits(allRows.length)}`} />
        {preview ? (
          <Chip size="small" variant="outlined"
                label={`جمع مبلغ: ${formatPersianNumber(preview.totals?.amount || 0)}`} />
        ) : null}
        {preview?.needs_fix_count ? (
          <Chip size="small" color="warning" variant="outlined"
                label={`نیازمند اصلاح: ${toPersianDigits(preview.needs_fix_count)}`} />
        ) : null}
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<DownloadIcon sx={{ fontSize: 15 }} />}
                onClick={onDownloadCsv} disabled={loading || !preview}>
          دانلود CSV پیش‌نمایش
        </Button>
        <Button size="small" startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
                onClick={onRefresh} disabled={loading}>
          به‌روزرسانی
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel id="ttms-bulk-col">اعمال به همهٔ ردیف‌ها</InputLabel>
          <Select
            labelId="ttms-bulk-col"
            label="اعمال به همهٔ ردیف‌ها"
            value={bulkColumn}
            onChange={(event) => { setBulkColumn(event.target.value); setBulkValue(''); }}
            sx={{ fontSize: 11.5 }}
          >
            {BULK_COLUMNS.map((column) => (
              <MenuItem key={column} value={column} sx={{ fontSize: 11.5 }}>{label(column)}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {bulkColumn === STATE_COLUMN ? (
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="ttms-bulk-state">استان</InputLabel>
            <Select
              labelId="ttms-bulk-state"
              label="استان"
              displayEmpty
              value={bulkValue}
              onChange={(event) => setBulkValue(event.target.value)}
              sx={{ fontSize: 11.5 }}
            >
              <MenuItem value="" sx={{ fontSize: 11.5 }}>—</MenuItem>
              {provinces.map((province) => (
                <MenuItem key={province.code} value={String(province.code)} sx={{ fontSize: 11.5 }}>
                  {`${toPersianDigits(province.code)} — ${province.name}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : bulkColumn === CITY_COLUMN ? (
          <CitySelect
            apiBase={apiBase}
            stateCode={defaults[STATE_COLUMN] || null}
            value={bulkValue}
            onChange={setBulkValue}
          />
        ) : bulkColumn === 'KalaType' ? (
          <Select size="small" displayEmpty value={bulkValue}
                  onChange={(event) => setBulkValue(event.target.value)}
                  sx={{ fontSize: 11.5, minWidth: 200 }}>
            <MenuItem value="" sx={{ fontSize: 11.5 }}>—</MenuItem>
            {kalaTypes.map((item) => (
              <MenuItem key={item.value} value={String(item.value)} sx={{ fontSize: 11.5 }}>
                {`${toPersianDigits(item.value)} — ${item.label}`}
              </MenuItem>
            ))}
          </Select>
        ) : bulkColumn === 'HCForoushandeType1Code' ? (
          <Select size="small" displayEmpty value={bulkValue}
                  onChange={(event) => setBulkValue(event.target.value)}
                  sx={{ fontSize: 11.5, minWidth: 200 }}>
            <MenuItem value="" sx={{ fontSize: 11.5 }}>—</MenuItem>
            {statusCodes.map((item) => (
              <MenuItem key={item.value} value={String(item.value)} sx={{ fontSize: 11.5 }}>
                {`${toPersianDigits(item.value)} — ${item.label}`}
              </MenuItem>
            ))}
          </Select>
        ) : bulkColumn === 'ArzType' ? (
          <Select size="small" displayEmpty value={bulkValue}
                  onChange={(event) => setBulkValue(event.target.value)}
                  sx={{ fontSize: 11.5, minWidth: 200 }}>
            <MenuItem value="" sx={{ fontSize: 11.5 }}>—</MenuItem>
            {currencies.map((item) => (
              <MenuItem key={item.code} value={String(item.code)} sx={{ fontSize: 11.5 }}>
                {`${toPersianDigits(item.code)} — ${item.name}`}
              </MenuItem>
            ))}
          </Select>
        ) : (
          <TextField size="small" label={label(bulkColumn)} value={bulkValue}
                     onChange={(event) => setBulkValue(event.target.value)}
                     sx={{ minWidth: 200 }}
                     inputProps={{ style: { fontSize: 11.5 } }} />
        )}

        <Button size="small" variant="outlined" onClick={applyBulk} disabled={!bulkValue}>
          اعمال به همه
        </Button>
        <Button size="small" variant="text" onClick={() => onDefault(null, null)}>
          پاک کردن اعمال‌ها
        </Button>
        {bulkColumn === CITY_COLUMN && !defaults[STATE_COLUMN] && !bulkState ? (
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
            ابتدا استان را «اعمال به همه» کنید تا فهرست شهرها بارگذاری شود.
          </Typography>
        ) : null}
      </Stack>

      {preview?.warnings?.length ? (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
          {preview.warnings.map((warning) => (
            <Chip
              key={warning.code}
              size="small"
              color={warning.level === 'warning' ? 'warning' : 'info'}
              variant="outlined"
              label={warning.message}
              sx={{ fontSize: 10.5 }}
            />
          ))}
        </Stack>
      ) : null}

      {error ? <Alert severity="error" sx={{ mb: 1, fontSize: 11.5 }}>{error}</Alert> : null}
      {loading ? <LinearProgress sx={{ mb: 1 }} /> : null}

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        <FormControlLabel
          control={<Switch size="small" checked={onlyNeedsFix}
                           onChange={(event) => setOnlyNeedsFix(event.target.checked)} />}
          label={<Typography sx={{ fontSize: 11.5 }}>فقط ردیف‌های نیازمند اصلاح</Typography>}
        />
        {onlyNeedsFix ? (
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
            {`${toPersianDigits(rows.length)} از ${toPersianDigits(allRows.length)} ردیف نمایش داده می‌شود.`}
          </Typography>
        ) : null}
      </Stack>

      <Box sx={{
        maxHeight: 360, overflow: 'auto', border: '1px solid', borderColor: 'divider',
        borderRadius: 1,
      }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {['ردیف', 'طرف معامله', 'استان/شهر (Zone)'].map((title) => (
                <TableCell key={title} sx={{ fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
                  {title}
                </TableCell>
              ))}
              {visibleColumns.map((column) => (
                <TableCell key={column} sx={{ fontSize: 10.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
                  {label(column)}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key} hover sx={row.needs_fix ? { bgcolor: 'rgba(245, 158, 11, 0.07)' } : undefined}>
                <TableCell sx={{ fontSize: 11 }}>{toPersianDigits(row.line_no)}</TableCell>
                <TableCell sx={{ fontSize: 11, maxWidth: 180 }}>{row.party_name}</TableCell>
                <TableCell sx={{ fontSize: 10.5, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  {row.province_name || row.province || '—'}
                  {row.city_name ? ` / ${row.city_name}` : ''}
                </TableCell>
                {visibleColumns.map((column) => (
                  <TableCell key={column} sx={{ py: 0.5, px: 0.75 }}>
                    {renderEditor(row, column)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
        <Tooltip title="نمایش ستون‌های کم‌کاربرد مثل شماره/تاریخ سند، نام و آدرس فروشنده">
          <Button size="small" variant="text" onClick={() => setShowExtra((value) => !value)}>
            {showExtra ? 'نمایش ستون‌های اصلی' : 'نمایش همهٔ ستون‌های قابل ویرایش'}
          </Button>
        </Tooltip>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
          {'کدهای استان/شهر از جدول Zone نسخهٔ TTMS خوانده و از نام استان/شهر هر ردیف تشخیص داده می‌شوند؛ تغییرها فقط در همین خروجی اثر دارد.'}
        </Typography>
      </Stack>
    </Box>
  );
};

export default SeasonalTtmsPreview;


