import React from 'react';
import { Box, Paper } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import { SimpleEntityList, glassPaper, PageHeader } from './projects/ProjectsShared';

const ProjectTypesPage = () => (
  <Box>
    <PageHeader icon={<CategoryIcon sx={{ color: '#fff', fontSize: 28 }} />}
      title="انواع پروژه" subtitle="دسته‌بندی پروژه‌ها (عمرانی، EPC، تأمین کالا و ...)" color="#4f46e5" />
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <SimpleEntityList queryKey="project-types" endpoint="/project-types/" title="انواع پروژه"
        color="#6366f1" icon={<span style={{ fontSize: 14, color: '#fff' }}>P</span>}
        fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'عنوان' }]} />
    </Paper>
  </Box>
);

export default ProjectTypesPage;
