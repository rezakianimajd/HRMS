import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, CircularProgress, Alert, Avatar, Chip, Grid,
  IconButton, Tooltip, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem,
  OutlinedInput, ListItemText, Checkbox,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import DoneIcon from '@mui/icons-material/Done';
import PrintIcon from '@mui/icons-material/Print';
import { keyframes } from '@mui/system';

const fadeIn = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); }`;
const depthColors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

/* Pure-CSS tree connectors — reliable, always connected, no breaks.
 * The tree renders LTR (canonical org-chart geometry) while card text stays RTL. */
const treeCss = `
  .org-tree, .org-tree ul { margin:0; padding:0; list-style:none; }
  .org-tree li { list-style:none; }
  /* Canonical tree geometry is LTR (connectors use physical left/right).
     Children order is reversed in JSX so Persian reads right-to-left. */
  .org-tree { direction: ltr; }

  /* Every nested list is a horizontal row of children. */
  .org-tree ul {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    position: relative;
    padding-top: 22px;
  }
  .org-tree--root {
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .org-tree li {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 22px 4px 0 4px;
  }
  /* Root card(s) have no line above them */
  .org-tree--root > li { padding-top: 0; }

  /* Vertical trunk from a parent card down to the children horizontal bar */
  .org-tree li > ul::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    width: 0;
    height: 22px;
    border-left: 2px solid var(--line);
  }

  /* Horizontal bar + vertical drop for each child.
     ::before = left half of horizontal bar.
     ::after  = right half (border-top) + vertical drop at center (border-left). */
  .org-tree li > ul > li::before,
  .org-tree li > ul > li::after {
    content: '';
    position: absolute;
    top: 0;
    right: 50%;
    width: 50%;
    height: 22px;
    border-top: 2px solid var(--line);
  }
  .org-tree li > ul > li::after {
    right: auto;
    left: 50%;
    border-left: 2px solid var(--line);
  }
  .org-tree li > ul > li:only-child::before,
  .org-tree li > ul > li:only-child::after { display: none; }
  .org-tree li > ul > li:only-child { padding-top: 0; }
  .org-tree li > ul > li:first-child::before,
  .org-tree li > ul > li:last-child::after { border: 0 none; }
  .org-tree li > ul > li:last-child::before {
    border-right: 2px solid var(--line);
    border-top: 2px solid var(--line);
    border-radius: 0 8px 0 0;
  }
  .org-tree li > ul > li:first-child::after { border-radius: 8px 0 0 0; }
`;

const printCss = `
  @media screen {
    .orgchart-print-area {
      position: absolute;
      left: -99999px;
      top: 0;
      display: block;
      background: #fff;
      padding: 16px;
    }
  }
  @media print {
    html, body, #root { overflow: visible !important; height: auto !important; }
    body * { visibility: hidden !important; }
    .orgchart-print-area, .orgchart-print-area * { visibility: visible !important; }
    .orgchart-print-area {
      display: block !important;
      position: absolute;
      top: 0; left: 0;
      width: max-content;
      min-width: max-content;
      margin: 0;
      padding: 16px;
      background: #fff;
      zoom: 1;
    }
    .orgchart-print-area * { animation: none !important; opacity: 1 !important; }
  }
