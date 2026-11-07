import React from 'react';
import { TreasuryListPage } from './treasuryListUi';
import { PAYMENT_REQUESTS_CONFIG } from './treasuryListConfigs2';

const PaymentRequestsPage = () => <TreasuryListPage {...PAYMENT_REQUESTS_CONFIG} />;

export default PaymentRequestsPage;
