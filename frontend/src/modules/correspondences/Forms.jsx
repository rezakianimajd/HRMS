import React from 'react';
import DescriptionIcon from '@mui/icons-material/Description';
import CorrespondenceCRUD from './shared';
import { toPersianDigits } from '../../core/utils/numberUtils';

const Forms = () => (
  <CorrespondenceCRUD
    endpoint="/forms/"
    title="فرم‌ها"
    color="#8b5cf6"
    icon={<DescriptionIcon sx={{ color: '#fff', fontSize: 20 }} />}
    searchPlaceholder="جستجوی فرم..."
    fields={[
      { key: 'name', label: 'نام فرم', required: true },
      { key: 'code', label: 'کد فرم', required: true },
      { key: 'category', label: 'دسته‌بندی' },
      { key: 'description', label: 'توضیحات', multiline: true },
    ]}
    columns={[
      { key: 'name', label: 'نام فرم', primary: true },
      { key: 'category', label: 'دسته‌بندی', secondary: true },
      { key: 'code', label: 'کد', render: it => toPersianDigits(it.code) },
      { key: 'description', label: 'توضیحات' },
    ]}
    defaultForm={{}}
  />
);

export default Forms;