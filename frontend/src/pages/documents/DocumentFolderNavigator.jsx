import React, { useMemo, useState } from 'react';
import {
  Box, ButtonBase, Chip, Collapse, Paper, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import { formatPersianNumber } from '../../core/utils/numberUtils';
import {
  DOCUMENT_LIBRARY_MODULES, findDocumentModule, folderDescendants, moduleRootFolders,
} from '../../core/config/documentLibraryModules';

const sorted = (rows) => [...rows].sort(
  (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
    || String(a.name || '').localeCompare(String(b.name || ''), 'fa'),
);

const FolderTree = ({ folders, selected, onSelect }) => {
  const [collapsed, setCollapsed] = useState({});
  const byParent = useMemo(() => {
    const map = new Map();
    folders.forEach((folder) => {
      const key = folder.parent ? String(folder.parent) : 'root';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(folder);
    });
    return map;
  }, [folders]);

  const renderNodes = (parent, depth = 0) => sorted(byParent.get(parent) || []).map((folder) => {
    const hasChildren = (byParent.get(String(folder.id)) || []).length > 0;
    const isOpen = collapsed[folder.id] !== false;
    const isSelected = String(selected) === String(folder.id);
    return (
      <React.Fragment key={folder.id}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.5,
          pl: 0.35 + depth * 1.1, pr: 0.5, borderRadius: '8px',
          bgcolor: isSelected ? alpha(folder.color || '#0f766e', 0.1) : 'transparent',
        }}>
          <ButtonBase
            onClick={() => hasChildren && setCollapsed((previous) => ({
              ...previous, [folder.id]: previous[folder.id] === false,
            }))}
            aria-label={isOpen ? 'جمع کردن پوشه' : 'باز کردن پوشه'}
            sx={{ width: 20, height: 24, borderRadius: '6px', color: 'text.disabled' }}
          >
            {hasChildren ? (
              <ChevronLeftIcon sx={{
                fontSize: 15, transform: isOpen ? 'rotate(-90deg)' : 'none',
                transition: 'transform .16s ease',
              }} />
            ) : null}
          </ButtonBase>
          <ButtonBase
            onClick={() => onSelect(folder)}
            sx={{
              flex: 1, minWidth: 0, textAlign: 'right', borderRadius: '7px',
              py: 0.42, px: 0.35, color: isSelected ? (folder.color || '#0f766e') : 'text.secondary',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.55, minWidth: 0, width: '100%' }}>
              {hasChildren
                ? <FolderOpenOutlinedIcon sx={{ fontSize: 15, flexShrink: 0 }} />
                : <FolderOutlinedIcon sx={{ fontSize: 15, flexShrink: 0 }} />}
              <Typography noWrap sx={{ fontSize: 10.8, fontWeight: isSelected ? 900 : 700, flex: 1 }}>
                {folder.name}
              </Typography>
              <Typography sx={{ fontSize: 9.5, color: 'text.disabled', flexShrink: 0 }}>
                {formatPersianNumber(folder.documents_count || 0)}
              </Typography>
            </Box>
          </ButtonBase>
        </Box>
        {hasChildren && (
          <Collapse in={isOpen} timeout={180} unmountOnExit>
            <Box sx={{ borderRight: '1px solid', borderColor: alpha(folder.color || '#0f766e', 0.2), mr: 1.2 }}>
              {renderNodes(String(folder.id), depth + 1)}
            </Box>
          </Collapse>
        )}
      </React.Fragment>
    );
  });

  return <Box>{renderNodes('root')}</Box>;
};

/**
 * مرور پوشه‌های DMS: برای هر ماژول، ریشه‌ها و زیرپوشه‌ها را با توالی قابل
 * جمع‌شدن نشان می‌دهد. انتخاب هر پوشه فیلتر فهرست اسناد را عوض می‌کند.
 */
