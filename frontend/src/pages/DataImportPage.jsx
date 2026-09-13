import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Stack, Chip, Alert, Button, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Grid,
  LinearProgress, Tooltip,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PeopleIcon from '@mui/icons-material/People';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WorkOutlineIcon from '@mui/icons-material/WorkOutline';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ShieldIcon from '@mui/icons-material/Shield';
import FolderIcon from '@mui/icons-material/Folder';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

/* ط¢غŒع©ظ†â€Œظ‡ط§غŒ ط§ط®طھطµط§طµغŒ ط¨ط±ط§غŒ ظ‡ط± ظ†ظˆط¹ */
const ICONS = {
  employees: <PeopleIcon />,
  departments: <AccountTreeIcon />,
  job_titles: <WorkOutlineIcon />,
  work_locations: <LocationOnIcon />,
  insurance_lists: <ShieldIcon />,
  document_types: <FolderIcon />,
  salary_records: <ReceiptLongIcon />,
  salary_bulk: <ReceiptLongIcon />,
  benefit_bulk: <CardGiftcardIcon />,
  attendance_bulk: <AccessTimeIcon />,
  leave_bulk: <BeachAccessIcon />,
  contract_versions: <HistoryEduIcon />,
};

const COLORS = {
  employees: '#6366f1',
  departments: '#8b5cf6',
  job_titles: '#0ea5e9',
  work_locations: '#10b981',
  insurance_lists: '#14b8a6',
  document_types: '#f97316',
  salary_records: '#3b82f6',
  salary_bulk: '#3b82f6',
  benefit_bulk: '#10b981',
  attendance_bulk: '#06b6d4',
  leave_bulk: '#f59e0b',
  contract_versions: '#ec4899',
};

