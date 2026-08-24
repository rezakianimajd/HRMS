import React, { useState } from 'react';
import { Box, Paper, Tabs, Tab, Typography, Avatar } from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ListAltIcon from '@mui/icons-material/ListAlt';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SalaryForm from './SalaryForm';
import SalaryList from './SalaryList';
import SalaryBulkImport from './SalaryBulkImport';

/**
 * Salary sub-tab container with three views:
 *  0 - ثبت فیش حقوق جدید
 *  1 - درون‌ریزی گروهی
 *  2 - لیست حقوق
 */
const SalaryTab = ({ onSuccess }) => {
  const [subTab, setSubTab] = useState(0);

  const tabs = [
    { label: 'ثبت فیش حقوق جدید', icon: <AddCircleIcon /> },
    { label: 'درون‌ریزی گروهی', icon: <UploadFileIcon /> },
    { label: 'لیست حقوق', icon: <ListAltIcon /> },
  ];

  return (
    <Box>
      <Paper sx={{ mb: 2, overflow: 'hidden' }}>
        <Tabs
          value={subTab}
          onChange={(e, v) => setSubTab(v)}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'rgba(245,158,11,0.04)',
          }}
        >
          {tabs.map((t, i) => (
            <Tab
              key={i}
              icon={t.icon}
              iconPosition="start"
              label={t.label}
              sx={{
                color: subTab === i ? '#f59e0b' : undefined,
                fontWeight: 600,
                minHeight: 48,
              }}
            />
          ))}
        </Tabs>
      </Paper>

      <Box>
        {subTab === 0 && <SalaryForm onSuccess={onSuccess} />}
        {subTab === 1 && <SalaryBulkImport onSuccess={onSuccess} />}
        {subTab === 2 && <SalaryList />}
      </Box>
    </Box>
  );
};

export default SalaryTab;