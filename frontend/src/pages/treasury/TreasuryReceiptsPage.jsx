import React, { useState } from 'react';
import { TreasuryListPage } from './treasuryListUi';
import { RECEIPTS_CONFIG } from './treasuryListConfigs';
import TreasuryVoucherDialog from './TreasuryVoucherDialog';

const TreasuryReceiptsPage = () => {
  const [voucher, setVoucher] = useState(null);
  const config = {
    ...RECEIPTS_CONFIG,
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
    </>
  );
};

export default TreasuryReceiptsPage;
