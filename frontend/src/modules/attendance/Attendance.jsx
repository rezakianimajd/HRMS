import React from 'react';
import { Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

const Attendance = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="h4" gutterBottom>{t('nav.attendance')}</Typography>
      <Typography color="textSecondary">{t('common.noData')}</Typography>
    </Box>
  );
};

export default Attendance;