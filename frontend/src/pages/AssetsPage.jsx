import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Paper, Button, IconButton, Chip, Avatar, Grid,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, TextField, CircularProgress, Stack, Tooltip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LaptopIcon from '@mui/icons-material/Laptop';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import DesktopAccessDisabledIcon from '@mui/icons-material/DesktopAccessDisabled';
import KeyIcon from '@mui/icons-material/Key';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import UndoIcon from '@mui/icons-material/Undo';
import JalaliDatePicker from '../core/components/ui/JalaliDatePicker';
import { useAssets, useCreateAsset, useReturnAsset } from '../core/hooks/useLifecycle';
import { useEmployees } from '../core/hooks/useEmployees';
import { toPersianDigits, formatPersianNumber } from '../core/utils/numberUtils';

const TYPE_META = {
  laptop: { label: 'ظ„ظ¾â€Œطھط§ظ¾', icon: <LaptopIcon fontSize="small" />, color: '#6366f1' },
  phone: { label: 'ظ…ظˆط¨ط§غŒظ„', icon: <PhoneAndroidIcon fontSize="small" />, color: '#10b981' },
  desk: { label: 'ظ…غŒط² ع©ط§ط±', icon: <DesktopAccessDisabledIcon fontSize="small" />, color: '#f59e0b' },
  monitor: { label: 'ظ…ط§ظ†غŒطھظˆط±', icon: <Inventory2Icon fontSize="small" />, color: '#3b82f6' },
  key: { label: 'ع©ظ„غŒط¯', icon: <KeyIcon fontSize="small" />, color: '#8b5cf6' },
  other: { label: 'ط³ط§غŒط±', icon: <Inventory2Icon fontSize="small" />, color: '#94a3b8' },
};

const STATUS_META = {
  assigned: { label: 'ظˆط§ع¯ط°ط§ط±ط´ط¯ظ‡', color: '#10b981' },
  returned: { label: 'طھط­ظˆغŒظ„â€Œط´ط¯ظ‡', color: '#64748b' },
  lost: { label: 'ظ…ظپظ‚ظˆط¯', color: '#ef4444' },
  damaged: { label: 'ط¢ط³غŒط¨â€Œط¯غŒط¯ظ‡', color: '#f59e0b' },
};

const emptyForm = {
  name: '', asset_type: 'laptop', serial_number: '',
  employee: '', assigned_date: '', return_due_date: '', notes: '',
};

