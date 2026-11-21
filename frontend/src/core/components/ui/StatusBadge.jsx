import React from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { EMPLOYEE_STATUS_MAP } from '../../constants/employeeStatuses';

const StatusBadge = ({ status, size = 'small' }) => {
  const { t } = useTranslation();
  const config = EMPLOYEE_STATUS_MAP[status] || { color: 'default', labelKey: status };
  return (
    <Chip
      label={t(config.labelKey)}
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