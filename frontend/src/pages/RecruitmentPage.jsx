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
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
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
const emptyInterview = { candidate: '', interviewer: '', interview_date: '', interview_time: '', outcome: 'pending', score: 0, comments: '' };

const RecruitmentPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [openReq, setOpenReq] = useState(false);
  const [reqForm, setReqForm] = useState(emptyForm);
  const [editReqId, setEditReqId] = useState(null);
  const [viewReq, setViewReq] = useState(null);
  const [deleteReqId, setDeleteReqId] = useState(null);
  const [openCand, setOpenCand] = useState(false);
  const [candForm, setCandForm] = useState(emptyCand);
  const [resumeFile, setResumeFile] = useState(null);
  const [openInterview, setOpenInterview] = useState(false);
  const [interviewForm, setInterviewForm] = useState(emptyInterview);
  const [editInterviewId, setEditInterviewId] = useState(null);
  const [viewInterview, setViewInterview] = useState(null);
  const [deleteInterviewId, setDeleteInterviewId] = useState(null);
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

  const updateReq = useMutation({
    mutationFn: ({ id, payload }) => axiosInstance.patch(`/job-requisitions/${id}/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-requisitions'] });
      setOpenReq(false);
      setEditReqId(null);
      setReqForm(emptyForm);
      setMsg('درخواست استخدام ویرایش شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در ویرایش درخواست'),
  });

  const deleteReq = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/job-requisitions/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-requisitions'] });
      qc.invalidateQueries({ queryKey: ['candidates'] });
      setDeleteReqId(null);
      setMsg('درخواست استخدام حذف شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در حذف درخواست'),
  });

  // Normalize requisition payload: empty FK -> null, numeric coercion.
  const submitReq = () => {
    const p = { ...reqForm };
    ['department', 'job_title', 'work_location'].forEach(k => { if (p[k] === '' || p[k] == null) p[k] = null; });
    p.headcount = Number(p.headcount) || 1;
    if (p.budget_salary === '' || p.budget_salary == null) p.budget_salary = null;
    else p.budget_salary = Number(p.budget_salary);
    if (p.requested_date === '') p.requested_date = null;
    if (editReqId) updateReq.mutate({ id: editReqId, payload: p });
    else createReq.mutate(p);
  };

  const openEditReq = (r) => {
    setEditReqId(r.id);
    setReqForm({
      title: r.title || '',
      headcount: r.headcount ?? 1,
      department: r.department ?? '',
      job_title: r.job_title ?? '',
      work_location: r.work_location ?? '',
      reason: r.reason || '',
      responsibilities: r.responsibilities || '',
      requirements: r.requirements || '',
      requested_by: r.requested_by || '',
      requested_date: r.requested_date || '',
      budget_salary: r.budget_salary ?? '',
      status: r.status || 'open',
    });
    setOpenReq(true);
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
      setEditInterviewId(null);
      setInterviewForm(emptyInterview);
      setMsg('مصاحبه ثبت شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در ثبت مصاحبه'),
  });

  const updateInterview = useMutation({
    mutationFn: ({ id, payload }) => axiosInstance.patch(`/interviews/${id}/`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['candidates'] });
      setOpenInterview(false);
      setEditInterviewId(null);
      setInterviewForm(emptyInterview);
      setMsg('مصاحبه ویرایش شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در ویرایش مصاحبه'),
  });

  const deleteInterview = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/interviews/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['candidates'] });
      setDeleteInterviewId(null);
      setMsg('مصاحبه حذف شد.');
      setTimeout(() => setMsg(''), 2500);
    },
    onError: (e) => setErr(e.response?.data?.error || 'خطا در حذف مصاحبه'),
  });

  // Normalize interview payload: combine Jalali date + time into ISO datetime.
  const submitInterview = () => {
    const p = { ...interviewForm };
    if (p.candidate === '' || p.candidate == null) p.candidate = null;
    p.score = Number(p.score) || 0;
    if (p.interview_date && p.interview_time) {
      p.interview_date = `${p.interview_date}T${p.interview_time}`;
    } else if (!p.interview_date) {
      p.interview_date = null;
    }
    delete p.interview_time;
    if (editInterviewId) updateInterview.mutate({ id: editInterviewId, payload: p });
    else createInterview.mutate(p);
  };

  const openEditInterview = (it) => {
    setEditInterviewId(it.id);
    const [datePart, timePart] = (it.interview_date || '').split('T');
    setInterviewForm({
      candidate: it.candidate ?? '',
      interviewer: it.interviewer || '',
      interview_date: datePart || '',
      interview_time: timePart ? timePart.slice(0, 5) : '',
      outcome: it.outcome || 'pending',
      score: it.score ?? 0,
      comments: it.comments || '',
    });
    setOpenInterview(true);
  };

  const candById = (id) => candList.find(c => c.id === id) || null;

  const formatDateTime = (dt) => {
    if (!dt) return '—';
    const [datePart, timePart] = String(dt).split('T');
    const jalali = toJalali(datePart);
    const time = timePart ? timePart.slice(0, 5) : '';
    return time ? `${jalali} · ${toPersianDigits(time)}` : jalali;
  };
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
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditReqId(null); setReqForm(emptyForm); setOpenReq(true); }}
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
                      <TableCell sx={{ fontWeight: 700 }}>عملیات</TableCell>
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
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.25 }}>
                            <Tooltip title="مشاهده جزئیات">
                              <IconButton size="small" color="info" onClick={() => setViewReq(r)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="ویرایش">
                              <IconButton size="small" color="primary" onClick={() => openEditReq(r)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton size="small" color="error" onClick={() => setDeleteReqId(r.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
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
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditInterviewId(null); setInterviewForm(emptyInterview); setOpenInterview(true); }}
              sx={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', borderRadius: '10px', whiteSpace: 'nowrap' }}>
              مصاحبه جدید
            </Button>
            <Paper sx={{ p: 1, borderRadius: '10px', display: 'flex', gap: 1, flexWrap: 'wrap', background: 'rgba(255,255,255,0.6)' }}>
              <Chip size="small" icon={<CalendarMonthIcon fontSize="small" />} label={`کل: ${formatPersianNumber(intList.length)}`} sx={{ fontWeight: 700 }} />
              <Chip size="small" label={`قبول: ${formatPersianNumber(intList.filter(i => i.outcome === 'pass').length)}`} sx={{ bgcolor: '#10b98118', color: '#10b981', fontWeight: 700 }} />
              <Chip size="small" label={`رد: ${formatPersianNumber(intList.filter(i => i.outcome === 'fail').length)}`} sx={{ bgcolor: '#ef444418', color: '#ef4444', fontWeight: 700 }} />
              <Chip size="small" label={`در انتظار: ${formatPersianNumber(intList.filter(i => i.outcome === 'pending').length)}`} sx={{ bgcolor: '#f59e0b18', color: '#f59e0b', fontWeight: 700 }} />
            </Paper>
          </Box>

          {intList.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 6, textAlign: 'center', borderRadius: '10px' }}>
              <CalendarMonthIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1.5 }} />
              <Typography color="textSecondary">مصاحبه‌ای ثبت نشده است.</Typography>
            </Paper>
          ) : (
            <Grid container spacing={1.5}>
              {intList.map(i => {
                const cand = candById(i.candidate);
                return (
                  <Grid item xs={12} sm={6} md={4} key={i.id}>
                    <Paper variant="outlined" sx={{ p: 1.75, borderRadius: '14px', borderColor: `${OUTCOME_COLORS[i.outcome] || '#64748b'}44`, borderTop: `3px solid ${OUTCOME_COLORS[i.outcome] || '#64748b'}`, background: 'rgba(255,255,255,0.65)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Avatar sx={{ width: 44, height: 44, bgcolor: OUTCOME_COLORS[i.outcome] || '#64748b', fontWeight: 800, fontSize: 17 }}>
                          {(i.candidate_full_name || '؟').charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body1" fontWeight={800} noWrap>{i.candidate_full_name || `کاندید #${i.candidate}`}</Typography>
                          {cand && (
                            <Chip size="small" label={STAGE_LABELS[cand.stage] || cand.stage}
                              sx={{ bgcolor: `${STAGE_COLORS[cand.stage] || '#64748b'}18`, color: STAGE_COLORS[cand.stage] || '#64748b', fontWeight: 700, fontSize: 10, height: 18, mt: 0.25 }} />
                          )}
                        </Box>
                        <Chip size="small" label={OUTCOME[i.outcome] || i.outcome}
                          sx={{ bgcolor: `${OUTCOME_COLORS[i.outcome] || '#64748b'}18`, color: OUTCOME_COLORS[i.outcome] || '#64748b', fontWeight: 700, fontSize: 11 }} />
                      </Box>
                      <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <PersonIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                          <Typography variant="caption" color="textSecondary">مصاحبه‌کننده: {i.interviewer || '—'}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <ScheduleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                          <Typography variant="caption" color="textSecondary">{formatDateTime(i.interview_date)}</Typography>
                        </Box>
                        {i.score > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: '#f59e0b' }}>⭐ امتیاز: {formatPersianNumber(i.score)}</Typography>
                          </Box>
                        )}
                      </Box>
                      {i.comments && (
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {i.comments}
                        </Typography>
                      )}
                      <Box sx={{ mt: 1.25, display: 'flex', gap: 0.25, borderTop: '1px dashed rgba(100,116,139,0.2)', pt: 1 }}>
                        <Tooltip title="مشاهده جزئیات">
                          <IconButton size="small" color="info" onClick={() => setViewInterview(i)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ویرایش">
                          <IconButton size="small" color="primary" onClick={() => openEditInterview(i)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error" onClick={() => setDeleteInterviewId(i.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* New/Edit requisition dialog */}
      <Dialog open={openReq} onClose={() => { setOpenReq(false); setEditReqId(null); setReqForm(emptyForm); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#0369a1', fontWeight: 800, borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
          {editReqId ? 'ویرایش درخواست استخدام' : 'درخواست استخدام جدید'}
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
          <Button onClick={() => { setOpenReq(false); setEditReqId(null); setReqForm(emptyForm); }}>انصراف</Button>
          <Button variant="contained" disabled={!reqForm.title} onClick={submitReq}
            sx={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', borderRadius: '10px', px: 3 }}>
            {editReqId ? 'ذخیره تغییرات' : 'ثبت درخواست'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View requisition dialog */}
      <Dialog open={!!viewReq} onClose={() => setViewReq(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#0369a1', fontWeight: 800, borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
          جزئیات درخواست استخدام
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {viewReq && (
            <Stack spacing={2.5}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Typography variant="h6" fontWeight={800} color="#0369a1">{viewReq.title}</Typography>
                <Chip size="small" label={REQ_STATUS[viewReq.status] || viewReq.status}
                  sx={{ bgcolor: `${REQ_STATUS_COLORS[viewReq.status] || '#64748b'}18`, color: REQ_STATUS_COLORS[viewReq.status] || '#64748b', fontWeight: 700, fontSize: 11 }} />
                <Chip size="small" variant="outlined" label={`${formatPersianNumber(viewReq.candidates_count || 0)} کاندید`}
                  sx={{ fontWeight: 700, fontSize: 11 }} />
              </Box>
              <Grid container spacing={1.5}>
                {[
                  { label: 'دپارتمان', value: viewReq.department_name || '—' },
                  { label: 'عنوان سازمانی', value: viewReq.job_title_name || '—' },
                  { label: 'محل خدمت', value: locList.find(l => l.id === viewReq.work_location)?.name || '—' },
                  { label: 'تعداد نیرو', value: `${formatPersianNumber(viewReq.headcount)} نفر` },
                  { label: 'سقف حقوق', value: viewReq.budget_salary ? `${formatPersianNumber(viewReq.budget_salary)} ریال` : '—' },
                  { label: 'درخواست‌دهنده', value: viewReq.requested_by || '—' },
                  { label: 'تاریخ درخواست', value: toJalali(viewReq.requested_date) },
                ].map(f => (
                  <Grid item xs={12} sm={6} key={f.label}>
                    <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
                      <Typography variant="caption" color="textSecondary" display="block">{f.label}</Typography>
                      <Typography variant="body2" fontWeight={700}>{f.value}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              <Divider />
              <Box>
                <Typography variant="subtitle2" fontWeight={800} color="#0369a1" mb={0.5}>دلیل استخدام</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewReq.reason || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={800} color="#0369a1" mb={0.5}>شرح وظایف</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewReq.responsibilities || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={800} color="#0369a1" mb={0.5}>شرایط احراز</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewReq.requirements || '—'}</Typography>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setViewReq(null)}
            sx={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', borderRadius: '10px', px: 3 }}>بستن</Button>
        </DialogActions>
      </Dialog>

      {/* Delete requisition confirm dialog */}
      <Dialog open={!!deleteReqId} onClose={() => setDeleteReqId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#b91c1c', fontWeight: 800 }}>حذف درخواست استخدام</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ lineHeight: 1.8 }}>
            آیا از حذف این درخواست استخدام اطمینان دارید؟
            <Box component="span" sx={{ display: 'block', mt: 1, color: 'error.main', fontWeight: 700 }}>
              توجه: کاندیدها و مصاحبه‌های مرتبط با این درخواست نیز حذف خواهند شد.
            </Box>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteReqId(null)}>انصراف</Button>
          <Button variant="contained" color="error" onClick={() => deleteReq.mutate(deleteReqId)}>حذف</Button>
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
      {/* New/Edit interview dialog */}
      <Dialog open={openInterview} onClose={() => { setOpenInterview(false); setEditInterviewId(null); setInterviewForm(emptyInterview); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#0369a1', fontWeight: 800, borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
          {editInterviewId ? 'ویرایش مصاحبه' : 'مصاحبه جدید'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <Typography variant="subtitle2" fontWeight={800} color="#0369a1">کاندید</Typography>
            <FormControl fullWidth size="small" sx={fieldSx}>
              <InputLabel>کاندید *</InputLabel>
              <Select value={interviewForm.candidate} label="کاندید *" onChange={e => setInterviewForm(p => ({ ...p, candidate: e.target.value }))}>
                {candList.map(c => <MenuItem key={c.id} value={c.id}>{c.full_name}</MenuItem>)}
              </Select>
            </FormControl>
            {candById(interviewForm.candidate) && (() => {
              const sel = candById(interviewForm.candidate);
              return (
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: '12px', background: 'rgba(14,165,233,0.05)', borderColor: 'rgba(14,165,233,0.25)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
                    <Avatar sx={{ width: 40, height: 40, bgcolor: STAGE_COLORS[sel.stage] || '#0ea5e9', fontWeight: 800 }}>
                      {sel.full_name?.charAt(0) || '؟'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={800}>{sel.full_name}</Typography>
                      <Chip size="small" label={STAGE_LABELS[sel.stage] || sel.stage}
                        sx={{ bgcolor: `${STAGE_COLORS[sel.stage] || '#64748b'}18`, color: STAGE_COLORS[sel.stage] || '#64748b', fontWeight: 700, fontSize: 10, height: 18, mt: 0.25 }} />
                    </Box>
                  </Box>
                  <Grid container spacing={1} sx={{ mt: 1 }}>
                    {[
                      { label: 'موبایل', value: sel.mobile ? toPersianDigits(sel.mobile) : '—' },
                      { label: 'ایمیل', value: sel.email || '—' },
                      { label: 'منبع جذب', value: sel.source || '—' },
                      { label: 'حقوق پیشنهادی', value: sel.expected_salary ? `${formatPersianNumber(sel.expected_salary)} ریال` : '—' },
                    ].map(f => (
                      <Grid item xs={12} sm={6} key={f.label}>
                        <Typography variant="caption" color="textSecondary" display="block">{f.label}</Typography>
                        <Typography variant="body2" fontWeight={600} noWrap>{f.value}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                  {sel.resume_url && (
                    <Button size="small" startIcon={<DescriptionIcon />} component="a" href={sel.resume_url} target="_blank" rel="noreferrer"
                      sx={{ mt: 1, textTransform: 'none', color: '#0ea5e9' }}>
                      مشاهده رزومه
                    </Button>
                  )}
                </Paper>
              );
            })()}

            <Divider />

            <Typography variant="subtitle2" fontWeight={800} color="#0369a1">زمان‌بندی</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="مصاحبه‌کننده" value={interviewForm.interviewer} sx={fieldSx}
                  onChange={e => setInterviewForm(p => ({ ...p, interviewer: e.target.value }))} />
              </Grid>
              <Grid item xs={12} md={3}>
                <JalaliDatePicker fullWidth label="تاریخ مصاحبه" value={interviewForm.interview_date}
                  onChange={v => setInterviewForm(p => ({ ...p, interview_date: v }))} />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth size="small" label="ساعت" type="time" value={interviewForm.interview_time}
                  sx={fieldSx} InputLabelProps={{ shrink: true }}
                  onChange={e => setInterviewForm(p => ({ ...p, interview_time: e.target.value }))} />
              </Grid>
            </Grid>
            <Divider />

            <Typography variant="subtitle2" fontWeight={800} color="#0369a1">ارزیابی</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth size="small" sx={fieldSx}>
                  <InputLabel>نتیجه</InputLabel>
                  <Select value={interviewForm.outcome} label="نتیجه" onChange={e => setInterviewForm(p => ({ ...p, outcome: e.target.value }))}>
                    {Object.keys(OUTCOME).map(k => <MenuItem key={k} value={k}>{OUTCOME[k]}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth size="small" label="امتیاز (۰-۱۰۰)" type="number" value={interviewForm.score} sx={fieldSx}
                  onChange={e => setInterviewForm(p => ({ ...p, score: e.target.value }))} />
              </Grid>
            </Grid>
            <TextField fullWidth size="small" label="نظرات مصاحبه" multiline rows={3} value={interviewForm.comments} sx={fieldSx}
              onChange={e => setInterviewForm(p => ({ ...p, comments: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setOpenInterview(false); setEditInterviewId(null); setInterviewForm(emptyInterview); }}>انصراف</Button>
          <Button variant="contained" disabled={!interviewForm.candidate} onClick={submitInterview}
            sx={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', borderRadius: '10px', px: 3 }}>
            {editInterviewId ? 'ذخیره تغییرات' : 'ثبت مصاحبه'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View interview dialog */}
      <Dialog open={!!viewInterview} onClose={() => setViewInterview(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#0369a1', fontWeight: 800, borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
          جزئیات مصاحبه
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {viewInterview && (() => {
            const cand = candById(viewInterview.candidate);
            return (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: OUTCOME_COLORS[viewInterview.outcome] || '#64748b', fontWeight: 800, fontSize: 18 }}>
                    {(viewInterview.candidate_full_name || '؟').charAt(0)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" fontWeight={800}>{viewInterview.candidate_full_name || `کاندید #${viewInterview.candidate}`}</Typography>
                    <Chip size="small" label={OUTCOME[viewInterview.outcome] || viewInterview.outcome}
                      sx={{ bgcolor: `${OUTCOME_COLORS[viewInterview.outcome] || '#64748b'}18`, color: OUTCOME_COLORS[viewInterview.outcome] || '#64748b', fontWeight: 700, fontSize: 11, mt: 0.25 }} />
                  </Box>
                </Box>
                {cand && (
                  <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
                    <Grid container spacing={1}>
                      {[
                        { label: 'مرحله', value: STAGE_LABELS[cand.stage] || cand.stage },
                        { label: 'موبایل', value: cand.mobile ? toPersianDigits(cand.mobile) : '—' },
                        { label: 'ایمیل', value: cand.email || '—' },
                        { label: 'منبع جذب', value: cand.source || '—' },
                      ].map(f => (
                        <Grid item xs={6} key={f.label}>
                          <Typography variant="caption" color="textSecondary" display="block">{f.label}</Typography>
                          <Typography variant="body2" fontWeight={600} noWrap>{f.value}</Typography>
                        </Grid>
                      ))}
                    </Grid>
                    {cand.resume_url && (
                      <Button size="small" startIcon={<DescriptionIcon />} component="a" href={cand.resume_url} target="_blank" rel="noreferrer"
                        sx={{ mt: 0.5, textTransform: 'none', color: '#0ea5e9' }}>
                        مشاهده رزومه
                      </Button>
                    )}
                  </Paper>
                )}
                <Grid container spacing={1.5}>
                  {[
                    { label: 'مصاحبه‌کننده', value: viewInterview.interviewer || '—' },
                    { label: 'زمان مصاحبه', value: formatDateTime(viewInterview.interview_date) },
                    { label: 'امتیاز', value: viewInterview.score > 0 ? formatPersianNumber(viewInterview.score) : '—' },
                  ].map(f => (
                    <Grid item xs={12} sm={6} key={f.label}>
                      <Paper variant="outlined" sx={{ p: 1.25, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
                        <Typography variant="caption" color="textSecondary" display="block">{f.label}</Typography>
                        <Typography variant="body2" fontWeight={700}>{f.value}</Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} color="#0369a1" mb={0.5}>نظرات</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{viewInterview.comments || '—'}</Typography>
                </Box>
              </Stack>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setViewInterview(null)}
            sx={{ background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', borderRadius: '10px', px: 3 }}>بستن</Button>
        </DialogActions>
      </Dialog>

      {/* Delete interview confirm dialog */}
      <Dialog open={!!deleteInterviewId} onClose={() => setDeleteInterviewId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ color: '#b91c1c', fontWeight: 800 }}>حذف مصاحبه</DialogTitle>
        <DialogContent>
          <Typography variant="body2">آیا از حذف این مصاحبه اطمینان دارید؟ این عملیات قابل بازگشت نیست.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteInterviewId(null)}>انصراف</Button>
          <Button variant="contained" color="error" onClick={() => deleteInterview.mutate(deleteInterviewId)}>حذف</Button>
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