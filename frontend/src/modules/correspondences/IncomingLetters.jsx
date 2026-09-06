import React from 'react';
import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import MailIcon from '@mui/icons-material/Mail';
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

const IncomingLetters = () => (
  <CorrespondenceCRUD
    endpoint="/incoming-letters/"
    title="نامه‌های وارده"
    color="#6366f1"
    icon={<MailIcon sx={{ color: '#fff', fontSize: 20 }} />}
    searchPlaceholder="جستجوی نامه وارده..."
    fields={[
      { key: 'number', label: 'شماره نامه', required: true },
      { key: 'date', label: 'تاریخ نامه', type: 'date', required: true },
      { key: 'sender', label: 'فرستنده', required: true },
      { key: 'subject', label: 'موضوع', required: true, multiline: true },
      { key: 'priority', label: 'اولویت', render: renderPriorityField },
      { key: 'employees', label: 'پرسنل مرتبط', type: 'employees' },
      { key: 'description', label: 'توضیحات', multiline: true },
    ]}
    columns={[
      { key: 'subject', label: 'موضوع', primary: true },
      { key: 'sender', label: 'فرستنده', secondary: true },
      { key: 'number', label: 'شماره', render: it => toPersianDigits(it.number) },
      { key: 'date', label: 'تاریخ' },
      { key: 'priority', label: 'اولویت' },
      { key: 'employee_names', label: 'پرسنل' },
    ]}
    defaultForm={{ priority: 'normal' }}
  />
);

export default IncomingLetters;