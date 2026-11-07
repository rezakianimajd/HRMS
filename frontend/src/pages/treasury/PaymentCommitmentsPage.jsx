import React from 'react';
import { TreasuryListPage } from './treasuryListUi';
import { COMMITMENTS_CONFIG } from './treasuryListConfigs2';

const PaymentCommitmentsPage = () => <TreasuryListPage {...COMMITMENTS_CONFIG} />;

export default PaymentCommitmentsPage;
