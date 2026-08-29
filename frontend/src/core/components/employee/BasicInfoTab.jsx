import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Grid, Paper, Typography, Divider, Box, Avatar, Stack, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import CallIcon from '@mui/icons-material/Call';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import axiosInstance from '../../api/axiosConfig';
import { toJalali } from '../../utils/dateUtils';
import { toPersianDigits } from '../../utils/numberUtils';

/* Numeric fields that should render with Persian digits */
const DIGIT_FIELDS = [
  'national_id', 'mobile', 'phone', 'postal_code',
  'children_count', 'emergency_contact_phone', 'national_id_serial',
  'birth_certificate_number', 'insurance_number',
  'account_number', 'sheba_number',
];

const DATE_FIELDS = ['birth_date', 'national_id_date'];

const SectionHeader = ({ title, icon, color }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    <Avatar sx={{ width: 32, height: 32, background: `linear-gradient(135deg, ${color}, ${color}90)`, boxShadow: `0 2px 8px ${color}40` }}>
      {icon}
    </Avatar>
    <Typography variant="subtitle1" fontWeight={700} sx={{ color }}>{title}</Typography>
  </Box>
);

const InfoCard = ({ fieldName, label, value }) => {
  let display = value || '—';
  if (DATE_FIELDS.includes(fieldName)) {
    display = toJalali(value);
  } else if (DIGIT_FIELDS.includes(fieldName)) {
    display = toPersianDigits(value);
  }
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Paper sx={{
        px: 1.5, py: 1,
        background: 'rgba(255,255,255,0.5)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.5)',
        borderRadius: 2,
      }}>
        <Typography variant="caption" color="textSecondary" display="block">{label}</Typography>
        <Typography variant="body2" fontWeight={600}>{display}</Typography>
      </Paper>
    </Grid>
  );
};

const BasicInfoTab = ({ employee }) => {
  const { t } = useTranslation();
  const e = employee || {};

  const { data: experiences } = useQuery({
    queryKey: ['work-experiences', e.id],
    queryFn: () => axiosInstance.get(`/work-experiences/?employee_id=${e.id}`).then(r => r.data),
    enabled: !!e.id,
  });

  const expList = Array.isArray(experiences) ? experiences : experiences?.results || [];

  return (
    <Box>
      <SectionHeader title={t('employees.personal_info')} icon={<PersonIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#6366f1" />
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={1.5}>
        <InfoCard label={t('employees.first_name')} value={e.first_name} />
        <InfoCard label={t('employees.last_name')} value={e.last_name} />
        <InfoCard fieldName="national_id" label={t('employees.national_id')} value={e.national_id} />
        <InfoCard fieldName="birth_date" label={t('employees.birth_date')} value={e.birth_date} />
        <InfoCard label={t('employees.birth_place')} value={e.birth_place} />
        <InfoCard label="میزان تحصیلات" value={e.education_level_display || e.education_level || '—'} />
        <InfoCard label="رشته / مدرک تحصیلی" value={e.education_field} />
        <InfoCard label="محل اخذ مدرک تحصیلی" value={e.education_place} />
        <InfoCard label="نوع دانشگاه" value={e.university_type_display || e.university_type || '—'} />
        <InfoCard label={t('employees.gender')} value={e.gender_display} />
        <InfoCard label={t('employees.marital_status')} value={e.marital_status_display} />
        <InfoCard fieldName="children_count" label={t('employees.children_count')} value={e.children_count} />
        <InfoCard label={t('employees.spouse_name')} value={e.spouse_name} />
        <InfoCard label="نام پدر" value={e.father_name} />
      </Grid>

      <Box sx={{ mt: 3 }}>
        <SectionHeader title={t('employees.identity_info')} icon={<BadgeIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#ec4899" />
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={1.5}>
        <InfoCard fieldName="birth_certificate_number" label="شماره شناسنامه" value={e.birth_certificate_number} />
        <InfoCard fieldName="national_id_serial" label={t('employees.national_id_serial')} value={e.national_id_serial} />
        <InfoCard fieldName="national_id_place" label={t('employees.national_id_place')} value={e.national_id_place} />
        <InfoCard fieldName="national_id_date" label={t('employees.national_id_date')} value={e.national_id_date} />
        <InfoCard fieldName="insurance_number" label="شماره بیمه" value={e.insurance_number} />
      </Grid>

      {/* اطلاعات بانکی */}
      <Box sx={{ mt: 3 }}>
        <SectionHeader title="اطلاعات بانکی" icon={<CallIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#0ea5e9" />
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={1.5}>
        <InfoCard label="بانک" value={e.bank_name} />
        <InfoCard fieldName="account_number" label="شماره حساب" value={e.account_number} />
        <InfoCard fieldName="sheba_number" label="شماره شبا" value={e.sheba_number} />
      </Grid>

      {/* سوابق کاری */}
      <Box sx={{ mt: 3 }}>
        <SectionHeader title="سوابق کاری" icon={<WorkHistoryIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#14b8a6" />
      </Box>
      <Divider sx={{ mb: 2 }} />
      {expList.length === 0 ? (
        <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>
          سابقه کاری ثبت نشده است
        </Typography>
      ) : (
        <Stack spacing={1}>
          {expList.map((exp) => (
            <Paper key={exp.id} sx={{
              p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
              background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.2)',
              borderRadius: 2,
            }}>
              <Avatar sx={{ width: 36, height: 36, background: 'linear-gradient(135deg, #14b8a6, #0ea5e9)', fontSize: 14 }}>
                <WorkHistoryIcon sx={{ fontSize: 18, color: '#fff' }} />
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={700}>{exp.company_name}</Typography>
                <Typography variant="caption" color="textSecondary" display="block">
                  {exp.job_title || '—'} · {toJalali(exp.start_date)} تا {exp.end_date ? toJalali(exp.end_date) : 'اکنون'}
                </Typography>
              </Box>
              {exp.duration_years != null && (
                <Chip size="small" label={`${toPersianDigits(exp.duration_years)} سال`} variant="outlined"
                  sx={{ color: '#14b8a6', borderColor: '#14b8a6' }} />
              )}
            </Paper>
          ))}
        </Stack>
      )}

      <Box sx={{ mt: 3 }}>
        <SectionHeader title={t('employees.contact_info')} icon={<ContactPhoneIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#10b981" />
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={1.5}>
        <InfoCard fieldName="phone" label={t('employees.phone')} value={e.phone} />
        <InfoCard fieldName="mobile" label={t('employees.mobile')} value={e.mobile} />
        <InfoCard label={t('employees.email')} value={e.email} />
        <InfoCard label={t('employees.address')} value={e.address} />
        <InfoCard label="شهر" value={e.city} />
        <InfoCard fieldName="postal_code" label={t('employees.postal_code')} value={e.postal_code} />
      </Grid>

      <Box sx={{ mt: 3 }}>
        <SectionHeader title={t('employees.emergency_contact')} icon={<CallIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#f59e0b" />
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={1.5}>
        <InfoCard label={t('employees.emergency_contact_name')} value={e.emergency_contact_name} />
        <InfoCard fieldName="emergency_contact_phone" label={t('employees.emergency_contact_phone')} value={e.emergency_contact_phone} />
      </Grid>
    </Box>
  );
};

export default BasicInfoTab;