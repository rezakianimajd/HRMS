import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import CorrespondenceCRUD from './shared';
import { toPersianDigits } from '../../core/utils/numberUtils';
import { ANNOUNCEMENT_TYPES } from './config';

const renderTypeField = (form, setForm) => (
  <FormControl fullWidth size="small">
    <InputLabel>نوع ابلاغ</InputLabel>
    <Select value={form.type || 'general'} label="نوع ابلاغ"
      onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
      {ANNOUNCEMENT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
    </Select>
  </FormControl>
);

const TYPE_LABELS = ANNOUNCEMENT_TYPES.reduce((a, t) => { a[t.value] = t.label; return a; }, {});
const TYPE_COLORS = ANNOUNCEMENT_TYPES.reduce((a, t) => { a[t.value] = t.color; return a; }, {});

const Announcements = () => (
  <CorrespondenceCRUD
    endpoint="/announcements/"
    title="ابلاغ‌ها"
    color="#f59e0b"
    icon={<CampaignIcon sx={{ color: '#fff', fontSize: 20 }} />}
    searchPlaceholder="جستجوی ابلاغ..."
    fields={[
      { key: 'number', label: 'شماره ابلاغ', required: true },
      { key: 'date', label: 'تاریخ ابلاغ', type: 'date', required: true },
      { key: 'title', label: 'عنوان', required: true },
      { key: 'type', label: 'نوع ابلاغ', render: renderTypeField },
      { key: 'description', label: 'توضیحات', multiline: true },
    ]}
    columns={[
      { key: 'title', label: 'عنوان', primary: true },
      { key: 'type', label: 'نوع', secondary: true, render: it => <Chip size="small" label={TYPE_LABELS[it.type] || it.type} sx={{ color: TYPE_COLORS[it.type], borderColor: TYPE_COLORS[it.type] }} variant="outlined" /> },
      { key: 'number', label: 'شماره', render: it => toPersianDigits(it.number) },
      { key: 'date', label: 'تاریخ' },
    ]}
    defaultForm={{ type: 'general' }}
  />
);

export default Announcements;