import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Button, Avatar, Grid, CircularProgress, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Select, MenuItem, Tabs, Tab, IconButton, Chip,
} from '@mui/material';
import HistoryEduIcon from '@mui/icons-material/HistoryEdu';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatPersianNumber } from '../core/utils/numberUtils';

const glassPaper = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.62), rgba(255,255,255,0.32))',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 32px rgba(99,102,241,0.08)', borderRadius: '10px',
};

const CommercialPage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Paper sx={{ p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(245,158,11,0.10), rgba(139,92,246,0.05), rgba(255,255,255,0.3))',
        border: '1px solid rgba(245,158,11,0.18)', borderRadius: '10px' }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg,#f59e0b,#8b5cf6)', boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
          <HistoryEduIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#b45309">ط³ط§ط®طھط§ط± طھط¬ط§ط±غŒ ظ‚ط±ط§ط±ط¯ط§ط¯</Typography>
          <Typography variant="body2" color="textSecondary">ظپط§ط² غ± â€” ط±ط¯غŒظپ ظ‚ط±ط§ط±ط¯ط§ط¯ (BOQ)طŒ ظ†ع¯ط§ط´طھ WBSطŒ ظ…ط¨ظ†ط§غŒ ظ‚غŒظ…طھ ظˆ ط±ط¯غŒظپ ظپظ‡ط±ط³طھâ€Œط¨ظ‡ط§</Typography>
        </Box>
      </Paper>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        <Tab label="ط±ط¯غŒظپ ظ‚ط±ط§ط±ط¯ط§ط¯ (BOQ)" />
        <Tab label="ظ†ع¯ط§ط´طھ WBS" />
        <Tab label="ظ…ط¨ظ†ط§غŒ ظ‚غŒظ…طھ" />
        <Tab label="ط±ط¯غŒظپ ظپظ‡ط±ط³طھâ€Œط¨ظ‡ط§" />
      </Tabs>

      {tab === 0 && <ContractItemsManager />}
      {tab === 1 && <ContractWBSManager />}
      {tab === 2 && <ContractPriceBasisManager />}
      {tab === 3 && <PriceItemManager />}
    </Box>
  );
};

