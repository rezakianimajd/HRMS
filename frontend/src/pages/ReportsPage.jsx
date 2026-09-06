import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Avatar, Chip,
  Divider, Stack,
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import BadgeIcon from '@mui/icons-material/Badge';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CakeIcon from '@mui/icons-material/Cake';
import FavoriteIcon from '@mui/icons-material/Favorite';
import WorkIcon from '@mui/icons-material/Work';
import ShieldIcon from '@mui/icons-material/Shield';
import PaymentsIcon from '@mui/icons-material/Payments';
import MailIcon from '@mui/icons-material/Mail';
import { toJalali } from '../core/utils/dateUtils';
import { toPersianDigits, formatPersianNumber } from '../core/utils/numberUtils';
import { DonutChart, BarChart, ColumnChart, LineChart } from '../core/components/charts/Charts';

const sectionColors = {
  dept: '#6366f1',
  gender: '#ec4899',
  location: '#10b981',
  contracts: '#f59e0b',
  turnover: '#3b82f6',
  age: '#8b5cf6',
  insurance: '#14b8a6',
  marital: '#f43f5e',
  shift: '#8b5cf6',
  hire: '#06b6d4',
  jobTitle: '#f97316',
};

const PALETTE = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#14b8a6', '#f43f5e', '#f97316', '#06b6d4'];

/* Consistent glassmorphism card for all report sections */
const glassCard = (from) => ({
  p: 3,
  height: '100%',
  background: `linear-gradient(135deg, ${from}10, ${from}04)`,
  border: `1px solid ${from}1e`,
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  borderRadius: 3,
  transition: 'all 0.25s ease',
  '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 12px 32px ${from}16` },
});

const SectionHeader = ({ title, color, icon, subtitle }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
    <Avatar sx={{ width: 38, height: 38, background: `linear-gradient(135deg, ${color}, ${color}90)`, color: '#fff', boxShadow: `0 2px 10px ${color}45` }}>
      {icon}
    </Avatar>
    <Box>
      <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      {subtitle && <Typography variant="caption" color="textSecondary">{subtitle}</Typography>}
    </Box>
  </Box>
);

/* Small numeric stat tile */
const StatTile = ({ label, value, color }) => (
  <Box sx={{
    p: 1.5, borderRadius: 2,
    background: `linear-gradient(135deg, ${color}10, ${color}04)`,
    border: `1px solid ${color}15`,
  }}>
    <Typography variant="caption" color="textSecondary">{label}</Typography>
    <Typography variant="h6" fontWeight={800} sx={{ color }}>{formatPersianNumber(value)}</Typography>
  </Box>
);

/* Large KPI card - centered vertical layout */
const KpiCard = ({ label, value, unit, subtitle, color, icon }) => (
  <Paper sx={glassCard(color)}>
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 1, py: 1 }}>
      <Avatar sx={{
        width: 58, height: 58,
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        boxShadow: `0 6px 18px ${color}40`,
      }}>
        {icon}
      </Avatar>
      <Box>
        <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1.1 }}>
          {formatPersianNumber(value)}
          {unit && <Typography component="span" variant="h5" sx={{ color, mr: 0.5 }}>{unit}</Typography>}
        </Typography>
        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5, color: 'text.primary' }}>{label}</Typography>
        {subtitle && <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.25 }}>{subtitle}</Typography>}
      </Box>
    </Box>
  </Paper>
);

