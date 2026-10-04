import React from 'react';
import { Box, Paper } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { SimpleEntityList, glassPaper, PageHeader } from './projects/ProjectsShared';

const ProjectsOBSPage = () => (
  <Box>
    <PageHeader icon={<AdminPanelSettingsIcon sx={{ color: '#fff', fontSize: 28 }} />}
      title="ساختار شکست سازمانی (OBS)" subtitle="تعیین مسئولیت‌ها و نقش‌های پروژه" color="#b91c1c"
      gradient="#ef4444,#8b5cf6" />
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <SimpleEntityList queryKey="obs-nodes" endpoint="/obs-nodes/" title="گره‌های OBS"
        color="#ef4444" icon={<span style={{ fontSize: 14, color: '#fff' }}>O</span>}
        fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام' }]} />
    </Paper>
  </Box>
);

export default ProjectsOBSPage;
