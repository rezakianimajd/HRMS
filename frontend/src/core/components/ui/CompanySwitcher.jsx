import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button, Menu, MenuItem, Typography, Box, Divider, ListItemText
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import CheckIcon from '@mui/icons-material/Check';
import useCompany from '../../hooks/useCompany';

const CompanySwitcher = () => {
  const { t } = useTranslation();
  const { companies, currentCompany, switchCompany, loading } = useCompany();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCompanyChange = async (companyId) => {
    handleClose();
    try {
      await switchCompany(companyId);
    } catch (error) {
      console.error('Company switch failed:', error);
    }
  };

  // Don't show if user has only one company (or none)
  if (companies.length <= 1) {
    return null;
  }

  return (
    <Box>
      <Button
        color="inherit"
        onClick={handleClick}
        startIcon={<BusinessIcon />}
        size="small"
        sx={{ textTransform: 'none', maxWidth: 200 }}
        disabled={loading}
      >
        <Typography variant="body2" noWrap>
          {currentCompany?.name || t('company.noCompany')}
        </Typography>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {companies.map((company) => (
          <MenuItem
            key={company.id}
            onClick={() => handleCompanyChange(company.id)}
          >
            {currentCompany?.id === company.id && (
              <CheckIcon sx={{ mr: 1 }} fontSize="small" color="primary" />
            )}
            <ListItemText
              primary={company.name}
              secondary={company.code}
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default CompanySwitcher;