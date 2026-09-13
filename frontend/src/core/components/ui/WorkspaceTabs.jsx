import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Chip, IconButton, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import { useWorkspaceTabs } from '../../context/WorkspaceTabsContext';

/**
 * Professional 2026 workspace tab strip.
 * Renders the open pages as glassy, colour-accented tabs. The active tab is
 * highlighted; clicking a tab navigates to that route; the close icon removes
 * it. Tabs persist across route changes (state lives in WorkspaceTabsContext).
 */
const WorkspaceTabs = () => {
  const navigate = useNavigate();
  const { tabs, active, closeTab, closeAll, setActive } = useWorkspaceTabs();

  if (!tabs || tabs.length === 0) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 2,
        py: 1,
        mt: 2,
        overflowX: 'auto',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.28))',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 6px 24px rgba(99,102,241,0.08)',
        borderRadius: '10px',
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(99,102,241,0.25)', borderRadius: '10px' },
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.path === active;
        const color = tab.color || '#6366f1';
        return (
          <Chip
            key={tab.path}
            label={tab.title}
            size="small"
            onClick={() => { setActive(tab.path); navigate(tab.path); }}
            onDelete={(e) => { e.stopPropagation(); closeTab(tab.path); }}
            deleteIcon={<CloseIcon sx={{ fontSize: 14 }} />}
            sx={{
              borderRadius: '10px',
              fontWeight: isActive ? 800 : 600,
              fontSize: 12,
              px: 0.5,
              transition: 'all 0.2s ease',
              color: isActive ? '#fff' : color,
              background: isActive
                ? `linear-gradient(135deg, ${color}, ${color}cc)`
                : `${color}14`,
              border: `1px solid ${color}${isActive ? '' : '33'}`,
              boxShadow: isActive ? `0 4px 14px ${color}55` : 'none',
              '& .MuiChip-deleteIcon': { color: isActive ? '#fff' : color },
              '&:hover': { background: isActive ? `linear-gradient(135deg, ${color}, ${color}cc)` : `${color}26` },
            }}
          />
        );
      })}

      <Box sx={{ flex: 1 }} />
      <Tooltip title="بستن همه تب‌ها" placement="left">
        <IconButton size="small" onClick={closeAll} sx={{ color: 'text.secondary' }}>
          <CloseFullscreenIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default WorkspaceTabs;