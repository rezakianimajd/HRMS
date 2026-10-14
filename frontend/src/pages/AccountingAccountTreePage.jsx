import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../core/api/axiosConfig';
import {
  Box, Typography, Paper, Avatar, Button, CircularProgress, Stack, Chip,
  TextField, IconButton, Tooltip, Alert, InputAdornment, Autocomplete,
  FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, Collapse, Menu, ListItemIcon, ListItemText,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ClearIcon from '@mui/icons-material/Clear';
import BoltIcon from '@mui/icons-material/Bolt';
import SaveIcon from '@mui/icons-material/Save';
import { toPersianDigits } from '../core/utils/numberUtils';

const COLOR = '#0f766e';
const COLOR_DARK = '#0d5c56';

const glass = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.80), rgba(255,255,255,0.45))',
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 18px 50px rgba(15,118,110,0.14)',
  borderRadius: '20px',
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '14px',
    background: 'rgba(255,255,255,0.6)',
    '&:hover': { background: 'rgba(255,255,255,0.85)' },
    '&.Mui-focused': { background: '#fff', boxShadow: '0 0 0 4px rgba(15,118,110,0.12)' },
  },
};

const NODE_KEY = (node) => (
  node.node_type === 'type' ? `t-${node.id}`
    : node.node_type === 'group' ? `g-${node.id}` : `a-${node.id}`
);

const natureLabel = (n) => (n === 'credit' ? 'بستانکار' : n === 'debit' ? 'بدهکار' : 'مهم نیست');
const natureColor = (n) => (n === 'credit' ? '#dc2626' : n === 'debit' ? '#059669' : '#64748b');
const natureBg = (n) => (n === 'credit' ? 'rgba(239,68,68,0.12)' : n === 'debit' ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.12)');

// پیام خطای خوانا از پاسخ DRF (فیلدهای خطادار)
const errText = (e, fallback) => {
  const d = e?.response?.data;
  if (!d) return fallback;
  if (typeof d === 'string') return d;
  if (d.error) return d.error;
  if (d.detail) return d.detail;
  const labels = {
    account_type: 'نوع حساب', nature: 'ماهیت', code: 'کد', name: 'عنوان',
    group: 'گروه حساب', parent: 'والد', level: 'سطح', account: 'حساب',
  };
  const first = Object.entries(d)[0];
  if (!first) return fallback;
  const [field, value] = first;
  const msg = Array.isArray(value) ? value[0] : value;
  return `${labels[field] || field}: ${msg}`;
};

const nodeMeta = (node) => {
  if (node.node_type === 'type') {
    return { color: '#0ea5e9', dark: '#0284c7', label: 'نوع حساب' };
  }
  if (node.node_type === 'group') {
    return node.is_subgroup
      ? { color: '#8b5cf6', dark: '#7c3aed', label: 'زیرگروه' }
      : { color: '#6366f1', dark: '#4f46e5', label: 'گروه حساب' };
  }
  return node.kind === 'general'
    ? { color: '#10b981', dark: '#059669', label: 'حساب کل' }
    : { color: '#0f766e', dark: '#0d5c56', label: 'حساب معین' };
};

const countChips = (node) => {
  const totals = node.totals || {};
  if (node.node_type === 'account') {
    const chips = [];
    if ((node.children || []).length) chips.push(`زیرمجموعه: ${toPersianDigits(node.children.length)}`);
    if (node.auxiliary_count) chips.push(`تفصیلی: ${toPersianDigits(node.auxiliary_count)}`);
    return chips;
  }
  const chips = [];
  if (totals.groups) chips.push(`گروه: ${toPersianDigits(totals.groups)}`);
  if (totals.general) chips.push(`کل: ${toPersianDigits(totals.general)}`);
  if (totals.subsidiary) chips.push(`معین: ${toPersianDigits(totals.subsidiary)}`);
  if (totals.auxiliary) chips.push(`تفصیلی: ${toPersianDigits(totals.auxiliary)}`);
  return chips;
};

