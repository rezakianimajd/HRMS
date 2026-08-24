import React from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';

const statusConfig = {
  active: { color: 'success', label: 'employees.active' },
  leave: { color: 'warning', label: 'employees.on_leave' },
  retired: { color: 'default', label: 'employees.retired' },
  terminated: { color: 'error', label: 'employees.terminated' },
  deceased: { color: 'error', label: 'employees.deceased' },
};

const StatusBadge = ({ status, size = 'small' }) => {
  const { t } = useTranslation();
  const config = statusConfig[status] || { color: 'default', label: status };

  return (
    <Chip
      label={t(config.label)}
      color={config.color}
      size={size}
      variant="filled"
      sx={{
        fontWeight: 500,
        minWidth: 80,
        '& .MuiChip-label': { fontSize: '0.75rem' },
      }}
    />
  );
};

export default StatusBadge;