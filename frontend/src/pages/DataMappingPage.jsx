import React, { useState, useRef } from 'react';
import {
  Box, Typography, Paper, Button, Tabs, Tab, Chip, Avatar, Grid, Stack,
  Select, MenuItem, FormControl, InputLabel, TextField, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Switch, FormControlLabel, LinearProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import HubIcon from '@mui/icons-material/Hub';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CategoryIcon from '@mui/icons-material/Category';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import DescriptionIcon from '@mui/icons-material/Description';
import axiosInstance from '../core/api/axiosConfig';
import { toPersianDigits, formatPersianNumber } from '../core/utils/numberUtils';

const LEVELS = [
  { key: 'group', label: 'گروه حساب', color: '#6366f1', icon: <CategoryIcon fontSize="small" /> },
  { key: 'general', label: 'حساب کل', color: '#10b981', icon: <AccountTreeIcon fontSize="small" /> },
  { key: 'subsidiary', label: 'حساب معین', color: '#0ea5e9', icon: <ReceiptLongIcon fontSize="small" /> },
  { key: 'auxiliary', label: 'حساب تفصیلی', color: '#f59e0b', icon: <HubIcon fontSize="small" /> },
];

const DataMappingPage = () => {
  const [tab, setTab] = useState(0);
  const [level, setLevel] = useState('subsidiary');
  const [kind, setKind] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [sources, setSources] = useState([]);
  const [options, setOptions] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [codingMsg, setCodingMsg] = useState('');
  const [codingErr, setCodingErr] = useState('');
  const codingFileRef = useRef(null);
  const [postNow, setPostNow] = useState(false);
  const [docSourceId, setDocSourceId] = useState('');
  const [docLoading, setDocLoading] = useState(false);
  const [docResult, setDocResult] = useState(null);
  const [docMsg, setDocMsg] = useState('');
  const [docErr, setDocErr] = useState('');
  const docFileRef = useRef(null);
  const [auxSources, setAuxSources] = useState([]);
  const [auxSyncing, setAuxSyncing] = useState('');
  const [auxMsg, setAuxMsg] = useState('');
  const [auxErr, setAuxErr] = useState('');

  const loadSources = async () => {
    try {
      const r = await axiosInstance.get('/datamapping/sources/');
      setSources(Array.isArray(r.data) ? r.data : r.data?.results || []);
    } catch (e) { /* ignore */ }
  };

  const loadOptions = async (lvl) => {
    try {
      const r = await axiosInstance.get('/datamapping/options/', { params: { level: lvl } });
      setOptions(Array.isArray(r.data) ? r.data : []);
    } catch (e) { /* ignore */ }
  };

  React.useEffect(() => { loadSources(); }, []);
  React.useEffect(() => { loadOptions(level); }, [level]);

  const createSource = async () => {
    const name = window.prompt('نام برنامه مبدا (مثلاً سپیدار، هلو، نوین):');
    if (!name) return;
    try {
      const r = await axiosInstance.post('/datamapping/sources/', { name });
      setSources((s) => [...s, r.data]);
      setSourceId(r.data.id);
    } catch (e) {
      setCodingErr(e.response?.data?.error || 'خطا در ساخت منبع');
    }
  };

  const onPickDocFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setDocErr('');
    setDocResult(null);
    setDocLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('post', String(postNow));
      if (docSourceId) fd.append('source_id', docSourceId);
      const r = await axiosInstance.post('/datamapping/import-documents/', fd);
      setDocResult(r.data);
      setDocMsg(r.data.message);
    } catch (err) {
      setDocErr(err.response?.data?.error || 'خطا در ایمپورت اسناد');
    } finally {
      setDocLoading(false);
    }
  };

  const onPickCodingFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCodingErr('');
    setPreviewLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('level', level);
      if (kind) fd.append('kind', kind);
      if (sourceId) fd.append('source_id', sourceId);
      const r = await axiosInstance.post('/datamapping/preview/', fd);
      setPreviewRows((r.data.rows || []).map((row) => ({
        ...row,
        action: row.matched_target_id ? 'matched' : (row.source_name ? 'new' : 'ignore'),
        target_id: row.matched_target_id || '',
        new_name: row.source_name || '',
      })));
    } catch (err) {
      setCodingErr(err.response?.data?.error || 'خطا در خواندن فایل');
      setPreviewRows([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const setRow = (idx, patch) => {
    setPreviewRows((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const doApply = async () => {
    setApplying(true);
    setCodingMsg('');
    setCodingErr('');
    try {
      const payload = {
        level,
        kind: kind || '',
        source_id: sourceId || null,
        rows: previewRows.map((r) => ({
          source_code: r.source_code,
          source_name: r.source_name,
          parent_name: r.parent_name || '',
          action: r.action,
          target_id: r.target_id,
          new_name: r.new_name,
        })),
      };
      const r = await axiosInstance.post('/datamapping/apply/', payload);
      const d = r.data;
      setCodingMsg(`نگاشت اعمال شد: ${formatPersianNumber(d.mapped)} تطبیق‌شده، ${formatPersianNumber(d.created)} ایجاد جدید، ${formatPersianNumber(d.ignored)} نادیده`);
      setPreviewRows([]);
    } catch (err) {
      setCodingErr(err.response?.data?.error || 'خطا در اعمال نگاشت');
    } finally {
      setApplying(false);
    }
  };

  const clearAll = async () => {
    const ok1 = window.confirm('هشدار: همه گروه‌ها، حساب‌ها (کل/معین)، تفصیلی‌ها، نگاشت‌ها و اسناد حسابداری حذف می‌شوند. ادامه می‌دهید؟');
    if (!ok1) return;
    const ok2 = window.prompt('برای تأیید نهایی عبارت DELETE را بنویسید:');
    if (ok2 !== 'DELETE') {
      setCodingErr('حذف لغو شد (عبارت تأیید درست نبود).');
      return;
    }
    try {
      const r = await axiosInstance.post('/datamapping/clear-codings/', { confirm: 'DELETE' });
      const d = r.data.deleted || {};
      setCodingMsg(`حذف شد: ${formatPersianNumber(d.groups || 0)} گروه، ${formatPersianNumber(d.generals || 0)} کل، ${formatPersianNumber(d.subsidiaries || 0)} معین، ${formatPersianNumber(d.auxiliaries || 0)} تفصیل`);
      setPreviewRows([]);
    } catch (err) {
      setCodingErr(err.response?.data?.error || 'خطا در حذف');
    }
  };

  const downloadTemplate = async () => {
    try {
      const r = await axiosInstance.get('/datamapping/template/', { params: { level }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${level}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setCodingErr('خطا در دانلود نمونه');
    }
  };

  const loadAuxSources = async () => {
    try {
      const r = await axiosInstance.get('/datamapping/auxiliary-sources/');
      setAuxSources(Array.isArray(r.data) ? r.data : []);
    } catch (e) { /* ignore */ }
  };

  React.useEffect(() => { loadAuxSources(); }, [tab]);

  const syncKind = async (kind) => {
    setAuxSyncing(kind);
    setAuxMsg('');
    setAuxErr('');
    try {
      const r = await axiosInstance.post('/datamapping/sync-auxiliaries/', { kinds: [kind] });
      const d = r.data;
      setAuxMsg(`همگام‌سازی شد: ${formatPersianNumber(d.created)} جدید، ${formatPersianNumber(d.updated)} موجود`);
      loadAuxSources();
    } catch (err) {
      setAuxErr(err.response?.data?.error || 'خطا در همگام‌سازی');
    } finally {
      setAuxSyncing('');
    }
  };

  const syncAllAux = async () => {
    setAuxSyncing('__all__');
    setAuxMsg('');
    setAuxErr('');
    try {
      const r = await axiosInstance.post('/datamapping/sync-auxiliaries/', {});
      const d = r.data;
      setAuxMsg(`همگام‌سازی همه: ${formatPersianNumber(d.created)} جدید، ${formatPersianNumber(d.updated)} موجود`);
      loadAuxSources();
    } catch (err) {
      setAuxErr(err.response?.data?.error || 'خطا در همگام‌سازی');
    } finally {
      setAuxSyncing('');
    }
  };



  const renderCoding = () => (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(100,116,139,0.14)' }}>
        <Typography variant="subtitle2" fontWeight={800} color="#3730a3" mb={1.5}>۱) سطح کدینگ و منبع داده را انتخاب کنید</Typography>
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
          {LEVELS.map((l) => (
            <Grid item xs={6} sm={3} key={l.key}>
              <Paper onClick={() => { setLevel(l.key); setPreviewRows([]); }}
                sx={{
                  p: 1.25, cursor: 'pointer', borderRadius: '12px', textAlign: 'center',
                  border: level === l.key ? `2px solid ${l.color}` : '1px solid rgba(100,116,139,0.18)',
                  background: level === l.key ? `${l.color}14` : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.2s ease',
                }}>
                <Box sx={{ color: l.color, display: 'flex', justifyContent: 'center', mb: 0.5 }}>{l.icon}</Box>
                <Typography variant="caption" fontWeight={800} sx={{ color: level === l.key ? l.color : 'text.secondary' }}>{l.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>برنامه مبدا</InputLabel>
            <Select value={sourceId || ''} label="برنامه مبدا" onChange={(e) => setSourceId(e.target.value)}>
              <MenuItem value="">بدون منبع (عمومی)</MenuItem>
              {sources.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={createSource}
            sx={{ borderRadius: '10px', whiteSpace: 'nowrap' }}>منبع جدید</Button>
          {level === 'auxiliary' && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>دسته تفصیلی</InputLabel>
              <Select value={kind || ''} label="دسته تفصیلی" onChange={(e) => setKind(e.target.value)}>
                <MenuItem value="">همه دسته‌ها</MenuItem>
                {auxSources.map((s) => <MenuItem key={s.kind} value={s.kind}>{s.category}</MenuItem>)}
              </Select>
            </FormControl>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(100,116,139,0.14)' }}>
        <Typography variant="subtitle2" fontWeight={800} color="#3730a3" mb={1}>۲) فایل اکسل کدینگ را آپلود کنید</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => codingFileRef.current?.click()}
            sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '10px', px: 3 }}>
            انتخاب فایل اکسل
          </Button>
          <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={downloadTemplate}
            sx={{ borderRadius: '10px', whiteSpace: 'nowrap' }}>
            دانلود نمونه اکسل
          </Button>
          <Button variant="outlined" color="error" onClick={clearAll}
            sx={{ borderRadius: '10px', whiteSpace: 'nowrap' }}>
            حذف همه کدینگ‌ها
          </Button>
          <Typography variant="caption" color="textSecondary">
            ستون‌های «کد» و «عنوان» (یا نام) به‌صورت خودکار شناسایی می‌شوند.
          </Typography>
          <input ref={codingFileRef} type="file" hidden accept=".xlsx,.xls" onChange={onPickCodingFile} />
        </Box>
        {previewLoading && <LinearProgress sx={{ mt: 1.5, borderRadius: '10px' }} />}
      </Paper>

      {(codingMsg || codingErr) && (
        <Alert severity={codingErr ? 'error' : 'success'} onClose={() => { setCodingMsg(''); setCodingErr(''); }}>
          {codingErr || codingMsg}
        </Alert>
      )}

      {previewRows.length > 0 && (
        <Paper variant="outlined" sx={{ borderRadius: '14px', overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(100,116,139,0.12)' }}>
            <Typography variant="subtitle2" fontWeight={800} color="#3730a3">
              پیش‌نمایش تطبیق ({toPersianDigits(previewRows.length)} ردیف)
            </Typography>
            <Button variant="contained" startIcon={<PlaylistAddCheckIcon />} onClick={doApply} disabled={applying}
              sx={{ background: 'linear-gradient(135deg, #10b981, #0ea5e9)', borderRadius: '10px' }}>
              {applying ? 'در حال اعمال...' : 'اعمال نگاشت'}
            </Button>
          </Box>
          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(99,102,241,0.06)' }}>
                  <TableCell sx={{ fontWeight: 700 }}>کد مبدا</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>عنوان مبدا</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>والد</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>پیشنهاد خودکار</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>اقدام</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>هدف / عنوان جدید</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewRows.map((r, idx) => (
                  <TableRow key={idx} hover sx={{ bgcolor: r.action === 'ignore' ? 'rgba(100,116,139,0.05)' : 'transparent' }}>
                    <TableCell sx={{ direction: 'ltr', textAlign: 'left' }}>{toPersianDigits(r.source_code)}</TableCell>
                    <TableCell>{r.source_name}</TableCell>
                    <TableCell sx={{ direction: 'ltr', textAlign: 'left' }}>{toPersianDigits(r.parent_name)}</TableCell>
                    <TableCell>
                      {r.matched_target_name ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <CheckCircleIcon fontSize="small" sx={{ color: r.is_exact ? '#10b981' : '#f59e0b' }} />
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{r.matched_target_name}</Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ direction: 'ltr', display: 'block' }}>
                              {toPersianDigits(r.matched_target_code)} · {toPersianDigits(Math.round(r.match_score * 100))}٪
                            </Typography>
                          </Box>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="textSecondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select value={r.action} onChange={(e) => setRow(idx, { action: e.target.value })}>
                          <MenuItem value="matched">تطبیق</MenuItem>
                          <MenuItem value="new">ایجاد جدید</MenuItem>
                          <MenuItem value="ignore">نادیده</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      {r.action === 'matched' ? (
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                          <Select value={r.target_id || ''} onChange={(e) => setRow(idx, { target_id: e.target.value })}>
                            {options.map((o) => <MenuItem key={o.id} value={o.id}>{o.code} - {o.name}</MenuItem>)}
                          </Select>
                        </FormControl>
                      ) : r.action === 'new' ? (
                        <TextField size="small" value={r.new_name} onChange={(e) => setRow(idx, { new_name: e.target.value })}
                          placeholder="عنوان جدید" />
                      ) : (
                        <Typography variant="caption" color="textSecondary">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Stack>
  );


  const renderDocuments = () => (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(100,116,139,0.14)' }}>
        <Typography variant="subtitle2" fontWeight={800} color="#0f766e" mb={1}>ایمپورت اسناد حسابداری از اکسل</Typography>
        <Typography variant="caption" color="textSecondary" display="block" mb={1.5}>
          ستون‌های «شماره سند»، «تاریخ»، «شرح»، «کد حساب/معین»، «شرح سطر»، «بدهکار»، «بستانکار» و «تفصیل» به‌صورت خودکار شناسایی می‌شوند.
          کدهای مبدا با نگاشت‌های انجام‌شده (یا کدهای موجود) تطبیق داده شده و سند حسابداری ساخته می‌شود.
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel>برنامه مبدا (منبع)</InputLabel>
            <Select value={docSourceId || ''} label="برنامه مبدا (منبع)" onChange={(e) => setDocSourceId(e.target.value)}>
              <MenuItem value="">همه / عمومی</MenuItem>
              {sources.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => docFileRef.current?.click()}
            sx={{ background: 'linear-gradient(135deg, #10b981, #0ea5e9)', borderRadius: '10px', px: 3 }}>
            انتخاب فایل اسناد
          </Button>
          <FormControlLabel
            control={<Switch checked={postNow} onChange={(e) => setPostNow(e.target.checked)} />}
            label={<Typography variant="body2" fontWeight={700}>ثبت نهایی سند (posted)</Typography>} />
          <input ref={docFileRef} type="file" hidden accept=".xlsx,.xls" onChange={onPickDocFile} />
        </Stack>
        {docLoading && <LinearProgress sx={{ mt: 1.5, borderRadius: '10px' }} />}
      </Paper>

      {(docMsg || docErr) && (
        <Alert severity={docErr ? 'error' : 'success'} onClose={() => { setDocMsg(''); setDocErr(''); }}>
          {docErr || docMsg}
        </Alert>
      )}

      {docResult && (
        <Paper sx={{ p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(100,116,139,0.14)' }}>
          <Typography variant="subtitle2" fontWeight={800} color="#0f766e" mb={1.5}>نتیجه ایمپورت</Typography>
          <Grid container spacing={1.5}>
            {[
              { label: 'اسناد ساخته‌شده', value: docResult.created_documents, color: '#6366f1' },
              { label: 'سطرهای ثبت‌شده', value: docResult.created_lines, color: '#10b981' },
              { label: 'کدهای حل‌نشده', value: (docResult.unresolved_codes || []).length, color: '#ef4444' },
            ].map((k) => (
              <Grid item xs={4} key={k.label}>
                <Paper sx={{ p: 1.5, borderRadius: '12px', textAlign: 'center', background: `${k.color}12`, border: `1px solid ${k.color}30` }}>
                  <Typography variant="h5" fontWeight={900} sx={{ color: k.color, direction: 'ltr' }}>{formatPersianNumber(k.value)}</Typography>
                  <Typography variant="caption" color="textSecondary" fontWeight={700}>{k.label}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
          {docResult.unresolved_codes && docResult.unresolved_codes.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="#b91c1c" fontWeight={700}>کدهای بدون نگاشت:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 0.5 }}>
                {docResult.unresolved_codes.map((c) => (
                  <Chip key={c} size="small" label={toPersianDigits(c)} sx={{ direction: 'ltr', bgcolor: 'rgba(239,68,68,0.1)', color: '#b91c1c' }} />
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      )}
    </Stack>
  );

  const renderAuxiliaries = () => (
    <Stack spacing={2}>
      <Paper sx={{ p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(100,116,139,0.14)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={800} color="#9a3412">ساخت تفصیلی‌ها از ماژول‌ها (دسته به دسته)</Typography>
          <Button variant="contained" onClick={syncAllAux} disabled={!!auxSyncing}
            sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: '10px' }}>
            {auxSyncing === '__all__' ? 'در حال همگام‌سازی...' : 'ساخت همه'}
          </Button>
        </Box>
        <Typography variant="caption" color="textSecondary" display="block" mb={1.5}>
          تفصیلی‌ها مستقیماً از موجودیت‌های هر ماژول ساخته می‌شوند و در دستهٔ مربوطه قرار می‌گیرند.
        </Typography>
        {(auxMsg || auxErr) && (
          <Alert severity={auxErr ? 'error' : 'success'} onClose={() => { setAuxMsg(''); setAuxErr(''); }} sx={{ mb: 1.5 }}>
            {auxErr || auxMsg}
          </Alert>
        )}
        <Grid container spacing={1.5}>
          {auxSources.map((s) => (
            <Grid item xs={12} sm={6} md={4} key={s.kind}>
              <Paper sx={{
                p: 1.75, borderRadius: '14px', border: '1px solid rgba(100,116,139,0.14)',
                background: 'rgba(255,255,255,0.6)', height: '100%', display: 'flex', flexDirection: 'column', gap: 0.5,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={800}>{s.label}</Typography>
                  <Chip size="small" label={`${formatPersianNumber(s.count)} مورد`} sx={{ fontWeight: 700 }} />
                </Box>
                <Typography variant="caption" color="textSecondary">ماژول: {s.module}</Typography>
                <Typography variant="caption" color="textSecondary">دسته: {s.category}</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => syncKind(s.kind)} disabled={!!auxSyncing}
                    sx={{ borderRadius: '8px', whiteSpace: 'nowrap', flex: 1 }}>
                    {auxSyncing === s.kind ? 'در حال ساخت...' : 'ساخت'}
                  </Button>
                  <Button size="small" variant="outlined" color="secondary" onClick={() => { setLevel('auxiliary'); setKind(s.kind); setTab(0); }}
                    sx={{ borderRadius: '8px', whiteSpace: 'nowrap', flex: 1 }}>
                    ایمپورت اکسل
                  </Button>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper sx={{ p: 2, borderRadius: '16px', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(100,116,139,0.14)' }}>
        <Typography variant="subtitle2" fontWeight={800} color="#9a3412" mb={1}>ایمپورت تفصیلی از اکسل (با دسته‌بندی)</Typography>
        <Typography variant="caption" color="textSecondary" display="block" mb={1.5}>
          ستون‌های «کد»، «عنوان» و «دسته» خوانده می‌شوند؛ اگر دسته در سیستم نباشد ساخته می‌شود.
        </Typography>
        <Button variant="contained" startIcon={<CloudUploadIcon />} onClick={() => setTab(0)}
          sx={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', borderRadius: '10px', px: 3 }}>
          ایمپورت از اکسل (تب نگاشت کدینگ)
        </Button>
      </Paper>
    </Stack>
  );

  return (
    <Box>
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(120deg, rgba(99,102,241,0.10), rgba(16,185,129,0.06), rgba(255,255,255,0.3))',
        border: '1px solid rgba(99,102,241,0.16)', borderRadius: '12px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #6366f1, #10b981)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
          <AutoFixHighIcon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color="#3730a3">نگاشت و ایمپورت داده</Typography>
          <Typography variant="body2" color="textSecondary">
            انتقال کدینگ و اسناد از برنامه حسابداری دیگر به‌صورت اکسل، با تطبیق خودکار عناوین
          </Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 1, mb: 2, borderRadius: '12px', background: 'rgba(255,255,255,0.6)' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AccountTreeIcon fontSize="small" /> نگاشت کدینگ</Box>} />
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><DescriptionIcon fontSize="small" /> ایمپورت اسناد</Box>} />
          <Tab label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><HubIcon fontSize="small" /> تفصیلی‌ها</Box>} />
        </Tabs>
      </Paper>

      {tab === 0 ? renderCoding() : tab === 1 ? renderDocuments() : renderAuxiliaries()}
    </Box>
  );
};

export default DataMappingPage;



