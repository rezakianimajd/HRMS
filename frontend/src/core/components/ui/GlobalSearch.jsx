import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, TextField, InputAdornment, Typography, List, ListItemButton,
  ListItemText, Avatar, Chip, CircularProgress, Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import DescriptionIcon from '@mui/icons-material/Description';
import MailIcon from '@mui/icons-material/Mail';
import AssignmentIcon from '@mui/icons-material/Assignment';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { toPersianDigits, formatPersianNumber } from '../../utils/numberUtils';

const SECTIONS = [
  { key: 'employees', label: 'پرسنل', icon: <PersonIcon fontSize="small" />, color: '#6366f1', emptyText: 'پرسنلی یافت نشد' },
  { key: 'documents', label: 'مدارک', icon: <DescriptionIcon fontSize="small" />, color: '#14b8a6', emptyText: 'مدرکی یافت نشد' },
  { key: 'letters', label: 'نامه‌ها', icon: <MailIcon fontSize="small" />, color: '#06b6d4', emptyText: 'نامه‌ای یافت نشد' },
  { key: 'hr_requests', label: 'درخواست‌های اداری', icon: <AssignmentIcon fontSize="small" />, color: '#8b5cf6', emptyText: 'درخواستی یافت نشد' },
  { key: 'leave_requests', label: 'مرخصی‌ها', icon: <EventBusyIcon fontSize="small" />, color: '#f59e0b', emptyText: 'مرخصی‌ای یافت نشد' },
  { key: 'salary_records', label: 'فیش‌های حقوقی', icon: <PaymentsIcon fontSize="small" />, color: '#10b981', emptyText: 'فیشی یافت نشد' },
];

function resultSubtitle(section, r) {
  switch (section) {
    case 'employees':
      return `${r.department_name || ''}${r.job_title_name ? ' — ' + r.job_title_name : ''}`;
    case 'documents':
      return `${r.document_type_name || ''}${r.employee_name ? ' · ' + r.employee_name : ''}`;
    case 'letters':
      return `${r.kind === 'incoming' ? 'از' : 'به'}: ${r.counterparty || ''} · ${r.number || ''}`;
    case 'hr_requests':
      return `${r.request_type || ''} · ${r.status || ''}`;
    case 'leave_requests':
      return `${r.leave_type || ''} · ${r.days ? toPersianDigits(r.days) + ' روز' : ''}`;
    case 'salary_records':
      return `دوره ${r.period || ''} · ${formatPersianNumber(r.net_payable)} ریال`;
    default:
      return '';
  }
}

function resultTitle(section, r) {
  switch (section) {
    case 'employees':
      return r.full_name || r.first_name || '';
    case 'documents':
      return r.title || '';
    case 'letters':
      return r.subject || '';
    case 'hr_requests':
      return r.employee_name || '';
    case 'leave_requests':
      return r.employee_name || '';
    case 'salary_records':
      return r.employee_name || '';
    default:
      return '';
  }
}

const GlobalSearch = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [debounced, setDebounced] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const tm = setTimeout(() => setDebounced(input), 350);
    return () => clearTimeout(tm);
  }, [input]);

  const { data, isLoading } = useGlobalSearch(debounced);

  const total = useMemo(() => {
    if (!data) return 0;
    return SECTIONS.reduce((sum, s) => sum + (data[s.key]?.length || 0), 0);
  }, [data]);

  const handleSelect = (section, r) => {
    const map = {
      employees: () => navigate(`/employees/${r.id}`),
      documents: () => {},
      letters: () => navigate('/correspondences'),
      hr_requests: () => navigate('/requests'),
      leave_requests: () => navigate('/leaves'),
      salary_records: () => navigate(`/employees/${r.id}`),
    };
    // salary_records don't carry employee id; ignore navigation.
    if (section !== 'salary_records') {
      map[section]?.();
    }
    setInput('');
    setFocused(false);
  };

  return (
    <Box sx={{ position: 'relative', width: { xs: '100%', md: 320 } }}>
      <TextField
        fullWidth
        size="small"
        placeholder="جستجوی سراسری…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 18 }} color="primary" />
            </InputAdornment>
          ),
          sx: {
            borderRadius: 50,
            background: 'rgba(255,255,255,0.45)',
            backdropFilter: 'blur(12px)',
            '& fieldset': { border: '1px solid rgba(99,102,241,0.2)' },
          },
        }}
      />

      {focused && debounced.length >= 2 && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: 44,
            left: 0,
            right: 0,
            zIndex: 1300,
            maxHeight: 420,
            overflowY: 'auto',
            borderRadius: 3,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(99,102,241,0.16)',
          }}
        >
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : total === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                نتیجه‌ای برای «{debounced}» یافت نشد
              </Typography>
            </Box>
          ) : (
            <Box>
              <Box sx={{ px: 2, py: 1, borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                <Typography variant="caption" color="textSecondary" fontWeight={700}>
                  {toPersianDigits(total)} نتیجه
                </Typography>
              </Box>
              {SECTIONS.map((sec) => {
                const items = data?.[sec.key] || [];
                if (items.length === 0) return null;
                return (
                  <Box key={sec.key}>
                    <Box sx={{
                      px: 2, py: 0.75, background: `${sec.color}14`,
                      display: 'flex', alignItems: 'center', gap: 1,
                    }}>
                      <Avatar sx={{ width: 20, height: 20, bgcolor: sec.color }}>{sec.icon}</Avatar>
                      <Typography variant="caption" fontWeight={800} sx={{ color: sec.color }}>
                        {sec.label}
                      </Typography>
                      <Chip size="small" label={toPersianDigits(items.length)} sx={{ height: 16, fontSize: 10 }} />
                    </Box>
                    <List disablePadding>
                      {items.map((r, i) => (
                        <React.Fragment key={`${sec.key}-${r.id}-${i}`}>
                          <ListItemButton
                            onClick={() => handleSelect(sec.key, r)}
                            sx={{ px: 2, py: 0.75 }}
                          >
                            <ListItemText
                              primary={<Typography variant="body2" fontWeight={600} noWrap>{resultTitle(sec.key, r)}</Typography>}
                              secondary={<Typography variant="caption" color="textSecondary" noWrap>{resultSubtitle(sec.key, r)}</Typography>}
                            />
                          </ListItemButton>
                          {i < items.length - 1 && <Divider component="li" light />}
                        </React.Fragment>
                      ))}
                    </List>
                  </Box>
                );
              })}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default GlobalSearch;