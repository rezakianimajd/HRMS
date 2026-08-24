import React from 'react';
import { Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

const Leaves = () => {
  const { t } = useTranslation();
  return (
    <Box>
      <Typography variant="h4" gutterBottom>{t('nav.leaves')}</Typography>
      <Typography color="textSecondary">{t('common.noData')}</Typography>
    </Box>
  );
};

export default Leaves;