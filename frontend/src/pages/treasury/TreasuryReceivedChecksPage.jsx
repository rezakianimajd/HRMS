import React from 'react';
import { TreasuryListPage } from './treasuryListUi';
import { RECEIVED_CHECKS_CONFIG } from './treasuryCheckConfigs';

const TreasuryReceivedChecksPage = () => <TreasuryListPage {...RECEIVED_CHECKS_CONFIG} />;

export default TreasuryReceivedChecksPage;
