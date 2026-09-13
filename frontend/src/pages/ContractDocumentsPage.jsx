import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, IconButton, Tooltip, Chip,
} from '@mui/material';
import FolderSharedIcon from '@mui/icons-material/FolderShared';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { toJalali } from '../core/utils/dateUtils';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: '10px',
};

const fileIcon = (name = '') => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext)) return <PictureAsPdfIcon sx={{ color: '#ef4444' }} />;
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return <ImageIcon sx={{ color: '#10b981' }} />;
  return <InsertDriveFileIcon sx={{ color: '#6366f1' }} />;
};

const formatSize = (bytes) => {
  if (!bytes) return 'â€”';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const ContractDocumentsPage = () => {
  const qc = useQueryClient();
  const [contractId, setContractId] = useState('');
  const [dialog, setDialog] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const { data: contracts } = useQuery({ queryKey: ['ext-contracts-docs'], queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data) });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: docs, isLoading } = useQuery({
    queryKey: ['contract-documents', contractId],
    queryFn: () => axiosInstance.get('/contract-documents/', { params: { contract: contractId } }).then(r => r.data),
    enabled: !!contractId,
  });
  const docList = Array.isArray(docs) ? docs : docs?.results || [];

  const upload = useMutation({
    mutationFn: (formData) => axiosInstance.post('/contract-documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract-documents'] });
      setDialog(false); setTitle(''); setFile(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/contract-documents/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-documents'] }),
  });

  const submit = () => {
    if (!file || !title) return;
    const fd = new FormData();
    fd.append('contract', contractId);
    fd.append('title', title);
    fd.append('file', file);
    upload.mutate(fd);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      setFile(e.dataTransfer.files[0]);
      if (!title) setTitle(e.dataTransfer.files[0].name);
    }
  };

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(6,182,212,0.10), rgba(59,130,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(6,182,212,0.18)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', boxShadow: '0 8px 24px rgba(6,182,212,0.4)' }}>
          <FolderSharedIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#0e7490">ط¨ط§غŒع¯ط§ظ†غŒ ط§ط³ظ†ط§ط¯ ظ‚ط±ط§ط±ط¯ط§ط¯</Typography>
          <Typography variant="body2" color="textSecondary">ط¢ظ¾ظ„ظˆط¯طŒ ظ…ط´ط§ظ‡ط¯ظ‡ ظˆ ظ…ط¯غŒط±غŒطھ ط§ط³ظ†ط§ط¯ ظ¾غŒظˆط³طھ ظ‡ط± ظ‚ط±ط§ط±ط¯ط§ط¯</Typography>
        </Box>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>ظ‚ط±ط§ط±ط¯ط§ط¯</InputLabel>
          <Select value={contractId || ''} label="ظ‚ط±ط§ط±ط¯ط§ط¯" onChange={e => setContractId(e.target.value)}>
            {contractList.map(c => <MenuItem key={c.id} value={c.id}>{c.subject || c.number}</MenuItem>)}
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={<AddIcon />} disabled={!contractId} onClick={() => setDialog(true)}
          sx={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)', borderRadius: '10px' }}>
          ط§ظپط²ظˆط¯ظ† ط³ظ†ط¯
        </Button>
      </Paper>

      {!contractId ? (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <FolderSharedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="textSecondary">ط¨ط±ط§غŒ ظ…ط´ط§ظ‡ط¯ظ‡ظ” ط§ط³ظ†ط§ط¯طŒ غŒع© ظ‚ط±ط§ط±ط¯ط§ط¯ ط§ظ†طھط®ط§ط¨ ع©ظ†غŒط¯.</Typography>
        </Paper>
      ) : isLoading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
      ) : docList.length === 0 ? (
        <Paper sx={{ ...glassPaper, p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">ط³ظ†ط¯غŒ ط¨ط±ط§غŒ ط§غŒظ† ظ‚ط±ط§ط±ط¯ط§ط¯ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ.</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {docList.map(d => (
            <Grid item xs={12} sm={6} md={4} key={d.id}>
              <Paper sx={{ ...glassPaper, p: 2, position: 'relative' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Avatar sx={{ width: 44, height: 44, background: 'rgba(99,102,241,0.08)' }}>
                    {fileIcon(d.title || d.file_url)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>{d.title}</Typography>
                    <Typography variant="caption" color="textSecondary">{toJalali(d.uploaded_at?.slice(0, 10))}</Typography>
                  </Box>
                </Box>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Tooltip title="ط¯ط§ظ†ظ„ظˆط¯">
                    <IconButton size="small" color="primary" component="a" href={d.file_url} target="_blank" rel="noreferrer">
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="ط­ط°ظپ">
                    <IconButton size="small" color="error" onClick={() => { if (window.confirm('ط­ط°ظپ ط³ظ†ط¯طں')) remove.mutate(d.id); }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Upload dialog with drag & drop */}
      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ط§ظپط²ظˆط¯ظ† ط³ظ†ط¯ ط¨ظ‡ ظ‚ط±ط§ط±ط¯ط§ط¯</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField size="small" label="ط¹ظ†ظˆط§ظ† ط³ظ†ط¯ *" value={title} onChange={e => setTitle(e.target.value)} />
            <Box
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              sx={{
                p: 3, textAlign: 'center', cursor: 'pointer', borderRadius: '10px',
                border: `2px dashed ${dragActive ? '#06b6d4' : 'rgba(99,102,241,0.3)'}`,
                background: dragActive ? 'rgba(6,182,212,0.06)' : 'rgba(99,102,241,0.03)',
                transition: 'all 0.2s',
              }}
            >
              <CloudUploadIcon sx={{ fontSize: 44, color: '#06b6d4', mb: 1 }} />
              <Typography variant="body2" fontWeight={600}>
                {file ? file.name : 'ظپط§غŒظ„ ط±ط§ ط§غŒظ†ط¬ط§ ط±ظ‡ط§ ع©ظ†غŒط¯ غŒط§ ع©ظ„غŒع© ع©ظ†غŒط¯'}
              </Typography>
              {file && <Chip size="small" label={formatSize(file.size)} sx={{ mt: 1 }} />}
              <input ref={inputRef} type="file" hidden onChange={(e) => {
                if (e.target.files?.[0]) { setFile(e.target.files[0]); if (!title) setTitle(e.target.files[0].name); }
              }} />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" disabled={!file || !title || upload.isLoading} onClick={submit}
            sx={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}>
            {upload.isLoading ? <CircularProgress size={20} color="inherit" /> : 'ط¢ظ¾ظ„ظˆط¯'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ContractDocumentsPage;