/* ---------------- ContractItem (BOQ) ---------------- */
const ContractItemsManager = () => {
  const qc = useQueryClient();
  const [contractId, setContractId] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});

  const { data: contracts } = useQuery({ queryKey: ['ext-contracts'], queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data) });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: items } = useQuery({
    queryKey: ['contract-items', contractId],
    queryFn: () => axiosInstance.get('/contract-items/', { params: { contract: contractId } }).then(r => r.data),
    enabled: !!contractId,
  });
  const itemList = Array.isArray(items) ? items : items?.results || [];

  const save = useMutation({
    mutationFn: (p) => p.id ? axiosInstance.patch(`/contract-items/${p.id}/`, p) : axiosInstance.post('/contract-items/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-items'] }); setDialog(false); setForm({}); },
  });
  const remove = useMutation({ mutationFn: (id) => axiosInstance.delete(`/contract-items/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-items'] }) });

  const num = v => (v === '' || v == null ? null : Number(v));

  return (
    <Box>
      <Paper sx={{ ...glassPaper, p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>ظ‚ط±ط§ط±ط¯ط§ط¯</InputLabel>
            <Select value={contractId || ''} label="ظ‚ط±ط§ط±ط¯ط§ط¯" onChange={e => setContractId(e.target.value)}>
              {contractList.map(c => <MenuItem key={c.id} value={c.id}>{c.subject || c.number}</MenuItem>)}
            </Select>
          </FormControl>
          <Button size="small" startIcon={<AddIcon />} variant="outlined" disabled={!contractId}
            onClick={() => { setForm({ contract: contractId }); setDialog(true); }}>ط§ظپط²ظˆط¯ظ† ط±ط¯غŒظپ</Button>
        </Stack>

        <Stack spacing={0.75}>
          {itemList.map(it => (
            <Paper key={it.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700}>{it.code} â€” {it.description}</Typography>
                <Typography variant="caption" color="textSecondary">
                  {formatPersianNumber(it.quantity)} {it.unit} أ— {formatPersianNumber(it.unit_price)} = {formatPersianNumber(it.amount)}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => { setForm({ ...it }); setDialog(true); }}><EditIcon fontSize="small" /></IconButton>
              <IconButton size="small" color="error" onClick={() => { if (window.confirm('ط­ط°ظپطں')) remove.mutate(it.id); }}><DeleteIcon fontSize="small" /></IconButton>
            </Paper>
          ))}
          {itemList.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">ط±ط¯غŒظپغŒ ظ†غŒط³طھ</Typography>}
        </Stack>
      </Paper>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ط±ط¯غŒظپ ظ‚ط±ط§ط±ط¯ط§ط¯</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="ع©ط¯" value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
          <TextField size="small" label="ط´ط±ط­" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <Grid container spacing={1.5}>
            <Grid item xs={4}><TextField size="small" label="ظ…ظ‚ط¯ط§ط±" type="number" value={form.quantity ?? ''} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField size="small" label="ظˆط§ط­ط¯" value={form.unit || ''} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} /></Grid>
            <Grid item xs={4}><TextField size="small" label="ظ†ط±ط® ظˆط§ط­ط¯" type="number" value={form.unit_price ?? ''} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" onClick={() => save.mutate({ ...form, quantity: num(form.quantity), unit_price: num(form.unit_price), amount: (num(form.quantity) || 0) * (num(form.unit_price) || 0) })}
            sx={{ background: 'linear-gradient(135deg,#f59e0b,#8b5cf6)' }}>ط°ط®غŒط±ظ‡</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

/* ---------------- ContractWBS Mapping ---------------- */
const ContractWBSManager = () => {
  const qc = useQueryClient();
  const [contractId, setContractId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});

  const { data: contracts } = useQuery({ queryKey: ['ext-contracts'], queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data) });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: projects } = useQuery({ queryKey: ['projects-all'], queryFn: () => axiosInstance.get('/projects/').then(r => r.data) });
  const projectList = Array.isArray(projects) ? projects : projects?.results || [];

  const { data: wbs } = useQuery({
    queryKey: ['wbs-list', projectId],
    queryFn: () => axiosInstance.get('/wbs-nodes/', { params: { project: projectId } }).then(r => r.data),
    enabled: !!projectId,
  });
  const wbsList = Array.isArray(wbs) ? wbs : wbs?.results || [];

  const { data: links } = useQuery({
    queryKey: ['contract-wbs', contractId],
    queryFn: () => axiosInstance.get('/contract-wbs/', { params: { contract: contractId } }).then(r => r.data),
    enabled: !!contractId,
  });
  const linkList = Array.isArray(links) ? links : links?.results || [];

  const save = useMutation({
    mutationFn: (p) => axiosInstance.post('/contract-wbs/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-wbs'] }); setDialog(false); setForm({}); },
  });
  const remove = useMutation({ mutationFn: (id) => axiosInstance.delete(`/contract-wbs/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-wbs'] }) });

  return (
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>ظ‚ط±ط§ط±ط¯ط§ط¯</InputLabel>
          <Select value={contractId || ''} label="ظ‚ط±ط§ط±ط¯ط§ط¯" onChange={e => setContractId(e.target.value)}>
            {contractList.map(c => <MenuItem key={c.id} value={c.id}>{c.subject || c.number}</MenuItem>)}
          </Select>
        </FormControl>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" disabled={!contractId}
          onClick={() => { setForm({ contract: contractId }); setDialog(true); }}>ط§ظپط²ظˆط¯ظ† ظ†ع¯ط§ط´طھ</Button>
      </Stack>

      <Stack spacing={0.75}>
        {linkList.map(l => (
          <Paper key={l.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountTreeIcon fontSize="small" color="primary" />
            <Typography variant="body2" sx={{ flex: 1 }}>{l.wbs_name || `WBS #${l.wbs}`}</Typography>
            <IconButton size="small" color="error" onClick={() => { if (window.confirm('ط­ط°ظپطں')) remove.mutate(l.id); }}><DeleteIcon fontSize="small" /></IconButton>
          </Paper>
        ))}
        {linkList.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">ظ†ع¯ط§ط´طھغŒ ظ†غŒط³طھ</Typography>}
      </Stack>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>ظ†ع¯ط§ط´طھ ظ‚ط±ط§ط±ط¯ط§ط¯-WBS</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl size="small" fullWidth><InputLabel>ظ¾ط±ظˆعکظ‡</InputLabel>
            <Select value={projectId || ''} label="ظ¾ط±ظˆعکظ‡" onChange={e => setProjectId(e.target.value)}>
              {projectList.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth><InputLabel>ع¯ط±ظ‡ WBS</InputLabel>
            <Select value={form.wbs || ''} label="ع¯ط±ظ‡ WBS" onChange={e => setForm(p => ({ ...p, wbs: e.target.value }))}>
              {wbsList.map(w => <MenuItem key={w.id} value={w.id}>{w.code} - {w.name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" disabled={!form.wbs} onClick={() => save.mutate({ contract: contractId, wbs: form.wbs })}
            sx={{ background: 'linear-gradient(135deg,#8b5cf6,#3b82f6)' }}>ط°ط®غŒط±ظ‡</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

/* ---------------- ContractPriceBasis ---------------- */
const ContractPriceBasisManager = () => {
  const qc = useQueryClient();
  const [contractId, setContractId] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});

  const { data: contracts } = useQuery({ queryKey: ['ext-contracts'], queryFn: () => axiosInstance.get('/external-contracts/').then(r => r.data) });
  const contractList = Array.isArray(contracts) ? contracts : contracts?.results || [];

  const { data: plist } = useQuery({ queryKey: ['price-lists-pb'], queryFn: () => axiosInstance.get('/price-lists/').then(r => r.data) });
  const priceLists = Array.isArray(plist) ? plist : plist?.results || [];

  const { data: versions } = useQuery({
    queryKey: ['price-list-versions-pb', form.price_list],
    queryFn: () => axiosInstance.get('/price-list-versions/', { params: { price_list: form.price_list } }).then(r => r.data),
    enabled: !!form.price_list,
  });
  const versionList = Array.isArray(versions) ? versions : versions?.results || [];

  const { data: bases } = useQuery({
    queryKey: ['contract-price-bases', contractId],
    queryFn: () => axiosInstance.get('/contract-price-bases/', { params: { contract: contractId } }).then(r => r.data),
    enabled: !!contractId,
  });
  const baseList = Array.isArray(bases) ? bases : bases?.results || [];

  const save = useMutation({
    mutationFn: (p) => axiosInstance.post('/contract-price-bases/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contract-price-bases'] }); setDialog(false); setForm({}); },
  });
  const remove = useMutation({ mutationFn: (id) => axiosInstance.delete(`/contract-price-bases/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['contract-price-bases'] }) });

  return (
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>ظ‚ط±ط§ط±ط¯ط§ط¯</InputLabel>
          <Select value={contractId || ''} label="ظ‚ط±ط§ط±ط¯ط§ط¯" onChange={e => setContractId(e.target.value)}>
            {contractList.map(c => <MenuItem key={c.id} value={c.id}>{c.subject || c.number}</MenuItem>)}
          </Select>
        </FormControl>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" disabled={!contractId}
          onClick={() => { setForm({ contract: contractId }); setDialog(true); }}>ط§ظپط²ظˆط¯ظ† ظ…ط¨ظ†ط§غŒ ظ‚غŒظ…طھ</Button>
      </Stack>

      <Stack spacing={0.75}>
        {baseList.map(b => (
          <Paper key={b.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptLongIcon fontSize="small" color="warning" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={700}>{b.price_list_name || 'ط¨ط¯ظˆظ† ظپظ‡ط±ط³طھ'} {b.version_label ? `آ· ظ†ط³ط®ظ‡ ${b.version_label}` : ''}</Typography>
              {b.pricing_method && <Typography variant="caption" color="textSecondary">ط±ظˆط´: {b.pricing_method}</Typography>}
            </Box>
            <IconButton size="small" color="error" onClick={() => { if (window.confirm('ط­ط°ظپطں')) remove.mutate(b.id); }}><DeleteIcon fontSize="small" /></IconButton>
          </Paper>
        ))}
        {baseList.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">ظ…ط¨ظ†ط§غŒغŒ ظ†غŒط³طھ</Typography>}
      </Stack>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>ظ…ط¨ظ†ط§غŒ ظ‚غŒظ…طھ ظ‚ط±ط§ط±ط¯ط§ط¯</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <FormControl size="small" fullWidth><InputLabel>ظپظ‡ط±ط³طھâ€Œط¨ظ‡ط§</InputLabel>
            <Select value={form.price_list || ''} label="ظپظ‡ط±ط³طھâ€Œط¨ظ‡ط§" onChange={e => setForm(p => ({ ...p, price_list: e.target.value, price_list_version: '' }))}>
              <MenuItem value="">â€”</MenuItem>
              {priceLists.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth><InputLabel>ظ†ط³ط®ظ‡</InputLabel>
            <Select value={form.price_list_version || ''} label="ظ†ط³ط®ظ‡" onChange={e => setForm(p => ({ ...p, price_list_version: e.target.value }))}>
              <MenuItem value="">â€”</MenuItem>
              {versionList.map(v => <MenuItem key={v.id} value={v.id}>{v.version}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="ط±ظˆط´ ظ‚غŒظ…طھâ€Œع¯ط°ط§ط±غŒ" value={form.pricing_method || ''} onChange={e => setForm(p => ({ ...p, pricing_method: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" onClick={() => save.mutate({ contract: contractId, ...form })}
            sx={{ background: 'linear-gradient(135deg,#f59e0b,#8b5cf6)' }}>ط°ط®غŒط±ظ‡</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

/* ---------------- PriceListItem ---------------- */
const PriceItemManager = () => {
  const qc = useQueryClient();
  const [priceListId, setPriceListId] = useState('');
  const [versionId, setVersionId] = useState('');
  const [chapterId, setChapterId] = useState('');
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState({});

  const { data: plist } = useQuery({ queryKey: ['price-lists-pi'], queryFn: () => axiosInstance.get('/price-lists/').then(r => r.data) });
  const priceLists = Array.isArray(plist) ? plist : plist?.results || [];

  const { data: versions } = useQuery({ queryKey: ['pl-versions-pi', priceListId], queryFn: () => axiosInstance.get('/price-list-versions/', { params: { price_list: priceListId } }).then(r => r.data), enabled: !!priceListId });
  const versionList = Array.isArray(versions) ? versions : versions?.results || [];

  const { data: chapters } = useQuery({ queryKey: ['pl-chapters-pi', versionId], queryFn: () => axiosInstance.get('/price-list-chapters/', { params: { version: versionId } }).then(r => r.data), enabled: !!versionId });
  const chapterList = Array.isArray(chapters) ? chapters : chapters?.results || [];

  const { data: items } = useQuery({ queryKey: ['pl-items-pi', chapterId], queryFn: () => axiosInstance.get('/price-list-items/', { params: { chapter: chapterId } }).then(r => r.data), enabled: !!chapterId });
  const itemList = Array.isArray(items) ? items : items?.results || [];

  const save = useMutation({
    mutationFn: (p) => axiosInstance.post('/price-list-items/', p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pl-items-pi'] }); setDialog(false); setForm({}); },
  });
  const remove = useMutation({ mutationFn: (id) => axiosInstance.delete(`/price-list-items/${id}/`), onSuccess: () => qc.invalidateQueries({ queryKey: ['pl-items-pi'] }) });

  return (
    <Paper sx={{ ...glassPaper, p: 2 }}>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}><InputLabel>ظپظ‡ط±ط³طھâ€Œط¨ظ‡ط§</InputLabel>
          <Select value={priceListId || ''} label="ظپظ‡ط±ط³طھâ€Œط¨ظ‡ط§" onChange={e => { setPriceListId(e.target.value); setVersionId(''); setChapterId(''); }}>
            {priceLists.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}><InputLabel>ظ†ط³ط®ظ‡</InputLabel>
          <Select value={versionId || ''} label="ظ†ط³ط®ظ‡" onChange={e => { setVersionId(e.target.value); setChapterId(''); }}>
            {versionList.map(v => <MenuItem key={v.id} value={v.id}>{v.version}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}><InputLabel>ظپطµظ„</InputLabel>
          <Select value={chapterId || ''} label="ظپطµظ„" onChange={e => setChapterId(e.target.value)}>
            {chapterList.map(ch => <MenuItem key={ch.id} value={ch.id}>{ch.code} - {ch.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Button size="small" startIcon={<AddIcon />} variant="outlined" disabled={!chapterId}
          onClick={() => { setForm({ chapter: chapterId }); setDialog(true); }}>ط§ظپط²ظˆط¯ظ† ط±ط¯غŒظپ</Button>
      </Stack>

      <Stack spacing={0.75}>
        {itemList.map(it => (
          <Paper key={it.id} variant="outlined" sx={{ p: 1, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={700}>{it.code} â€” {it.description}</Typography>
              <Typography variant="caption" color="textSecondary">{formatPersianNumber(it.price)} / {it.unit || 'â€”'}</Typography>
            </Box>
            <IconButton size="small" color="error" onClick={() => { if (window.confirm('ط­ط°ظپطں')) remove.mutate(it.id); }}><DeleteIcon fontSize="small" /></IconButton>
          </Paper>
        ))}
        {itemList.length === 0 && <Typography variant="caption" color="textSecondary" textAlign="center">ط±ط¯غŒظپغŒ ظ†غŒط³طھ</Typography>}
      </Stack>

      <Dialog open={dialog} onClose={() => setDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>ط±ط¯غŒظپ ظپظ‡ط±ط³طھâ€Œط¨ظ‡ط§</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField size="small" label="ع©ط¯" value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
          <TextField size="small" label="ط´ط±ط­" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          <Grid container spacing={1.5}>
            <Grid item xs={6}><TextField size="small" label="ظˆط§ط­ط¯" value={form.unit || ''} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))} /></Grid>
            <Grid item xs={6}><TextField size="small" label="ظ†ط±ط®" type="number" value={form.price ?? ''} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" onClick={() => save.mutate({ ...form, price: Number(form.price) || 0 })}
            sx={{ background: 'linear-gradient(135deg,#f59e0b,#8b5cf6)' }}>ط°ط®غŒط±ظ‡</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default CommercialPage;