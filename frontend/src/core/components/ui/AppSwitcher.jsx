import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Menu, MenuItem, Typography, Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import { useApplication } from '../../context/ApplicationContext';
import { useModulePalette } from '../../context/ModulePaletteContext';
import { toPersianDigits } from '../../utils/numberUtils';
import { MODULE_ICONS, getModuleLandingPath } from '../../constants/moduleIcons';

const renderIcon = (app, size, color = 'text.secondary') => {
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
  return <Icon sx={{ fontSize: size, color }} />;
};

/**
 * سوئیچر ماژول — کارت سفید و مینیمال با آیکون‌های اوت‌لاین خاکستری.
 */
const AppSwitcher = () => {
  const navigate = useNavigate();
  const { applications, currentApp, loadApplications, switchApplication } = useApplication();
  const { getPalette } = useModulePalette();
  const currentAccent = getPalette(currentApp?.slug)?.accent || null;
  const [anchor, setAnchor] = useState(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const activeApps = applications.filter((a) => !a.is_coming_soon && a.accessible);
  const comingSoonApps = applications.filter((a) => a.is_coming_soon);

  const pick = async (app) => {
    if (app.is_coming_soon) return;
    setAnchor(null);
    if (currentApp?.id === app.id) return;
    await switchApplication(app);
    navigate(getModuleLandingPath(app.slug));
  };

  if (applications.length <= 1) return null;

  return (
    <Box sx={{ width: '100%' }}>
      <Button
        fullWidth
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label="تغییر ماژول"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        sx={{
          justifyContent: 'space-between',
          px: 1.1,
          py: 0.7,
          minHeight: 48,
          textTransform: 'none',
          borderRadius: '12px',
          border: '1px solid',
          borderColor: currentAccent ? alpha(currentAccent, 0.28) : 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
          '&:hover': {
            bgcolor: 'background.paper',
            borderColor: currentAccent ? alpha(currentAccent, 0.48) : 'text.disabled',
            boxShadow: currentAccent
              ? `0 6px 18px ${alpha(currentAccent, 0.12)}`
              : '0 6px 18px rgba(15,23,42,0.08)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
          <Box sx={{
            width: 30, height: 30, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '9px',
            border: '1px solid',
            borderColor: currentAccent ? alpha(currentAccent, 0.22) : 'divider',
            bgcolor: currentAccent ? alpha(currentAccent, 0.08) : 'action.hover',
          }}>
            {currentApp
              ? renderIcon(currentApp, 17, currentAccent || 'text.secondary')
              : <AppsOutlinedIcon sx={{ fontSize: 17, color: 'text.secondary' }} />}
          </Box>
          <Typography variant="body2" noWrap sx={{ fontWeight: 500, lineHeight: 1.5, minWidth: 0 }}>
            {currentApp?.title || 'انتخاب ماژول'}
          </Typography>
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
          <Typography variant="caption" sx={{
            fontWeight: 500,
            letterSpacing: '0.06em', color: 'text.disabled',
          }}>
            انتخاب ماژول
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 400, color: 'text.disabled' }}>
            {toPersianDigits(activeApps.length)} ماژول
          </Typography>
        </Box>

        <Box sx={{ p: 0.75 }}>
          {activeApps.map((app) => {
            const selected = currentApp?.id === app.id;
            const appAccent = getPalette(app.slug)?.accent || null;
            return (
              <MenuItem
                key={app.id}
                onClick={() => pick(app)}
                selected={selected}
                role="menuitemradio"
                aria-checked={selected}
                sx={{
                  py: 0.9, px: 1.1, borderRadius: '10px', mb: 0.25, gap: 1,
                  border: '1px solid',
                  borderColor: selected && currentAccent ? alpha(currentAccent, 0.22) : 'transparent',
                  '&.Mui-selected': {
                    bgcolor: selected && currentAccent ? alpha(currentAccent, 0.08) : 'action.selected',
                  },
                  '&.Mui-selected:hover': {
                    bgcolor: selected && currentAccent ? alpha(currentAccent, 0.11) : 'action.selected',
                  },
                }}
              >
                <Box sx={{
                  width: 28, height: 28, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: selected && appAccent ? alpha(appAccent, 0.25) : 'divider',
                  bgcolor: selected && appAccent ? alpha(appAccent, 0.08) : 'background.paper',
                }}>
                  {renderIcon(app, 16, selected ? (appAccent || currentAccent || 'text.primary') : 'text.secondary')}
                </Box>
                <Typography variant="body2" noWrap sx={{
                  flex: 1,
                  fontWeight: selected ? 500 : 400,
                }}>
                  {app.title}
                </Typography>
                {appAccent && (
                  <Box sx={{
                    width: 6, height: 6, borderRadius: '50%',
                    bgcolor: appAccent, flexShrink: 0,
                  }} />
                )}
                {selected && <CheckRoundedIcon sx={{ fontSize: 15, color: currentAccent || 'text.secondary' }} />}
              </MenuItem>
            );
          })}
        </Box>

        {comingSoonApps.length > 0 && (
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', p: 0.75 }}>
            <Typography variant="caption" sx={{
              px: 1, py: 0.5, fontWeight: 500,
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
                <Typography variant="body2" noWrap sx={{ flex: 1, fontWeight: 400 }}>{app.title}</Typography>
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>به‌زودی</Typography>
              </MenuItem>
            ))}
          </Box>
        )}
      </Menu>
    </Box>
  );
};

export default AppSwitcher;