// فهرست کلید همهٔ گره‌های دارای فرزند (برای «باز کردن همه» و باز شدن خودکار در جستجو)
const collectKeys = (nodes, acc = [], onlyMatches = false) => {
  (nodes || []).forEach(node => {
    const hasChildren = (node.children || []).length > 0;
    if (hasChildren && (!onlyMatches || node.has_match)) acc.push(NODE_KEY(node));
    if (hasChildren) collectKeys(node.children, acc, onlyMatches);
  });
  return acc;
};

/** یک ردیف درخت (نوع/گروه/زیرگروه/کل/معین) با باز/بسته، شمارنده‌ها و اکشن‌ها. */
const NodeRow = ({ node, depth, expanded, onToggle, onEdit, onDelete, onAdd, searchTerm }) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const key = NODE_KEY(node);
  const isOpen = expanded.has(key);
  const hasChildren = (node.children || []).length > 0;
  const meta = nodeMeta(node);
  const isType = node.node_type === 'type';
  const chips = countChips(node);
  const rowBg = node.matched && searchTerm
    ? 'rgba(250,204,21,0.22)'
    : isType ? `linear-gradient(90deg, ${meta.color}1f, rgba(255,255,255,0.55))`
      : node.node_type === 'group' ? 'rgba(99,102,241,0.07)'
        : 'rgba(255,255,255,0.58)';

  const addOptions = isType
    ? [{ kind: 'group', label: 'گروه حساب جدید' }]
    : node.node_type === 'group'
      ? [{ kind: 'group', label: 'زیرگروه جدید' }, { kind: 'account', label: 'حساب کل جدید' }]
      : [{ kind: 'account', label: node.kind === 'general' ? 'حساب معین جدید' : 'زیرمعین جدید' }];

  return (
    <Box>
      <Paper
        elevation={0}
        onClick={() => hasChildren && onToggle(node)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.5, py: 0.6, pr: 1 + depth * 3, pl: 0.5,
          mb: 0.5, borderRadius: '12px',
          background: rowBg,
          border: node.matched && searchTerm ? '1px solid rgba(234,179,8,0.65)' : '1px solid rgba(255,255,255,0.75)',
          cursor: hasChildren ? 'pointer' : 'default',
          transition: 'all .18s ease',
          '&:hover': { boxShadow: '0 8px 22px rgba(15,118,110,0.12)' },
        }}
      >
        {hasChildren ? (
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onToggle(node); }}
            sx={{ color: meta.color, transform: isOpen ? 'rotate(0deg)' : 'rotate(90deg)', transition: 'transform .2s', p: 0.25 }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>
        ) : <Box sx={{ width: 30, flexShrink: 0 }} />}

        <Box sx={{
          width: isType ? 10 : 8, height: isType ? 10 : 8, borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${meta.color}, ${meta.dark})`,
          boxShadow: `0 0 0 3px ${meta.color}22`, mx: 0.75,
        }} />

        <Chip size="small" label={toPersianDigits(node.code)}
          sx={{ fontWeight: 800, bgcolor: `${meta.color}1f`, color: meta.dark, fontSize: 11, fontFamily: 'monospace' }} />

        <Typography
          variant={isType ? 'subtitle2' : 'body2'}
          fontWeight={isType ? 800 : 700}
          noWrap
          sx={{ maxWidth: 300, color: '#0f172a' }}
        >
          {node.name}
        </Typography>

        {isType && (
          <Chip size="small" label={node.category_label}
            sx={{ bgcolor: 'rgba(14,165,233,0.14)', color: '#0369a1', fontWeight: 700 }} />
        )}
        {!isType && (
          <Chip size="small" variant="outlined" label={natureLabel(node.nature)}
            sx={{ bgcolor: natureBg(node.nature), color: natureColor(node.nature), fontWeight: 700 }} />
        )}
        {!isType && !node.is_active && (
          <Chip size="small" label="غیرفعال" sx={{ bgcolor: 'rgba(100,116,139,0.16)', color: '#475569', fontWeight: 700 }} />
        )}
        {node.node_type === 'account' && !node.is_postable && (
          <Chip size="small" label="غیرقابل سند" sx={{ bgcolor: 'rgba(245,158,11,0.16)', color: '#b45309', fontWeight: 700 }} />
        )}
        {node.node_type === 'account' && node.coding_locked && (
          <Chip size="small" label="کدینگ دستی" sx={{ bgcolor: 'rgba(139,92,246,0.14)', color: '#6d28d9', fontWeight: 700 }} />
        )}

        <Box sx={{ flex: 1, minWidth: 8 }} />

        {chips.map(label => (
          <Chip key={label} size="small" variant="outlined" label={label}
            sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.65)', display: { xs: 'none', md: 'inline-flex' } }} />
        ))}
        {searchTerm && node.matched && (
          <Chip size="small" label="تطبیق" color="warning" sx={{ fontWeight: 800 }} />
        )}

        <Tooltip title="افزودن زیرمجموعه">
          <IconButton size="small" sx={{ color: meta.dark }}
            onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="ویرایش">
          <IconButton size="small" color="primary"
            onClick={(e) => { e.stopPropagation(); onEdit(node); }}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="حذف">
          <IconButton size="small" color="error"
            onClick={(e) => { e.stopPropagation(); onDelete(node); }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          {addOptions.map(option => (
            <MenuItem key={option.kind} onClick={() => { setMenuAnchor(null); onAdd(node, option.kind); }}>
              <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
              <ListItemText>{option.label}</ListItemText>
            </MenuItem>
          ))}
        </Menu>
      </Paper>

      {hasChildren && (
        <Collapse in={isOpen} timeout={180} unmountOnExit>
          <Box>
            {node.children.map(child => (
              <NodeRow
                key={NODE_KEY(child)}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggle={onToggle}
                onEdit={onEdit}
                onDelete={onDelete}
                onAdd={onAdd}
                searchTerm={searchTerm}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};


const AccountingAccountTreePage = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState(new Set());
  const lastQuery = useRef(null);
  const [msg, setMsg] = useState(null);
  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState({
    code: '', name: '', account_type: '', nature: '', group: '', parent: '',
    auxiliary_category_1: '', auxiliary_category_2: '', auxiliary_category_3: '',
  });

  // جستجوی سرورساید با تعویق کوتاه
  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: treeData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['account-tree', q],
    queryFn: () => axiosInstance.get('/accounting/accounts/tree/', {
      params: q ? { q } : {},
    }).then(r => r.data),
  });
  const { data: groups } = useQuery({
    queryKey: ['account-groups'],
    queryFn: () => axiosInstance.get('/accounting/account-groups/').then(r => r.data),
  });
  const { data: generals } = useQuery({
    queryKey: ['acc-general'],
    queryFn: () => axiosInstance.get('/accounting/accounts/', { params: { kind: 'general' } }).then(r => r.data),
  });
  const { data: types } = useQuery({
    queryKey: ['acc-types'],
    queryFn: () => axiosInstance.get('/accounting/account-types/').then(r => r.data),
  });
  const { data: auxCategories } = useQuery({
    queryKey: ['aux-categories'],
    queryFn: () => axiosInstance.get('/accounting/auxiliary-categories/').then(r => r.data),
  });

  const treeTypes = useMemo(() => treeData?.types || [], [treeData]);
  const summary = treeData?.summary || {};
  const groupList = useMemo(() => (Array.isArray(groups) ? groups : groups?.results || []), [groups]);
  const generalList = useMemo(() => (Array.isArray(generals) ? generals : generals?.results || []), [generals]);
  const typeList = useMemo(() => (Array.isArray(types) ? types : types?.results || []), [types]);
  const auxCategoryList = useMemo(
    () => (Array.isArray(auxCategories) ? auxCategories : auxCategories?.results || []),
    [auxCategories],
  );

  const suggestLevel = !editor ? 'general'
    : editor.mode === 'group' ? 'group'
      : form.parent ? 'subsidiary' : 'general';
  const { data: suggested } = useQuery({
    queryKey: ['tree-suggest-code', suggestLevel, form.parent || '', form.group || ''],
    enabled: Boolean(editor),
    queryFn: () => axiosInstance.get('/accounting/coding-configs/suggest/', {
      params: {
        level: suggestLevel,
        ...(form.parent ? { parent: form.parent } : {}),
        ...(form.group ? { group: form.group } : {}),
      },
    }).then(r => r.data),
  });

  const selectedGroup = groupList.find(g => g.id === form.group);
  const selectedParent = generalList.find(a => a.id === form.parent);
  const effectiveType = form.account_type || suggested?.account_type
    || (form.parent ? selectedParent?.account_type : selectedGroup?.account_type);
  const effectiveNature = form.nature || suggested?.nature
    || (form.parent ? selectedParent?.nature : selectedGroup?.nature);


  // همهٔ شاخه‌ها در شروع بسته‌اند؛ فقط در جستجو شاخه‌های منطبق خودکار باز می‌شوند
  useEffect(() => {
    if (!treeData || lastQuery.current === q) return;
    lastQuery.current = q;
    setExpanded(q ? new Set(collectKeys(treeTypes, [], true)) : new Set());
  }, [treeData, q, treeTypes]);

  const toggle = (node) => setExpanded(prev => {
    const next = new Set(prev);
    const key = NODE_KEY(node);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });
  const expandAll = () => setExpanded(new Set(collectKeys(treeTypes)));
  const collapseAll = () => setExpanded(new Set());

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['account-tree'] });
    qc.invalidateQueries({ queryKey: ['account-groups'] });
    qc.invalidateQueries({ queryKey: ['accounts'] });
    qc.invalidateQueries({ queryKey: ['acc-general'] });
  };

  const blankForm = (preset = {}) => ({
    code: '', name: '', account_type: preset.account_type || '', nature: 'none',
    group: preset.group || '', parent: preset.parent || '',
    auxiliary_category_1: '', auxiliary_category_2: '', auxiliary_category_3: '',
  });

  const openGroup = async (node = null, preset = {}) => {
    setMsg(null);
    let values = blankForm(preset);
    if (node) {
      try {
        const { data } = await axiosInstance.get(`/accounting/account-groups/${node.id}/`);
        values = {
          ...values, code: data.code || '', name: data.name || '',
          account_type: data.account_type || '', nature: data.nature || 'none',
          parent: data.parent || '',
        };
      } catch (e) {
        setMsg({ ok: false, text: errText(e, 'خواندن اطلاعات گروه ناموفق بود') });
        return;
      }
    }
    setForm(values);
    setEditor({
      mode: 'group', node,
      title: node ? `ویرایش گروه حساب ${node.code} — ${node.name}` : 'ثبت گروه حساب جدید',
      hint: 'سلسله‌مراتب گروه‌ها با «گروه بالادستی» ساخته می‌شود؛ خالی بگذارید تا گروه سطح اول شود.',
    });
  };

  const openAccount = async (node = null, preset = {}) => {
    setMsg(null);
    let values = { ...blankForm(preset), nature: '' };
    if (node) {
      try {
        const { data } = await axiosInstance.get(`/accounting/accounts/${node.id}/`);
        values = {
          code: data.code || '', name: data.name || '',
          account_type: data.account_type || '', nature: data.nature || '',
          group: data.group || '', parent: data.parent || '',
          auxiliary_category_1: data.auxiliary_category_1 || '',
          auxiliary_category_2: data.auxiliary_category_2 || '',
          auxiliary_category_3: data.auxiliary_category_3 || '',
        };
      } catch (e) {
        setMsg({ ok: false, text: errText(e, 'خواندن اطلاعات حساب ناموفق بود') });
        return;
      }
    }
    setForm(values);
    setEditor({
      mode: 'account', node,
      title: node ? `ویرایش حساب ${node.code} — ${node.name}`
        : preset.parent ? 'ثبت حساب معین جدید' : 'ثبت حساب کل جدید',
      hint: preset.parent
        ? 'حساب معین زیر «حساب کل والد» ساخته می‌شود و نوع، ماهیت و گروه را از آن ارث می‌برد.'
        : 'حساب کل با انتخاب «گروه حساب» ساخته می‌شود؛ نوع و ماهیت از گروه ارث می‌برند.',
    });
  };

  const openEdit = (node) => (
    node.node_type === 'group' ? openGroup(node) : openAccount(node)
  );

  const save = useMutation({
    mutationFn: () => {
      if (editor.mode === 'group') {
        const payload = {
          code: form.code,
          name: form.name,
          account_type: form.account_type || null,
          nature: form.nature || 'none',
          parent: form.parent || null,
        };
        return editor.node
          ? axiosInstance.patch(`/accounting/account-groups/${editor.node.id}/`, payload)
          : axiosInstance.post('/accounting/account-groups/', payload);
      }
      const payload = {
        code: form.code,
        name: form.name,
        nature: effectiveNature || 'debit',
        account_type: effectiveType || null,
        ...(form.parent
          ? { parent: form.parent }
          : { group: form.group || null, parent: null, level: 1 }),
      };
      if (form.parent) {
        payload.auxiliary_category_1 = form.auxiliary_category_1 || null;
        payload.auxiliary_category_2 = form.auxiliary_category_2 || null;
        payload.auxiliary_category_3 = form.auxiliary_category_3 || null;
      }
      return editor.node
        ? axiosInstance.patch(`/accounting/accounts/${editor.node.id}/`, payload)
        : axiosInstance.post('/accounting/accounts/', payload);
    },
    onSuccess: () => {
      invalidate();
      setMsg({ ok: true, text: editor?.node ? 'تغییرات با موفقیت ذخیره شد.' : 'با موفقیت ثبت شد.' });
      setEditor(null);
    },
    onError: (e) => setMsg({ ok: false, text: errText(e, 'ذخیره ناموفق بود') }),
  });

  const del = useMutation({
    mutationFn: (node) => (node.node_type === 'group'
      ? axiosInstance.delete(`/accounting/account-groups/${node.id}/`)
      : axiosInstance.delete(`/accounting/accounts/${node.id}/`)),
    onSuccess: () => {
      invalidate();
      setMsg({ ok: true, text: 'حذف شد.' });
    },
    onError: (e) => setMsg({ ok: false, text: errText(e, 'حذف ممکن نیست') }),
  });

  const askDelete = (node) => {
    const note = node.node_type === 'group'
      ? ' (گروه دارای زیرگروه/حساب حذف نمی‌شود)' : ' (حساب دارای گردش/فرزند حذف نمی‌شود)';
    if (window.confirm(`«${node.name}» حذف شود؟${note}`)) del.mutate(node);
  };

  // در ویرایش گروه، خودِ گروه و زیرگروه‌هایش از فهرست «گروه بالادستی» حذف می‌شوند (ضد چرخه)
  const groupOptions = useMemo(() => {
    if (!editor || editor.mode !== 'group' || !editor.node) return groupList;
    const blocked = new Set([editor.node.id]);
    let added = true;
    while (added) {
      added = false;
      for (let index = 0; index < groupList.length; index += 1) {
        const item = groupList[index];
        if (item.parent && blocked.has(item.parent) && !blocked.has(item.id)) {
          blocked.add(item.id);
          added = true;
        }
      }
    }
    return groupList.filter(item => !blocked.has(item.id));
  }, [groupList, editor]);

  const canSave = Boolean(form.code && form.name) && Boolean(
    editor?.mode === 'group' ? form.account_type : (form.parent || form.group)
  );
  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const openAdd = (node, kind) => {
    if (node.node_type === 'type') {
      return openGroup(null, { account_type: node.id });
    }
    if (node.node_type === 'group') {
      return kind === 'group'
        ? openGroup(null, { parent: node.id, account_type: node.type_id })
        : openAccount(null, { group: node.id, account_type: node.type_id });
    }
    return openAccount(null, { parent: node.id, group: node.group_id, account_type: node.type_id });
  };


  return (
    <Box>
      {/* هدر */}
      <Paper sx={{
        p: 2.5, mb: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
        background: `linear-gradient(120deg, ${COLOR}1f, rgba(255,255,255,0.35))`,
        border: `1px solid ${COLOR}2e`, borderRadius: '20px',
      }}>
        <Avatar sx={{
          width: 56, height: 56,
          background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})`,
          boxShadow: `0 10px 28px ${COLOR}55`,
        }}>
          <AccountTreeIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Typography variant="h6" fontWeight={800} color={COLOR_DARK}>درخت حساب‌ها</Typography>
          <Typography variant="body2" color="textSecondary">
            نمای درختوارهٔ چارت حساب: نوع حساب ← گروه ← زیرگروه ← حساب کل ← معین — هر گره قابل ویرایش است
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <Chip label={`گروه: ${toPersianDigits(summary.groups || 0)}`} sx={{ fontWeight: 700, bgcolor: 'rgba(99,102,241,0.14)', color: '#4338ca' }} />
          <Chip label={`کل: ${toPersianDigits(summary.general || 0)}`} sx={{ fontWeight: 700, bgcolor: 'rgba(16,185,129,0.14)', color: '#047857' }} />
          <Chip label={`معین: ${toPersianDigits(summary.subsidiary || 0)}`} sx={{ fontWeight: 700, bgcolor: 'rgba(15,118,110,0.14)', color: COLOR_DARK }} />
          <Chip label={`تفصیلی: ${toPersianDigits(summary.auxiliary || 0)}`} sx={{ fontWeight: 700, bgcolor: 'rgba(245,158,11,0.16)', color: '#b45309' }} />
        </Stack>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <Tooltip title="باز کردن همهٔ شاخه‌ها">
            <Button size="small" variant="outlined" startIcon={<UnfoldMoreIcon />} onClick={expandAll}>باز کردن همه</Button>
          </Tooltip>
          <Tooltip title="بستن همهٔ شاخه‌ها">
            <Button size="small" variant="outlined" startIcon={<UnfoldLessIcon />} onClick={collapseAll}>بستن همه</Button>
          </Tooltip>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openGroup()}
            sx={{ borderRadius: '12px', background: `linear-gradient(135deg, #6366f1, #4f46e5)` }}>گروه جدید</Button>
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openAccount()}
            sx={{ borderRadius: '12px', background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})` }}>حساب کل جدید</Button>
        </Stack>
      </Paper>

      {msg && (
        <Alert severity={msg.ok ? 'success' : 'error'} sx={{ mb: 2, borderRadius: '14px' }} onClose={() => setMsg(null)}>
          {msg.text}
        </Alert>
      )}

      {/* نوار ابزار */}
      <Paper sx={{ ...glass, p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small" fullWidth
            placeholder="جستجوی کد یا نام (نوع حساب، گروه، زیرگروه، کل، معین)…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ ...fieldSx, minWidth: 260, flex: 1 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          {q && (
            <Chip color="warning" variant="outlined" sx={{ fontWeight: 700 }}
              label={`شاخه‌های منطبق با «${q}»: ${toPersianDigits(summary.account_count || 0)} حساب`} />
          )}
          {isFetching && <CircularProgress size={18} />}
          <Tooltip title="به‌روزرسانی">
            <span>
              <IconButton onClick={() => refetch()} disabled={isFetching}><RefreshIcon /></IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Paper>

      {/* درخت */}
      <Paper sx={{ ...glass, p: 2 }}>
        {isLoading ? (
          <Box textAlign="center" py={7}><CircularProgress /></Box>
        ) : treeTypes.length === 0 ? (
          <Box textAlign="center" py={7}>
            <AccountTreeIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 1 }} />
            <Typography color="textSecondary">
              {q ? 'شاخه‌ای با این عبارت پیدا نشد.' : 'هنوز نوع حساب/گروه/حسابی ثبت نشده است.'}
            </Typography>
          </Box>
        ) : (
          treeTypes.map(node => (
            <NodeRow
              key={NODE_KEY(node)}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              onEdit={openEdit}
              onDelete={askDelete}
              onAdd={openAdd}
              searchTerm={q}
            />
          ))
        )}
      </Paper>

      {/* راهنما */}
      <Paper sx={{ ...glass, p: 1.75, mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        {[
          { label: 'نوع حساب', color: '#0ea5e9' },
          { label: 'گروه / زیرگروه', color: '#6366f1' },
          { label: 'حساب کل', color: '#10b981' },
          { label: 'حساب معین', color: '#0f766e' },
        ].map(item => (
          <Stack key={item.label} direction="row" alignItems="center" spacing={0.75}>
            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: item.color }} />
            <Typography variant="caption" fontWeight={700}>{item.label}</Typography>
          </Stack>
        ))}
        <Typography variant="caption" color="textSecondary">
          روی هر ردیف کلیک کنید تا باز/بسته شود؛ با + زیرمجموعه بسازید، با ✎ ویرایش و با 🗑 حذف کنید.
        </Typography>
      </Paper>



      {/* دیالوگ ثبت/ویرایش گره */}
      <Dialog
        open={Boolean(editor)} onClose={() => setEditor(null)} fullWidth maxWidth="sm"
        slotProps={{ paper: { sx: { borderRadius: '20px', background: 'linear-gradient(150deg, #fff, #f8fafc)' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: COLOR_DARK, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountTreeIcon sx={{
            color: editor?.mode === 'group' ? '#6366f1'
              : (editor?.node?.kind === 'general' ? '#10b981' : COLOR),
          }} />
          {editor?.title}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            {editor?.hint && (
              <Alert severity="info" icon={<BoltIcon fontSize="small" />} sx={{ borderRadius: '12px', py: 0.25 }}>
                <Typography variant="caption">{editor.hint}</Typography>
              </Alert>
            )}

            <TextField
              size="small" fullWidth label="کد" value={form.code} sx={fieldSx}
              onChange={e => set('code', e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip title={`پیشنهاد کد بعدی${suggested?.code ? `: ${suggested.code}` : ''}`}>
                      <IconButton size="small" onClick={() => set('code', suggested?.code || form.code)}>
                        <BoltIcon fontSize="small" color="primary" />
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
            />
            <TextField size="small" fullWidth label="عنوان" value={form.name} sx={fieldSx}
              onChange={e => set('name', e.target.value)} />

            {editor?.mode === 'group' ? (
              <>
                <Autocomplete
                  size="small" options={typeList} getOptionLabel={o => o.name}
                  value={typeList.find(t => t.id === (form.account_type || effectiveType)) || null}
                  onChange={(e, v) => set('account_type', v ? v.id : '')}
                  renderInput={p => <TextField {...p} label="نوع حساب *" sx={fieldSx} />}
                />
                <Autocomplete
                  size="small" options={groupOptions} getOptionLabel={o => `${o.code} - ${o.name}`}
                  value={groupOptions.find(g => g.id === form.parent) || null}
                  onChange={(e, v) => set('parent', v ? v.id : '')}
                  renderInput={p => <TextField {...p} label="گروه بالادستی (برای ساخت زیرگروه)" sx={fieldSx} />}
                />
              </>
            ) : (
              <>
                {form.parent ? (
                  <Autocomplete
                    size="small" options={generalList} getOptionLabel={o => `${o.code} - ${o.name}`}
                    value={generalList.find(a => a.id === form.parent) || null}
                    onChange={(e, v) => set('parent', v ? v.id : '')}
                    renderInput={p => <TextField {...p} label="حساب کل والد *" sx={fieldSx} />}
                  />
                ) : (
                  <Autocomplete
                    size="small" options={groupList} getOptionLabel={o => `${o.code} - ${o.name}`}
                    value={groupList.find(g => g.id === form.group) || null}
                    onChange={(e, v) => set('group', v ? v.id : '')}
                    renderInput={p => <TextField {...p} label="گروه حساب *" sx={fieldSx} />}
                  />
                )}
                <Autocomplete
                  size="small" options={typeList} getOptionLabel={o => o.name}
                  value={typeList.find(t => t.id === (form.account_type || effectiveType)) || null}
                  onChange={(e, v) => set('account_type', v ? v.id : '')}
                  renderInput={p => <TextField {...p} label="نوع حساب" sx={fieldSx} />}
                />
              </>
            )}

            <FormControl fullWidth size="small">
              <InputLabel>ماهیت</InputLabel>
              <Select label="ماهیت" value={form.nature || ''} onChange={e => set('nature', e.target.value)} sx={fieldSx}>
                <MenuItem value="">وراثت خودکار</MenuItem>
                <MenuItem value="debit">بدهکار</MenuItem>
                <MenuItem value="credit">بستانکار</MenuItem>
                <MenuItem value="none">مهم نیست</MenuItem>
              </Select>
            </FormControl>

            {editor?.mode === 'account' && form.parent && (
              <>
                <Divider><Typography variant="caption" color="textSecondary">ارتباط با تفصیل‌ها (اختیاری)</Typography></Divider>
                {[1, 2, 3].map(index => (
                  <Autocomplete
                    key={index}
                    size="small" options={auxCategoryList} getOptionLabel={o => o.name}
                    value={auxCategoryList.find(c => c.id === form[`auxiliary_category_${index}`]) || null}
                    onChange={(e, v) => set(`auxiliary_category_${index}`, v ? v.id : '')}
                    renderInput={p => <TextField {...p} label={`ارتباط با تفصیل ${['یک', 'دو', 'سه'][index - 1]}`} sx={fieldSx} />}
                  />
                ))}
              </>
            )}

            {editor?.mode === 'account' && (
              <Box sx={{
                p: 1.25, borderRadius: '12px',
                background: 'rgba(15,118,110,0.06)', border: '1px dashed rgba(15,118,110,0.3)',
              }}>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                  <Chip size="small" label={`کد پیشنهادی: ${suggested?.code || '—'}`}
                    sx={{ fontWeight: 800, bgcolor: 'rgba(15,118,110,0.14)', color: COLOR_DARK }} />
                  <Chip size="small" label={`نوع مؤثر: ${typeList.find(t => t.id === effectiveType)?.name || '—'}`}
                    sx={{ fontWeight: 700, bgcolor: 'rgba(37,99,235,0.12)', color: '#1d4ed8' }} />
                  <Chip size="small" label={`ماهیت مؤثر: ${natureLabel(effectiveNature)}`}
                    sx={{ bgcolor: natureBg(effectiveNature), color: natureColor(effectiveNature), fontWeight: 700 }} />
                  {suggested?.inherited_from && (
                    <Chip size="small" color="success" variant="outlined"
                      label={suggested.inherited_from === 'parent' ? 'ارث‌بری از والد' : 'ارث‌بری از گروه'}
                      sx={{ fontWeight: 700 }} />
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditor(null)} sx={{ borderRadius: '12px' }}>انصراف</Button>
          <Button
            variant="contained" disabled={!canSave || save.isLoading}
            startIcon={save.isLoading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            onClick={() => save.mutate()}
            sx={{ borderRadius: '12px', px: 3, background: `linear-gradient(135deg, ${COLOR}, ${COLOR_DARK})` }}
          >
            {editor?.node ? 'ذخیره تغییرات' : 'ثبت'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AccountingAccountTreePage;

