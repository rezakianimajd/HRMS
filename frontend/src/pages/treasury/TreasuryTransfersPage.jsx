import React, { useState } from 'react';
import { Button } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { TreasuryListPage } from './treasuryListUi';
import { TRANSFERS_CONFIG } from './treasuryListConfigs2';
import TreasuryVoucherComposerDialog from './TreasuryVoucherComposerDialog';

const TreasuryTransfersPage = () => {
  const [composer, setComposer] = useState(false);
  return (
    <>
      <TreasuryListPage
        {...TRANSFERS_CONFIG}
        headerActions={(
          <Button
            size="small"
            variant="contained"
            startIcon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />}
            onClick={() => setComposer(true)}
          >
            صدور رسید انتقال
          </Button>
        )}
      />
      <TreasuryVoucherComposerDialog
        open={composer}
        initialKind="transfer"
        onClose={() => setComposer(false)}
      />
    </>
  );
};

export default TreasuryTransfersPage;