`;

const OrgChartPage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [posDialog, setPosDialog] = useState(false);
  const [editingPos, setEditingPos] = useState(null);
  const [posForm, setPosForm] = useState({ title: '', code: '', level: 1, parent: '', department: '' });
  const [occupantPos, setOccupantPos] = useState(null);
  const [selectedOccupants, setSelectedOccupants] = useState([]);
  const [focusId, setFocusId] = useState('');

  const { data: tree, isLoading, error } = useQuery({
    queryKey: ['orgchart-tree'],
    queryFn: () => axiosInstance.get('/org-chart/positions/tree/').then(r => r.data),
  });
  const { data: flatPositions } = useQuery({
    queryKey: ['orgchart-flat'],
    queryFn: () => axiosInstance.get('/org-chart/positions/list_all/').then(r => r.data),
  });
  const { data: departments } = useQuery({
    queryKey: ['departments-org'],
    queryFn: () => axiosInstance.get('/departments/').then(r => r.data),
  });
  const { data: employees } = useQuery({
    queryKey: ['emp-dropdown'],
    queryFn: () => axiosInstance.get('/employees/', { params: { page_size: 500 } }).then(r => r.data.results || r.data),
  });

  const savePosMutation = useMutation({
    mutationFn: (payload) =>
      editingPos
        ? axiosInstance.patch(`/org-chart/positions/${editingPos.id}/`, payload)
        : axiosInstance.post('/org-chart/positions/', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgchart-tree'] });
      queryClient.invalidateQueries({ queryKey: ['orgchart-flat'] });
      setPosDialog(false);
      setEditingPos(null);
    },
  });

  const deletePosMutation = useMutation({
    mutationFn: (id) => axiosInstance.delete(`/org-chart/positions/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgchart-tree'] });
      queryClient.invalidateQueries({ queryKey: ['orgchart-flat'] });
    },
  });

  const setOccupantsMutation = useMutation({
    mutationFn: ({ id, occupant_ids }) =>
      axiosInstance.post(`/org-chart/positions/${id}/set_occupants/`, { occupant_ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgchart-tree'] });
      setOccupantPos(null);
      setSelectedOccupants([]);
    },
  });

  const openAdd = () => {
    setEditingPos(null);
    setPosForm({ title: '', code: '', level: 1, parent: '', department: '' });
    setPosDialog(true);
  };

  const openAddChild = (node) => {
    setEditingPos(null);
    setPosForm({ title: '', code: '', level: (node.level || 1) + 1, parent: node.id, department: node.department_id || '' });
    setPosDialog(true);
  };

  const openEdit = (node) => {
    setEditingPos(node);
    setPosForm({
      title: node.title, code: node.code, level: node.level,
      parent: node.parent_id || '', department: node.department_id || '',
    });
    setPosDialog(true);
  };

  const openOccupants = async (node) => {
    setOccupantPos(node);
    try {
      const res = await axiosInstance.get(`/org-chart/positions/${node.id}/occupants/`);
      setSelectedOccupants((res.data || []).map(e => e.id));
    } catch {
      setSelectedOccupants([]);
    }
  };

  // Build a focused tree for a selected node: show ancestors chain (top) + target's full subtree.
  const getDisplayTree = () => {
    if (!tree || !tree.length) return [];
    if (!focusId) return tree;

    const map = {};
    const walk = (nodes) => { nodes.forEach(n => { map[n.id] = n; if (n.children) walk(n.children); }); };
    walk(tree);
    if (!map[focusId]) return tree;

    // ancestor chain from root to target (target already has full children)
    const chain = [];
    let cur = map[focusId];
    let guard = 0;
    while (cur && guard++ < 60) { chain.unshift(cur); cur = map[cur.parent_id]; }

    // rebuild: each ancestor keeps only the next node on path; target keeps full subtree
    let result = null;
    for (let i = chain.length - 1; i >= 0; i--) {
      const node = map[chain[i].id];
      result = { ...node, children: i === chain.length - 1 ? (node.children || []) : (result ? [result] : []) };
    }
    return [result];
  };
  const displayTree = getDisplayTree();

  const handlePrint = () => {
    const area = document.querySelector('.orgchart-print-area');
    if (area) {
      // Measure the off-screen print copy and scale it to fit A4 landscape.
      const contentWidth = area.scrollWidth || 1200;
      const pageWidth = 1123; // A4 landscape usable width at 96dpi
      const scale = Math.min(1, (pageWidth - 40) / contentWidth);
      area.style.zoom = scale;
    }
    setTimeout(() => window.print(), 100);
  };

  const OrgNode = ({ node, depth }) => {
    const color = depthColors[depth % depthColors.length];
    const hasChildren = node.children?.length > 0;
    const hasEmployees = node.employees?.length > 0;

    return (
      <Box component="li">
        {/* Card */}
          <Box sx={{
          direction: 'rtl',
          width: 190, px: 1.5, py: 1.25, borderRadius: 2,
          background: `linear-gradient(135deg, ${color}16, ${color}08)`,
          border: `1.2px solid ${color}45`,
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          textAlign: 'center', transition: 'all 0.25s ease',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          animation: `${fadeIn} 0.4s ease ${depth * 0.07}s both`,
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 22px ${color}22` },
        }}>
          <Typography variant="body2" fontWeight={700} sx={{ fontSize: 12.5, lineHeight: 1.35, color: '#1e293b' }}>{node.title}</Typography>
          {node.department_name && (
            <Typography variant="caption" sx={{ fontSize: 10, color: 'textSecondary', display: 'block', mb: 0.25 }}>{node.department_name}</Typography>
          )}

          {hasEmployees && (
            <Box sx={{ mt: 0.75, pt: 0.75, borderTop: `1px solid ${color}22`, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0.3 }}>
              {node.employees.slice(0, 4).map(emp => (
                <Chip key={emp.id} label={emp.full_name} size="small"
                  sx={{ fontSize: 9.5, height: 20, bgcolor: `${color}1c`, color: '#1e293b' }} />
              ))}
              {node.employees.length > 4 && <Chip label={`+${node.employees.length - 4}`} size="small" variant="outlined" sx={{ fontSize: 9.5, height: 20 }} />}
            </Box>
          )}

          {editMode && (
            <Box sx={{ direction: 'ltr', mt: 0.75, pt: 0.5, borderTop: `1px solid ${color}18`, display: 'flex', justifyContent: 'center', gap: 0.25 }}>
              <Tooltip title="افزودن زیرمجموعه"><IconButton size="small" sx={{ p: 0.5 }} onClick={() => openAddChild(node)}><AddIcon sx={{ fontSize: 16 }} color="success" /></IconButton></Tooltip>
              <Tooltip title="ویرایش جایگاه"><IconButton size="small" sx={{ p: 0.5 }} onClick={() => openEdit(node)}><EditIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
              <Tooltip title="افزودن پرسنل"><IconButton size="small" sx={{ p: 0.5 }} onClick={() => openOccupants(node)}><GroupAddIcon sx={{ fontSize: 15 }} color="primary" /></IconButton></Tooltip>
              <Tooltip title="حذف جایگاه"><IconButton size="small" sx={{ p: 0.5 }} onClick={() => deletePosMutation.mutate(node.id)}><DeleteIcon sx={{ fontSize: 14 }} color="error" /></IconButton></Tooltip>
            </Box>
          )}
        </Box>

          {hasChildren && (
          <Box component="ul" className="org-tree org-tree--nested" sx={{ '--line': color }}>
            {[...node.children].reverse().map(child => <OrgNode key={child.id} node={child} depth={depth + 1} />)}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box>
      <style>{treeCss}{printCss}</style>

      {/* Header - glass */}
      <Paper sx={{
        mb: 4, p: 2.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap',
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.05))',
        border: '1px solid rgba(99,102,241,0.2)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 56, height: 56, background: 'linear-gradient(135deg, #6366f1, #ec4899)', boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}>
            <AccountTreeIcon sx={{ fontSize: 28, color: '#fff' }} />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={800}>{t('orgchart.title')}</Typography>
            <Typography variant="body2" color="textSecondary">نمودار ساختار سازمانی</Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          {!editMode && (
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>تمرکز بر شاخه</InputLabel>
              <Select value={focusId} label="تمرکز بر شاخه" onChange={e => setFocusId(e.target.value)}>
                <MenuItem value="">نمایش کامل چارت</MenuItem>
                {(flatPositions || []).map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {editMode ? (
            <>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={openAdd}>افزودن جایگاه</Button>
              <Button variant="contained" color="success" startIcon={<DoneIcon />} onClick={() => setEditMode(false)}>
                ذخیره و خروج
              </Button>
            </>
          ) : (
            <>
              <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditMode(true)}>ویرایش چارت</Button>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>چاپ / PDF</Button>
            </>
          )}
        </Box>
      </Paper>

      {/* Tree */}
      <Paper sx={{
        p: 3, overflow: 'auto', minHeight: 400,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.35))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: 3,
        '@media print': {
          overflow: 'visible',
          minHeight: 'auto',
          borderRadius: 0,
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          background: 'none',
          p: 0,
        },
      }}>
        {isLoading ? (
          <Box sx={{ textAlign: 'center', p: 8 }}><CircularProgress /></Box>
        ) : error ? (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            خطا در دریافت چارت. دستور زیر را اجرا کنید:
            <Box component="code" sx={{ display: 'block', mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
              python manage.py setup_dev
            </Box>
          </Alert>
        ) : !tree || tree.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 8 }}>
            <AccountTreeIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="textSecondary" gutterBottom>چارت سازمانی خالی است</Typography>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>افزودن اولین جایگاه</Button>
          </Box>
        ) : (
          <Box className="orgchart-print-root" sx={{ display: 'flex', justifyContent: 'flex-start', gap: 6, pb: 4, minWidth: 'fit-content', minHeight: 'max-content' }}>
            {[...displayTree].reverse().map(root => (
              <Box key={root.id} component="ul" className="org-tree org-tree--root" sx={{ '--line': depthColors[0] }}>
                <OrgNode node={root} depth={0} />
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* Add/Edit Position Dialog */}
      <Dialog open={posDialog} onClose={() => setPosDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingPos ? 'ویرایش جایگاه' : 'افزودن جایگاه جدید'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="عنوان جایگاه" value={posForm.title || ''}
            onChange={e => setPosForm(p => ({ ...p, title: e.target.value }))} sx={{ mt: 1.5 }} required />
          <TextField fullWidth size="small" label="کد" value={posForm.code || ''}
            onChange={e => setPosForm(p => ({ ...p, code: e.target.value }))} sx={{ mt: 1.5 }} required />
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth size="small" label="سطح" type="number" value={posForm.level || 1}
                onChange={e => setPosForm(p => ({ ...p, level: Number(e.target.value) }))} />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>جایگاه بالادستی</InputLabel>
                <Select value={posForm.parent || ''} label="جایگاه بالادستی"
                  onChange={e => setPosForm(p => ({ ...p, parent: e.target.value }))}>
                  <MenuItem value="">— بدون بالادستی (ریشه) —</MenuItem>
                  {(flatPositions || []).filter(p => p.id !== editingPos?.id).map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
            <InputLabel>دپارتمان</InputLabel>
            <Select value={posForm.department || ''} label="دپارتمان"
              onChange={e => setPosForm(p => ({ ...p, department: e.target.value }))}>
              <MenuItem value="">— بدون دپارتمان —</MenuItem>
              {Array.isArray(departments) && departments.map(d => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPosDialog(false)}>انصراف</Button>
          <Button variant="contained" onClick={() => savePosMutation.mutate(posForm)} disabled={savePosMutation.isLoading}>
            {savePosMutation.isLoading ? <CircularProgress size={20} /> : 'ذخیره'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hidden print-only copy of the tree (outside any overflow container) */}
      {displayTree && displayTree.length > 0 && (
        <div className="orgchart-print-area" aria-hidden="true">
          <div style={{ display: 'flex', justifyContent: 'center', gap: 60 }}>
            {[...displayTree].reverse().map(root => (
              <ul key={`print-${root.id}`} className="org-tree org-tree--root" style={{ '--line': depthColors[0] }}>
                <OrgNode node={root} depth={0} />
              </ul>
            ))}
          </div>
        </div>
      )}

      {/* Occupants Dialog */}
      <Dialog open={!!occupantPos} onClose={() => setOccupantPos(null)} maxWidth="sm" fullWidth>
        <DialogTitle>نفرات مستقر در «{occupantPos?.title}»</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
            از لیست زیر، پرسنل مستقر در این جایگاه را انتخاب کنید.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>انتخاب پرسنل</InputLabel>
            <Select
              multiple
              value={selectedOccupants}
              onChange={e => setSelectedOccupants(e.target.value)}
              input={<OutlinedInput label="انتخاب پرسنل" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map(id => {
                    const emp = (employees || []).find(e => e.id === id);
                    return emp ? <Chip key={id} label={emp.full_name} size="small" /> : null;
                  })}
                </Box>
              )}
            >
              {Array.isArray(employees) && employees.map(emp => (
                <MenuItem key={emp.id} value={emp.id}>
                  <Checkbox checked={selectedOccupants.indexOf(emp.id) > -1} />
                  <ListItemText primary={emp.full_name} secondary={emp.employee_id} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOccupantPos(null)}>انصراف</Button>
          <Button variant="contained" onClick={() => setOccupantsMutation.mutate({ id: occupantPos.id, occupant_ids: selectedOccupants })} disabled={setOccupantsMutation.isLoading}>
            {setOccupantsMutation.isLoading ? <CircularProgress size={20} /> : 'ذخیره نفرات'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrgChartPage;