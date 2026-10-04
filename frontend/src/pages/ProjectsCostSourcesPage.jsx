import React from 'react';
import { Box, Paper } from '@mui/material';
import NumbersIcon from '@mui/icons-material/Numbers';
import { SimpleEntityList, glassPaper, PageHeader } from './projects/ProjectsShared';

const ProjectsCostSourcesPage = () => (
  <Box>
    <PageHeader icon={<NumbersIcon sx={{ color: '#fff', fontSize: 28 }} />}
      title="منشأ هزینه" subtitle="منابع شکل‌گیری رویداد هزینه (قرارداد، انبار، حقوق و ...)" color="#b45309"
      gradient="#f59e0b,#ef4444" />
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <SimpleEntityList queryKey="cost-sources" endpoint="/cost-sources/" title="منشأ هزینه"
        color="#f59e0b" icon={<span style={{ fontSize: 14, color: '#fff' }}>$</span>}
        fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'عنوان' }]} />
    </Paper>
  </Box>
);

export default ProjectsCostSourcesPage;
