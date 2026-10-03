import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab, Divider, IconButton, Tooltip, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DescriptionIcon from '@mui/icons-material/Description';
import BlockIcon from '@mui/icons-material/Block';
import RestoreIcon from '@mui/icons-material/Restore';
import AddIcon from '@mui/icons-material/Add';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';

const STAGE_LABELS = {
  applied: 'دریافت رزومه',
  screening: 'غربالگری',
  interview: 'مصاحبه',
  assessment: 'ارزیابی فنی',
  offer: 'پیشنهاد همکاری',
  hired: 'استخدام شده',
  rejected: 'رد شده',
};

const STAGE_COLORS = {
  applied: '#64748b', screening: '#0ea5e9', interview: '#f59e0b',
  assessment: '#8b5cf6', offer: '#10b981', hired: '#16a34a', rejected: '#ef4444',
};

const STAGE_FLOW = ['applied', 'screening', 'interview', 'assessment', 'offer', 'hired'];

const REQ_STATUS = { draft: 'پیش‌نویس', open: 'باز', on_hold: 'متوقف', closed: 'بسته' };
const REQ_STATUS_COLORS = { draft: '#64748b', open: '#10b981', on_hold: '#f59e0b', closed: '#ef4444' };
const OUTCOME = { pass: 'قبول', fail: 'رد', pending: 'در انتظار' };
const OUTCOME_COLORS = { pass: '#10b981', fail: '#ef4444', pending: '#f59e0b' };

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.6)',
    transition: 'all 0.2s ease',
    '&:hover': { background: 'rgba(255,255,255,0.85)' },
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(14,165,233,0.12)' },
  },
};

const emptyForm = { title: '', headcount: 1, department: '', job_title: '', work_location: '', reason: '', responsibilities: '', requirements: '', requested_by: '', requested_date: '', budget_salary: '', status: 'open' };
const emptyCand = { requisition: '', first_name: '', last_name: '', national_id: '', mobile: '', email: '', stage: 'applied', rating: 0, source: '', expected_salary: '', notes: '' };
const emptyInterview = { candidate: '', interviewer: '', interview_date: '', outcome: 'pending', score: 0, comments: '' };

const RecruitmentPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [openReq, setOpenReq] = useState(false);
  const [reqForm, setReqForm] = useState(emptyForm);
  const [openCand, setOpenCand] = useState(false);
  const [candForm, setCandForm] = useState(emptyCand);
  const [resumeFile, setResumeFile] = useState(null);
  const [openInterview, setOpenInterview] = useState(false);
  const [interviewForm, setInterviewForm] = useState(emptyInterview);
  const [openHire, setOpenHire] = useState(null);
  const [hireForm, setHireForm] = useState({ employee_id: '', hire_date: '', contract_type: '' });

  const { data: reqs, isLoading: reqsLoading } = useQuery({
    queryKey: ['job-requisitions'],
    queryFn: () => axiosInstance.get('/job-requisitions/').then(r => r.data),
  });
  const requisitions = Array.isArray(reqs) ? reqs : reqs?.results || [];

  const { data: candidates, isLoading: candLoading } = useQuery({
    queryKey: ['candidates'],
    queryFn: () => axiosInstance.get('/candidates/').then(r => r.data),
  });
  const candList = Array.isArray(candidates) ? candidates : candidates?.results || [];

  const { data: interviews, isLoading: intLoading } = useQuery({
    queryKey: ['interviews'],
    queryFn: () => axiosInstance.get('/interviews/').then(r => r.data),
  });
  const intList = Array.isArray(interviews) ? interviews : interviews?.results || [];

  const { data: deps } = useQuery({
    queryKey: ['rec-departments'],
    queryFn: () => axiosInstance.get('/departments/').then(r => r.data),
  });
  const depsList = Array.isArray(deps) ? deps : deps?.results || [];

  const { data: titles } = useQuery({
    queryKey: ['rec-job-titles'],
    queryFn: () => axiosInstance.get('/job-titles/').then(r => r.data),
  });
  const titlesList = Array.isArray(titles) ? titles : titles?.results || [];

  const { data: locations } = useQuery({
    queryKey: ['rec-work-locations'],
    queryFn: () => axiosInstance.get('/work-locations/').then(r => r.data),
  });
  const locList = Array.isArray(locations) ? locations : locations?.results || [];

  const createReq = useMutation({
    mutationFn: (payload) => axiosInstance.post('/job-requisitions/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-requisitions'] });
      setOpenReq(false);
      setReqForm(emptyForm);
      setMsg('درخواست استخدام ثبت شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در ثبت درخواست'),
  });

  // Normalize requisition payload: empty FK -> null, numeric coercion.
  const submitReq = () => {
    const p = { ...reqForm };
    ['department', 'job_title', 'work_location'].forEach(k => { if (p[k] === '' || p[k] == null) p[k] = null; });
    p.headcount = Number(p.headcount) || 1;
    if (p.budget_salary === '' || p.budget_salary == null) p.budget_salary = null;
    else p.budget_salary = Number(p.budget_salary);
    if (p.requested_date === '') p.requested_date = null;
    createReq.mutate(p);
  };
  const createCand = useMutation({
    mutationFn: (fd) => axiosInstance.post('/candidates/', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates'] });
      setOpenCand(false);
      setCandForm(emptyCand);
      setResumeFile(null);
      setMsg('کاندید ثبت شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در ثبت کاندید'),
  });

  // Normalize candidate payload into FormData (for optional resume upload).
  const submitCand = () => {
    const fd = new FormData();
    fd.append('requisition', candForm.requisition);
    fd.append('first_name', candForm.first_name);
    fd.append('last_name', candForm.last_name);
    if (candForm.national_id) fd.append('national_id', candForm.national_id);
    if (candForm.mobile) fd.append('mobile', candForm.mobile);
    if (candForm.email) fd.append('email', candForm.email);
    if (candForm.source) fd.append('source', candForm.source);
    if (candForm.expected_salary) fd.append('expected_salary', candForm.expected_salary);
    if (candForm.notes) fd.append('notes', candForm.notes);
    fd.append('stage', candForm.stage || 'applied');
    fd.append('rating', Number(candForm.rating) || 0);
    if (resumeFile) fd.append('resume', resumeFile);
    createCand.mutate(fd);
  };
  const createInterview = useMutation({
    mutationFn: (payload) => axiosInstance.post('/interviews/', payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['candidates'] });
      setOpenInterview(false);
      setInterviewForm(emptyInterview);
      setMsg('مصاحبه ثبت شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در ثبت مصاحبه'),
  });
  const moveStage = useMutation({
    mutationFn: ({ id, stage }) => axiosInstance.post(`/candidates/${id}/move_stage/`, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }),
    onError: (e) => setErr(e.response?.data?.error || 'خطا در تغییر مرحله'),
  });
  const hireCand = useMutation({
    mutationFn: ({ id, payload }) => axiosInstance.post(`/candidates/${id}/hire/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates'] });
      setOpenHire(null);
      setMsg('کاندید استخدام شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در استخدام'),
  });

  const isLoading = reqsLoading || candLoading || intLoading;
  if (isLoading) return <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>;

  const stageCounts = [...STAGE_FLOW, 'rejected'].map(s => ({ stage: s, count: candList.filter(c => c.stage === s).length }));

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(14,165,233,0.10), rgba(139,92,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(14,165,233,0.16)', borderRadius: '10px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', boxShadow: '0 8px 24px rgba(14,165,233,0.35)' }}>
          <WorkOutlineIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#0369a1">جذب و استخدام</Typography>
          <Typography variant="body2" color="textSecondary">درخواست استخدام ← کاندید ← مصاحبه ← استخدام (پایپلاین کامل)</Typography>
        </Box>
      </Paper>

      {(msg || err) && (
        <Alert severity={err ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => { setMsg(''); setErr(''); }}>{err || msg}</Alert>
      )}

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label={`درخواست‌های استخدام (${toPersianDigits(requisitions.length)})`} />
        <Tab label={`وضعیت کاندیدها (${toPersianDigits(candList.length)})`} />
        <Tab label={`مصاحبه‌ها (${toPersianDigits(intList.length)})`} />
      </Tabs>

      {/* ---------- TAB 0: Requisitions ---------- */}
      {tab === 0 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenReq(true)}
              sx={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', borderRadius: '10px' }}>
              درخواست استخدام جدید
            </Button>
          </Box>
          <Paper variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden' }}>
            {requisitions.length === 0 ? (
              <Box sx={{ p: 5, textAlign: 'center' }}><Typography color="textSecondary">درخواستی ثبت نشده است.</Typography></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(14,165,233,0.06)' }}>
                      <TableCell sx={{ fontWeight: 700 }}>عنوان شغلی</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>دپارتمان</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>نیاز</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>وضعیت</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>کاندید</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requisitions.map(r => (
                      <TableRow key={r.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>{r.title}</Typography>
                          <Typography variant="caption" color="textSecondary">{r.job_title_name || ''}</Typography>
                        </TableCell>
                        <TableCell>{r.department_name || '—'}</TableCell>
                        <TableCell>{formatPersianNumber(r.headcount)} نفر</TableCell>
                        <TableCell>
                          <Chip size="small" label={REQ_STATUS[r.status] || r.status}
                            sx={{ bgcolor: `${REQ_STATUS_COLORS[r.status] || '#64748b'}18`, color: REQ_STATUS_COLORS[r.status] || '#64748b', fontWeight: 700, fontSize: 11 }} />
                        </TableCell>
                        <TableCell>{formatPersianNumber(r.candidates_count || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      )}

      {/* ---------- TAB 1: Candidates Kanban ---------- */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1 }}>
            <Paper sx={{ p: 1, borderRadius: '10px', display: 'flex', gap: 1, flexWrap: 'wrap', background: 'rgba(255,255,255,0.6)' }}>
              {stageCounts.map(s => (
                <Chip key={s.stage} label={`${STAGE_LABELS[s.stage]}: ${formatPersianNumber(s.count)}`}
                  sx={{ bgcolor: `${STAGE_COLORS[s.stage]}18`, color: STAGE_COLORS[s.stage], fontWeight: 700 }} />
              ))}
            </Paper>
            <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setOpenCand(true)}
              sx={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', borderRadius: '10px', whiteSpace: 'nowrap' }}>
              کاندید جدید
            </Button>
          </Box>

          <Grid container spacing={1.5} sx={{ alignItems: 'flex-start' }}>
            {[...STAGE_FLOW, 'rejected'].map(stage => {
              const inStage = candList.filter(c => c.stage === stage);
              const isRejected = stage === 'rejected';
              const idx = STAGE_FLOW.indexOf(stage);
              const prevStage = idx > 0 ? STAGE_FLOW[idx - 1] : null;
              const nextStage = idx >= 0 && idx < STAGE_FLOW.length - 1 ? STAGE_FLOW[idx + 1] : null;
              return (
                <Grid item xs={12} sm={6} md={4} lg={2.4} key={stage}>
                  <Paper sx={{ p: 1.25, borderRadius: '12px', minHeight: 220, background: isRejected ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.62)', borderTop: `3px solid ${STAGE_COLORS[stage]}`, border: isRejected ? '1px solid rgba(239,68,68,0.35)' : undefined }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="caption" fontWeight={800} sx={{ color: STAGE_COLORS[stage] }}>
                        {STAGE_LABELS[stage]}
                      </Typography>
                      <Chip size="small" label={toPersianDigits(inStage.length)}
                        sx={{ bgcolor: `${STAGE_COLORS[stage]}18`, color: STAGE_COLORS[stage], fontWeight: 800, fontSize: 11, height: 20 }} />
                    </Box>
                    <Stack spacing={1}>
                      {inStage.map(c => (
                        <Paper key={c.id} variant="outlined" sx={{ p: 1.25, borderRadius: '12px', borderColor: `${STAGE_COLORS[stage]}44`, background: isRejected ? 'rgba(239,68,68,0.04)' : '#fff', boxShadow: '0 2px 8px rgba(100,116,139,0.06)' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: STAGE_COLORS[stage], fontSize: 13, fontWeight: 700 }}>
                              {c.full_name?.charAt(0) || '؟'}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontWeight={700} noWrap sx={isRejected ? { textDecoration: 'line-through', color: '#b91c1c' } : undefined}>{c.full_name}</Typography>
                              {c.source && <Typography variant="caption" color="textSecondary" display="block" noWrap>منبع: {c.source}</Typography>}
                            </Box>
                          </Box>
                          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                            {c.mobile && <Typography variant="caption" color="textSecondary">📞 {toPersianDigits(c.mobile)}</Typography>}
                            {c.email && <Typography variant="caption" color="textSecondary" noWrap>✉️ {c.email}</Typography>}
                            {c.expected_salary && <Typography variant="caption" color="textSecondary">💰 {formatPersianNumber(c.expected_salary)} ریال</Typography>}
                            {c.rating > 0 && <Typography variant="caption" fontWeight={700} sx={{ color: '#f59e0b' }}>⭐ امتیاز: {formatPersianNumber(c.rating)}</Typography>}
                          </Box>
                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            {!isRejected && prevStage && (
                              <Tooltip title={`برگشت به ${STAGE_LABELS[prevStage]}`}>
                                <IconButton size="small" onClick={() => moveStage.mutate({ id: c.id, stage: prevStage })}>
                                  <ArrowBackIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {!isRejected && nextStage && (
                              <Tooltip title={`انتقال به ${STAGE_LABELS[nextStage]}`}>
                                <IconButton size="small" color="primary" onClick={() => moveStage.mutate({ id: c.id, stage: nextStage })}>
                                  <ArrowForwardIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {stage !== 'hired' && stage !== 'rejected' && (
                              <Tooltip title="استخدام">
                                <IconButton size="small" color="success" onClick={() => { setOpenHire(c); setHireForm({ employee_id: '', hire_date: '', contract_type: '' }); }}>
                                  <CheckCircleIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {stage !== 'rejected' && stage !== 'hired' && (
                              <Tooltip title="رد">
                                <IconButton size="small" color="error" onClick={() => moveStage.mutate({ id: c.id, stage: 'rejected' })}>
                                  <BlockIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {isRejected && (
                              <Tooltip title="برگرداندن به مرحله ارزیابی">
                                <IconButton size="small" onClick={() => moveStage.mutate({ id: c.id, stage: 'assessment' })}>
                                  <RestoreIcon fontSize="small" sx={{ color: '#ef4444' }} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Box sx={{ flex: 1 }} />
                            {c.resume_url && (
                              <Tooltip title="مشاهده رزومه">
                                <IconButton size="small" component="a" href={c.resume_url} target="_blank" rel="noreferrer">
                                  <DescriptionIcon fontSize="small" sx={{ color: '#0ea5e9' }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Paper>
                      ))}
                      {inStage.length === 0 && (
                        <Typography variant="caption" color="textSecondary" sx={{ textAlign: 'center', py: 2 }}>—</Typography>
                      )}
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* ---------- TAB 2: Interviews ---------- */}
      {tab === 2 && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenInterview(true)}
              sx={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', borderRadius: '10px' }}>
              مصاحبه جدید
            </Button>
          </Box>
          <Paper variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden' }}>
            {intList.length === 0 ? (
              <Box sx={{ p: 5, textAlign: 'center' }}><Typography color="textSecondary">مصاحبه‌ای ثبت نشده است.</Typography></Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(14,165,233,0.06)' }}>
                      <TableCell sx={{ fontWeight: 700 }}>کاندید</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>مصاحبه‌کننده</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>زمان</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>نتیجه</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>امتیاز</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {intList.map(i => (
                      <TableRow key={i.id} hover>
                        <TableCell>{i.candidate_full_name || i.candidate}</TableCell>
                        <TableCell>{i.interviewer || '—'}</TableCell>
                        <TableCell>{i.interview_date ? toJalali(i.interview_date) : '—'}</TableCell>
                        <TableCell>
                          <Chip size="small" label={OUTCOME[i.outcome] || i.outcome}
                            sx={{ bgcolor: `${OUTCOME_COLORS[i.outcome] || '#64748b'}18`, color: OUTCOME_COLORS[i.outcome] || '#64748b', fontWeight: 700, fontSize: 11 }} />
                        </TableCell>
                        <TableCell>{i.score ? formatPersianNumber(i.score) : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      )}

      {/* New requisition dialog */}
      <Dialog open={openReq} onClose={() => setOpenReq(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#0369a1', fontWeight: 800, borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
          درخواست استخدام جدید
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {/* اطلاعات پایه */}
            <Typography variant="subtitle2" fontWeight={800} color="#0369a1">اطلاعات پایه</Typography>
            <TextField fullWidth size="small" label="عنوان شغلی *" value={reqForm.title} sx={fieldSx}
              onChange={e => setReqForm(p => ({ ...p, title: e.target.value }))} />
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>دپارتمان</InputLabel>
                  <Select value={reqForm.department} label="دپارتمان" onChange={e => setReqForm(p => ({ ...p, department: e.target.value }))}>
                    <MenuItem value=""><em>—</em></MenuItem>
                    {depsList.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>عنوان سازمانی</InputLabel>
                  <Select value={reqForm.job_title} label="عنوان سازمانی" onChange={e => setReqForm(p => ({ ...p, job_title: e.target.value }))}>
                    <MenuItem value=""><em>—</em></MenuItem>
                    {titlesList.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>محل خدمت</InputLabel>
                  <Select value={reqForm.work_location} label="محل خدمت" onChange={e => setReqForm(p => ({ ...p, work_location: e.target.value }))}>
                    <MenuItem value=""><em>—</em></MenuItem>
                    {locList.map(l => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth size="small" label="تعداد نیرو *" type="number" value={reqForm.headcount} sx={fieldSx}
                  onChange={e => setReqForm(p => ({ ...p, headcount: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth size="small" label="سقف حقوق (ریال)" type="number" value={reqForm.budget_salary} sx={fieldSx}
                  onChange={e => setReqForm(p => ({ ...p, budget_salary: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>وضعیت</InputLabel>
                  <Select value={reqForm.status} label="وضعیت" onChange={e => setReqForm(p => ({ ...p, status: e.target.value }))}>
                    {Object.keys(REQ_STATUS).map(k => <MenuItem key={k} value={k}>{REQ_STATUS[k]}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="درخواست‌دهنده" value={reqForm.requested_by} sx={fieldSx}
                  onChange={e => setReqForm(p => ({ ...p, requested_by: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={6}>
                <JalaliDatePicker fullWidth label="تاریخ درخواست" value={reqForm.requested_date}
                  onChange={v => setReqForm(p => ({ ...p, requested_date: v }))} />
              </Grid>
            </Grid>

            <Divider />

            {/* توضیحات */}
            <Typography variant="subtitle2" fontWeight={800} color="#0369a1">جزئیات شغل</Typography>
            <TextField fullWidth size="small" label="دلیل استخدام" multiline rows={2} value={reqForm.reason} sx={fieldSx}
              onChange={e => setReqForm(p => ({ ...p, reason: e.target.value }))} />
            <TextField fullWidth size="small" label="شرح وظایف" multiline rows={3} value={reqForm.responsibilities} sx={fieldSx}
              onChange={e => setReqForm(p => ({ ...p, responsibilities: e.target.value }))} />
            <TextField fullWidth size="small" label="شرایط احراز" multiline rows={3} value={reqForm.requirements} sx={fieldSx}
              onChange={e => setReqForm(p => ({ ...p, requirements: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenReq(false)}>انصراف</Button>
          <Button variant="contained" disabled={!reqForm.title} onClick={submitReq}
            sx={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', borderRadius: '10px', px: 3 }}>
            ثبت درخواست
          </Button>
        </DialogActions>
      </Dialog>

      {/* New candidate dialog */}
      <Dialog open={openCand} onClose={() => setOpenCand(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#0369a1', fontWeight: 800, borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
          کاندید جدید
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight={800} color="#0369a1">مشخصات فردی</Typography>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel>درخواست استخدام *</InputLabel>
              <Select value={candForm.requisition} label="درخواست استخدام *" onChange={e => setCandForm(p => ({ ...p, requisition: e.target.value }))}>
                {requisitions.map(r => <MenuItem key={r.id} value={r.id}>{r.title}</MenuItem>)}
              </Select>
            </FormControl>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="نام *" value={candForm.first_name} sx={fieldSx}
                  onChange={e => setCandForm(p => ({ ...p, first_name: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="نام خانوادگی *" value={candForm.last_name} sx={fieldSx}
                  onChange={e => setCandForm(p => ({ ...p, last_name: e.target.value }))} />
              </Grid>
            </Grid>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth size="small" label="کد ملی" value={candForm.national_id} sx={fieldSx}
                  onChange={e => setCandForm(p => ({ ...p, national_id: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth size="small" label="موبایل" value={candForm.mobile} sx={fieldSx}
                  onChange={e => setCandForm(p => ({ ...p, mobile: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth size="small" label="ایمیل" value={candForm.email} sx={fieldSx}
                  onChange={e => setCandForm(p => ({ ...p, email: e.target.value }))} />
              </Grid>
            </Grid>

            <Divider />

            <Typography variant="subtitle2" fontWeight={800} color="#0369a1">اطلاعات شغلی</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth size="small" label="منبع جذب" value={candForm.source} sx={fieldSx}
                  onChange={e => setCandForm(p => ({ ...p, source: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth size="small" label="حقوق پیشنهادی (ریال)" type="number" value={candForm.expected_salary} sx={fieldSx}
                  onChange={e => setCandForm(p => ({ ...p, expected_salary: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>مرحله</InputLabel>
                  <Select value={candForm.stage} label="مرحله" onChange={e => setCandForm(p => ({ ...p, stage: e.target.value }))}>
                    {Object.keys(STAGE_LABELS).map(k => <MenuItem key={k} value={k}>{STAGE_LABELS[k]}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="امتیاز (۰-۱۰۰)" type="number" value={candForm.rating} sx={fieldSx}
                  onChange={e => setCandForm(p => ({ ...p, rating: e.target.value }))} />
              </Grid>
            </Grid>

            <Divider />

            <Typography variant="subtitle2" fontWeight={800} color="#0369a1">رزومه و یادداشت</Typography>
            <Box>
              <Button variant="outlined" component="label" startIcon={<DescriptionIcon />}
                sx={{ borderRadius: '10px', textTransform: 'none', mb: resumeFile ? 1 : 0 }}>
                {resumeFile ? 'تغییر فایل رزومه' : 'الصاق رزومه'}
                <input type="file" hidden accept=".pdf,.doc,.docx,.jpg,.png,.jpeg"
                  onChange={e => setResumeFile(e.target.files[0] || null)} />
              </Button>
              {resumeFile && (
                <Chip size="small" label={resumeFile.name} onDelete={() => setResumeFile(null)}
                  sx={{ fontWeight: 600, mt: 0.5 }} />
              )}
            </Box>
            <TextField fullWidth size="small" label="یادداشت" multiline rows={3} value={candForm.notes} sx={fieldSx}
              onChange={e => setCandForm(p => ({ ...p, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCand(false)}>انصراف</Button>
          <Button variant="contained" disabled={!candForm.requisition || !candForm.first_name || !candForm.last_name}
            onClick={submitCand}
            sx={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', borderRadius: '10px', px: 3 }}>
            ثبت کاندید
          </Button>
        </DialogActions>
      </Dialog>
      {/* New interview dialog */}
      <Dialog open={openInterview} onClose={() => setOpenInterview(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#0369a1' }}>مصاحبه جدید</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl fullWidth size="small" sx={fieldSx}>
            <InputLabel>کاندید *</InputLabel>
            <Select value={interviewForm.candidate} label="کاندید *" onChange={e => setInterviewForm(p => ({ ...p, candidate: e.target.value }))}>
              {candList.map(c => <MenuItem key={c.id} value={c.id}>{c.full_name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth size="small" label="مصاحبه‌کننده" value={interviewForm.interviewer} sx={fieldSx}
            onChange={e => setInterviewForm(p => ({ ...p, interviewer: e.target.value }))} />
          <TextField fullWidth size="small" label="زمان مصاحبه" type="datetime-local" value={interviewForm.interview_date}
            sx={fieldSx} InputLabelProps={{ shrink: true }}
            onChange={e => setInterviewForm(p => ({ ...p, interview_date: e.target.value }))} />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel>نتیجه</InputLabel>
              <Select value={interviewForm.outcome} label="نتیجه" onChange={e => setInterviewForm(p => ({ ...p, outcome: e.target.value }))}>
                {Object.keys(OUTCOME).map(k => <MenuItem key={k} value={k}>{OUTCOME[k]}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth size="small" label="امتیاز (۰-۱۰۰)" type="number" value={interviewForm.score} sx={fieldSx}
              onChange={e => setInterviewForm(p => ({ ...p, score: e.target.value }))} />
          </Stack>
          <TextField fullWidth size="small" label="نظرات" multiline rows={2} value={interviewForm.comments} sx={fieldSx}
            onChange={e => setInterviewForm(p => ({ ...p, comments: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInterview(false)}>انصراف</Button>
          <Button variant="contained" disabled={!interviewForm.candidate} onClick={() => createInterview.mutate(interviewForm)}
            sx={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)' }}>ثبت</Button>
        </DialogActions>
      </Dialog>

      {/* Hire candidate dialog */}
      <Dialog open={!!openHire} onClose={() => setOpenHire(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#047857' }}>استخدام کاندید «{openHire?.full_name}»</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="شماره پرسنلی" value={hireForm.employee_id} sx={fieldSx}
            onChange={e => setHireForm(p => ({ ...p, employee_id: e.target.value }))} />
          <TextField fullWidth size="small" label="تاریخ استخدام" type="date" value={hireForm.hire_date}
            sx={fieldSx} InputLabelProps={{ shrink: true }}
            onChange={e => setHireForm(p => ({ ...p, hire_date: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHire(null)}>انصراف</Button>
          <Button variant="contained" onClick={() => hireCand.mutate({ id: openHire.id, payload: hireForm })}
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>استخدام</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecruitmentPage;