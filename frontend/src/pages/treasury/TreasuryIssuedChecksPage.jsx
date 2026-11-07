import React from 'react';
import { TreasuryListPage } from './treasuryListUi';
import { ISSUED_CHECKS_CONFIG } from './treasuryCheckConfigs';

const TreasuryIssuedChecksPage = () => <TreasuryListPage {...ISSUED_CHECKS_CONFIG} />;

export default TreasuryIssuedChecksPage;
