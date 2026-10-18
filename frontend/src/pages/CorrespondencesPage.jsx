import React, { useState } from 'react';
import { Box, Typography, Paper, Tabs, Tab, Avatar } from '@mui/material';
import MailIcon from '@mui/icons-material/Mail';
import SendIcon from '@mui/icons-material/Send';
import CampaignIcon from '@mui/icons-material/Campaign';
import DescriptionIcon from '@mui/icons-material/Description';
import BusinessIcon from '@mui/icons-material/Business';
import IncomingLetters from '../modules/correspondences/IncomingLetters';
import OutgoingLetters from '../modules/correspondences/OutgoingLetters';
import Announcements from '../modules/correspondences/Announcements';
import Forms from '../modules/correspondences/Forms';
import Organizations from '../modules/correspondences/Organizations';
import PageHeader from '../core/components/ui/PageHeader';

const TABS = [
  { key: 'incoming', label: 'نامه‌های وارده', icon: <MailIcon />, color: '#6366f1' },
  { key: 'outgoing', label: 'نامه‌های صادره', icon: <SendIcon />, color: '#10b981' },
  { key: 'announcements', label: 'ابلاغ‌ها', icon: <CampaignIcon />, color: '#f59e0b' },
  { key: 'forms', label: 'فرم‌ها', icon: <DescriptionIcon />, color: '#8b5cf6' },
  { key: 'organizations', label: 'سازمانی', icon: <BusinessIcon />, color: '#14b8a6' },
];

const CorrespondencesPage = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <PageHeader icon={<MailIcon />} title="مکاتبات" />

      {/* Glass tabs */}
      <Paper sx={{
        overflow: 'hidden',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.3))',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: '10px',
      }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: '1px solid rgba(255,255,255,0.4)', px: 2 }}
        >
          {TABS.map((t, i) => (
            <Tab
              key={t.key}
              label={t.label}
              sx={{
                fontWeight: 600,
                py: 1.75,
                color: tab === i ? t.color : 'text.secondary',
              }}
            />
          ))}
        </Tabs>

        <Box sx={{ p: 3 }}>
          {tab === 0 && <IncomingLetters />}
          {tab === 1 && <OutgoingLetters />}
          {tab === 2 && <Announcements />}
          {tab === 3 && <Forms />}
          {tab === 4 && <Organizations />}
        </Box>
      </Paper>
    </Box>
  );
};

export default CorrespondencesPage;