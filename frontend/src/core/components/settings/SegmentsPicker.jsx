import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Chip, Button, CircularProgress, FormControl, InputLabel, Select, MenuItem, Stack,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { formatPersianNumber } from '../../utils/numberUtils';

const CRITERIA = [
  { key: 'by_department', label: 'بر اساس دپارتمان' },
  { key: 'by_gender', label: 'بر اساس جنسیت' },
  { key: 'by_marital_status', label: 'بر اساس وضعیت تأهل' },
  { key: 'by_contract_type', label: 'بر اساس نوع قرارداد' },
  { key: 'by_work_shift', label: 'بر اساس شیفت کاری' },
];

const SegmentsPicker = ({ onSelect }) => {
  const [criterion, setCriterion] = useState('');
  const [group, setGroup] = useState('');
  const [picked, setPicked] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ['bale-segments'],
    queryFn: () => axiosInstance.get('/notifications/bale-segments/').then(r => r.data),
  });

  if (isLoading) return <Box sx={{ p: 2, textAlign: 'center' }}><CircularProgress size={24} /></Box>;

  const groups = criterion ? (data?.[criterion] || {}) : {};
  const groupKeys = Object.keys(groups);

  const allActive = data?.all_active || [];

  const chooseGroup = (g) => {
    setGroup(g);
    setPicked((groups[g] || []).map(x => x.chat_id));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>معیار گروه‌بندی</InputLabel>
          <Select value={criterion} label="معیار گروه‌بندی"
            onChange={e => { setCriterion(e.target.value); setGroup(''); setPicked([]); }}>
            {CRITERIA.map(c => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
          </Select>
        </FormControl>

        {criterion && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>گروه</InputLabel>
            <Select value={group} label="گروه"
              onChange={e => chooseGroup(e.target.value)}>
              {groupKeys.map(g => <MenuItem key={g} value={g}>{g} ({formatPersianNumber(groups[g].length)})</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* All active quick button */}
      <Button size="small" variant="outlined" sx={{ mb: 1 }}
        onClick={() => { setPicked(allActive.map(x => x.chat_id)); setGroup('_all'); }}>
        همهٔ پرسنل فعال ({formatPersianNumber(allActive.length)})
      </Button>

      {picked.length > 0 && (
        <Box sx={{ mt: 1, p: 1.25, borderRadius: '10px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <Typography variant="caption" fontWeight={700} color="#10b981">
            {formatPersianNumber(picked.length)} گیرنده انتخاب شد
          </Typography>
          <Button size="small" variant="contained" startIcon={<CheckIcon />} sx={{ mt: 1 }}
            onClick={() => onSelect(picked)}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            استفاده از این گروه
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SegmentsPicker;