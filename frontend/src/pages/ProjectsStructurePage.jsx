import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Paper, Grid, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { SimpleEntityList, glassPaper, PageHeader } from './projects/ProjectsShared';

const ProjectsStructurePage = () => {
  const [projectId, setProjectId] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['projects-structure'],
    queryFn: () => axiosInstance.get('/projects/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];

  return (
    <Box>
      <PageHeader icon={<AccountTreeIcon sx={{ color: '#fff', fontSize: 28 }} />}
        title="ساختار شکست (WBS / CBS)" subtitle="ساختار شکست کار (WBS) و ساختار شکست هزینه (CBS)" color="#6d28d9" />
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ ...glassPaper, p: 2 }}>
            <SimpleEntityList queryKey="cbs-tree" endpoint="/cbs-nodes/" title="ساختار شکست هزینه (CBS)"
              color="#0ea5e9" icon={<span style={{ fontSize: 14, color: '#fff' }}>C</span>}
              fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام' }]} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ ...glassPaper, p: 2 }}>
            <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
              <InputLabel>پروژه</InputLabel>
              <Select value={projectId || ''} label="پروژه" onChange={e => setProjectId(e.target.value)}>
                <MenuItem value="">— همه —</MenuItem>
                {projectList.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
              </Select>
            </FormControl>
            {projectId ? (
              <SimpleEntityList queryKey="wbs-nodes" endpoint="/wbs-nodes/" title="ساختار شکست کار (WBS)"
                color="#8b5cf6" icon={<span style={{ fontSize: 14, color: '#fff' }}>W</span>}
                params={{ project: projectId }}
                fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام' }]} />
            ) : (
              <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary', fontSize: 14 }}>
                برای مشاهده و مدیریت گره‌های WBS یک پروژه را انتخاب کنید.
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProjectsStructurePage;