const ReportsPage = () => {
  const { t } = useTranslation();

  const { data: byDept } = useQuery({ queryKey: ['report-dept'], queryFn: () => axiosInstance.get('/reports/employees-by-department/').then(r => r.data) });
  const { data: byGender } = useQuery({ queryKey: ['report-gender'], queryFn: () => axiosInstance.get('/reports/employees-by-gender/').then(r => r.data) });
  const { data: byLocation } = useQuery({ queryKey: ['report-loc'], queryFn: () => axiosInstance.get('/reports/employees-by-location/').then(r => r.data) });
  const { data: byJobTitle } = useQuery({ queryKey: ['report-job-title'], queryFn: () => axiosInstance.get('/reports/employees-by-job-title/').then(r => r.data) });
  const { data: byInsurance } = useQuery({ queryKey: ['report-insurance'], queryFn: () => axiosInstance.get('/reports/employees-by-insurance/').then(r => r.data) });
  const { data: byContract } = useQuery({ queryKey: ['report-contract-type'], queryFn: () => axiosInstance.get('/reports/employees-by-contract-type/').then(r => r.data) });
  const { data: byMarital } = useQuery({ queryKey: ['report-marital'], queryFn: () => axiosInstance.get('/reports/employees-by-marital-status/').then(r => r.data) });
  const { data: byShift } = useQuery({ queryKey: ['report-shift'], queryFn: () => axiosInstance.get('/reports/employees-by-work-shift/').then(r => r.data) });
  const { data: byAgeGroup } = useQuery({ queryKey: ['report-age-group'], queryFn: () => axiosInstance.get('/reports/employees-by-age-group/').then(r => r.data) });
  const { data: hiresTrend } = useQuery({ queryKey: ['report-hires-trend'], queryFn: () => axiosInstance.get('/reports/monthly-hires-trend/').then(r => r.data) });
  const { data: contracts } = useQuery({ queryKey: ['report-contracts-exp'], queryFn: () => axiosInstance.get('/reports/contracts-expiring/').then(r => r.data) });
  const { data: turnover } = useQuery({ queryKey: ['report-turnover'], queryFn: () => axiosInstance.get('/reports/turnover-rate/').then(r => r.data) });
  const { data: avgAge } = useQuery({ queryKey: ['report-avg-age'], queryFn: () => axiosInstance.get('/reports/average-age-experience/').then(r => r.data) });
  const { data: txSummary } = useQuery({ queryKey: ['report-tx-summary'], queryFn: () => axiosInstance.get('/transactions/summary/').then(r => r.data) });
  const { data: birthdays } = useQuery({ queryKey: ['report-birthdays'], queryFn: () => axiosInstance.get('/reports/upcoming-birthdays/').then(r => r.data) });
  const { data: corrSummary } = useQuery({ queryKey: ['report-correspondences'], queryFn: () => axiosInstance.get('/reports/correspondences-summary/').then(r => r.data) });
  const { data: salaryBenefit } = useQuery({ queryKey: ['report-salary-benefit'], queryFn: () => axiosInstance.get('/reports/salary-benefits-summary/').then(r => r.data) });
  const { data: salaryCost } = useQuery({ queryKey: ['report-salary-cost'], queryFn: () => axiosInstance.get('/reports/salary-cost/').then(r => r.data) });
  const { data: attendanceSummary } = useQuery({ queryKey: ['report-attendance-summary'], queryFn: () => axiosInstance.get('/reports/attendance-summary/').then(r => r.data) });

  const totalEmployees = (byGender || []).reduce((sum, g) => sum + (g.count || 0), 0);
  const hiresTotal = (hiresTrend || []).reduce((sum, d) => sum + (Number(d.count) || 0), 0);
  const hireRate = totalEmployees ? Math.round((hiresTotal / totalEmployees) * 1000) / 10 : 0;
  const ageValues = (avgAge || []).map(a => a.avg_age).filter(v => v != null && !isNaN(v));
  const avgAgeOverall = ageValues.length
    ? Math.round(ageValues.reduce((s, v) => s + Number(v), 0) / ageValues.length * 10) / 10
    : 0;

  const genderData = (byGender || []).map((g, i) => ({ label: g.gender, value: g.count, color: ['#ec4899', '#3b82f6'][i] }));
  const deptData = (byDept || []).map((d, i) => ({ label: d.name, value: d.count, color: PALETTE[i % PALETTE.length] }));
  const contractData = (byContract || []).map((d, i) => ({ label: d.name, value: d.count, color: PALETTE[(i + 2) % PALETTE.length] }));
  const maritalData = (byMarital || []).map((d, i) => ({ label: d.name, value: d.count, color: PALETTE[(i + 4) % PALETTE.length] }));
  const locationData = (byLocation || []).map((d, i) => ({ label: d.name, value: d.count, color: PALETTE[(i + 6) % PALETTE.length] }));
  const ageGroupData = (byAgeGroup || []).map((d, i) => ({ label: d.label, value: d.count, color: PALETTE[i % PALETTE.length] }));
  const hiresData = (hiresTrend || []).map(d => d.count);
  const hiresLabels = (hiresTrend || []).map(d => d.label);
  const txSummaryData = (txSummary || []).map((d, i) => ({ label: d.transaction_type_display, value: d.count, color: PALETTE[i % PALETTE.length] }));
  const salaryCostMonths = salaryCost?.months || [];
  const salaryCostData = salaryCostMonths.map((m) => Number(m.total) || 0);
  const salaryCostLabels = salaryCostMonths.map((m) => m.label);
  const attendanceMonths = attendanceSummary?.months || [];

  return (
    <Box>
      <Grid container spacing={2.5}>
        {/* Top 4 KPI cards */}
        <Grid item xs={6} md={3}>
          <KpiCard
            label="نرخ ورود"
            value={hireRate}
            unit="٪"
            subtitle={`${formatPersianNumber(hiresTotal)} نفر در ۱۲ ماه اخیر`}
            color="#3b82f6"
            icon={<PersonAddIcon sx={{ color: '#fff', fontSize: 28 }} />}
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <KpiCard
            label="تعداد پرسنل"
            value={totalEmployees}
            unit="نفر"
            subtitle="پرسنل فعال سازمان"
            color="#6366f1"
            icon={<PeopleIcon sx={{ color: '#fff', fontSize: 28 }} />}
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <KpiCard
            label="میانگین سنی"
            value={avgAgeOverall}
            unit="سال"
            subtitle="میانگین سن پرسنل فعال"
            color="#8b5cf6"
            icon={<CakeIcon sx={{ color: '#fff', fontSize: 28 }} />}
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <KpiCard
            label="نرخ خروج"
            value={turnover?.rate ?? 0}
            unit="٪"
            subtitle={`${formatPersianNumber(turnover?.terminated_count ?? 0)} خروج ثبت‌شده`}
            color="#ef4444"
            icon={<TrendingDownIcon sx={{ color: '#fff', fontSize: 28 }} />}
          />
        </Grid>

        {/* Gender Donut */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={glassCard(sectionColors.gender)}>
            <SectionHeader title={t('reports.employees_by_gender')} color={sectionColors.gender} icon={<PeopleIcon />} />
            <DonutChart data={genderData} centerLabel="نفر" />
          </Paper>
        </Grid>

        {/* Contract Type Donut */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={glassCard(sectionColors.contracts)}>
            <SectionHeader title="انواع قرارداد" color={sectionColors.contracts} icon={<WorkIcon />} />
            <DonutChart data={contractData} size={150} centerLabel="قرارداد" />
          </Paper>
        </Grid>

        {/* Marital Status */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={glassCard(sectionColors.marital)}>
            <SectionHeader title="وضعیت تأهل" color={sectionColors.marital} icon={<FavoriteIcon />} />
            <BarChart data={maritalData} color={sectionColors.marital} />
          </Paper>
        </Grid>

        {/* Department Bar */}
        <Grid item xs={12} md={6}>
          <Paper sx={glassCard(sectionColors.dept)}>
            <SectionHeader title={t('reports.employees_by_department')} color={sectionColors.dept} icon={<BusinessIcon />} />
            <BarChart data={deptData} color={sectionColors.dept} />
          </Paper>
        </Grid>

        {/* Job Title Bar */}
        <Grid item xs={12} md={6}>
          <Paper sx={glassCard(sectionColors.jobTitle)}>
            <SectionHeader title={t('reports.employees_by_job_title')} color={sectionColors.jobTitle} icon={<SupervisorAccountIcon />} />
            <BarChart data={(byJobTitle || []).map((d, i) => ({ label: d.name, value: d.count, color: PALETTE[(i + 8) % PALETTE.length] }))} color={sectionColors.jobTitle} />
          </Paper>
        </Grid>

        {/* Monthly Hires Trend */}
        <Grid item xs={12} md={6}>
          <Paper sx={glassCard(sectionColors.hire)}>
            <SectionHeader title="روند استخدام ماهانه" color={sectionColors.hire} icon={<BadgeIcon />} subtitle="۱۲ ماه اخیر" />
            <LineChart data={hiresData} labels={hiresLabels} color={sectionColors.hire} height={200} />
          </Paper>
        </Grid>

        {/* Age Group */}
        <Grid item xs={12} md={6}>
          <Paper sx={glassCard(sectionColors.age)}>
            <SectionHeader title="توزیع سنی کارکنان" color={sectionColors.age} icon={<CakeIcon />} />
            <ColumnChart data={ageGroupData} color={sectionColors.age} height={200} />
          </Paper>
        </Grid>

        {/* Monthly Salary Cost Trend */}
        <Grid item xs={12} md={6}>
          <Paper sx={glassCard('#f59e0b')}>
            <SectionHeader title="روند هزینه حقوق ماهانه" color="#f59e0b" icon={<PaymentsIcon />} subtitle="۱۲ ماه اخیر (خالص پرداختی)" />
            <LineChart data={salaryCostData} labels={salaryCostLabels} color="#f59e0b" height={200} />
          </Paper>
        </Grid>

        {/* Attendance / Absence Monthly Rate */}
        <Grid item xs={12} md={6}>
          <Paper sx={glassCard(sectionColors.turnover)}>
            <SectionHeader title="نرخ حضور / غیبت ماهانه" color={sectionColors.turnover} icon={<AccessTimeIcon />} subtitle="۱۲ ماه اخیر" />
            <LineChart
              data={attendanceMonths.map((m) => m.present_rate)}
              labels={attendanceMonths.map((m) => m.label)}
              color="#3b82f6"
              height={200}
            />
            <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip size="small" label={`حضور: ${formatPersianNumber(attendanceMonths.reduce((s, m) => s + m.present, 0))}`} sx={{ bgcolor: 'rgba(59,130,246,0.1)', color: '#3b82f6' }} />
              <Chip size="small" label={`غیبت: ${formatPersianNumber(attendanceMonths.reduce((s, m) => s + m.absent, 0))}`} sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#ef4444' }} />
              <Chip size="small" label={`مرخصی: ${formatPersianNumber(attendanceMonths.reduce((s, m) => s + m.leave, 0))}`} sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }} />
            </Box>
          </Paper>
        </Grid>

        {/* Work Shift */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={glassCard(sectionColors.shift)}>
            <SectionHeader title="نوبت کاری" color={sectionColors.shift} icon={<AccessTimeIcon />} />
            <BarChart data={(byShift || []).map((d, i) => ({ label: d.name, value: d.count, color: PALETTE[i % PALETTE.length] }))} color={sectionColors.shift} />
          </Paper>
        </Grid>

        {/* Location */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={glassCard(sectionColors.location)}>
            <SectionHeader title={t('reports.employees_by_location')} color={sectionColors.location} icon={<LocationOnIcon />} />
            <BarChart data={locationData} color={sectionColors.location} />
          </Paper>
        </Grid>

        {/* Insurance */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper sx={glassCard(sectionColors.insurance)}>
            <SectionHeader title={t('reports.employees_by_insurance')} color={sectionColors.insurance} icon={<ShieldIcon />} />
            <BarChart data={(byInsurance || []).map((d, i) => ({ label: d.name, value: d.count, color: PALETTE[(i + 5) % PALETTE.length] }))} color={sectionColors.insurance} />
          </Paper>
        </Grid>

        {/* Transaction Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={glassCard('#8b5cf6')}>
            <SectionHeader title="تراکنش‌های پرسنلی" color="#8b5cf6" icon={<WorkIcon />} subtitle="مرخصی، غیبت، مزایا، حقوق و کسورات" />
            {txSummaryData.length === 0 ? (
              <Typography color="textSecondary" variant="body2" sx={{ p: 2, textAlign: 'center' }}>تراکنشی ثبت نشده است</Typography>
            ) : (
              <BarChart data={txSummaryData} color="#8b5cf6" />
            )}
            {txSummary && txSummary.length > 0 && (
              <Box sx={{ mt: 2, borderTop: `1px solid #8b5cf622`, pt: 1.5 }}>
                {txSummary.map((s, i) => (
                  <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">{s.transaction_type_display}</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {s.total_amount > 0 && `${formatPersianNumber(s.total_amount)} ریال`}
                      {' '}{s.total_quantity > 0 && `${formatPersianNumber(s.total_quantity)} روز/تعداد`}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Salary & Benefits Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={glassCard('#6366f1')}>
            <SectionHeader title="خلاصه حقوق و مزایا" color="#6366f1" icon={<PaymentsIcon />} />
            <Grid container spacing={1.5}>
              <Grid item xs={6}><StatTile label="جمع حقوق پرداختی" value={salaryBenefit?.total_salaries} color="#6366f1" /></Grid>
              <Grid item xs={6}><StatTile label="جمع مزایا" value={salaryBenefit?.total_benefits} color="#10b981" /></Grid>
              <Grid item xs={6}><StatTile label="جمع کسورات" value={salaryBenefit?.total_deductions} color="#ef4444" /></Grid>
              <Grid item xs={6}><StatTile label="جمع مزایای رفاهی" value={salaryBenefit?.benefits_total_paid} color="#f59e0b" /></Grid>
            </Grid>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="textSecondary">تعداد فیش حقوقی</Typography>
              <Typography variant="body2" fontWeight={700}>{formatPersianNumber(salaryBenefit?.salary_records)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="body2" color="textSecondary">تعداد مزایا</Typography>
              <Typography variant="body2" fontWeight={700}>{formatPersianNumber(salaryBenefit?.benefit_records)}</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Upcoming Birthdays */}
        <Grid item xs={12} md={6}>
          <Paper sx={glassCard('#ec4899')}>
            <SectionHeader title="تولدهای ۷ روز آینده" color="#ec4899" icon={<CakeIcon />} subtitle="بر اساس تاریخ شمسی" />
            {(!birthdays || birthdays.length === 0) ? (
              <Typography color="textSecondary" variant="body2" sx={{ p: 2, textAlign: 'center' }}>در ۷ روز آینده تولدی نیست</Typography>
            ) : (
              <Stack spacing={1}>
                {birthdays.map(b => (
                  <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: 2, background: b.is_today ? 'rgba(236,72,153,0.1)' : 'rgba(236,72,153,0.04)', border: '1px solid rgba(236,72,153,0.12)' }}>
                    <Avatar sx={{ width: 36, height: 36, background: 'linear-gradient(135deg, #ec4899, #f472b6)', fontSize: 14 }}>{b.full_name?.charAt(0)}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>{b.full_name}</Typography>
                      <Typography variant="caption" color="textSecondary">{b.department_name}</Typography>
                    </Box>
                    <Chip size="small" color={b.is_today ? 'secondary' : 'default'}
                      label={b.is_today ? 'امروز 🎂' : `${toPersianDigits(b.days_until)} روز دیگر`} />
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Correspondences Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={glassCard('#14b8a6')}>
            <SectionHeader title="خلاصه مکاتبات" color="#14b8a6" icon={<MailIcon />} />
            <Grid container spacing={1.5}>
              <Grid item xs={6}><StatTile label="نامه‌های وارده" value={corrSummary?.incoming_letters} color="#6366f1" /></Grid>
              <Grid item xs={6}><StatTile label="نامه‌های صادره" value={corrSummary?.outgoing_letters} color="#10b981" /></Grid>
              <Grid item xs={6}><StatTile label="ابلاغ‌ها" value={corrSummary?.announcements} color="#f59e0b" /></Grid>
              <Grid item xs={6}><StatTile label="فرم‌ها" value={corrSummary?.forms} color="#8b5cf6" /></Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Expiring Contracts */}
        <Grid item xs={12}>
          <Paper sx={glassCard(sectionColors.contracts)}>
            <SectionHeader title={t('reports.contracts_expiring')} color={sectionColors.contracts} icon={<AssignmentIcon />} subtitle="قراردادهایی که در ۹۰ روز آینده منقضی می‌شوند" />
            {(!contracts || contracts.length === 0) ? (
              <Box sx={{ textAlign: 'center', p: 3 }}>
                <Typography variant="body2" color="textSecondary">هیچ قراردادی در ۹۰ روز آینده منقضی نمی‌شود</Typography>
              </Box>
            ) : (
              <Grid container spacing={1.5}>
                {contracts.slice(0, 12).map((c, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Card variant="outlined" sx={{ background: `rgba(245,158,11,0.05)`, border: `1px solid rgba(245,158,11,0.16)`, backdropFilter: 'blur(10px)' }}>
                      <CardContent sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, background: `linear-gradient(135deg, #f59e0b, #fbbf24)`, fontSize: 14, fontWeight: 700 }}>
                          {c.full_name?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{c.full_name}</Typography>
                          <Typography variant="caption" color="textSecondary">
                            {toPersianDigits(c.employee_id)} · انقضا: {toJalali(c.contract_end_date)}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>

        {/* Average Age & Experience Table */}
        <Grid item xs={12}>
          <Paper sx={glassCard(sectionColors.age)}>
            <SectionHeader title={t('reports.average_age_experience')} color={sectionColors.age} icon={<CakeIcon />} />
            <Box sx={{ display: 'flex', px: 2, py: 1, borderBottom: '1px solid #eef2f7' }}>
              <Typography variant="caption" fontWeight={700} sx={{ flex: 1 }}>دپارتمان</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ width: 130, textAlign: 'center' }}>میانگین سن</Typography>
              <Typography variant="caption" fontWeight={700} sx={{ width: 130, textAlign: 'center' }}>میانگین سابقه</Typography>
            </Box>
            {(avgAge || []).map((a, i) => (
              <Box key={i} sx={{ display: 'flex', px: 2, py: 1, '&:hover': { bgcolor: 'rgba(139,92,246,0.05)' }, borderRadius: 1 }}>
                <Typography variant="body2" sx={{ flex: 1 }}>{a.department}</Typography>
                <Typography variant="body2" sx={{ width: 130, textAlign: 'center' }}>{formatPersianNumber(a.avg_age)} سال</Typography>
                <Typography variant="body2" sx={{ width: 130, textAlign: 'center' }}>{formatPersianNumber(a.avg_experience_years)} سال</Typography>
              </Box>
            ))}
            {(!avgAge || avgAge.length === 0) && (
              <Typography color="textSecondary" variant="body2" sx={{ p: 2, textAlign: 'center' }}>داده‌ای موجود نیست</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsPage;