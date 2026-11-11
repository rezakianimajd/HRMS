/**
 * تب «چاپ» در صفحهٔ «ظاهر و پوسته» — سربرگ، پاورقی و پیش‌فرض‌های کاغذ.
 *
 * این تنظیمات در همان payload ظاهر (`print`) ذخیره می‌شوند و موتور چاپ سرور
 * (نامه، فهرست مکاتبات، گزارش‌ها، فیش و سند خزانه) آن‌ها را روی هر صفحه اعمال
 * می‌کند. پیش‌نمایش زنده از همان Endpoint چاپ گرفته می‌شود.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Button, Chip, CircularProgress, FormControlLabel, Grid, MenuItem, Paper, Stack,
  Switch, TextField, ToggleButton, ToggleButtonGroup, Typography, alpha,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import VerticalSplitOutlinedIcon from '@mui/icons-material/VerticalSplitOutlined';
import CropPortraitIcon from '@mui/icons-material/CropPortrait';
import CropLandscapeIcon from '@mui/icons-material/CropLandscape';
import axiosInstance from '../../core/api/axiosConfig';
import { SURFACE, SOFT } from '../../core/components/settings/settingsUi';
import { useModulePalette } from '../../core/context/ModulePaletteContext';
import {
  DEFAULT_PRINT_SETTINGS, PRINT_ALIGNMENTS, PRINT_PAPERS,
} from '../../core/theme/printSettings';

const ACCENT = '#0ea5e9';

const PanelSection = ({ icon, title, subtitle, color, children }) => (
  <Paper sx={{ ...SURFACE, p: 1.75, overflow: 'hidden' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5, flexWrap: 'wrap' }}>
      <Box sx={{
        width: 32, height: 32, borderRadius: '9px', flexShrink: 0,
        display: 'grid', placeItems: 'center', bgcolor: alpha(color, 0.14), color,
      }}>
        {React.cloneElement(icon, { sx: { fontSize: 18 } })}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6">{title}</Typography>
        {subtitle ? (
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{subtitle}</Typography>
        ) : null}
      </Box>
    </Box>
    {children}
  </Paper>
);

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: '10px', fontSize: 12.5 },
  '& .MuiFormHelperText-root': { fontSize: 10.5 },
};

const SAMPLE_HTML = `
<div class="pe-print-title">نمونهٔ سند چاپی</div>
<div class="pe-print-sub">این پیش‌نمایش با تنظیمات فعلی سربرگ و پاورقی ساخته می‌شود.</div>
<table>
  <thead><tr><th>ردیف</th><th>موضوع</th><th>تاریخ</th><th>مبلغ</th></tr></thead>
  <tbody>
    <tr><td>۱</td><td>صورت‌وضعیت دورهٔ اول</td><td>۱۴۰۵/۰۳/۰۱</td><td>۱٬۲۰۰٬۰۰۰٬۰۰۰</td></tr>
    <tr><td>۲</td><td>صورت‌وضعیت دورهٔ دوم</td><td>۱۴۰۵/۰۴/۰۱</td><td>۹۵۰٬۰۰۰٬۰۰۰</td></tr>
    <tr><td>۳</td><td>صورت‌وضعیت دورهٔ سوم</td><td>۱۴۰۵/۰۵/۰۱</td><td>۱٬۴۵۰٬۰۰۰٬۰۰۰</td></tr>
  </tbody>
</table>
`;

const PrintSettingsCard = () => {
  const { canEdit, printSettings, setPrintSettings, resetPrintSettings } = useModulePalette();
  const [preview, setPreview] = useState({ html: '', loading: false, error: '' });
  const timer = useRef(null);

  const requestBody = useMemo(() => ({
    document: 'custom',
    payload: {
      title: 'نمونهٔ سند چاپی',
      subtitle: 'پیش‌نمایش تنظیمات چاپ',
      html: SAMPLE_HTML,
      module: '',
    },
    options: {
      paper: printSettings.paper,
      orientation: printSettings.orientation,
      font_size: printSettings.font_size,
      margin: printSettings.margin,
      header: printSettings.header,
      footer: printSettings.footer,
    },
  }), [printSettings]);

  useEffect(() => {
    let alive = true;
    setPreview((previous) => ({ ...previous, loading: true, error: '' }));
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      axiosInstance.post('/print/preview/', requestBody)
        .then(({ data }) => {
          if (!alive) return;
          setPreview({ html: data?.html || '', loading: false, error: '' });
        })
        .catch((error) => {
          if (!alive) return;
          setPreview({
            html: '',
            loading: false,
            error: error?.response?.data?.detail || 'تهیهٔ پیش‌نمایش چاپ ناموفق بود.',
          });
        });
    }, 450);
    return () => {
      alive = false;
      clearTimeout(timer.current);
    };
  }, [requestBody]);

  const patchHeader = (key, value) => setPrintSettings((previous) => ({
    ...previous,
    header: { ...previous.header, [key]: value },
  }));
  const patchFooter = (key, value) => setPrintSettings((previous) => ({
    ...previous,
    footer: { ...previous.footer, [key]: value },
  }));
  const patchRoot = (key, value) => setPrintSettings((previous) => ({ ...previous, [key]: value }));
  const noEdit = !canEdit;

  return (
    <Grid container spacing={1.75}>
      <Grid item xs={12} lg={7}>
        <Stack spacing={1.5}>
          <PanelSection icon={<PrintOutlinedIcon />} title="پیش‌فرض‌های کاغذ"
            subtitle="این مقادیر پیش‌فرض هر چاپ هستند و در پنجرهٔ پیش‌نمایش هم قابل تغییرند."
            color={ACCENT}>
            <Grid container spacing={1.25}>
              <Grid item xs={12} sm={6}>
                <ToggleButtonGroup size="small" exclusive fullWidth
                  value={printSettings.orientation}
                  onChange={(_event, value) => { if (value) patchRoot('orientation', value); }}
                  aria-label="جهت پیش‌فرض کاغذ">
                  <ToggleButton value="portrait" aria-label="عمودی">
                    <CropPortraitIcon fontSize="small" sx={{ ml: 0.5 }} /> عمودی
                  </ToggleButton>
                  <ToggleButton value="landscape" aria-label="افقی">
                    <CropLandscapeIcon fontSize="small" sx={{ ml: 0.5 }} /> افقی
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField select size="small" fullWidth label="کاغذ" sx={fieldSx}
                  value={printSettings.paper}
                  onChange={(event) => patchRoot('paper', event.target.value)}>
                  {PRINT_PAPERS.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField size="small" fullWidth type="number" label="فونت (pt)" sx={fieldSx}
                  inputProps={{ min: 7, max: 14, step: 0.5 }}
                  value={printSettings.font_size}
                  onChange={(event) => patchRoot('font_size', event.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField size="small" fullWidth label="حاشیهٔ صفحه (CSS)" sx={fieldSx}
                  helperText="مثال: 10mm 9mm 12mm 9mm"
                  value={printSettings.margin}
                  onChange={(event) => patchRoot('margin', event.target.value)} />
              </Grid>
            </Grid>
          </PanelSection>



          <PanelSection icon={<DescriptionOutlinedIcon />} title="سربرگ چاپ (هدر)"
            subtitle="لوگو از «مشخصات شرکت» خوانده می‌شود؛ زیر آن نام شرکت و عنوان سند چاپ می‌شود."
            color={SOFT?.violet || '#7c3aed'}>
            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
              <FormControlLabel control={<Switch size="small" checked={printSettings.header.enabled}
                disabled={noEdit}
                onChange={(event) => patchHeader('enabled', event.target.checked)} />}
                label={<Typography sx={{ fontSize: 12 }}>نمایش سربرگ</Typography>} />
              <FormControlLabel control={<Switch size="small" checked={printSettings.header.show_logo}
                disabled={noEdit}
                onChange={(event) => patchHeader('show_logo', event.target.checked)} />}
                label={<Typography sx={{ fontSize: 12 }}>نمایش لوگو</Typography>} />
              <FormControlLabel control={<Switch size="small" checked={printSettings.header.show_meta}
                disabled={noEdit}
                onChange={(event) => patchHeader('show_meta', event.target.checked)} />}
                label={<Typography sx={{ fontSize: 12 }}>نمایش متادیتا</Typography>} />
              <FormControlLabel control={<Switch size="small" checked={printSettings.header.show_border}
                disabled={noEdit}
                onChange={(event) => patchHeader('show_border', event.target.checked)} />}
                label={<Typography sx={{ fontSize: 12 }}>خط جداکننده</Typography>} />
            </Stack>
            <Grid container spacing={1.25}>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth disabled={noEdit} label="عنوان جایگزین چاپ (اختیاری)"
                  sx={fieldSx}
                  placeholder="پیش‌فرض: عنوان همان سند (مثلاً فهرست نامه‌های وارده)"
                  value={printSettings.header.title}
                  onChange={(event) => patchHeader('title', event.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth disabled={noEdit} label="زیرعنوان" sx={fieldSx}
                  placeholder="مثلاً: مکاتبات اداری"
                  value={printSettings.header.subtitle}
                  onChange={(event) => patchHeader('subtitle', event.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth disabled={noEdit} label="نشانی" sx={fieldSx}
                  value={printSettings.header.address}
                  onChange={(event) => patchHeader('address', event.target.value)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField size="small" fullWidth disabled={noEdit} label="تلفن" sx={fieldSx}
                  value={printSettings.header.phone}
                  onChange={(event) => patchHeader('phone', event.target.value)} />
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField size="small" fullWidth disabled={noEdit} label="وبگاه" sx={fieldSx}
                  value={printSettings.header.website}
                  onChange={(event) => patchHeader('website', event.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth disabled={noEdit} label="ایمیل" sx={fieldSx}
                  value={printSettings.header.email}
                  onChange={(event) => patchHeader('email', event.target.value)} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField select size="small" fullWidth disabled={noEdit} label="تراز عنوان" sx={fieldSx}
                  value={printSettings.header.align}
                  onChange={(event) => patchHeader('align', event.target.value)}>
                  {PRINT_ALIGNMENTS.map((item) => (
                    <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField size="small" fullWidth disabled={noEdit} label="متن تکمیلی زیر سربرگ"
                  sx={fieldSx}
                  placeholder="مثلاً: کلیهٔ مکاتبات باید با ذکر شمارهٔ اندیکاتور ارسال شود"
                  value={printSettings.header.extra}
                  onChange={(event) => patchHeader('extra', event.target.value)} />
              </Grid>
            </Grid>
          </PanelSection>


          <PanelSection icon={<VerticalSplitOutlinedIcon />} title="پاورقی چاپ (فوتر)"
            subtitle="متن ثابت، تاریخ چاپ و شمارهٔ صفحه." color="#14b8a6">
            <Stack direction="row" spacing={1.5} useFlexGap flexWrap="wrap" sx={{ mb: 1.25 }}>
              <FormControlLabel control={<Switch size="small" checked={printSettings.footer.enabled}
                disabled={noEdit}
                onChange={(event) => patchFooter('enabled', event.target.checked)} />}
                label={<Typography sx={{ fontSize: 12 }}>نمایش پاورقی</Typography>} />
              <FormControlLabel
                control={<Switch size="small" checked={printSettings.footer.show_page_number}
                  disabled={noEdit}
                  onChange={(event) => patchFooter('show_page_number', event.target.checked)} />}
                label={<Typography sx={{ fontSize: 12 }}>شمارهٔ صفحه</Typography>} />
              <FormControlLabel
                control={<Switch size="small" checked={printSettings.footer.show_printed_at}
                  disabled={noEdit}
                  onChange={(event) => patchFooter('show_printed_at', event.target.checked)} />}
                label={<Typography sx={{ fontSize: 12 }}>تاریخ چاپ</Typography>} />
              <FormControlLabel control={<Switch size="small" checked={printSettings.footer.show_border}
                disabled={noEdit}
                onChange={(event) => patchFooter('show_border', event.target.checked)} />}
                label={<Typography sx={{ fontSize: 12 }}>خط جداکننده</Typography>} />
              <FormControlLabel control={<Switch size="small" checked={printSettings.footer.signatures}
                disabled={noEdit}
                onChange={(event) => patchFooter('signatures', event.target.checked)} />}
                label={<Typography sx={{ fontSize: 12 }}>امضاها (ثابت پایین صفحه)</Typography>} />
            </Stack>
            <Grid container spacing={1.25}>
              <Grid item xs={12} sm={8}>
                <TextField size="small" fullWidth disabled={noEdit} label="متن پاورقی" sx={fieldSx}
                  placeholder="مثلاً: این سند از سامانهٔ کیان ERP صادر شده است"
                  value={printSettings.footer.text}
                  onChange={(event) => patchFooter('text', event.target.value)} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select size="small" fullWidth disabled={noEdit} label="تراز پاورقی" sx={fieldSx}
                  value={printSettings.footer.align}
                  onChange={(event) => patchFooter('align', event.target.value)}>
                  {[...PRINT_ALIGNMENTS,
                    { value: 'space-between', label: 'دوطرفه (چپ و راست)' }].map((item) => (
                    <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField size="small" fullWidth disabled={noEdit} label="متن تکمیلی پاورقی"
                  sx={fieldSx}
                  value={printSettings.footer.extra}
                  onChange={(event) => patchFooter('extra', event.target.value)} />
              </Grid>
            </Grid>
          </PanelSection>
        </Stack>
      </Grid>


      <Grid item xs={12} lg={5}>
        <Paper sx={{ ...SURFACE, p: 1.5, position: { lg: 'sticky' }, top: 12 }}>
          <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }} flexWrap="wrap">
            <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 800 }}>پیش‌نمایش زندهٔ چاپ</Typography>
            <Chip
              size="small"
              label={`${printSettings.paper} · ${printSettings.orientation === 'landscape' ? 'افقی' : 'عمودی'}`}
              sx={{ height: 20, fontSize: 10.5 }}
            />
            <Button size="small" startIcon={<RestartAltIcon />} onClick={resetPrintSettings}
              disabled={noEdit} sx={{ fontSize: 11.5 }}>پیش‌فرض</Button>
          </Stack>
          <Box sx={{
            position: 'relative', borderRadius: '12px', overflow: 'hidden',
            border: '1px solid', borderColor: 'divider',
          }}>
            {preview.loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ height: 420 }}>
                <CircularProgress size={26} />
              </Stack>
            ) : preview.error ? (
              <Box sx={{ p: 2 }}>
                <Typography sx={{ fontSize: 12, color: 'error.main' }}>{preview.error}</Typography>
              </Box>
            ) : (
              <Box
                component="iframe"
                title="پیش‌نمایش چاپ"
                srcDoc={preview.html}
                sx={{ width: '100%', height: 420, border: 0, bgcolor: '#fff' }}
              />
            )}
          </Box>
          <Typography sx={{ mt: 1, fontSize: 10.5, color: 'text.secondary' }}>
            این تنظیمات برای همهٔ اسناد چاپی (نامه، فهرست مکاتبات، گزارش‌ها، فیش و سند خزانه)
            اعمال می‌شود؛ در هر چاپ می‌توانید جهت/کاغذ را تغییر دهید.
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default PrintSettingsCard;
export { DEFAULT_PRINT_SETTINGS };

