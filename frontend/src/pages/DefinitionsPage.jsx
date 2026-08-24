import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Paper, Tabs, Tab, Avatar } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ShieldIcon from '@mui/icons-material/Shield';
import DescriptionIcon from '@mui/icons-material/Description';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import CategoryIcon from '@mui/icons-material/Category';
import { EntityManager, CompanyProfileTab, ENDPOINTS } from '../core/components/settings/shared';

const ORG_TYPES = [
  { value: 'tax', label: 'اداره مالیات' },
  { value: 'social_security', label: 'تأمین اجتماعی' },
  { value: 'insurance', label: 'بیمه' },
  { value: 'court', label: 'دادگستری / مراجع قضایی' },
  { value: 'bank', label: 'بانک' },
  { value: 'government', label: 'سازمان دولتی' },
  { value: 'other', label: 'سایر' },
];

const TABS = [
  { key: 'profile', label: 'مشخصات شرکت', icon: <BusinessIcon />, color: '#6366f1', desc: 'اطلاعات حقوقی، تماس و لوگوی شرکت' },
  { key: 'departments', label: 'دپارتمان‌ها', icon: <AccountTreeIcon />, color: '#14b8a6', desc: 'ساختار واحدهای سازمانی' },
  { key: 'jobTitles', label: 'عناوین شغلی', icon: <WorkIcon />, color: '#ec4899', desc: 'سمت‌های سازمانی با سطح' },
  { key: 'locations', label: 'محل‌های استقرار', icon: <LocationOnIcon />, color: '#10b981', desc: 'شعب و محل‌های کاری' },
  { key: 'insurance', label: 'لیست بیمه', icon: <ShieldIcon />, color: '#f59e0b', desc: 'کدهای کارگاهی تأمین اجتماعی' },
  { key: 'docTypes', label: 'انواع مدارک', icon: <DescriptionIcon />, color: '#3b82f6', desc: 'دسته‌بندی مدارک پرسنلی' },
  { key: 'contractTypes', label: 'انواع قرارداد', icon: <NoteAltIcon />, color: '#8b5cf6', desc: 'الگوهای قرارداد استخدام' },
  { key: 'organizations', label: 'سازمان‌ها', icon: <CategoryIcon />, color: '#f97316', desc: 'سازمان‌های خارجی (مالیات، تأمین اجتماعی و ...)' },
];

const DefinitionsPage = () => {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  const active = TABS[tabIndex];

  return (
    <Box>
      {/* Glass header */}
      <Paper sx={{
        mb: 3, p: 2.5,
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.05))',
        border: '1px solid rgba(99,102,241,0.2)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 3,
      }}>
        <Avatar sx={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
        }}>
          <CategoryIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={800}>تعاریف اولیه</Typography>
          <Typography variant="body2" color="textSecondary">مدیریت داده‌های پایه و مرجع سازمان</Typography>
        </Box>
      </Paper>

      {/* Glass container with colored tabs */}
      <Paper sx={{
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.3))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: 3,
      }}>
        <Tabs
          value={tabIndex}
          onChange={(e, v) => setTabIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(255,255,255,0.4)', px: 2 }}
        >
          {TABS.map((tab, i) => (
            <Tab
              key={tab.key}
              label={tab.label}
              sx={{
                fontWeight: 600,
                py: 1.75,
                color: tabIndex === i ? tab.color : 'text.secondary',
              }}
            />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Active tab description */}
          <Paper sx={{
            mb: 2, px: 1.5, py: 1,
            background: `linear-gradient(135deg, ${active.color}0d, ${active.color}04)`,
            border: `1px solid ${active.color}20`,
            borderRadius: 2,
          }}>
            <Typography variant="body2" sx={{ color: active.color, fontWeight: 600 }}>{active.desc}</Typography>
          </Paper>

          {tabIndex === 0 && <CompanyProfileTab />}
          {tabIndex === 1 && <EntityManager endpoint={ENDPOINTS.departments} fields={['name', 'code']} title="مدیریت دپارتمان‌های سازمان" />}
          {tabIndex === 2 && <EntityManager endpoint={ENDPOINTS.jobTitles} fields={['name', 'code']} extraFields={{ level: 'سطح' }} defaultForm={{ level: 'expert' }} title="مدیریت عناوین شغلی" />}
          {tabIndex === 3 && <EntityManager endpoint={ENDPOINTS.workLocations} fields={['name', 'code']} extraFields={{ description: 'توضیحات' }} title="مدیریت محل‌های استقرار" />}
          {tabIndex === 4 && <EntityManager endpoint={ENDPOINTS.insuranceLists} fields={['name', 'code']} extraFields={{ description: 'توضیحات' }} title="مدیریت لیست‌های بیمه" />}
          {tabIndex === 5 && <EntityManager endpoint={ENDPOINTS.documentTypes} fields={['name', 'code']} title="مدیریت انواع مدارک" />}
          {tabIndex === 6 && <EntityManager endpoint={ENDPOINTS.contractTypes} fields={['name', 'code']} extraFields={{ description: 'توضیحات' }} title="مدیریت انواع قرارداد" />}
          {tabIndex === 7 && (
            <EntityManager
              endpoint={ENDPOINTS.organizations}
              fields={['name', 'code']}
              extraFields={{
                type: { label: 'نوع سازمان', options: ORG_TYPES },
                phone: 'تلفن',
                email: 'ایمیل',
                address: 'آدرس',
                description: 'توضیحات',
              }}
              defaultForm={{ type: 'government' }}
              title="مدیریت سازمان‌های خارجی (مالیات، تأمین اجتماعی و ...)"
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default DefinitionsPage;