import React, { useRef, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, FormControl, Grid, IconButton, InputLabel, MenuItem, Paper, Select,
  Stack, TextField, Typography, alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import { toEnglishDigits } from '../../core/utils/numberUtils';
import { RELATION_OPTIONS } from '../supplementaryInsuranceHelpers';

const ACCENT = '#7c3aed';
const BLUE = '#2563eb';
const RED = '#be123c';
const INK = '#1e293b';
const MUTED = '#64748b';
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';
const ATTACHMENT_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

const Section = ({ icon: Icon, title, color = ACCENT, badge, children }) => (
  <Box sx={{
    p: 1.5, borderRadius: '14px', bgcolor: '#fff', border: '1px solid #e8edf4',
    boxShadow: '0 1px 2px rgba(15,23,42,0.03)',
  }}>
    <Stack direction="row" alignItems="center" spacing={0.9} sx={{ mb: 1.2 }}>
      <Box sx={{
        width: 30, height: 30, borderRadius: '10px', flexShrink: 0,
        display: 'grid', placeItems: 'center', color, bgcolor: alpha(color, 0.1),
      }}>
        <Icon sx={{ fontSize: 17 }} />
      </Box>
      <Typography sx={{ flex: 1, fontSize: 12.5, fontWeight: 900, color: INK }}>{title}</Typography>
      {badge || null}
    </Stack>
    {children}
  </Box>
);

/**
 * دیالوگ استاندارد «افزودن/ویرایش فرد تحت تکفل» بیمه تکمیلی.
 * کد ملی و تاریخ تولد اختیاری‌اند و در صورت ورود اعتبارسنجی می‌شوند.
 */
const DependentDialog = ({ open, onClose, form, setForm, onSave, error, setError, editing }) => {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const existingAttachment = form.attachment_url && !form.removeAttachment && !form.attachment;

  const pickAttachment = (files) => {
    const file = Array.from(files || [])[0];
    if (!file) return;
    const ext = `.${String(file.name || '').split('.').pop()?.toLowerCase()}`;
    if (!ATTACHMENT_EXTENSIONS.includes(ext)) {
      setError('فرمت پیوست باید PDF یا تصویر باشد.');
      return;
    }
    if (Number(file.size) > MAX_ATTACHMENT_SIZE) {
      setError('حجم پیوست نباید بیشتر از ۱۰ مگابایت باشد.');
      return;
    }
    setError('');
    setForm((previous) => ({ ...previous, attachment: file, removeAttachment: false }));
  };


  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: '16px', overflow: 'hidden', bgcolor: '#f8fafc' } }}
    >
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', gap: 1.1, px: 2.2, py: 1.5,
        bgcolor: '#fff', borderBottom: '1px solid #e8edf4',
      }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: '12px', flexShrink: 0,
          display: 'grid', placeItems: 'center', color: '#fff',
          background: `linear-gradient(140deg, ${BLUE}, ${alpha(BLUE, 0.72)})`,
          boxShadow: `0 8px 20px ${alpha(BLUE, 0.3)}`,
        }}>
          <FamilyRestroomIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 900, color: INK }}>
            {editing ? 'ویرایش فرد تحت تکفل' : 'افزودن فرد تحت تکفل'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="بستن"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1.25, md: 2 } }}>
        <Stack spacing={1.5}>
          <Section icon={FamilyRestroomIcon} title="مشخصات فرد" color={BLUE}>
            <Grid container spacing={1.2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="نام *"
                  value={form.first_name || ''}
                  onChange={(event) => update('first_name', event.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="نام خانوادگی *"
                  value={form.last_name || ''}
                  onChange={(event) => update('last_name', event.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>نسبت</InputLabel>
                  <Select
                    value={form.relation || 'spouse'}
                    label="نسبت"
                    onChange={(event) => update('relation', event.target.value)}
                  >
                    {RELATION_OPTIONS.map((item) => (
                      <MenuItem key={item.value} value={item.value}>{item.label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="کد ملی"
                  value={form.national_id || ''}
                  onChange={(event) => update(
                    'national_id',
                    toEnglishDigits(event.target.value).replace(/\D/g, '').slice(0, 10),
                  )}
                  inputProps={{ dir: 'ltr', inputMode: 'numeric', maxLength: 10 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <JalaliDatePicker
                  fullWidth
                  label="تاریخ تولد"
                  value={form.birth_date || ''}
                  onChange={(value) => update('birth_date', value)}
                />
              </Grid>
            </Grid>
          </Section>

          <Section
            icon={PictureAsPdfIcon}
            title="پیوست مدارک"
            color={RED}
            badge={(
              <Chip
                size="small"
                label="اختیاری"
                sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(RED, 0.08), color: RED }}
              />
            )}
          >
            {existingAttachment ? (
              <Paper variant="outlined" sx={{ p: 0.8, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 0.7, mb: 0.9 }}>
                <PictureAsPdfIcon sx={{ fontSize: 19, color: RED }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>
                    {form.attachment_name || 'پیوست فعلی'}
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: MUTED }}>
                    {form.attachment_size_display || 'پیوست ثبت‌شده'}
                  </Typography>
                </Box>
                <Button size="small" href={form.attachment_url} target="_blank" rel="noreferrer" sx={{ fontSize: 11 }}>
                  مشاهده
                </Button>
                <IconButton
                  size="small"
                  color="error"
                  aria-label="حذف پیوست"
                  onClick={() => setForm((previous) => ({ ...previous, removeAttachment: true }))}
                >
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Paper>
            ) : null}

            {form.removeAttachment ? (
              <Alert severity="warning" sx={{ mb: 0.9, py: 0.1, borderRadius: '9px' }}>
                <Typography sx={{ fontSize: 11 }}>پیوست فعلی هنگام ذخیره حذف می‌شود.</Typography>
              </Alert>
            ) : null}

            <Box
              onDragOver={(event) => { event.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => { event.preventDefault(); setDragActive(false); pickAttachment(event.dataTransfer.files); }}
              onClick={() => inputRef.current?.click()}
              sx={{
                p: 1.6, textAlign: 'center', cursor: 'pointer', borderRadius: '12px',
                border: `1.5px dashed ${dragActive ? RED : alpha(RED, 0.25)}`,
                bgcolor: dragActive ? alpha(RED, 0.05) : alpha(RED, 0.02),
                transition: 'background-color .18s ease, border-color .18s ease',
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 28, color: RED, mb: 0.3 }} />
              <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: INK }}>
                {form.attachment ? form.attachment.name : 'انتخاب یا رها کردن فایل پیوست'}
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: MUTED }}>PDF / JPG / PNG — حداکثر ۱۰ مگابایت</Typography>
              <input
                ref={inputRef}
                type="file"
                hidden
                accept={ATTACHMENT_ACCEPT}
                onChange={(event) => { pickAttachment(event.target.files); event.target.value = ''; }}
              />
            </Box>

            {form.attachment ? (
              <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.5 }}>
                <Button
                  size="small"
                  color="error"
                  onClick={() => setForm((previous) => ({ ...previous, attachment: null }))}
                >
                  حذف انتخاب
                </Button>
              </Stack>
            ) : null}
          </Section>

          {error ? <Alert severity="error" onClose={() => setError('')}>{error}</Alert> : null}
        </Stack>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 2.2, py: 1.3, bgcolor: '#fff' }}>
        <Button onClick={onClose} sx={{ fontSize: 12, color: MUTED }}>انصراف</Button>
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          onClick={onSave}
          sx={{ fontSize: 12, px: 2.6, borderRadius: '11px', bgcolor: BLUE, '&:hover': { bgcolor: '#1d4ed8' } }}
        >
          {editing ? 'ذخیره تغییرات' : 'افزودن به لیست'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DependentDialog;

