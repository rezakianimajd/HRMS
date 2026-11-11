/**
 * پیش‌نمایش و چاپ سند از موتور چاپ (HTML سرور در iframe).
 */
import React from 'react';
import {
  Alert, Box, Button, Checkbox, CircularProgress, Collapse, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, FormControlLabel, FormControl, IconButton, InputLabel,
  MenuItem, Select, Stack, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import TuneIcon from '@mui/icons-material/Tune';
import CropPortraitIcon from '@mui/icons-material/CropPortrait';
import CropLandscapeIcon from '@mui/icons-material/CropLandscape';
import { printHtml } from './printEngine';

export const PRINT_PAPERS = ['A4', 'A5', 'A3', 'Letter'];

const PrintPreviewDialog = ({
  open, title = 'پیش‌نمایش چاپ', html = '', loading = false, error = '',
  onClose, printLabel = 'چاپ', maxWidth = 'md',
  options = null, onChangeOptions = null, onRefresh = null,
  columnsCatalog = null, onSaveColumns = null,
}) => {
  const paper = options?.paper || 'A4';
  const orientation = options?.orientation === 'landscape' ? 'landscape' : 'portrait';
  const showControls = Boolean(onChangeOptions && options);
  const change = (patch) => onChangeOptions?.({ ...options, ...patch });
  const savedColumns = Array.isArray(options?.columns)
    ? options.columns
    : (columnsCatalog || []).map((column) => column.key);
  const [columnsOpen, setColumnsOpen] = React.useState(false);
  const [columns, setColumns] = React.useState(savedColumns);
  React.useEffect(() => { setColumns(savedColumns); }, [JSON.stringify(savedColumns)]);
  const toggleColumn = (key) => {
    const next = columns.includes(key)
      ? columns.filter((item) => item !== key)
      : [...columns, key];
    const safe = next.length ? next : [key];
    setColumns(safe);
    change({ columns: safe });
  };
  const showColumnPicker = Boolean(columnsCatalog?.length && onChangeOptions);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={maxWidth} PaperProps={{ sx: { height: '92vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1, flexWrap: 'wrap' }}>
        <PrintIcon fontSize="small" />
        <Box sx={{ flex: 1, fontWeight: 800, minWidth: 160 }}>{title}</Box>
        {showControls ? (
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <ToggleButtonGroup
              size="small" exclusive value={orientation}
              onChange={(_event, value) => { if (value) change({ orientation: value }); }}
              aria-label="جهت کاغذ چاپ"
            >
              <ToggleButton value="portrait" aria-label="عمودی" title="عمودی (Portrait)">
                <CropPortraitIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="landscape" aria-label="افقی" title="افقی (Landscape)">
                <CropLandscapeIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
            <FormControl size="small" sx={{ minWidth: 96 }}>
              <InputLabel id="print-paper-label">کاغذ</InputLabel>
              <Select
                labelId="print-paper-label" label="کاغذ" value={paper}
                onChange={(event) => change({ paper: event.target.value })}
              >
                {PRINT_PAPERS.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
              </Select>
            </FormControl>
            {onRefresh ? (
              <Button size="small" onClick={onRefresh} disabled={loading}>به‌روزرسانی</Button>
            ) : null}
            {showColumnPicker ? (
              <Button
                size="small" startIcon={<TuneIcon />} onClick={() => setColumnsOpen((value) => !value)}
                aria-expanded={columnsOpen}
              >
                قالب چاپ
              </Button>
            ) : null}
          </Stack>
        ) : null}
        <IconButton size="small" onClick={onClose} aria-label="بستن پیش‌نمایش چاپ">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, bgcolor: 'grey.100', position: 'relative' }}>
        {showColumnPicker ? (
          <Collapse in={columnsOpen}>
            <Box sx={{ bgcolor: 'background.paper', px: 2, py: 1.25 }}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 800, mb: 0.75 }}>
                ساخت قالب چاپ — ستون‌های این چاپ
              </Typography>
              <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" alignItems="center">
                {(columnsCatalog || []).map((column) => (
                  <FormControlLabel
                    key={column.key}
                    sx={{ m: 0 }}
                    control={(
                      <Checkbox
                        size="small"
                        checked={columns.includes(column.key)}
                        onChange={() => toggleColumn(column.key)}
                      />
                    )}
                    label={<Typography sx={{ fontSize: 12 }}>{column.label}</Typography>}
                  />
                ))}
                {onSaveColumns ? (
                  <Button
                    size="small" variant="outlined"
                    onClick={() => onSaveColumns(columns)}
                    disabled={!columns.length}
                  >
                    ذخیره به‌عنوان قالب
                  </Button>
                ) : null}
              </Stack>
              <Divider sx={{ mt: 1 }} />
            </Box>
          </Collapse>
        ) : null}
        {loading && (
          <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
            <CircularProgress size={28} />
          </Stack>
        )}
        {!loading && error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
        {!loading && !error && html && (
          <Box
            component="iframe"
            title={title}
            srcDoc={html}
            sx={{ width: '100%', height: '100%', border: 0, bgcolor: '#fff' }}
          />
        )}
        {loading && html ? (
          <Box sx={{
            position: 'absolute', top: 8, left: 8, right: 8, borderRadius: '8px',
            bgcolor: 'rgba(15,23,42,0.06)', px: 1, py: 0.25,
          }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700 }}>در حال آماده‌سازی پیش‌نمایش…</Typography>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Typography sx={{ flex: 1, fontSize: 11.5, color: 'text.secondary' }}>
          {paper} · {orientation === 'landscape' ? 'افقی' : 'عمودی'}
        </Typography>
        <Button onClick={onClose} color="inherit">بستن</Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          disabled={!html || loading}
          onClick={() => printHtml(html, { title })}
        >
          {printLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PrintPreviewDialog;
