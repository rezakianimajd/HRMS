import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Alert, Box, Button, Chip, FormControl, Grid, InputLabel, MenuItem, Paper,
  Select, Stack, Typography,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import { SimpleEntityList, glassPaper, PageHeader } from './projects/ProjectsShared';
import { toPersianDigits } from '../core/utils/numberUtils';

const ProjectsStructurePage = () => {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [mode, setMode] = useState('append');
  const [message, setMessage] = useState(null);

  const { data: projects } = useQuery({
    queryKey: ['projects-structure'],
    queryFn: () => axiosInstance.get('/projects/', { params: { page_size: 500 } }).then(r => r.data),
  });
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];

  const { data: templates } = useQuery({
    queryKey: ['wbs-templates-structure'],
    queryFn: () => axiosInstance.get('/wbs-templates/', { params: { page_size: 200 } }).then(r => r.data),
  });
  const templateList = Array.isArray(templates) ? templates : templates?.results || [];

  const apply = useMutation({
    mutationFn: (payload) => axiosInstance
      .post(`/projects/${projectId}/apply-wbs-template/`, payload)
      .then(r => r.data),
    onSuccess: (data) => {
      setMessage({
        type: 'success',
        text: `قالب «${data.template}» اعمال شد — ${toPersianDigits(data.created)} گرهٔ جدید، `
          + `${toPersianDigits(data.updated)} گره به‌روزرسانی شد.`,
      });
      qc.invalidateQueries({ queryKey: ['wbs-nodes'] });
    },
    onError: (err) => setMessage({
      type: 'error',
      text: err?.response?.data?.detail || 'اعمال قالب WBS ناموفق بود.',
    }),
  });

  const selectedTemplate = templateList.find(t => t.id === Number(templateId));

  return (
    <Box>
      <PageHeader icon={<AccountTreeIcon sx={{ color: '#fff', fontSize: 28 }} />}
        title="ساختار شکست (WBS / CBS)" subtitle="ساختار شکست کار (WBS) و ساختار شکست هزینه (CBS)" color="#6d28d9" />
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
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
                {projectList.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.code} — {p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {projectId ? (
              <Box>
                <Paper sx={{
                  p: 1.5, mb: 1.5, borderRadius: '12px',
                  background: 'linear-gradient(120deg, rgba(139,92,246,0.10), rgba(14,165,233,0.06))',
                  border: '1px solid rgba(139,92,246,0.18)',
                }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <PlaylistAddCheckIcon sx={{ color: '#6d28d9' }} />
                    <Typography variant="subtitle2" fontWeight={800} color="#5b21b6">
                      ساخت ساختار پروژه از قالب WBS
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    {selectedTemplate ? (
                      <Chip size="small" label={`${toPersianDigits(selectedTemplate.nodes_count || 0)} گره`}
                        sx={{ fontWeight: 700, bgcolor: 'rgba(139,92,246,0.12)', color: '#5b21b6' }} />
                    ) : null}
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>قالب WBS</InputLabel>
                      <Select value={templateId || ''} label="قالب WBS"
                        onChange={e => { setTemplateId(e.target.value); setMessage(null); }}>
                        <MenuItem value="">— انتخاب قالب —</MenuItem>
                        {templateList.map(t => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.name} ({toPersianDigits(t.nodes_count || 0)} گره)
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 175 }}>
                      <InputLabel>حالت</InputLabel>
                      <Select value={mode} label="حالت" onChange={e => setMode(e.target.value)}>
                        <MenuItem value="append">افزودن به ساختار موجود</MenuItem>
                        <MenuItem value="replace">جایگزینی ساختار فعلی</MenuItem>
                      </Select>
                    </FormControl>
                    <Button variant="contained" disabled={!templateId || apply.isPending}
                      onClick={() => apply.mutate({ template: Number(templateId), mode })}
                      sx={{
                        borderRadius: '12px', whiteSpace: 'nowrap',
                        background: 'linear-gradient(135deg,#8b5cf6,#0ea5e9)',
                      }}>
                      اعمال قالب
                    </Button>
                  </Stack>
                  {message ? (
                    <Alert severity={message.type} sx={{ mt: 1.25, borderRadius: '10px' }}
                      onClose={() => setMessage(null)}>
                      {message.text}
                    </Alert>
                  ) : null}
                </Paper>

                <SimpleEntityList queryKey="wbs-nodes" endpoint="/wbs-nodes/" title="ساختار شکست کار (WBS)"
                color="#8b5cf6" icon={<span style={{ fontSize: 14, color: '#fff' }}>W</span>}
                params={{ project: projectId }}
                fields={[{ key: 'code', label: 'کد' }, { key: 'name', label: 'نام' }]} />
              </Box>
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
