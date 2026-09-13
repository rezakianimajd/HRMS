import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../../api/axiosConfig';
import {
  Box, Typography, Chip, Button, CircularProgress, FormControl, InputLabel, Select, MenuItem, Stack,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import { formatPersianNumber } from '../../utils/numberUtils';

const CRITERIA = [
  { key: 'by_department', label: 'ط¨ط± ط§ط³ط§ط³ ط¯ظ¾ط§ط±طھظ…ط§ظ†' },
  { key: 'by_gender', label: 'ط¨ط± ط§ط³ط§ط³ ط¬ظ†ط³غŒطھ' },
  { key: 'by_marital_status', label: 'ط¨ط± ط§ط³ط§ط³ ظˆط¶ط¹غŒطھ طھط£ظ‡ظ„' },
  { key: 'by_contract_type', label: 'ط¨ط± ط§ط³ط§ط³ ظ†ظˆط¹ ظ‚ط±ط§ط±ط¯ط§ط¯' },
  { key: 'by_work_shift', label: 'ط¨ط± ط§ط³ط§ط³ ط´غŒظپطھ ع©ط§ط±غŒ' },
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
          <InputLabel>ظ…ط¹غŒط§ط± ع¯ط±ظˆظ‡â€Œط¨ظ†ط¯غŒ</InputLabel>
          <Select value={criterion} label="ظ…ط¹غŒط§ط± ع¯ط±ظˆظ‡â€Œط¨ظ†ط¯غŒ"
            onChange={e => { setCriterion(e.target.value); setGroup(''); setPicked([]); }}>
            {CRITERIA.map(c => <MenuItem key={c.key} value={c.key}>{c.label}</MenuItem>)}
          </Select>
        </FormControl>

        {criterion && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>ع¯ط±ظˆظ‡</InputLabel>
            <Select value={group} label="ع¯ط±ظˆظ‡"
              onChange={e => chooseGroup(e.target.value)}>
              {groupKeys.map(g => <MenuItem key={g} value={g}>{g} ({formatPersianNumber(groups[g].length)})</MenuItem>)}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* All active quick button */}
      <Button size="small" variant="outlined" sx={{ mb: 1 }}
        onClick={() => { setPicked(allActive.map(x => x.chat_id)); setGroup('_all'); }}>
        ظ‡ظ…ظ‡ظ” ظ¾ط±ط³ظ†ظ„ ظپط¹ط§ظ„ ({formatPersianNumber(allActive.length)})
      </Button>

      {picked.length > 0 && (
        <Box sx={{ mt: 1, p: 1.25, borderRadius: '10px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <Typography variant="caption" fontWeight={700} color="#10b981">
            {formatPersianNumber(picked.length)} ع¯غŒط±ظ†ط¯ظ‡ ط§ظ†طھط®ط§ط¨ ط´ط¯
          </Typography>
          <Button size="small" variant="contained" startIcon={<CheckIcon />} sx={{ mt: 1 }}
            onClick={() => onSelect(picked)}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            ط§ط³طھظپط§ط¯ظ‡ ط§ط² ط§غŒظ† ع¯ط±ظˆظ‡
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default SegmentsPicker;