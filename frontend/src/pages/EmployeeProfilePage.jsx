import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Box, Typography, Paper, Tabs, Tab, Button, CircularProgress,
  Chip, Divider, Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import DescriptionIcon from '@mui/icons-material/Description';
import PaymentsIcon from '@mui/icons-material/Payments';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BusinessIcon from '@mui/icons-material/Business';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useEmployee } from '../core/hooks/useEmployees';
import { useDocuments, useDocumentTypes } from '../core/hooks/useDocuments';
import StatusBadge from '../core/components/ui/StatusBadge';
import BasicInfoTab from '../core/components/employee/BasicInfoTab';
import EmploymentTab from '../core/components/employee/EmploymentTab';
import DocumentsTab from '../core/components/employee/DocumentsTab';
import ReceiptsTab from '../core/components/employee/ReceiptsTab';
import WorkRecordTab from '../core/components/employee/WorkRecordTab';
import EmploymentHistoryTab from '../core/components/employee/EmploymentHistoryTab';
import TimelineTab from '../core/components/employee/TimelineTab';
import EmployeeAvatar from '../core/components/ui/EmployeeAvatar';
import { toJalali } from '../core/utils/dateUtils';
import { toPersianDigits } from '../core/utils/numberUtils';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)',
  borderRadius: 3,
};

const InfoItem = ({ icon, color, label, value }) => (
  <Grid item xs={6} sm={4} md={3}>
    <Paper sx={{
      p: 1.5, height: '100%',
      background: `linear-gradient(135deg, ${color}12, ${color}05)`,
      border: `1px solid ${color}28`,
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      borderRadius: 2.5,
      transition: 'all 0.2s ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 20px ${color}20` },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '50%',
          background: `linear-gradient(135deg, ${color}, ${color}99)`,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 2px 8px ${color}40`,
        }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="caption" color="textSecondary" display="block">{label}</Typography>
          <Typography variant="body2" fontWeight={700}>{value}</Typography>
        </Box>
      </Box>
    </Paper>
  </Grid>
);

const EmployeeProfilePage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: employee, isLoading, error } = useEmployee(id);
  const { data: documents } = useDocuments(id);
  const { data: docTypes } = useDocumentTypes();
  const [tabIndex, setTabIndex] = useState(0);

  if (isLoading) return <Box sx={{ textAlign: 'center', p: 8 }}><CircularProgress /></Box>;
  if (error || !employee) return (
    <Box sx={{ textAlign: 'center', p: 6 }}>
      <Typography color="error" variant="h5">{t('employees.not_found')}</Typography>
      <Button onClick={() => navigate('/employees')} sx={{ mt: 2 }}>{t('common.back')}</Button>
    </Box>
  );

  const e = employee;
  const docs = documents || [];

  // Build uploaded documents summary by type
  const docsByType = (docTypes || []).map(dt => ({
    ...dt,
    count: docs.filter(d => d.document_type === dt.id).length,
  })).filter(d => d.count > 0);

  return (
    <Box>
      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Button variant="text" onClick={() => navigate('/employees')}>{t('common.back')}</Button>
        <Button variant="contained" onClick={() => navigate(`/employees/${id}/edit`)}>
          {t('common.edit')}
        </Button>
      </Box>

      {/* Glass Hero Card */}
      <Paper sx={{ ...glassPaper, mb: 3, position: 'relative', overflow: 'hidden' }}>
        {/* Decorative glows */}
        <Box sx={{
          position: 'absolute', top: -90, left: -60, width: 280, height: 280,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.18), rgba(236,72,153,0.08), transparent 70%)',
          filter: 'blur(30px)', pointerEvents: 'none',
        }} />
        <Box sx={{
          position: 'absolute', bottom: -90, right: -50, width: 220, height: 220,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.12), rgba(59,130,246,0.06), transparent 70%)',
          filter: 'blur(30px)', pointerEvents: 'none',
        }} />

        <Box sx={{ position: 'relative', zIndex: 1, p: 3.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3.5, flexWrap: 'wrap' }}>
            <EmployeeAvatar
              employee={e}
              size={104}
              sx={{ boxShadow: '0 10px 36px rgba(99,102,241,0.4)', border: '3px solid rgba(255,255,255,0.7)' }}
            />
            <Box sx={{ flex: 1, minWidth: 240 }}>
              <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>
                {e.full_name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {/* Identity chips WITHOUT icons */}
                <Chip label={`کد پرسنلی: ${toPersianDigits(e.employee_id)}`} size="small" color="primary" variant="filled" />
                <Chip label={`کد ملی: ${toPersianDigits(e.national_id)}`} size="small" variant="outlined" />
                <StatusBadge status={e.status} size="medium" />
              </Box>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                {toPersianDigits(docs.length)} مدرک بارگذاری شده
              </Typography>
            </Box>
          </Box>

          {/* Detail info grid */}
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={1.5}>
            <InfoItem icon={<AccountTreeIcon sx={{ fontSize: 18 }} />} color="#6366f1" label="دپارتمان" value={e.department_detail?.name || '—'} />
            <InfoItem icon={<WorkIcon sx={{ fontSize: 18 }} />} color="#ec4899" label="عنوان شغلی" value={e.job_title_detail?.name || '—'} />
            <InfoItem icon={<BusinessIcon sx={{ fontSize: 18 }} />} color="#10b981" label="محل استقرار" value={e.work_location_detail?.name || '—'} />
            <InfoItem icon={<PhoneIcon sx={{ fontSize: 18 }} />} color="#f59e0b" label="موبایل" value={toPersianDigits(e.mobile)} />
            <InfoItem icon={<EmailIcon sx={{ fontSize: 18 }} />} color="#3b82f6" label="ایمیل" value={e.email || '—'} />
            <InfoItem icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />} color="#ef4444" label="تاریخ استخدام" value={toJalali(e.hire_date)} />
          </Grid>

          {/* Uploaded documents summary */}
          {docsByType.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>مدارک بارگذاری شده</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {docsByType.map(d => (
                    <Chip key={d.id} label={`${d.name} (${toPersianDigits(d.count)})`} size="small" variant="outlined" color="success" />
                  ))}
                </Box>
              </Box>
            </>
          )}
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ ...glassPaper, overflow: 'hidden' }}>
        <Tabs
          value={tabIndex}
          onChange={(ev, v) => setTabIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="تایملاین" />
          <Tab label="اطلاعات فردی" />
          <Tab label="اطلاعات شغلی" />
          <Tab label="دریافتی‌ها" />
          <Tab label="کارکرد" />
          <Tab label="تغییرات" />
          <Tab label="مدارک" />
        </Tabs>
        <Box sx={{ p: 3 }}>
          {tabIndex === 0 && <TimelineTab employeeId={e.id} />}
          {tabIndex === 1 && <BasicInfoTab employee={e} />}
          {tabIndex === 2 && <EmploymentTab employee={e} />}
          {tabIndex === 3 && <ReceiptsTab employeeId={e.id} />}
          {tabIndex === 4 && <WorkRecordTab employeeId={e.id} />}
          {tabIndex === 5 && <EmploymentHistoryTab employeeId={e.id} />}
          {tabIndex === 6 && <DocumentsTab employeeId={e.id} />}
        </Box>
      </Paper>
    </Box>
  );
};

export default EmployeeProfilePage;