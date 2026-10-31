import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem,
  Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import {
  FIELD_LABELS, GRID_FIELDS, buildRowsFromMatrix, detectMapping, parseClipboardMatrix,
} from './seasonalGridEntry';
import { toPersianDigits } from '../../../core/utils/numberUtils';

const MUTED = '#64748b';

/**
 * درج گروهی: چسباندن از اکسل/CSV یا خواندن فایل CSV/TSV
 * با تشخیص خودکار ستون‌ها، پیش‌نمایش و هشدارهای ردیفی.
 */
const SeasonalBulkPasteDialog = ({ open, onClose, onApply, makeRow, seedText = '' }) => {
  const [text, setText] = useState('');
  const [mapping, setMapping] = useState([]);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && seedText) setText(seedText);
  }, [open, seedText]);

  const parsed = useMemo(() => parseClipboardMatrix(text), [text]);
  const activeMapping = mapping.length ? mapping : detectMapping(parsed.matrix, parsed.hasHeader);
  const preview = useMemo(() => (parsed.matrix.length
    ? buildRowsFromMatrix({ ...parsed, mapping: activeMapping }, makeRow)
    : { rows: [], warnings: [] }), [parsed, activeMapping, makeRow]);

  useEffect(() => { setMapping(detectMapping(parsed.matrix, parsed.hasHeader)); }, [parsed]);

  const reset = () => { setText(''); setFileName(''); setMapping([]); };
  const close = () => { reset(); onClose?.(); };

  const apply = () => {
    const result = buildRowsFromMatrix({ ...parsed, mapping: activeMapping }, makeRow);
    if (!result.rows.length) return;
    onApply?.(result.rows, result.warnings);
    reset();
    onClose?.();
  };

  const readFile = (file) => {
    if (!file) return;
    const name = String(file.name || '');
    setFileName(name);
    if (/\.xlsx?$/i.test(name)) {
      setText('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.readAsText(file, 'utf-8');
  };

  const headerRow = parsed.hasHeader ? parsed.matrix[0] : [];
  const bodyPreview = (parsed.hasHeader ? parsed.matrix.slice(1) : parsed.matrix).slice(0, 5);

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: 14, fontWeight: 800, pb: 1 }}>
        درج گروهی ردیف‌ها
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 10.5, color: MUTED, mb: 1, lineHeight: 1.8 }}>
          ردیف‌ها را از اکسل کپی و اینجا بچسبانید (Ctrl+V) یا فایل CSV/TSV را انتخاب کنید.
          ستون‌ها خودکار شناسایی می‌شوند؛ قبل از درج، پیش‌نمایش و هشدارها را ببینید.
        </Typography>

        <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => inputRef.current?.click()}
            sx={{ fontSize: 10.5 }}
          >
            انتخاب فایل CSV/TSV
          </Button>
          <Button
            size="small"
            startIcon={<ContentPasteIcon />}
            onClick={async () => {
              try {
                const clip = await navigator.clipboard?.readText?.();
                if (clip) setText(clip);
              } catch (error) { /* noop */ }
            }}
            sx={{ fontSize: 10.5 }}
          >
            چسباندن از کلیپ‌بورد
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls"
            aria-label="فایل ورودی گروهی"
            style={{ display: 'none' }}
            onChange={(event) => readFile(event.target.files?.[0])}
          />
          {fileName ? (
            <Typography sx={{ fontSize: 10.5, color: MUTED }}>{fileName}</Typography>
          ) : null}
        </Stack>

        <TextField
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={'نام شرکت\tشناسه ملی\tمبلغ\nشرکت آلفا\t10101010101\t1000000'}
          multiline
          minRows={5}
          maxRows={10}
          fullWidth
          inputProps={{
            'aria-label': 'محتوای درج گروهی',
            dir: 'ltr',
            style: { fontFamily: 'monospace', fontSize: 11 },
          }}
        />

        {parsed.matrix.length ? (
          <Box sx={{ mt: 1.25 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800 }}>
              {`${toPersianDigits(parsed.matrix.length - (parsed.hasHeader ? 1 : 0))} ردیف × ${toPersianDigits(activeMapping.length)} ستون شناسایی شد`}
              {parsed.hasHeader ? ' (سرسطر شناسایی و حذف می‌شود)' : ''}
            </Typography>

            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mt: 0.75 }}>
              {activeMapping.map((field, index) => (
                <Box key={`map-${index}`} sx={{ minWidth: 168 }}>
                  <Typography noWrap sx={{ fontSize: 9, color: MUTED }}>
                    {`ستون ${toPersianDigits(index + 1)}: ${headerRow[index] || '—'}`}
                  </Typography>
                  <Select
                    size="small"
                    value={field || ''}
                    onChange={(event) => {
                      const next = [...activeMapping];
                      next[index] = event.target.value || null;
                      setMapping(next);
                    }}
                    displayEmpty
                    sx={{ fontSize: 10.5, height: 28, minWidth: 168 }}
                    inputProps={{ 'aria-label': `نگاشت ستون ${toPersianDigits(index + 1)}` }}
                  >
                    <MenuItem value="" sx={{ fontSize: 10.5 }}>نادیده بگیر</MenuItem>
                    {GRID_FIELDS.map((option) => (
                      <MenuItem key={option} value={option} sx={{ fontSize: 10.5 }}>
                        {FIELD_LABELS[option]}
                      </MenuItem>
                    ))}
                  </Select>
                </Box>
              ))}
            </Box>

            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  {(headerRow.length
                    ? headerRow
                    : activeMapping.map((field, index) => field || `ستون ${toPersianDigits(index + 1)}`)
                  ).map((label, index) => (
                    <TableCell key={`h-${index}`} sx={{ fontSize: 9.5, fontWeight: 800 }}>{label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {bodyPreview.map((cells, rowIndex) => (
                  <TableRow key={`r-${rowIndex}`}>
                    {cells.map((cell, cellIndex) => (
                      <TableCell key={`c-${rowIndex}-${cellIndex}`} sx={{ fontSize: 9.5 }}>{cell}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {preview.warnings.length ? (
              <Alert severity="warning" sx={{ mt: 1, fontSize: 10.5 }}>
                <Typography sx={{ fontSize: 10.5, fontWeight: 800 }}>
                  {`${toPersianDigits(preview.warnings.length)} هشدار`}
                </Typography>
                {preview.warnings.slice(0, 6).map((warning) => (
                  <Typography key={warning} sx={{ fontSize: 10 }}>{`• ${warning}`}</Typography>
                ))}
              </Alert>
            ) : null}

            <Typography sx={{ fontSize: 10.5, color: MUTED, mt: 1 }}>
              {`آمادهٔ درج: ${toPersianDigits(preview.rows.length)} ردیف`}
            </Typography>
          </Box>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button size="small" onClick={close} sx={{ fontSize: 11 }}>انصراف</Button>
        <Button
          size="small"
          variant="contained"
          onClick={apply}
          disabled={!preview.rows.length}
          sx={{ fontSize: 11 }}
        >
          {`درج ${toPersianDigits(preview.rows.length)} ردیف`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SeasonalBulkPasteDialog;