const DocumentFolderNavigator = ({
  folders = [], moduleKey = '', selectedFolderId = '', onChangeModule, onChangeFolder,
}) => {
  const [expanded, setExpanded] = useState(true);
  const moduleRows = useMemo(() => DOCUMENT_LIBRARY_MODULES
    .map((module) => {
      const roots = moduleRootFolders(folders, module.key);
      const childRoots = (module.children || [])
        .flatMap((child) => moduleRootFolders(folders, child.key));
      const allRoots = [...roots, ...childRoots]
        .filter((folder, index, rows) => rows.findIndex((row) => row.id === folder.id) === index);
      return { ...module, roots: allRoots };
    })
    .filter((module) => module.roots.length), [folders]);

  const activeModule = moduleKey ? findDocumentModule(moduleKey) : null;
  const scopedFolders = useMemo(() => {
    if (!moduleKey) return folders;
    const roots = moduleRootFolders(folders, moduleKey);
    const ids = folderDescendants(folders, roots.map((folder) => folder.id));
    return folders.filter((folder) => ids.has(String(folder.id)));
  }, [folders, moduleKey]);

  const selectedFolder = folders.find(
    (folder) => String(folder.id) === String(selectedFolderId),
  ) || null;
  const rootFolders = moduleKey
    ? moduleRootFolders(folders, moduleKey)
    : sorted(moduleRows.flatMap((module) => module.roots));

  return (
    <Paper elevation={0} sx={{
      mb: 1.25,
      borderRadius: 'var(--hrms-radius-large, 16px)',
      border: 'var(--hrms-border-card, 1px solid #e8edf4)',
      bgcolor: 'var(--hrms-region-card-bg, #ffffff)',
      boxShadow: 'var(--hrms-shadow-card, none)',
      overflow: 'hidden',
    }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap',
        px: 1.25, py: 0.9, borderBottom: '1px solid', borderColor: 'divider',
      }}>
        <Box sx={{
          width: 28, height: 28, borderRadius: '8px', display: 'grid', placeItems: 'center',
          bgcolor: alpha('#0f766e', 0.1), color: '#0f766e',
        }}>
          <FolderOpenOutlinedIcon sx={{ fontSize: 17 }} />
        </Box>
        <Typography sx={{ fontSize: 12, fontWeight: 900 }}>پوشه‌های اسناد</Typography>
        <Box sx={{ flex: 1 }} />
        <ButtonBase
          onClick={() => setExpanded((previous) => !previous)}
          sx={{ fontSize: 10.5, color: 'text.secondary', borderRadius: '7px', px: 0.7, py: 0.3 }}
        >
          {expanded ? 'جمع کردن' : 'نمایش ساختار'}
        </ButtonBase>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', px: 1.25, pt: 0.9 }}>
        <Chip
          size="small"
          label="همه ماژول‌ها"
          onClick={() => onChangeModule?.('')}
          variant={!moduleKey ? 'filled' : 'outlined'}
          sx={{ height: 24, fontSize: 10.5, fontWeight: 800 }}
        />
        {moduleRows.map((module) => (
          <Chip
            key={module.key}
            size="small"
            label={module.label}
            onClick={() => onChangeModule?.(module.key)}
            variant={moduleKey === module.key ? 'filled' : 'outlined'}
            sx={{
              height: 24, fontSize: 10.5, fontWeight: 800,
              ...(moduleKey === module.key ? { bgcolor: alpha(module.color, 0.13), color: module.color } : {}),
            }}
          />
        ))}
        <Box sx={{ flex: 1 }} />
        {selectedFolder ? (
          <Chip
            size="small"
            label={selectedFolder.path || selectedFolder.name}
            onDelete={() => onChangeFolder?.('')}
            sx={{ height: 24, fontSize: 10.5, maxWidth: 320 }}
          />
        ) : null}
      </Box>


      <Collapse in={expanded} timeout={180}>
        <Box sx={{
          mt: 0.9, px: 1.25, pb: 1.25,
          display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '260px minmax(0, 1fr)' }, gap: 1.25,
        }}>
          <Box sx={{
            maxHeight: { xs: 220, lg: 300 }, overflowY: 'auto',
            border: '1px solid', borderColor: 'divider', borderRadius: '10px', p: 0.6,
          }}>
            <FolderTree folders={scopedFolders} selected={selectedFolderId} onSelect={(folder) => onChangeFolder?.(folder.id)} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', mb: 0.55 }}>
              {activeModule ? `ریشه‌های ${activeModule.label}` : 'ریشه‌های ماژول‌ها'}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 0.7 }}>
              {sorted(rootFolders).map((folder) => (
                <ButtonBase
                  key={folder.id}
                  onClick={() => onChangeFolder?.(folder.id)}
                  sx={{
                    textAlign: 'right', borderRadius: '9px', border: '1px solid',
                    borderColor: selectedFolderId === folder.id ? alpha(folder.color || '#0f766e', 0.4) : 'divider',
                    bgcolor: selectedFolderId === folder.id ? alpha(folder.color || '#0f766e', 0.07) : 'transparent',
                    px: 1, py: 0.65, minWidth: 0,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.55 }}>
                    <FolderOutlinedIcon sx={{ fontSize: 15, color: folder.color || '#0f766e' }} />
                    <Typography noWrap sx={{ fontSize: 10.8, fontWeight: 800, flex: 1 }}>{folder.name}</Typography>
                    <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>
                      {formatPersianNumber(folder.documents_count || 0)}
                    </Typography>
                  </Box>
                </ButtonBase>
              ))}
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default DocumentFolderNavigator;

