import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, IconButton, Divider,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { formatPersianNumber } from '../core/utils/numberUtils';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)',
  borderRadius: '10px',
};

const PriceListPage = () => {
  const qc = useQueryClient();
  const [selectedPriceList, setSelectedPriceList] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [dialogType, setDialogType] = useState('pl'); // pl | version | chapter | item
  const [form, setForm] = useState({});

  const { data: plData, isLoading: plLoading } = useQuery({
    queryKey: ['price-lists'],
    queryFn: () => axiosInstance.get('/price-lists/').then(r => r.data),
  });
  const priceLists = Array.isArray(plData) ? plData : plData?.results || [];

  const { data: verData, isLoading: verLoading } = useQuery({
    queryKey: ['price-list-versions', selectedPriceList],
    queryFn: () => axiosInstance.get('/price-list-versions/', { params: { price_list: selectedPriceList } }).then(r => r.data),
    enabled: !!selectedPriceList,
  });
  const versions = Array.isArray(verData) ? verData : verData?.results || [];

  const { data: chData, isLoading: chLoading } = useQuery({
    queryKey: ['price-list-chapters', selectedVersion],
    queryFn: () => axiosInstance.get('/price-list-chapters/', { params: { version: selectedVersion } }).then(r => r.data),
    enabled: !!selectedVersion,
  });
  const chapters = Array.isArray(chData) ? chData : chData?.results || [];

  const createPL = useMutation({
    mutationFn: (payload) => axiosInstance.post('/price-lists/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['price-lists'] }); setDialog(false); setForm({}); },
  });

  const createVersion = useMutation({
    mutationFn: (payload) => axiosInstance.post('/price-list-versions/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['price-list-versions'] }); setDialog(false); setForm({}); },
  });

  const createChapter = useMutation({
    mutationFn: (payload) => axiosInstance.post('/price-list-chapters/', payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['price-list-chapters'] }); setDialog(false); setForm({}); },
  });

  const openPLDialog = () => { setDialogType('pl'); setForm({}); setDialog(true); };
  const openVersionDialog = () => { setDialogType('version'); setForm({ price_list: selectedPriceList }); setDialog(true); };
  const openChapterDialog = () => { setDialogType('chapter'); setForm({ version: selectedVersion }); setDialog(true); };

  const submit = () => {
    if (dialogType === 'pl') createPL.mutate(form);
    if (dialogType === 'version') createVersion.mutate(form);
    if (dialogType === 'chapter') createChapter.mutate(form);
  };

  if (plLoading) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(245,158,11,0.10), rgba(59,130,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.18)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#f59e0b,#3b82f6)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
          <ReceiptLongIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">فهرست‌بها و ساختار تجاری</Typography>
          <Typography variant="body2" color="textSecondary">فاز ۱ — فهرست‌بها، نسخه، فصل و ردیف قیمت (مستقل از WBS و قرارداد)</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openPLDialog}
          sx={{ background: 'linear-gradient(135deg,#f59e0b,#3b82f6)', borderRadius: '10px' }}>
          فهرست‌بها جدید
        </Button>
      </Paper>

      <Grid container spacing={2}>
        {/* Price Lists */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...glassPaper, p: 2 }}>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom>فهرست‌بها</Typography>
            <Stack spacing={0.75}>
              {priceLists.map(pl => (
                <Paper key={pl.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', cursor: 'pointer',
                  borderColor: selectedPriceList === pl.id ? '#f59e0b' : 'rgba(0,0,0,0.1)',
                  background: selectedPriceList === pl.id ? '#f59e0b0d' : 'rgba(255,255,255,0.5)' }}
                  onClick={() => { setSelectedPriceList(pl.id); setSelectedVersion(null); }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={700}>{pl.name}</Typography>
                      <Typography variant="caption" color="textSecondary">کد: {pl.code}{pl.discipline ? ` · ${pl.discipline}` : ''}</Typography>
                    </Box>
                    <ChevronRightIcon fontSize="small" />
                  </Box>
                </Paper>
              ))}
              {priceLists.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">فهرست‌بهایی نیست</Typography>}
            </Stack>
          </Paper>
        </Grid>

        {/* Versions */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...glassPaper, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={800}>نسخه‌ها</Typography>
              {selectedPriceList && <Button size="small" startIcon={<AddIcon />} onClick={openVersionDialog}>نسخه</Button>}
            </Box>
            {!selectedPriceList ? (
              <Typography variant="caption" color="textSecondary">یک فهرست‌بها انتخاب کنید.</Typography>
            ) : (
              <Stack spacing={0.75}>
                {versions.map(v => (
                  <Paper key={v.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', cursor: 'pointer',
                    borderColor: selectedVersion === v.id ? '#3b82f6' : 'rgba(0,0,0,0.1)',
                    background: selectedVersion === v.id ? '#3b82f60d' : 'rgba(255,255,255,0.5)' }}
                    onClick={() => setSelectedVersion(v.id)}>
                    <Typography variant="body2" fontWeight={700}>نسخه {v.version} {v.year ? `· ${formatPersianNumber(v.year)}` : ''}</Typography>
                  </Paper>
                ))}
                {versions.length === 0 && <Typography variant="caption" color="textSecondary">نسخه‌ای نیست</Typography>}
              </Stack>
            )}
          </Paper>
        </Grid>

        {/* Chapters */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ ...glassPaper, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={800}>فصل‌ها</Typography>
              {selectedVersion && <Button size="small" startIcon={<AddIcon />} onClick={openChapterDialog}>فصل</Button>}
            </Box>
            {!selectedVersion ? (
              <Typography variant="caption" color="textSecondary">یک نسخه انتخاب کنید.</Typography>
            ) : (
              <Stack spacing={0.75}>
                {chapters.map(ch => (
                  <Paper key={ch.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', background: 'rgba(255,255,255,0.5)' }}>
                    <Typography variant="body2" fontWeight={700}>{ch.name}</Typography>
                    <Typography variant="caption" color="textSecondary">کد: {ch.code} · {ch.items?.length || 0} ردیف</Typography>
                  </Paper>
                ))}
                {chapters.length === 0 && <Typography variant="caption" color="textSecondary">فصلی نیست</Typography>}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {dialogType === 'pl' ? 'فهرست‌بها جدید' : dialogType === 'version' ? 'نسخه جدید' : 'فصل جدید'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {dialogType === 'pl' && (
            <>
              <TextField size="small" label="کد" value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
              <TextField size="small" label="نام" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              <TextField size="small" label="رشته / دیسیپلین" value={form.discipline || ''} onChange={e => setForm(p => ({ ...p, discipline: e.target.value }))} />
            </>
          )}
          {dialogType === 'version' && (
            <>
              <TextField size="small" label="نسخه" value={form.version || ''} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} />
              <TextField size="small" label="سال" type="number" value={form.year || ''} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
            </>
          )}
          {dialogType === 'chapter' && (
            <>
              <TextField size="small" label="کد" value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
              <TextField size="small" label="عنوان" value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>انصراف</Button>
          <Button variant="contained" onClick={submit} sx={{ background: 'linear-gradient(135deg,#f59e0b,#3b82f6)' }}>ذخیره</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PriceListPage;