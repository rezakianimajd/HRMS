import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CorrespondenceCRUD from './shared';
import { toPersianDigits } from '../../core/utils/numberUtils';
import { PRIORITIES } from './config';

const renderPriorityField = (form, setForm) => (
  <FormControl fullWidth size="small">
    <InputLabel>اولویت</InputLabel>
    <Select value={form.priority || 'normal'} label="اولویت"
      onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
      {PRIORITIES.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
    </Select>
  </FormControl>
);

const OutgoingLetters = () => (
  <CorrespondenceCRUD
    endpoint="/outgoing-letters/"
    title="نامه‌های صادره"
    color="#10b981"
    icon={<SendIcon sx={{ color: '#fff', fontSize: 20 }} />}
    searchPlaceholder="جستجوی نامه صادره..."
    fields={[
      { key: 'number', label: 'شماره نامه', required: true },
      { key: 'date', label: 'تاریخ نامه', type: 'date', required: true },
      { key: 'receiver', label: 'گیرنده', required: true },
      { key: 'subject', label: 'موضوع', required: true, multiline: true },
      { key: 'priority', label: 'اولویت', render: renderPriorityField },
      { key: 'description', label: 'توضیحات', multiline: true },
    ]}
    columns={[
      { key: 'subject', label: 'موضوع', primary: true },
      { key: 'receiver', label: 'گیرنده', secondary: true },
      { key: 'number', label: 'شماره', render: it => toPersianDigits(it.number) },
      { key: 'date', label: 'تاریخ' },
      { key: 'priority', label: 'اولویت' },
    ]}
    defaultForm={{ priority: 'normal' }}
  />
);

export default OutgoingLetters;