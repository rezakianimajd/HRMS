import React from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Divider, Grid, IconButton, Stack, TextField,
  Typography, alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseIcon from '@mui/icons-material/Close';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import PaymentsIcon from '@mui/icons-material/Payments';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import JalaliDatePicker from '../../core/components/ui/JalaliDatePicker';
import MoneyInput from '../../core/components/ui/MoneyInput';
import EmployeeAvatar from '../../core/components/ui/EmployeeAvatar';
import { toPersianDigits } from '../../core/utils/numberUtils';
import { dependentHasAttachment } from '../supplementaryInsuranceHelpers';
import DependentRows from './DependentList';

const ACCENT = '#7c3aed';
const BLUE = '#2563eb';
const TEAL = '#0f766e';
const RED = '#be123c';
const INK = '#1e293b';
const MUTED = '#64748b';

const Section = ({ icon: Icon, title, color = ACCENT, badge, action, children }) => (
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
      {action || null}
    </Stack>
    {children}
  </Box>
);


/** دیالوگ استاندارد ثبت/ویرایش بیمه تکمیلی با زبان طراحی استودیو. */
const InsuranceEditorDialog = ({
  open, onClose, form, setForm, employees, saving, error, setError, onSave,
  onOpenDependent, onEditDependent, onRemoveDependent,
}) => {
  const update = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const selectedEmployee = employees.find((employee) => String(employee.id) === String(form.employee)) || null;
  const dependents = form.dependents || [];
  const attached = dependents.filter(dependentHasAttachment).length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
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
          background: `linear-gradient(140deg, ${ACCENT}, ${alpha(ACCENT, 0.72)})`,
          boxShadow: `0 8px 20px ${alpha(ACCENT, 0.3)}`,
        }}>
          <HealthAndSafetyIcon sx={{ fontSize: 20 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: 13, fontWeight: 900, color: INK }}>
            {form.id ? 'ویرایش بیمه تکمیلی' : 'افزودن بیمه تکمیلی'}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="بستن"><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1.25, md: 2 } }}>
        <Stack spacing={1.5}>
          <Section
            icon={PeopleAltIcon}
            title="پرسنل و پوشش بیمه"
            color={ACCENT}
            badge={form.id ? (
              <Chip
                size="small"
                label="ویرایش"
                sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(ACCENT, 0.08), color: ACCENT }}
              />
            ) : null}
          >
            <Grid container spacing={1.2}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  size="small"
                  options={employees}
                  value={selectedEmployee}
                  onChange={(_event, value) => update('employee', value ? String(value.id) : '')}
                  getOptionLabel={(option) => `${option.full_name || ''}${option.employee_id ? ` (${option.employee_id})` : ''}`}
                  isOptionEqualToValue={(option, value) => String(option.id) === String(value.id)}
                  renderOption={(props, option) => {
                    const { key, ...optionProps } = props;
                    return (
                      <Box component="li" key={key} {...optionProps} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.7 }}>
                        <EmployeeAvatar employee={option} size={27} sx={{ borderRadius: '8px' }} />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography noWrap sx={{ fontSize: 12, fontWeight: 800, color: INK }}>{option.full_name}</Typography>
                          <Typography noWrap sx={{ fontSize: 10.5, color: MUTED }}>
                            {toPersianDigits(option.employee_id || '—')}
                            {option.department_name ? ` · ${option.department_name}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }}
                  renderInput={(params) => <TextField {...params} label="پرسنل *" placeholder="جست‌وجوی نام یا کد پرسنلی…" />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="نام بیمه تکمیلی *"
                  value={form.insurance_name || ''}
                  onChange={(event) => update('insurance_name', event.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="نوع بیمه"
                  value={form.insurance_type || ''}
                  onChange={(event) => update('insurance_type', event.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="طرح انتخابی"
                  value={form.plan || ''}
                  onChange={(event) => update('plan', event.target.value)}
                />
              </Grid>
            </Grid>
          </Section>

          <Section icon={CalendarMonthIcon} title="دورهٔ پوشش" color={BLUE}>
            <Grid container spacing={1.2}>
              <Grid item xs={12} md={6}>
                <JalaliDatePicker
                  fullWidth
                  label="تاریخ شروع *"
                  value={form.start_date || ''}
                  onChange={(value) => update('start_date', value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <JalaliDatePicker
                  fullWidth
                  label="تاریخ پایان"
                  value={form.end_date || ''}
                  onChange={(value) => update('end_date', value)}
                />
              </Grid>
            </Grid>
          </Section>

          <Section icon={PaymentsIcon} title="مبالغ بیمه" color={TEAL}>
            <Grid container spacing={1.2}>
              <Grid item xs={12} md={6}>
                <MoneyInput
                  size="small"
                  fullWidth
                  allowDecimals={false}
                  label="مبلغ ماهانه (ریال)"
                  value={form.monthly_amount ?? ''}
                  onChange={(value) => update('monthly_amount', value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <MoneyInput
                  size="small"
                  fullWidth
                  allowDecimals={false}
                  label="مبلغ کل (ریال)"
                  value={form.total_amount ?? ''}
                  onChange={(value) => update('total_amount', value)}
                />
              </Grid>
            </Grid>
          </Section>

          <Section
            icon={FamilyRestroomIcon}
            title="افراد تحت تکفل"
            color={RED}
            badge={(
              <Stack direction="row" spacing={0.4}>
                <Chip
                  size="small"
                  icon={<PeopleAltIcon sx={{ fontSize: 12 }} />}
                  label={toPersianDigits(dependents.length)}
                  sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(RED, 0.07), color: RED }}
                />
                <Chip
                  size="small"
                  icon={<AttachFileIcon sx={{ fontSize: 12 }} />}
                  label={toPersianDigits(attached)}
                  sx={{ height: 21, fontSize: 10.5, fontWeight: 800, bgcolor: alpha(BLUE, 0.07), color: BLUE }}
                />
              </Stack>
            )}
            action={(
              <Button
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 16 }} />}
                onClick={onOpenDependent}
                variant="outlined"
                sx={{ fontSize: 11, borderRadius: '9px', borderColor: alpha(RED, 0.35), color: RED }}
              >
                افزودن فرد
              </Button>
            )}
          >
            <DependentRows
              dependents={dependents}
              onEdit={onEditDependent}
              onDelete={onRemoveDependent}
              emptyText="برای این بیمه هنوز فرد تحت تکفلی اضافه نشده است."
            />
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
          disabled={saving}
          onClick={onSave}
          startIcon={saving ? <CircularProgress size={15} sx={{ color: '#fff' }} /> : null}
          sx={{
            fontSize: 12, px: 2.8, borderRadius: '11px', bgcolor: ACCENT,
            boxShadow: `0 10px 24px ${alpha(ACCENT, 0.28)}`,
            '&:hover': { bgcolor: '#6d28d9' },
          }}
        >
          {saving ? 'در حال ذخیره…' : (form.id ? 'ذخیره تغییرات' : 'ثبت بیمه')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InsuranceEditorDialog;

