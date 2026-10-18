import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Menu, MenuItem, Typography, Button,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import FactoryOutlinedIcon from '@mui/icons-material/FactoryOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import { useApplication } from '../../context/ApplicationContext';
import { toPersianDigits } from '../../utils/numberUtils';

const LANDING_PATH = {
  hrms: '/dashboard',
  contracts: '/contracts-dashboard',
  settings: '/settings',
  projects: '/projects',
  pettycash: '/petty-cash/dashboard',
  accounting: '/accounting',
};

// آیکون‌های اوت‌لاین و یک‌دست هر ماژول (هم‌راستا با آیکون‌های سایدبار)
const MODULE_ICONS = {
  hrms: BadgeOutlinedIcon,
  contracts: DescriptionOutlinedIcon,
  projects: AccountTreeOutlinedIcon,
  inventory: Inventory2OutlinedIcon,
  accounting: CalculateOutlinedIcon,
  assets: HomeWorkOutlinedIcon,
  treasury: AccountBalanceOutlinedIcon,
  crm: PeopleAltOutlinedIcon,
  procurement: ShoppingCartOutlinedIcon,
  sales: SellOutlinedIcon,
  production: FactoryOutlinedIcon,
  settings: SettingsOutlinedIcon,
  pettycash: AccountBalanceWalletOutlinedIcon,
};

const renderIcon = (app, size) => {
  const Icon = MODULE_ICONS[app?.slug] || AppsOutlinedIcon;
  if (app?.icon && /^(https?:)?\//.test(app.icon)) {
    return (
      <Box
        component="img"
        src={app.icon}
        alt=""
        sx={{ width: size, height: size, borderRadius: '4px', objectFit: 'cover' }}
      />
    );
  }
  return <Icon sx={{ fontSize: size, color: 'text.secondary' }} />;
};

/**
 * سوئیچر ماژول — کارت سفید و مینیمال با آیکون‌های اوت‌لاین خاکستری.
 */
const AppSwitcher = () => {
  const navigate = useNavigate();
  const { applications, currentApp, loadApplications, switchApplication } = useApplication();
  const [anchor, setAnchor] = useState(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const activeApps = applications.filter((a) => !a.is_coming_soon && a.accessible);
  const comingSoonApps = applications.filter((a) => a.is_coming_soon);

  const pick = async (app) => {
    if (app.is_coming_soon) return;
    setAnchor(null);
    await switchApplication(app);
    navigate(LANDING_PATH[app.slug] || '/dashboard');
  };

  if (applications.length <= 1) return null;

  return (
    <Box sx={{ width: '100%' }}>
      <Button
        fullWidth
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label="انتخاب ماژول"
        aria-haspopup="menu"
        sx={{
          justifyContent: 'space-between',
          px: 1.25,
          py: 0.9,
          minHeight: 54,
          textTransform: 'none',
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            bgcolor: 'background.paper',
            borderColor: 'text.disabled',
            boxShadow: '0 6px 18px rgba(15,23,42,0.08)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Box sx={{
            width: 32, height: 32, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '9px',
            border: '1px solid', borderColor: 'divider',
            bgcolor: 'action.hover',
          }}>
            {currentApp
              ? renderIcon(currentApp, 18)
              : <AppsOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
          </Box>
          <Box sx={{ minWidth: 0, textAlign: 'right' }}>
            <Typography sx={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.06em',
              color: 'text.disabled', lineHeight: 1.5,
            }}>
              ماژول فعال
            </Typography>
            <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.6 }}>
              {currentApp?.title || 'انتخاب ماژول'}
            </Typography>
          </Box>
        </Box>
        <KeyboardArrowDownIcon sx={{
          fontSize: 18, color: 'text.secondary', flexShrink: 0,
          transform: Boolean(anchor) ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease',
        }} />
      </Button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 264,
              maxWidth: 300,
              borderRadius: '14px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: '0 18px 45px rgba(15,23,42,0.16)',
              overflow: 'hidden',
            },
          },
        }}
      >
        <Box sx={{
          px: 1.75, py: 1.1,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <Typography sx={{
            fontSize: 9.5, fontWeight: 800,
            letterSpacing: '0.06em', color: 'text.disabled',
          }}>
            انتخاب ماژول
          </Typography>
          <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>
            {toPersianDigits(activeApps.length)} ماژول
          </Typography>
        </Box>

        <Box sx={{ p: 0.75 }}>
          {activeApps.map((app) => {
            const selected = currentApp?.id === app.id;
            return (
              <MenuItem
                key={app.id}
                onClick={() => pick(app)}
                selected={selected}
                sx={{
                  py: 0.9, px: 1.1, borderRadius: '10px', mb: 0.25, gap: 1,
                  '&.Mui-selected': { bgcolor: 'action.selected' },
                  '&.Mui-selected:hover': { bgcolor: 'action.selected' },
                }}
              >
                <Box sx={{
                  width: 28, height: 28, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '8px',
                  border: '1px solid', borderColor: 'divider',
                  bgcolor: 'background.paper',
                }}>
                  {renderIcon(app, 16)}
                </Box>
                <Typography noWrap sx={{
                  flex: 1, fontSize: 11.5,
                  fontWeight: selected ? 800 : 600,
                }}>
                  {app.title}
                </Typography>
                {selected && <CheckRoundedIcon sx={{ fontSize: 15, color: 'text.secondary' }} />}
              </MenuItem>
            );
          })}
        </Box>

        {comingSoonApps.length > 0 && (
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: 0.75 }}>
            <Typography sx={{
              px: 1, py: 0.5, fontSize: 9, fontWeight: 800,
              letterSpacing: '0.04em', color: 'text.disabled',
            }}>
              در حال ساخت
            </Typography>
            {comingSoonApps.map((app) => (
              <MenuItem key={app.id} disabled sx={{
                py: 0.8, px: 1.1, borderRadius: '10px', gap: 1, opacity: 0.55,
              }}>
                <Box sx={{
                  width: 26, height: 26, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '8px',
                  border: '1px solid', borderColor: 'divider',
                }}>
                  {renderIcon(app, 15)}
                </Box>
                <Typography noWrap sx={{ flex: 1, fontSize: 11 }}>{app.title}</Typography>
                <Typography sx={{ fontSize: 8.5, color: 'text.disabled' }}>به‌زودی</Typography>
              </MenuItem>
            ))}
          </Box>
        )}
      </Menu>
    </Box>
  );
};

export default AppSwitcher;

