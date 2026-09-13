import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Paper, Tabs, Tab, Avatar } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ShieldIcon from '@mui/icons-material/Shield';
import DescriptionIcon from '@mui/icons-material/Description';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import CategoryIcon from '@mui/icons-material/Category';
import { EntityManager, CompanyProfileTab, ENDPOINTS } from '../core/components/settings/shared';

const ORG_TYPES = [
  { value: 'tax', label: 'ط§ط¯ط§ط±ظ‡ ظ…ط§ظ„غŒط§طھ' },
  { value: 'social_security', label: 'طھط£ظ…غŒظ† ط§ط¬طھظ…ط§ط¹غŒ' },
  { value: 'insurance', label: 'ط¨غŒظ…ظ‡' },
  { value: 'court', label: 'ط¯ط§ط¯ع¯ط³طھط±غŒ / ظ…ط±ط§ط¬ط¹ ظ‚ط¶ط§غŒغŒ' },
  { value: 'bank', label: 'ط¨ط§ظ†ع©' },
  { value: 'government', label: 'ط³ط§ط²ظ…ط§ظ† ط¯ظˆظ„طھغŒ' },
  { value: 'other', label: 'ط³ط§غŒط±' },
];

const TABS = [
  { key: 'profile', label: 'ظ…ط´ط®طµط§طھ ط´ط±ع©طھ', icon: <BusinessIcon />, color: '#6366f1', desc: 'ط§ط·ظ„ط§ط¹ط§طھ ط­ظ‚ظˆظ‚غŒطŒ طھظ…ط§ط³ ظˆ ظ„ظˆع¯ظˆغŒ ط´ط±ع©طھ' },
  { key: 'departments', label: 'ط¯ظ¾ط§ط±طھظ…ط§ظ†â€Œظ‡ط§', icon: <AccountTreeIcon />, color: '#14b8a6', desc: 'ط³ط§ط®طھط§ط± ظˆط§ط­ط¯ظ‡ط§غŒ ط³ط§ط²ظ…ط§ظ†غŒ' },
  { key: 'jobTitles', label: 'ط¹ظ†ط§ظˆغŒظ† ط´ط؛ظ„غŒ', icon: <WorkIcon />, color: '#ec4899', desc: 'ط³ظ…طھâ€Œظ‡ط§غŒ ط³ط§ط²ظ…ط§ظ†غŒ ط¨ط§ ط³ط·ط­' },
  { key: 'locations', label: 'ظ…ط­ظ„â€Œظ‡ط§غŒ ط§ط³طھظ‚ط±ط§ط±', icon: <LocationOnIcon />, color: '#10b981', desc: 'ط´ط¹ط¨ ظˆ ظ…ط­ظ„â€Œظ‡ط§غŒ ع©ط§ط±غŒ' },
  { key: 'insurance', label: 'ظ„غŒط³طھ ط¨غŒظ…ظ‡', icon: <ShieldIcon />, color: '#f59e0b', desc: 'ع©ط¯ظ‡ط§غŒ ع©ط§ط±ع¯ط§ظ‡غŒ طھط£ظ…غŒظ† ط§ط¬طھظ…ط§ط¹غŒ' },
  { key: 'docTypes', label: 'ط§ظ†ظˆط§ط¹ ظ…ط¯ط§ط±ع©', icon: <DescriptionIcon />, color: '#3b82f6', desc: 'ط¯ط³طھظ‡â€Œط¨ظ†ط¯غŒ ظ…ط¯ط§ط±ع© ظ¾ط±ط³ظ†ظ„غŒ' },
  { key: 'contractTypes', label: 'ط§ظ†ظˆط§ط¹ ظ‚ط±ط§ط±ط¯ط§ط¯', icon: <NoteAltIcon />, color: '#8b5cf6', desc: 'ط§ظ„ع¯ظˆظ‡ط§غŒ ظ‚ط±ط§ط±ط¯ط§ط¯ ط§ط³طھط®ط¯ط§ظ…' },
  { key: 'organizations', label: 'ط³ط§ط²ظ…ط§ظ†â€Œظ‡ط§', icon: <CategoryIcon />, color: '#f97316', desc: 'ط³ط§ط²ظ…ط§ظ†â€Œظ‡ط§غŒ ط®ط§ط±ط¬غŒ (ظ…ط§ظ„غŒط§طھطŒ طھط£ظ…غŒظ† ط§ط¬طھظ…ط§ط¹غŒ ظˆ ...)' },
];