const DataImportPage = () => {
  const qc = useQueryClient();
  const [step, setStep] = useState(0); // 0: select, 1: upload, 2: result
  const [importType, setImportType] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const fileInputRef = useRef(null);

  const { data: types, isLoading } = useQuery({
    queryKey: ['import-types'],
    queryFn: () => axiosInstance.get('/import/types/').then(r => r.data),
  });
  const list = Array.isArray(types) ? types : (types?.types || []);
  const selected = list.find(t => t.key === importType);

  const handleDownload = async () => {
    if (!importType) { setError('ظ†ظˆط¹ ط¯ط±ظˆظ†â€Œط±غŒط²غŒ ط±ط§ ط§ظ†طھط®ط§ط¨ ع©ظ†غŒط¯'); return; }
    setError('');
    try {
      const res = await axiosInstance.get(`/import/template/${importType}/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', `template_${importType}.xlsx`);
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch { setError('ط®ط·ط§ ط¯ط± ط¯ط§ظ†ظ„ظˆط¯ ظ†ظ…ظˆظ†ظ‡ ظپط§غŒظ„'); }
  };

  const handleUpload = async () => {
    if (!importType) { setError('ط§ط¨طھط¯ط§ ظ†ظˆط¹ ط¯ط±ظˆظ†â€Œط±غŒط²غŒ ط±ط§ ط§ظ†طھط®ط§ط¨ ع©ظ†غŒط¯'); return; }
    if (!file) { setError('ظپط§غŒظ„ ط§ع©ط³ظ„ ط±ط§ ط§ظ†طھط®ط§ط¨ ع©ظ†غŒط¯'); return; }
    setUploading(true); setError(''); setResult(null);
    const fd = new FormData();
    fd.append('import_type', importType);
    fd.append('file', file);
    try {
      const res = await axiosInstance.post('/import/upload/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(res.data);
      setStep(2);
      ['employees', 'departments', 'job-titles', 'work-locations', 'insurance-lists', 'salaries', 'benefits', 'attendance-records', 'leave-requests', 'contract-versions'].forEach(k =>
        qc.invalidateQueries({ queryKey: [k] }));
    } catch (e) {
      const d = e.response?.data;
      setError(d?.error || 'ط®ط·ط§ ط¯ط± ط¯ط±ظˆظ†â€Œط±غŒط²غŒ');
      if (d) setResult(d);
    } finally { setUploading(false); }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const reset = () => {
    setStep(0); setImportType(''); setFile(null); setResult(null); setError('');
  };

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(99,102,241,0.10), rgba(49,46,129,0.04), rgba(255,255,255,0.3))',
        border: '1px solid rgba(99,102,241,0.16)', borderRadius: '10px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
          <UploadFileIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#4338ca">ط¯ط±ظˆظ†â€Œط±غŒط²غŒ ط¯ط§ط¯ظ‡ ط§ط² ط§ع©ط³ظ„</Typography>
          <Typography variant="body2" color="textSecondary">ظ†ظˆط¹ ط±ط§ ط§ظ†طھط®ط§ط¨طŒ ظ†ظ…ظˆظ†ظ‡ ط±ط§ ط¯ط§ظ†ظ„ظˆط¯طŒ ظپط§غŒظ„ ط±ط§ ط¨ط§ط±ع¯ط°ط§ط±غŒ ع©ظ†غŒط¯ â€” ظ‡ظ…ظ‡â€Œع†غŒط² غŒع©ط¬ط§</Typography>
        </Box>
        <Button variant="outlined" startIcon={<InfoOutlinedIcon />} onClick={() => setHelpOpen(true)}>
          ط±ط§ظ‡ظ†ظ…ط§غŒ ط³طھظˆظ†â€Œظ‡ط§
        </Button>
      </Paper>

      {/* Feedback */}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {result?.imported_count !== undefined && step === 2 && (
        <Alert severity={result.imported_count > 0 ? 'success' : 'warning'} sx={{ mb: 2 }} onClose={() => setResult(null)}>
          {result.imported_count > 0
            ? `âœ… ${result.message || 'ط¯ط±ظˆظ†â€Œط±غŒط²غŒ ظ…ظˆظپظ‚'} â€” ${result.imported_count} ط±ط¯غŒظپ ط«ط¨طھ ط´ط¯${result.skipped_count ? `طŒ ${result.skipped_count} ط±ط¯ ط´ط¯` : ''}`
            : (result.validation_errors?.length
                ? `âڑ ï¸ڈ ${result.validation_errors.length} ط±ط¯غŒظپ ط®ط·ط§غŒ ط§ط¹طھط¨ط§ط±ط³ظ†ط¬غŒ ط¯ط§ط±ط¯`
                : `âڑ ï¸ڈ ${result.error || 'ط®ط·ط§'}`)}
        </Alert>
      )}
      {result?.validation_errors?.length > 0 && (
        <Paper sx={{ mb: 2, p: 1.5, maxHeight: 130, overflow: 'auto', fontSize: '0.72rem' }}>
          {result.validation_errors.slice(0, 10).map((v, i) => (
            <Typography key={i} variant="caption" color="error" display="block">
              ط±ط¯غŒظپ {v.row}: {v.errors.join(' â€” ')}
            </Typography>
          ))}
        </Paper>
      )}
      {result?.skipped?.length > 0 && (
        <Paper sx={{ mb: 2, p: 1.5, maxHeight: 100, overflow: 'auto' }}>
          <Typography variant="caption" color="warning.main" sx={{ fontWeight: 700 }}>ط±ط¯ ط´ط¯ظ‡â€Œظ‡ط§: </Typography>
          <Typography variant="caption">{result.skipped.slice(0, 10).join(' â€” ')}</Typography>
        </Paper>
      )}

      {/* STEP 0: ط§ظ†طھط®ط§ط¨ ظ†ظˆط¹ */}
      {step === 0 && (
        isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : (
          <>
            <Grid container spacing={1.5}>
              {list.map(t => {
                const color = COLORS[t.key] || '#6366f1';
                const active = importType === t.key;
                return (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={t.key}>
                    <Paper
                      onClick={() => { setImportType(t.key); setResult(null); setError(''); setFile(null); }}
                      sx={{
                        p: 2, borderRadius: '10px', cursor: 'pointer', height: '100%',
                        transition: 'all 0.18s ease',
                        border: active ? `2px solid ${color}` : '1px solid rgba(0,0,0,0.08)',
                        background: active ? `${color}12` : 'rgba(255,255,255,0.6)',
                        '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 10px 24px ${color}22` },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Avatar sx={{ width: 40, height: 40, background: `linear-gradient(135deg, ${color}, ${color}bb)`, color: '#fff' }}>
                          {ICONS[t.key] || <UploadFileIcon />}
                        </Avatar>
                        <Typography variant="subtitle1" fontWeight={800}>{t.label}</Typography>
                      </Box>
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', minHeight: 32 }}>
                        {t.description || ''}
                      </Typography>
                      {t.required?.length > 0 && (
                        <Chip size="small" label={`${t.required.length} ظپغŒظ„ط¯ ط§ظ„ط²ط§ظ…غŒ`}
                          sx={{ mt: 1, bgcolor: `${color}15`, color, fontWeight: 700 }} />
                      )}
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
            {selected && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => setStep(1)}
                  sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  ط§ط¯ط§ظ…ظ‡
                </Button>
              </Box>
            )}
          </>
        )
      )}

      {/* STEP 1: ط¨ط§ط±ع¯ط°ط§ط±غŒ */}
      {step === 1 && selected && (
        <Paper sx={{ p: 3, borderRadius: '10px', border: '1px dashed rgba(99,102,241,0.4)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={800}>ط¯ط±ظˆظ†â€Œط±غŒط²غŒ: {selected.label}</Typography>
            <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>
              ط¯ط§ظ†ظ„ظˆط¯ ظ†ظ…ظˆظ†ظ‡
            </Button>
          </Box>

          <Box
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            sx={{
              py: 5, textAlign: 'center', cursor: 'pointer', borderRadius: '10px',
              border: dragOver ? '2px dashed #6366f1' : '2px dashed rgba(100,116,139,0.3)',
              background: dragOver ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.15s ease',
            }}
          >
            <CloudUploadIcon sx={{ fontSize: 48, color: '#6366f1', mb: 1 }} />
            <Typography variant="body1" fontWeight={700}>
              {file ? file.name : 'ظپط§غŒظ„ ط§ع©ط³ظ„ ط±ط§ ط§غŒظ†ط¬ط§ ط±ظ‡ط§ ع©ظ†غŒط¯'}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              غŒط§ ع©ظ„غŒع© ع©ظ†غŒط¯ طھط§ ط§ظ†طھط®ط§ط¨ ط´ظˆط¯ (.xlsx / .xls)
            </Typography>
            <input
              ref={fileInputRef}
              type="file" hidden accept=".xlsx,.xls"
              onChange={ev => { setFile(ev.target.files?.[0] || null); setResult(null); }}
            />
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2 }}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => setStep(0)}>ط¨ط§ط²ع¯ط´طھ</Button>
            <Button
              variant="contained" disabled={!file || uploading}
              onClick={handleUpload}
              sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', flex: 1 }}
            >
              {uploading ? <CircularProgress size={18} color="inherit" /> : 'ط´ط±ظˆط¹ ط¯ط±ظˆظ†â€Œط±غŒط²غŒ'}
            </Button>
          </Stack>
          {uploading && <LinearProgress sx={{ mt: 2, borderRadius: '10px' }} />}
        </Paper>
      )}

      {/* STEP 2: ظ†طھغŒط¬ظ‡ */}
      {step === 2 && result && (
        <Paper sx={{ p: 3, borderRadius: '10px', textAlign: 'center', background: 'rgba(255,255,255,0.6)' }}>
          <Avatar sx={{
            width: 72, height: 72, mx: 'auto', mb: 1.5,
            background: result.imported_count > 0
              ? 'linear-gradient(135deg, #10b981, #34d399)'
              : 'linear-gradient(135deg, #f59e0b, #fbbf24)',
          }}>
            {result.imported_count > 0 ? <CloudUploadIcon sx={{ color: '#fff', fontSize: 36 }} /> : <InfoOutlinedIcon sx={{ color: '#fff', fontSize: 36 }} />}
          </Avatar>
          <Typography variant="h6" fontWeight={800}>
            {result.imported_count > 0 ? 'ط¯ط±ظˆظ†â€Œط±غŒط²غŒ ظ…ظˆظپظ‚ ط¨ظˆط¯' : 'ط¯ط±ظˆظ†â€Œط±غŒط²غŒ ط¨ط§ ظ‡ط´ط¯ط§ط±'}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {result.imported_count} ط±ط¯غŒظپ ط«ط¨طھ ط´ط¯ آ· {result.skipped_count || 0} ط±ط¯غŒظپ ط±ط¯ ط´ط¯
          </Typography>
          {result.skipped?.length > 0 && (
            <Paper sx={{ p: 1.5, maxHeight: 120, overflow: 'auto', textAlign: 'right', mb: 2 }}>
              {result.skipped.slice(0, 10).map((s, i) => (
                <Typography key={i} variant="caption" color="warning.main" display="block">{s}</Typography>
              ))}
            </Paper>
          )}
          <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={reset}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            ط¯ط±ظˆظ†â€Œط±غŒط²غŒ ط¬ط¯غŒط¯
          </Button>
        </Paper>
      )}

      {/* Help dialog */}
      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#4338ca' }}>ط±ط§ظ‡ظ†ظ…ط§غŒ ط³طھظˆظ†â€Œظ‡ط§غŒ ظپط§غŒظ„ ط§ع©ط³ظ„</DialogTitle>
        <DialogContent dividers>
          {(selected || {}).persian_headers && (
            <>
              <Typography variant="subtitle2" fontWeight={700}>ط³طھظˆظ†â€Œظ‡ط§ (ط¨ظ‡ طھط±طھغŒط¨):</Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                {selected.persian_headers.map((h, idx) => (
                  <Chip key={idx} size="small" label={h} sx={{
                    bgcolor: selected.required?.includes(selected.headers?.[idx]) ? 'rgba(99,102,241,0.16)' : 'rgba(100,116,139,0.08)',
                    color: selected.required?.includes(selected.headers?.[idx]) ? '#4338ca' : '#475569',
                    fontWeight: selected.required?.includes(selected.headers?.[idx]) ? 700 : 400,
                  }} />
                ))}
              </Stack>
              <Alert severity="info" sx={{ mt: 2 }}>
                ظپغŒظ„ط¯ظ‡ط§غŒ ط¨ط§ ظ¾ط³â€Œط²ظ…غŒظ†ظ‡ ط¨ظ†ظپط´ ط§ظ„ط²ط§ظ…غŒâ€Œط§ظ†ط¯. طھط§ط±غŒط®â€Œظ‡ط§ ط±ط§ ظ…غŒâ€Œطھظˆط§ظ†غŒط¯ ط´ظ…ط³غŒ (ظ…ط«ط§ظ„ غ±غ´غ°غ´/غ°غ¶/غ±غµ) غŒط§ ظ…غŒظ„ط§ط¯غŒ ط¨ظ†ظˆغŒط³غŒط¯.
              </Alert>
            </>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setHelpOpen(false)}>ط¨ط³طھظ†</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataImportPage;