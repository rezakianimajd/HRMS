import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Avatar, Chip, Stack, alpha } from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ShieldIcon from '@mui/icons-material/Shield';
import DescriptionIcon from '@mui/icons-material/Description';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import CategoryIcon from '@mui/icons-material/Category';
import HubIcon from '@mui/icons-material/Hub';
import LayersIcon from '@mui/icons-material/Layers';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PublicIcon from '@mui/icons-material/Public';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import axiosInstance from '../core/api/axiosConfig';
import { EntityManager, ENDPOINTS } from '../core/components/settings/shared';
import SettingsShell from '../core/components/settings/SettingsShell';
import { formatPersianNumber } from '../core/utils/numberUtils';

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
  {
    key: 'departments', endpointKey: 'departments', label: 'دپارتمان‌ها',
    icon: <AccountTreeIcon />, color: '#14b8a6', group: 'ساختار سازمانی',
    desc: 'واحدها و دپارتمان‌های سازمان',
  },
  {
    key: 'jobTitles', endpointKey: 'jobTitles', label: 'عناوین شغلی',
    icon: <WorkIcon />, color: '#ec4899', group: 'ساختار سازمانی',
    desc: 'سمت‌های سازمانی به‌همراه سطح',
  },
  {
    key: 'locations', endpointKey: 'workLocations', label: 'محل‌های استقرار',
    icon: <LocationOnIcon />, color: '#10b981', group: 'ساختار سازمانی',
    desc: 'شعب و محل‌های کاری',
  },
  {
    key: 'insurance', endpointKey: 'insuranceLists', label: 'لیست‌های بیمه',
    icon: <ShieldIcon />, color: '#f59e0b', group: 'بیمه و قرارداد',
    desc: 'کدهای کارگاهی تأمین اجتماعی',
  },
  {
    key: 'contractTypes', endpointKey: 'contractTypes', label: 'انواع قرارداد',
    icon: <NoteAltIcon />, color: '#8b5cf6', group: 'بیمه و قرارداد',
    desc: 'الگوهای قرارداد استخدام',
  },
  {
    key: 'docTypes', endpointKey: 'documentTypes', label: 'انواع مدارک',
    icon: <DescriptionIcon />, color: '#3b82f6', group: 'مدارک و طرف‌های خارجی',
    desc: 'دسته‌بندی مدارک و زیرپوشهٔ بایگانی',
  },
  {
    key: 'organizations', endpointKey: 'organizations', label: 'سازمان‌های خارجی',
    icon: <CategoryIcon />, color: '#f97316', group: 'مدارک و طرف‌های خارجی',
    desc: 'سازمان‌های مالیات، تأمین اجتماعی و ...',
  },
];

const MANAGER_PROPS = {
  departments: {
    endpoint: ENDPOINTS.departments, fields: ['name', 'code'],
    title: 'مدیریت دپارتمان‌های سازمان',
  },
  jobTitles: {
    endpoint: ENDPOINTS.jobTitles, fields: ['name', 'code'],
    extraFields: { level: 'سطح' }, defaultForm: { level: 'expert' },
    title: 'مدیریت عناوین شغلی',
  },
  locations: {
    endpoint: ENDPOINTS.workLocations, fields: ['name', 'code'],
    extraFields: { description: 'توضیحات' }, title: 'مدیریت محل‌های استقرار',
  },
  insurance: {
    endpoint: ENDPOINTS.insuranceLists, fields: ['name', 'code'],
    extraFields: { description: 'توضیحات' }, title: 'مدیریت لیست‌های بیمه',
  },
  contractTypes: {
    endpoint: ENDPOINTS.contractTypes, fields: ['name', 'code'],
    extraFields: { description: 'توضیحات' }, title: 'مدیریت انواع قرارداد',
  },
  docTypes: {
    endpoint: ENDPOINTS.documentTypes, fields: ['name', 'code'],
    extraFields: {
      archive_folder: {
        label: 'زیرپوشهٔ بایگانی',
        single: true,
        helper: 'مثلاً «افراد تحت تکفل»؛ خالی = تشخیص خودکار از نام/کد مدرک',
      },
    },
    title: 'مدیریت انواع مدارک',
  },
  organizations: {
    endpoint: ENDPOINTS.organizations, fields: ['name', 'code'],
    extraFields: {
      type: { label: 'نوع سازمان', options: ORG_TYPES },
      phone: 'تلفن',
      email: 'ایمیل',
      address: 'آدرس',
      description: 'توضیحات',
    },
    defaultForm: { type: 'government' },
    title: 'مدیریت سازمان‌های خارجی',
  },
};

const DefinitionsPage = () => {
  const [activeKey, setActiveKey] = useState(TABS[0].key);
  const active = TABS.find((tab) => tab.key === activeKey) || TABS[0];

  const { data: counts = {} } = useQuery({
    queryKey: ['definition-counts'],
    staleTime: 60_000,
    queryFn: async () => {
      const entries = await Promise.all(
        TABS.map(async (tab) => {
          try {
            const { data } = await axiosInstance.get(ENDPOINTS[tab.endpointKey]);
            const total = Array.isArray(data)
              ? data.length
              : (data?.count ?? data?.results?.length ?? 0);
            return [tab.key, total];
          } catch {
            return [tab.key, 0];
          }
        }),
      );
      return Object.fromEntries(entries);
    },
  });

  const totalRecords = TABS.reduce((sum, tab) => sum + (counts[tab.key] || 0), 0);
  const activeCount = counts[active.key] || 0;

  const nav = TABS.map((tab) => ({
    ...tab,
    badge: counts[tab.key] != null ? formatPersianNumber(counts[tab.key]) : '',
  }));

  const stats = [
    {
      label: 'کل رکوردهای پایه', value: formatPersianNumber(totalRecords),
      sub: `${formatPersianNumber(TABS.length)} گروه تعریف پایه`,
      icon: <LayersIcon />, color: '#6366f1',
    },
    {
      label: 'دپارتمان‌ها', value: formatPersianNumber(counts.departments || 0),
      sub: 'واحدهای سازمانی', icon: <ApartmentIcon />, color: '#14b8a6',
    },
    {
      label: 'انواع مدارک', value: formatPersianNumber(counts.docTypes || 0),
      sub: 'دسته‌بندی مدارک پرسنلی', icon: <DescriptionIcon />, color: '#3b82f6',
    },
    {
      label: 'سازمان‌های خارجی', value: formatPersianNumber(counts.organizations || 0),
      sub: 'مالیات، بیمه و مراجع', icon: <PublicIcon />, color: '#f97316',
    },
  ];

  const shellProps = MANAGER_PROPS[active.key];

  return (
    <SettingsShell
      brand="تعاریف اولیه"
      brandSub="داده‌های پایهٔ سازمان"
      icon={<HubIcon />}
      title="تعاریف و داده‌های پایه"
      subtitle="مدیریت ساختار سازمانی، مدارک، بیمه و طرف‌های خارجی — همهٔ ماژول‌ها از این داده‌ها استفاده می‌کنند."
      badge={<Chip size="small" label={`${formatPersianNumber(TABS.length)} گروه`} sx={{ fontWeight: 800 }} />}
      nav={nav}
      activeKey={active.key}
      onSelect={setActiveKey}
      stats={stats}
      footer={(
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ width: 30, height: 30, bgcolor: alpha('#6366f1', 0.12), color: '#6366f1' }}>
            <InfoOutlinedIcon sx={{ fontSize: 17 }} />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 800 }} noWrap>راهنما</Typography>
            <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }} noWrap>
              تغییرات بلافاصله در فرم‌ها اعمال می‌شود
            </Typography>
          </Box>
        </Stack>
      )}
    >
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap',
        p: 1.5, mb: 1.75, borderRadius: '16px',
        background: `linear-gradient(135deg, ${alpha(active.color, 0.13)}, ${alpha(active.color, 0.02)})`,
        border: `1px solid ${alpha(active.color, 0.18)}`,
      }}>
        <Avatar variant="rounded" sx={{
          width: 38, height: 38, borderRadius: '11px',
          bgcolor: alpha(active.color, 0.15), color: active.color,
        }}>
          {React.cloneElement(active.icon, { sx: { fontSize: 19 } })}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 160 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 13.5 }}>{active.label}</Typography>
          <Typography variant="caption" color="text.secondary">{active.desc}</Typography>
        </Box>
        <Chip
          size="small"
          label={`${formatPersianNumber(activeCount)} رکورد`}
          sx={{
            fontWeight: 800, bgcolor: alpha(active.color, 0.12), color: active.color,
            '& .MuiChip-label': { px: 1 },
          }}
        />
      </Box>

      {shellProps ? <EntityManager {...shellProps} /> : null}
    </SettingsShell>
  );
};

export default DefinitionsPage;

