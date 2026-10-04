import React from 'react';
import { Box, Paper, Grid } from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import { SimpleEntityList, glassPaper, PageHeader } from './projects/ProjectsShared';

const ProjectsResourcesPage = () => (
  <Box>
    <PageHeader icon={<Inventory2Icon sx={{ color: '#fff', fontSize: 28 }} />}
      title="منابع (RBS)" subtitle="دسته‌بندی و تعریف منابع پروژه (مصالح، نیروی انسانی، ماشین‌آلات و ...)" color="#047857"
      gradient="#10b981,#3b82f6" />
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ ...glassPaper, p: 2 }}>
          <SimpleEntityList queryKey="resource-categories" endpoint="/resource-categories/" title="دسته منابع"
            color="#10b981" icon={<span style={{ fontSize: 14, color: '#fff' }}>R</span>}
            fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'عنوان' }]} />
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}>
        <Paper sx={{ ...glassPaper, p: 2 }}>
          <SimpleEntityList queryKey="resources" endpoint="/resources/" title="منابع"
            color="#0ea5e9" icon={<span style={{ fontSize: 14, color: '#fff' }}>M</span>}
            fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام' }, { key: 'unit', label: 'واحد' }]} />
        </Paper>
      </Grid>
    </Grid>
  </Box>
);

export default ProjectsResourcesPage;
