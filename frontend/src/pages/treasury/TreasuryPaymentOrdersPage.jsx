import React from 'react';
import { TreasuryListPage } from './treasuryListUi';
import { PAYMENT_ORDERS_CONFIG } from './treasuryListConfigs2';

const TreasuryPaymentOrdersPage = () => <TreasuryListPage {...PAYMENT_ORDERS_CONFIG} />;

export default TreasuryPaymentOrdersPage;