const DefinitionsPage = () => {
  const { t } = useTranslation();
  const [tabIndex, setTabIndex] = useState(0);
  const active = TABS[tabIndex];

  return (
    <Box>
      {/* Glass header */}
      <Paper sx={{
        mb: 3, p: 2.5,
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(236,72,153,0.05))',
        border: '1px solid rgba(99,102,241,0.2)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '10px',
      }}>
        <Avatar sx={{
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          boxShadow: '0 6px 20px rgba(99,102,241,0.4)',
        }}>
          <CategoryIcon sx={{ fontSize: 28, color: '#fff' }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight={800}>طھط¹ط§ط±غŒظپ ط§ظˆظ„غŒظ‡</Typography>
          <Typography variant="body2" color="textSecondary">ظ…ط¯غŒط±غŒطھ ط¯ط§ط¯ظ‡â€Œظ‡ط§غŒ ظ¾ط§غŒظ‡ ظˆ ظ…ط±ط¬ط¹ ط³ط§ط²ظ…ط§ظ†</Typography>
        </Box>
      </Paper>

      {/* Glass container with colored tabs */}
      <Paper sx={{
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.3))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: '10px',
      }}>
        <Tabs
          value={tabIndex}
          onChange={(e, v) => setTabIndex(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(255,255,255,0.4)', px: 2 }}
        >
          {TABS.map((tab, i) => (
            <Tab
              key={tab.key}
              label={tab.label}
              sx={{
                fontWeight: 600,
                py: 1.75,
                color: tabIndex === i ? tab.color : 'text.secondary',
              }}
            />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Active tab description */}
          <Paper sx={{
            mb: 2, px: 1.5, py: 1,
            background: `linear-gradient(135deg, ${active.color}0d, ${active.color}04)`,
            border: `1px solid ${active.color}20`,
            borderRadius: '10px',
          }}>
            <Typography variant="body2" sx={{ color: active.color, fontWeight: 600 }}>{active.desc}</Typography>
          </Paper>

          {tabIndex === 0 && <CompanyProfileTab />}
          {tabIndex === 1 && <EntityManager endpoint={ENDPOINTS.departments} fields={['name', 'code']} title="ظ…ط¯غŒط±غŒطھ ط¯ظ¾ط§ط±طھظ…ط§ظ†â€Œظ‡ط§غŒ ط³ط§ط²ظ…ط§ظ†" />}
          {tabIndex === 2 && <EntityManager endpoint={ENDPOINTS.jobTitles} fields={['name', 'code']} extraFields={{ level: 'ط³ط·ط­' }} defaultForm={{ level: 'expert' }} title="ظ…ط¯غŒط±غŒطھ ط¹ظ†ط§ظˆغŒظ† ط´ط؛ظ„غŒ" />}
          {tabIndex === 3 && <EntityManager endpoint={ENDPOINTS.workLocations} fields={['name', 'code']} extraFields={{ description: 'طھظˆط¶غŒط­ط§طھ' }} title="ظ…ط¯غŒط±غŒطھ ظ…ط­ظ„â€Œظ‡ط§غŒ ط§ط³طھظ‚ط±ط§ط±" />}
          {tabIndex === 4 && <EntityManager endpoint={ENDPOINTS.insuranceLists} fields={['name', 'code']} extraFields={{ description: 'طھظˆط¶غŒط­ط§طھ' }} title="ظ…ط¯غŒط±غŒطھ ظ„غŒط³طھâ€Œظ‡ط§غŒ ط¨غŒظ…ظ‡" />}
          {tabIndex === 5 && <EntityManager endpoint={ENDPOINTS.documentTypes} fields={['name', 'code']} title="ظ…ط¯غŒط±غŒطھ ط§ظ†ظˆط§ط¹ ظ…ط¯ط§ط±ع©" />}
          {tabIndex === 6 && <EntityManager endpoint={ENDPOINTS.contractTypes} fields={['name', 'code']} extraFields={{ description: 'طھظˆط¶غŒط­ط§طھ' }} title="ظ…ط¯غŒط±غŒطھ ط§ظ†ظˆط§ط¹ ظ‚ط±ط§ط±ط¯ط§ط¯" />}
          {tabIndex === 7 && (
            <EntityManager
              endpoint={ENDPOINTS.organizations}
              fields={['name', 'code']}
              extraFields={{
                type: { label: 'ظ†ظˆط¹ ط³ط§ط²ظ…ط§ظ†', options: ORG_TYPES },
                phone: 'طھظ„ظپظ†',
                email: 'ط§غŒظ…غŒظ„',
                address: 'ط¢ط¯ط±ط³',
                description: 'طھظˆط¶غŒط­ط§طھ',
              }}
              defaultForm={{ type: 'government' }}
              title="ظ…ط¯غŒط±غŒطھ ط³ط§ط²ظ…ط§ظ†â€Œظ‡ط§غŒ ط®ط§ط±ط¬غŒ (ظ…ط§ظ„غŒط§طھطŒ طھط£ظ…غŒظ† ط§ط¬طھظ…ط§ط¹غŒ ظˆ ...)"
            />
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default DefinitionsPage;