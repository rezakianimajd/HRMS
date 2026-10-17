import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Chip } from '@mui/material';
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
import axiosInstance from '../core/api/axiosConfig';
import { EntityManager, ENDPOINTS } from '../core/components/settings/shared';
import {
  PageHeader, StatGrid, TabsCard, SOFT,
} from '../core/components/settings/settingsUi';
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
    icon: <AccountTreeIcon />, color: '#68b7a8', group: 'ساختار سازمانی',
    desc: 'واحدها و دپارتمان‌های سازمان',
  },
  {
    key: 'jobTitles', endpointKey: 'jobTitles', label: 'عناوین شغلی',
    icon: <WorkIcon />, color: '#d38aa8', group: 'ساختار سازمانی',
    desc: 'سمت‌های سازمانی به‌همراه سطح',
  },
  {
    key: 'locations', endpointKey: 'workLocations', label: 'محل‌های استقرار',
    icon: <LocationOnIcon />, color: '#7fbf8a', group: 'ساختار سازمانی',
    desc: 'شعب و محل‌های کاری',
  },
  {
    key: 'insurance', endpointKey: 'insuranceLists', label: 'لیست‌های بیمه',
    icon: <ShieldIcon />, color: '#d3ac6e', group: 'بیمه و قرارداد',
    desc: 'کدهای کارگاهی تأمین اجتماعی',
  },
  {
    key: 'contractTypes', endpointKey: 'contractTypes', label: 'انواع قرارداد',
    icon: <NoteAltIcon />, color: '#a08fdc', group: 'بیمه و قرارداد',
    desc: 'الگوهای قرارداد استخدام',
  },
  {
    key: 'docTypes', endpointKey: 'documentTypes', label: 'انواع مدارک',
    icon: <DescriptionIcon />, color: '#7aa6d6', group: 'مدارک و طرف‌های خارجی',
    desc: 'دسته‌بندی مدارک و زیرپوشهٔ بایگانی',
  },
  {
    key: 'organizations', endpointKey: 'organizations', label: 'سازمان‌های خارجی',
    icon: <CategoryIcon />, color: '#d69a74', group: 'مدارک و طرف‌های خارجی',
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
  const [tabIndex, setTabIndex] = useState(0);
  const active = TABS[Math.min(tabIndex, TABS.length - 1)];

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

  const tabs = TABS.map((tab) => ({
    ...tab,
    badge: counts[tab.key] != null ? formatPersianNumber(counts[tab.key]) : '',
  }));

  const stats = [
    {
      label: 'کل رکوردهای پایه', value: formatPersianNumber(totalRecords),
      sub: `${formatPersianNumber(TABS.length)} گروه تعریف پایه`,
      icon: <LayersIcon />, color: SOFT.indigo,
    },
    {
      label: 'دپارتمان‌ها', value: formatPersianNumber(counts.departments || 0),
      sub: 'واحدهای سازمانی', icon: <ApartmentIcon />, color: SOFT.teal,
    },
    {
      label: 'انواع مدارک', value: formatPersianNumber(counts.docTypes || 0),
      sub: 'دسته‌بندی مدارک پرسنلی', icon: <DescriptionIcon />, color: SOFT.blue,
    },
    {
      label: 'سازمان‌های خارجی', value: formatPersianNumber(counts.organizations || 0),
      sub: 'مالیات، بیمه و مراجع', icon: <PublicIcon />, color: SOFT.orange,
    },
  ];

  return (
    <Box>
      <PageHeader
        icon={<HubIcon />}
        title="تعاریف و داده‌های پایه"
        color={SOFT.indigo}
        badge={(
          <Chip size="small" variant="outlined" label={`${formatPersianNumber(TABS.length)} گروه`}
            sx={{ fontWeight: 800 }} />
        )}
      />

      <TabsCard
        tabs={tabs}
        value={Math.min(tabIndex, TABS.length - 1)}
        onChange={setTabIndex}
        activeColor={active.color}
      />

      <StatGrid stats={stats} />

      {MANAGER_PROPS[active.key] ? <EntityManager {...MANAGER_PROPS[active.key]} /> : null}
    </Box>
  );
};

export default DefinitionsPage;
