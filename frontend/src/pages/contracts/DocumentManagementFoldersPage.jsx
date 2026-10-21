import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, Paper, Snackbar, Alert,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import axiosInstance from '../../core/api/axiosConfig';
import PageHeader from '../../core/components/ui/PageHeader';
import { INK, MUTED, SOFT_BG, SurfaceCard } from '../accounting/AccountingDashboardUI';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import { DMS_ACCENT, FolderEditorDialog, FolderOverview, FolderTree } from './DocumentManagementUI';

const EMPTY_FOLDER = { id: null, name: '', parent: '', color: '#0f766e', description: '' };

const DocumentManagementFoldersPage = () => {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FOLDER);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const foldersQuery = useQuery({
    queryKey: ['dms-folders'],
    queryFn: () => axiosInstance.get('/document-management/folders/').then((response) => response.data),
  });
  const folders = useMemo(() => (Array.isArray(foldersQuery.data) ? foldersQuery.data : foldersQuery.data?.results || []), [foldersQuery.data]);
  const sorted = useMemo(() => [...folders].sort((a, b) => String(a.path || '').localeCompare(String(b.path || ''), 'fa')), [folders]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['dms-folders'] });
    qc.invalidateQueries({ queryKey: ['dms-menu-folders'] });
  };

  const saveFolder = useMutation({
    mutationFn: (payload) => {
      const body = {
        name: payload.name,
        parent: payload.parent || null,
        color: payload.color || '#0f766e',
        description: payload.description || '',
      };
      return payload.id
        ? axiosInstance.patch(`/document-management/folders/${payload.id}/`, body)
        : axiosInstance.post('/document-management/folders/', body);
    },
    onSuccess: () => { invalidate(); setDialog(false); setForm(EMPTY_FOLDER); setToast(editing ? 'پوشه ویرایش شد' : 'پوشه ایجاد شد'); },
    onError: (event) => setError(event.response?.data?.name?.[0] || 'ذخیره پوشه انجام نشد'),
  });
  const removeFolder = useMutation({
    mutationFn: (row) => axiosInstance.delete(`/document-management/folders/${row.id}/`),
    onSuccess: () => { invalidate(); setConfirmDelete(null); setToast('پوشه حذف شد'); },
    onError: (event) => setToast(event.response?.data?.detail || 'حذف پوشه انجام نشد'),
  });

  const openNew = () => { setEditing(false); setForm(EMPTY_FOLDER); setError(''); setDialog(true); };
  const openEdit = (folder) => {
    setEditing(true);
    setForm({ id: folder.id, name: folder.name || '', parent: folder.parent || '', color: folder.color || '#0f766e', description: folder.description || '' });
    setError('');
    setDialog(true);
  };

  if (foldersQuery.isLoading) return <Box sx={{ py: 9, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ pb: 1 }}>
      <PageHeader
        icon={<FolderOutlinedIcon />}
        title="پوشه‌ها و ماژول‌ها"
        subtitle="ساختار کامل کتابخانه، پوشه‌های ماژول‌ها و مستندات شرکت"
        actions={<Button variant="contained" startIcon={<CreateNewFolderOutlinedIcon />} onClick={openNew}>پوشه جدید</Button>}
      />

      <Box sx={{ mb: 1.5 }}>
        <FolderOverview folders={folders} selected="" onSelect={() => {}} />
      </Box>

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={4}>
          <SurfaceCard title="درخت پوشه‌ها" icon={FolderOutlinedIcon} color={DMS_ACCENT}>
            <FolderTree folders={folders} selected="" onSelect={() => {}} onEdit={openEdit} onDelete={setConfirmDelete} />
          </SurfaceCard>
        </Grid>
        <Grid item xs={12} lg={8}>
          <SurfaceCard title="فهرست پوشه‌ها" icon={FolderOutlinedIcon} color={DMS_ACCENT}
            action={<Chip size="small" label={formatPersianNumber(folders.length)} sx={{ height: 19, fontSize: 12, bgcolor: '#f1f5f9', color: MUTED }} />}>
            <Paper elevation={0} sx={{ border: '1px solid #eef2f7', borderRadius: '10px', overflow: 'hidden' }}>
              <Table size="small">
                <TableHead><TableRow>
                  {['مسیر', 'نوع', 'اسناد', 'زیرپوشه‌ها', 'اقدام'].map((label) => <TableCell key={label} sx={{ fontSize: 12, fontWeight: 800, bgcolor: SOFT_BG }}>{label}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {sorted.map((folder) => (
                    <TableRow key={folder.id} hover>
                      <TableCell sx={{ fontSize: 12, color: INK }}>{folder.path || folder.name}</TableCell>
                      <TableCell><Chip size="small" label={folder.code === 'company.documents' ? 'مستندات شرکت' : folder.is_system ? 'سیستمی' : 'دستی'} sx={{ height: 18, fontSize: 12, bgcolor: '#f8fafc', color: MUTED }} /></TableCell>
                      <TableCell sx={{ fontSize: 12, fontWeight: 800, color: DMS_ACCENT }}>{formatPersianNumber(folder.documents_count || 0)}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: MUTED }}>{formatPersianNumber(folder.children_count || 0)}</TableCell>
                      <TableCell>
                        <Button size="small" startIcon={<EditOutlinedIcon fontSize="small" />} onClick={() => openEdit(folder)}>ویرایش</Button>
                        {!folder.is_system ? <Button size="small" color="error" startIcon={<DeleteOutlineIcon fontSize="small" />} onClick={() => setConfirmDelete(folder)}>حذف</Button> : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </SurfaceCard>
        </Grid>
      </Grid>

      <FolderEditorDialog open={dialog} onClose={() => setDialog(false)} form={form} setForm={setForm}
        folderList={folders} editing={editing} error={error} setError={setError}
        saving={saveFolder.isPending} onSave={() => saveFolder.mutate(form)} />

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, fontSize: 14 }}>حذف پوشه</DialogTitle>
        <DialogContent><Alert severity="warning" sx={{ borderRadius: '10px' }}>پوشه «{confirmDelete?.name}» حذف شود؟ اسناد داخل آن بدون پوشه خواهند شد.</Alert></DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)}>انصراف</Button>
          <Button color="error" variant="contained" disabled={removeFolder.isPending} onClick={() => removeFolder.mutate(confirmDelete)}>حذف</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3400} onClose={() => setToast('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast.includes('نشد') ? 'error' : 'success'} onClose={() => setToast('')}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};

export default DocumentManagementFoldersPage;
