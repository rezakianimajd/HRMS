import React, { useState } from 'react';
import { Box, Paper, Tabs, Tab, Typography, Avatar } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ListAltIcon from '@mui/icons-material/ListAlt';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import BenefitForm from './BenefitForm';
import BenefitList from './BenefitList';
import BenefitBulkImport from './BenefitBulkImport';

/**
 * Benefit sub-tab container with three views:
 *  0 - ثبت مزایای جدید
 *  1 - درون‌ریزی گروهی
 *  2 - لیست مزایا
 */
const BenefitTab = ({ onSuccess }) => {
  const [subTab, setSubTab] = useState(0);

  const tabs = [
    { label: 'ثبت مزایای جدید', icon: <AddCircleIcon /> },
    { label: 'درون‌ریزی گروهی', icon: <UploadFileIcon /> },
    { label: 'لیست مزایا', icon: <ListAltIcon /> },
  ];

  return (
    <Box>
      <Paper sx={{ mb: 2, overflow: 'hidden' }}>
        <Tabs
          value={subTab}
          onChange={(e, v) => setSubTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'rgba(16,185,129,0.04)' }}
        >
          {tabs.map((t, i) => (
            <Tab
              key={i}
              icon={t.icon}
              iconPosition="start"
              label={t.label}
              sx={{ color: subTab === i ? '#10b981' : undefined, fontWeight: 600, minHeight: 48 }}
            />
          ))}
        </Tabs>
      </Paper>

      <Box>
        {subTab === 0 && <BenefitForm onSuccess={onSuccess} />}
        {subTab === 1 && <BenefitBulkImport onSuccess={onSuccess} />}
        {subTab === 2 && <BenefitList />}
      </Box>
    </Box>
  );
};

export default BenefitTab;