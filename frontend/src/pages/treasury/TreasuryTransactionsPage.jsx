import React, { useState } from 'react';
import { TreasuryListPage } from './treasuryListUi';
import { TRANSACTIONS_CONFIG } from './treasuryListConfigs';
import TreasuryVoucherDialog from './TreasuryVoucherDialog';

const TreasuryTransactionsPage = () => {
  const [voucher, setVoucher] = useState(null);
  const config = {
    ...TRANSACTIONS_CONFIG,
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
    </>
  );
};

export default TreasuryTransactionsPage;