const AssetsPage = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState('');

  const { data: assets, isLoading } = useAssets();
  const { data: employees } = useEmployees({ is_active: true });
  const empList = Array.isArray(employees) ? employees : employees?.results || [];

  const createMutation = useCreateAsset();
  const returnMutation = useReturnAsset();

  const items = Array.isArray(assets) ? assets : assets?.results || [];
  const filtered = filter ? items.filter((a) => String(a.employee) === String(filter)) : items;

  const openAdd = () => { setForm(emptyForm); setOpen(true); };

  const doCreate = () => {
    createMutation.mutate(form, { onSuccess: () => { setOpen(false); setForm(emptyForm); } });
  };

  const countAssigned = items.filter((a) => a.status === 'assigned').length;

  return (
    <Box>
      {/* Header */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(120deg, rgba(16,185,129,0.09), rgba(59,130,246,0.04), rgba(255,255,255,0.3))',
        border: '1px solid rgba(16,185,129,0.16)', borderRadius: '10px',
      }}>
        <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #10b981, #3b82f6)', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}>
          <Inventory2Icon sx={{ color: '#fff', fontSize: 28 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#047857">ط§ظ…ظˆط§ظ„ ظˆ طھط¬ظ‡غŒط²ط§طھ</Typography>
          <Typography variant="body2" color="textSecondary">
            {formatPersianNumber(countAssigned)} طھط¬ظ‡غŒط² ط¯ط± ط­ط§ظ„ ظˆط§ع¯ط°ط§ط±غŒ آ· {formatPersianNumber(items.length)} ظ…ط¬ظ…ظˆط¹
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}
          sx={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', borderRadius: '10px', px: 2.5 }}>
          ط«ط¨طھ طھط¬ظ‡غŒط²
        </Button>
      </Paper>

      {/* Filter */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: '10px', background: 'rgba(255,255,255,0.6)' }}>
        <FormControl sx={{ minWidth: { xs: '100%', md: 280 } }} size="small">
          <InputLabel>ظپغŒظ„طھط± ط¨ط± ط§ط³ط§ط³ ظ¾ط±ط³ظ†ظ„</InputLabel>
          <Select value={filter || ''} label="ظپغŒظ„طھط± ط¨ط± ط§ط³ط§ط³ ظ¾ط±ط³ظ†ظ„" onChange={(e) => setFilter(e.target.value)}>
            <MenuItem value="">ظ‡ظ…ظ‡</MenuItem>
            {empList.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name} ({e.employee_id})</MenuItem>)}
          </Select>
        </FormControl>
      </Paper>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden' }}>
        {isLoading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="textSecondary">طھط¬ظ‡غŒط²غŒ ط«ط¨طھ ظ†ط´ط¯ظ‡ ط§ط³طھ</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <table dir="rtl" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ textAlign: 'right', background: 'rgba(16,185,129,0.06)', color: '#475569', fontSize: '0.78rem' }}>
                  <th style={{ padding: '10px 14px' }}>طھط¬ظ‡غŒط²</th>
                  <th style={{ padding: '10px 14px' }}>ظ†ظˆط¹</th>
                  <th style={{ padding: '10px 14px' }}>ط³ط±غŒط§ظ„</th>
                  <th style={{ padding: '10px 14px' }}>ظ¾ط±ط³ظ†ظ„</th>
                  <th style={{ padding: '10px 14px' }}>ظˆط§ع¯ط°ط§ط±غŒ</th>
                  <th style={{ padding: '10px 14px' }}>ظˆط¶ط¹غŒطھ</th>
                  <th style={{ padding: '10px 14px' }}>ط§ظ‚ط¯ط§ظ…</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const tm = TYPE_META[a.asset_type] || TYPE_META.other;
                  const sm = STATUS_META[a.status] || STATUS_META.assigned;
                  return (
                    <tr key={a.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, bgcolor: tm.color }}>{tm.icon}</Avatar>
                          <Typography variant="body2" fontWeight={600}>{a.name}</Typography>
                        </Box>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <Chip size="small" label={a.asset_type_display || tm.label}
                          sx={{ bgcolor: `${tm.color}15`, color: tm.color, fontWeight: 700 }} />
                      </td>
                      <td style={{ padding: '10px 14px' }}>{a.serial_number || 'â€”'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Typography variant="body2">{a.employee_name || 'â€”'}</Typography>
                      </td>
                      <td style={{ padding: '10px 14px' }}>{a.assigned_date ? toPersianDigits(a.assigned_date) : 'â€”'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <Chip size="small" label={a.status_display || sm.label}
                          sx={{ bgcolor: `${sm.color}15`, color: sm.color, fontWeight: 700 }} />
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {a.status !== 'returned' && (
                          <Tooltip title="طھط­ظˆغŒظ„">
                            <IconButton size="small" color="success" onClick={() => returnMutation.mutate(a.id)}>
                              <UndoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}
      </Paper>

      {/* Add dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#047857' }}>ط«ط¨طھ طھط¬ظ‡غŒط²</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <TextField fullWidth size="small" label="ظ†ط§ظ… طھط¬ظ‡غŒط² *" value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <FormControl fullWidth size="small">
            <InputLabel>ظ†ظˆط¹</InputLabel>
            <Select value={form.asset_type} label="ظ†ظˆط¹" onChange={(e) => setForm((p) => ({ ...p, asset_type: e.target.value }))}>
              {Object.entries(TYPE_META).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth size="small" label="ط³ط±غŒط§ظ„ / ط´ظ†ط§ط³ظ‡" value={form.serial_number}
            onChange={(e) => setForm((p) => ({ ...p, serial_number: e.target.value }))} />
          <FormControl fullWidth size="small">
            <InputLabel>ظ¾ط±ط³ظ†ظ„ ظˆط§ع¯ط°ط§ط±ط´ط¯ظ‡</InputLabel>
            <Select value={form.employee || ''} label="ظ¾ط±ط³ظ†ظ„ ظˆط§ع¯ط°ط§ط±ط´ط¯ظ‡" onChange={(e) => setForm((p) => ({ ...p, employee: e.target.value }))}>
              <MenuItem value="">ط¨ط¯ظˆظ† ظ¾ط±ط³ظ†ظ„</MenuItem>
              {empList.map((e) => <MenuItem key={e.id} value={e.id}>{e.full_name}</MenuItem>)}
            </Select>
          </FormControl>
          <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ظˆط§ع¯ط°ط§ط±غŒ" value={form.assigned_date}
            onChange={(g) => setForm((p) => ({ ...p, assigned_date: g }))} />
          <JalaliDatePicker fullWidth label="طھط§ط±غŒط® ط¨ط§ط²ع¯ط´طھ ظ…ظˆط±ط¯ ط§ظ†طھط¸ط§ط±" value={form.return_due_date}
            onChange={(g) => setForm((p) => ({ ...p, return_due_date: g }))} />
          <TextField fullWidth size="small" label="غŒط§ط¯ط¯ط§ط´طھ" multiline rows={2} value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>ط§ظ†طµط±ط§ظپ</Button>
          <Button variant="contained" disabled={!form.name} onClick={doCreate}
            sx={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
            ط«ط¨طھ
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AssetsPage;