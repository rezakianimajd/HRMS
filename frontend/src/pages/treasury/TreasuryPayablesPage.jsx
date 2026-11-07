import React from 'react';
import { TreasuryListPage } from './treasuryListUi';
import { PAYABLES_CONFIG } from './treasuryListConfigs2';

const TreasuryPayablesPage = () => <TreasuryListPage {...PAYABLES_CONFIG} />;

export default TreasuryPayablesPage;
