import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, ButtonBase, Divider, IconButton, InputBase, Menu, MenuItem, Tooltip, Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ViewCarouselOutlinedIcon from '@mui/icons-material/ViewCarouselOutlined';
import { useWorkspaceTabs } from '../../context/WorkspaceTabsContext';
import { toPersianDigits } from '../../utils/numberUtils';

const FALLBACK_COLOR = '#6366f1';

const TabIcon = ({ tab, size = 15 }) => {
  if (React.isValidElement(tab.icon)) {
    return React.cloneElement(tab.icon, { sx: { fontSize: size, color: 'inherit' } });
  }
  return <InsertDriveFileOutlinedIcon sx={{ fontSize: size }} />;
};

const TabItem = ({
  tab, active, color, onActivate, onClose, onContextMenu, activeRef,
}) => (
  <Box
    ref={active ? activeRef : undefined}
    role="tab"
    aria-selected={active}
    aria-label={tab.title}
    data-testid="workspace-tab"
    data-active={active ? 'true' : 'false'}
    tabIndex={active ? 0 : -1}
    onClick={() => onActivate(tab.path)}
    onContextMenu={(event) => onContextMenu(event, tab)}
    onAuxClick={(event) => {
      if (event.button === 1) {
        event.preventDefault();
        onClose(tab.path);
      }
    }}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onActivate(tab.path);
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        onClose(tab.path);
      }
    }}
    sx={{
      position: 'relative',
      display: 'flex', alignItems: 'center', gap: 0.55,
      minWidth: 106, maxWidth: 224, height: 34, flexShrink: 0,
      px: 1.05, pb: active ? 0.28 : 0, borderRadius: '10px',
      cursor: 'pointer', userSelect: 'none', outline: 'none',
      color: active ? 'text.primary' : 'text.secondary',
      border: '1px solid',
      borderColor: active ? alpha(color, 0.38) : 'transparent',
      background: active
        ? `linear-gradient(135deg, ${alpha(color, 0.16)}, ${alpha(color, 0.045)})`
        : 'transparent',
      boxShadow: active ? `0 5px 16px ${alpha(color, 0.12)}` : 'none',
      transition: 'background .18s ease, border-color .18s ease, box-shadow .18s ease, transform .18s ease',
      '&:hover': {
        borderColor: active ? alpha(color, 0.48) : alpha(color, 0.2),
        background: active
          ? `linear-gradient(135deg, ${alpha(color, 0.19)}, ${alpha(color, 0.06)})`
          : alpha(color, 0.07),
        color: 'text.primary',
      },
      '&:focus-visible': { boxShadow: `0 0 0 2px ${alpha(color, 0.3)}` },
      '&:active': { transform: 'scale(.985)' },
    }}
  >
    <Box sx={{ display: 'grid', placeItems: 'center', color: active ? color : 'text.secondary', flexShrink: 0 }}>
      <TabIcon tab={tab} />
    </Box>
    <Typography noWrap sx={{ flex: 1, fontSize: 11.5, fontWeight: active ? 900 : 700 }}>
      {tab.title}
    </Typography>
    <IconButton
      component="span"
      size="small"
      aria-label={`بستن ${tab.title}`}
      onClick={(event) => { event.stopPropagation(); onClose(tab.path); }}
      sx={{
        width: 19, height: 19, p: 0, flexShrink: 0, color: 'inherit',
        opacity: active ? 0.9 : 0.55,
        '&:hover': { opacity: 1, bgcolor: alpha(color, 0.14), color },
      }}
    >
      <CloseIcon sx={{ fontSize: 13 }} />
    </IconButton>
    {active ? (
      <Box sx={{
        position: 'absolute', bottom: 0, insetInline: 9,
        height: 2.5, borderRadius: '3px 3px 0 0',
        bgcolor: color, boxShadow: `0 0 10px ${alpha(color, 0.55)}`,
      }} />
    ) : null}
  </Box>
);

