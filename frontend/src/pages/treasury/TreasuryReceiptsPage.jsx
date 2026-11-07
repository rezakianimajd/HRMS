import React, { useState } from 'react';
import { Button } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { TreasuryListPage } from './treasuryListUi';
import { RECEIPTS_CONFIG } from './treasuryListConfigs';
import TreasuryVoucherDialog from './TreasuryVoucherDialog';
import TreasuryVoucherComposerDialog from './TreasuryVoucherComposerDialog';

const TreasuryReceiptsPage = () => {
  const [voucher, setVoucher] = useState(null);
  const [composer, setComposer] = useState(false);
  const config = {
    ...RECEIPTS_CONFIG,
    headerActions: (
      <Button
        size="small"
        variant="contained"
        startIcon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />}
        onClick={() => setComposer(true)}
      >
        صدور فیش دریافت
      </Button>
    ),
    rowActions: [
      ...RECEIPTS_CONFIG.rowActions,
      {
        key: 'print',
        label: 'چاپ',
        silent: true,
        onRun: (row) => { setVoucher(`/treasury/receipts/${row.id}/print-data/`); },
      },
    ],
  };
  return (
    <>
      <TreasuryListPage {...config} />
      <TreasuryVoucherDialog
        open={Boolean(voucher)}
        endpoint={voucher}
        onClose={() => setVoucher(null)}
      />
      <TreasuryVoucherComposerDialog
        open={composer}
        initialKind="receipt"
        onClose={() => setComposer(false)}
      />
    </>
  );
};

export default TreasuryReceiptsPage;
