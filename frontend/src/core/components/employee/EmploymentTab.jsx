import React from 'react';
import { Grid, Typography, Divider, Box, Paper, Avatar } from '@mui/material';
import { useTranslation } from 'react-i18next';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StatusBadge from '../ui/StatusBadge';
import { toJalali } from '../../utils/dateUtils';
import { toPersianDigits } from '../../utils/numberUtils';

const DATE_FIELDS = [
  'hire_date', 'probation_end_date', 'official_date',
  'contract_start_date', 'contract_end_date', 'status_change_date'
];

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
  } else if (fieldName === 'employee_id') {
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

const EmploymentTab = ({ employee }) => {
  const { t } = useTranslation();
  const e = employee || {};

  return (
    <Box>
      <SectionHeader title={t('employees.employment_details')} icon={<WorkOutlineIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#f59e0b" />
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={1.5}>
        <InfoCard fieldName="employee_id" label={t('employees.employee_id')} value={e.employee_id} />
        <InfoCard fieldName="hire_date" label={t('employees.hire_date')} value={e.hire_date} />
        <InfoCard fieldName="probation_end_date" label={t('employees.probation_end_date')} value={e.probation_end_date} />
        <InfoCard fieldName="official_date" label={t('employees.official_date')} value={e.official_date} />
      </Grid>

      <Box sx={{ mt: 3 }}>
        <SectionHeader title={t('employees.position_info')} icon={<AccountTreeIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#3b82f6" />
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={1.5}>
        <InfoCard label={t('employees.department')} value={e.department_detail?.name} />
        <InfoCard label={t('employees.job_title')} value={e.job_title_detail?.name} />
        <InfoCard label={t('employees.work_location')} value={e.work_location_detail?.name} />
        <InfoCard label={t('employees.insurance_list')} value={e.insurance_list_detail?.name} />
      </Grid>

      <Box sx={{ mt: 3 }}>
        <SectionHeader title={t('employees.contract_info')} icon={<DescriptionIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#10b981" />
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={1.5}>
        <InfoCard label={t('employees.contract_type')} value={e.contract_type_display} />
        <InfoCard fieldName="contract_start_date" label={t('employees.contract_start_date')} value={e.contract_start_date} />
        <InfoCard fieldName="contract_end_date" label={t('employees.contract_end_date')} value={e.contract_end_date} />
      </Grid>

      <Box sx={{ mt: 3 }}>
        <SectionHeader title={t('employees.current_status')} icon={<WorkOutlineIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#ef4444" />
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={1.5}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{
            px: 1.5, py: 1,
            background: 'rgba(255,255,255,0.5)',
            borderRadius: 2,
          }}>
            <Typography variant="caption" color="textSecondary" display="block">{t('employees.status')}</Typography>
            <Box sx={{ mt: 0.5 }}><StatusBadge status={e.status} /></Box>
          </Paper>
        </Grid>
        <InfoCard fieldName="status_change_date" label={t('employees.status_change_date')} value={e.status_change_date} />
        <InfoCard label={t('employees.work_shift')} value={e.work_shift_display} />
      </Grid>

      {/* ساعات کاری */}
      <Box sx={{ mt: 3 }}>
        <SectionHeader title="ساعات کاری" icon={<AccessTimeIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#06b6d4" />
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={1.5}>
        <InfoCard fieldName="work_start_time" label="ساعت شروع کار" value={e.work_start_time} />
        <InfoCard fieldName="work_end_time" label="ساعت پایان کار" value={e.work_end_time} />
      </Grid>

      {/* ارزیابی */}
      <Box sx={{ mt: 3 }}>
        <SectionHeader title="ارزیابی و عملکرد" icon={<AssessmentIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#3b82f6" />
      </Box>
      <Divider sx={{ mb: 2 }} />
      <Grid container spacing={1.5}>
        <InfoCard label="مسافت تا محل کار" value={`${e.distance_to_work_km || '—'} کیلومتر`} />
        <InfoCard label="نمره عملکرد" value={e.performance_score != null ? `${e.performance_score} از ۱۰۰` : '—'} />
        <InfoCard label="نمره رضایت شغلی" value={e.satisfaction_score != null ? `${e.satisfaction_score} از ۱۰۰` : '—'} />
      </Grid>

      {e.description && (
        <>
          <Box sx={{ mt: 3 }}>
            <SectionHeader title={t('employees.description')} icon={<DescriptionIcon sx={{ color: '#fff', fontSize: 18 }} />} color="#8b5cf6" />
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2">{e.description}</Typography>
        </>
      )}
    </Box>
  );
};

export default EmploymentTab;