const WorkspaceTabs = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const {
    tabs = [], active, closeTab, closeAll, closeOthers, setActive,
  } = useWorkspaceTabs();
  const scrollerRef = useRef(null);
  const activeTabRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);
  const [switcherAnchor, setSwitcherAnchor] = useState(null);
  const [switcherSearch, setSwitcherSearch] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  const refreshOverflow = () => {
    const element = scrollerRef.current;
    if (!element) return;
    setOverflowing(element.scrollWidth > element.clientWidth + 4);
  };

  useEffect(() => {
    const timer = window.setTimeout(refreshOverflow, 30);
    const handleResize = () => refreshOverflow();
    window.addEventListener('resize', handleResize);
    let observer;
    if (typeof ResizeObserver !== 'undefined' && scrollerRef.current) {
      observer = new ResizeObserver(refreshOverflow);
      observer.observe(scrollerRef.current);
    }
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, [tabs.length]);

  useEffect(() => {
    const element = activeTabRef.current;
    if (element?.scrollIntoView) {
      element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
    const timer = window.setTimeout(refreshOverflow, 60);
    return () => window.clearTimeout(timer);
  }, [active, tabs.length]);

  if (!tabs.length) return null;

  const activateTab = (path) => {
    setActive(path);
    navigate(path);
  };

  const closeTabAndNavigate = (path) => {
    const index = tabs.findIndex((tab) => tab.path === path);
    const fallback = tabs[index + 1] || tabs[index - 1] || null;
    const wasActive = path === active;
    closeTab(path);
    if (wasActive) navigate(fallback?.path || '/');
  };

  const closeOthersAndNavigate = (path) => {
    closeOthers(path);
    if (path !== active) navigate(path);
  };

  const scrollTabs = (direction) => {
    const element = scrollerRef.current;
    if (!element) return;
    if (element.scrollBy) element.scrollBy({ left: direction * 240, behavior: 'smooth' });
  };

  const filteredTabs = tabs.filter((tab) => {
    const term = switcherSearch.trim().toLowerCase();
    if (!term) return true;
    return `${tab.title || ''} ${tab.path || ''}`.toLowerCase().includes(term);
  });

  const openSwitcher = (event) => {
    setSwitcherAnchor(event.currentTarget);
    setSwitcherSearch('');
  };

  const closeSwitcher = () => {
    setSwitcherAnchor(null);
    setSwitcherSearch('');
  };

  const openContextMenu = (event, tab) => {
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, tab });
  };

  const closeContextMenu = () => setContextMenu(null);


  return (
    <>
      <Box
        data-testid="workspace-tabs"
        sx={{
          position: 'relative', zIndex: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 0.7,
          minHeight: 48, px: { xs: 0.75, sm: 1.25 }, py: 0.55,
          bgcolor: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.9 : 0.86),
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid', borderColor: 'divider',
          boxShadow: '0 -8px 26px rgba(15,23,42,0.06)',
          '&::before': {
            content: '""', position: 'absolute', top: 0, insetInline: '10%', height: 1,
            background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.28)}, transparent)`,
            pointerEvents: 'none',
          },
        }}
      >
        <Box sx={{
          display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5,
          flexShrink: 0, px: 0.25, color: 'text.secondary',
        }}>
          <LayersOutlinedIcon sx={{ fontSize: 16 }} />
          <Typography sx={{ fontSize: 10, fontWeight: 800 }}>صفحات باز</Typography>
          <Box sx={{
            minWidth: 19, height: 19, px: 0.45, borderRadius: '7px',
            display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 900,
            color: theme.palette.primary.main, bgcolor: alpha(theme.palette.primary.main, 0.1),
          }}>
            {toPersianDigits(tabs.length)}
          </Box>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' }, my: 0.85 }} />

        {overflowing ? (
          <Tooltip title="صفحات قبلی">
            <IconButton
              size="small"
              aria-label="صفحات قبلی"
              onClick={() => scrollTabs(-1)}
              sx={{ width: 25, height: 25, color: 'text.secondary' }}
            >
              <ChevronRightIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        ) : null}

        <Box
          ref={scrollerRef}
          role="tablist"
          aria-label="صفحات باز"
          onScroll={refreshOverflow}
          onWheel={(event) => {
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
              event.currentTarget.scrollLeft += event.deltaY;
            }
          }}
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.6,
            flex: 1, minWidth: 0, overflowX: 'auto', overflowY: 'hidden',
            scrollBehavior: 'smooth', py: 0.1, px: 0.1,
            '&::-webkit-scrollbar': { height: 3 },
            '&::-webkit-scrollbar-thumb': {
              background: alpha(theme.palette.text.secondary, 0.2), borderRadius: 99,
            },
          }}
        >

          {tabs.map((tab) => (
            <TabItem
              key={tab.path}
              tab={tab}
              active={tab.path === active}
              color={tab.color || FALLBACK_COLOR}
              onActivate={activateTab}
              onClose={closeTabAndNavigate}
              onContextMenu={openContextMenu}
              activeRef={activeTabRef}
            />
          ))}
        </Box>

        {overflowing ? (
          <Tooltip title="صفحات بعدی">
            <IconButton
              size="small"
              aria-label="صفحات بعدی"
              onClick={() => scrollTabs(1)}
              sx={{ width: 25, height: 25, color: 'text.secondary' }}
            >
              <ChevronLeftIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        ) : null}

        <Tooltip title="همهٔ صفحات باز">
          <ButtonBase
            onClick={openSwitcher}
            aria-label="همهٔ صفحات باز"
            sx={{
              height: 31, px: 0.75, borderRadius: '9px', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 0.45,
              color: 'text.secondary', border: '1px solid', borderColor: 'divider',
              '&:hover': { color: 'text.primary', bgcolor: 'action.hover' },
            }}
          >
            <ViewCarouselOutlinedIcon sx={{ fontSize: 16 }} />
            <Typography sx={{ display: { xs: 'none', sm: 'block' }, fontSize: 10, fontWeight: 800 }}>
              صفحات
            </Typography>
            <Box sx={{
              minWidth: 17, height: 17, px: 0.35, borderRadius: '6px',
              display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 900,
              bgcolor: alpha(theme.palette.text.secondary, 0.1),
            }}>
              {toPersianDigits(tabs.length)}
            </Box>
          </ButtonBase>
        </Tooltip>

        <Tooltip title="بستن همهٔ صفحات">
          <IconButton
            size="small"
            aria-label="بستن همهٔ صفحات"
            onClick={closeAll}
            sx={{ width: 29, height: 29, flexShrink: 0, color: 'text.secondary' }}
          >
            <CloseFullscreenIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>


      <Menu
        anchorEl={switcherAnchor}
        open={Boolean(switcherAnchor)}
        onClose={closeSwitcher}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{
          sx: {
            mt: -1, width: 340, maxWidth: 'calc(100vw - 24px)',
            borderRadius: '14px', overflow: 'hidden',
            border: '1px solid', borderColor: 'divider',
            boxShadow: 'var(--hrms-shadow-dialog, 0 18px 46px rgba(15,23,42,0.2))',
          },
        }}
      >
        <Box sx={{ px: 1.2, pt: 1.1, pb: 0.9, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.8 }}>
            <ViewCarouselOutlinedIcon sx={{ fontSize: 17, color: theme.palette.primary.main }} />
            <Typography sx={{ fontSize: 11.5, fontWeight: 900, flex: 1 }}>صفحات باز</Typography>
            <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }}>
              {toPersianDigits(tabs.length)} صفحه
            </Typography>
          </Box>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            px: 0.8, height: 31, borderRadius: '9px',
            bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider',
          }}>
            <SearchIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <InputBase
              autoFocus
              value={switcherSearch}
              onChange={(event) => setSwitcherSearch(event.target.value)}
              placeholder="جست‌وجوی صفحه…"
              inputProps={{ 'aria-label': 'جست‌وجوی صفحات باز' }}
              sx={{ flex: 1, fontSize: 10.5 }}
            />
          </Box>
        </Box>
        <Box sx={{ maxHeight: 350, overflowY: 'auto', py: 0.5 }}>
          {filteredTabs.length ? filteredTabs.map((tab) => {
            const isActive = tab.path === active;
            const color = tab.color || FALLBACK_COLOR;
            return (
              <Box
                key={tab.path}
                role="menuitem"
                tabIndex={0}
                onClick={() => { activateTab(tab.path); closeSwitcher(); }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activateTab(tab.path);
                    closeSwitcher();
                  }
                }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75,
                  mx: 0.55, px: 0.75, py: 0.55, borderRadius: '9px', cursor: 'pointer',
                  bgcolor: isActive ? alpha(color, 0.09) : 'transparent',
                  border: '1px solid', borderColor: isActive ? alpha(color, 0.24) : 'transparent',
                  '&:hover': { bgcolor: alpha(color, 0.07) },
                }}
              >
                <Box sx={{
                  width: 27, height: 27, borderRadius: '8px', flexShrink: 0,
                  display: 'grid', placeItems: 'center', color,
                  bgcolor: alpha(color, 0.1),
                }}>
                  <TabIcon tab={tab} size={14} />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontSize: 10.8, fontWeight: isActive ? 900 : 700 }}>
                    {tab.title}
                  </Typography>
                  <Typography noWrap dir="ltr" sx={{ fontSize: 8.5, color: 'text.secondary', textAlign: 'right' }}>
                    {tab.path}
                  </Typography>
                </Box>
                {isActive ? (
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                ) : null}
                <IconButton
                  size="small"
                  aria-label={`بستن ${tab.title}`}
                  onClick={(event) => { event.stopPropagation(); closeTabAndNavigate(tab.path); }}
                  sx={{ width: 22, height: 22, p: 0, color: 'text.secondary' }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            );
          }) : (
            <Typography sx={{ px: 1.5, py: 2, fontSize: 10.5, color: 'text.secondary', textAlign: 'center' }}>
              صفحه‌ای با این عبارت پیدا نشد.
            </Typography>
          )}
        </Box>
      </Menu>

      <Menu
        open={Boolean(contextMenu)}
        onClose={closeContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu
          ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
          : undefined}
        PaperProps={{ sx: { minWidth: 190, borderRadius: '12px' } }}
      >
        <MenuItem
          dense
          onClick={() => {
            if (!contextMenu?.tab) return;
            closeTabAndNavigate(contextMenu.tab.path);
            closeContextMenu();
          }}
          sx={{ fontSize: 11 }}
        >
          بستن این صفحه
        </MenuItem>
        <MenuItem
          dense
          onClick={() => {
            if (!contextMenu?.tab) return;
            closeOthersAndNavigate(contextMenu.tab.path);
            closeContextMenu();
          }}
          sx={{ fontSize: 11 }}
        >
          بستن سایر صفحات
        </MenuItem>
        <Divider />
        <MenuItem
          dense
          onClick={() => { closeAll(); closeContextMenu(); }}
          sx={{ fontSize: 11 }}
        >
          بستن همهٔ صفحات
        </MenuItem>
      </Menu>
    </>
  );
};

export default WorkspaceTabs;
