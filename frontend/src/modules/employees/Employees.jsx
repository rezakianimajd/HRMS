import React from 'react';
import { Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

const Employees = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="h4" gutterBottom>{t('nav.employees')}</Typography>
      <Typography color="textSecondary">{t('common.noData')} - {t('nav.employees')} module placeholder</Typography>
    </Box>
  );
};

export default Employees;