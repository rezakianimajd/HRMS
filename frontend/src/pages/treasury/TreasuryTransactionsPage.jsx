import React, { useState } from 'react';
import { Button } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { TreasuryListPage } from './treasuryListUi';
import { TRANSACTIONS_CONFIG } from './treasuryListConfigs';
import TreasuryVoucherDialog from './TreasuryVoucherDialog';
import TreasuryVoucherComposerDialog from './TreasuryVoucherComposerDialog';

const TreasuryTransactionsPage = () => {
  const [voucher, setVoucher] = useState(null);
  const [composer, setComposer] = useState(false);
  const config = {
    ...TRANSACTIONS_CONFIG,
    headerActions: (
      <Button
        size="small"
        variant="contained"
        startIcon={<AddCircleOutlineIcon sx={{ fontSize: 16 }} />}
        onClick={() => setComposer(true)}
      >
        صدور حواله پرداخت
      </Button>
    ),
    rowActions: [
      ...TRANSACTIONS_CONFIG.rowActions,
      {
        key: 'print',
        label: 'رسید',
        silent: true,
        onRun: (row) => { setVoucher(`/treasury/treasury-transactions/${row.id}/print-data/`); },
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
        initialKind="payment"
        onClose={() => setComposer(false)}
      />
    </>
  );
};

export default TreasuryTransactionsPage;
