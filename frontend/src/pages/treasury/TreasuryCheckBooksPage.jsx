import React from 'react';
import { TreasuryListPage } from './treasuryListUi';
import { CHECKBOOKS_CONFIG } from './treasuryListConfigs2';

const TreasuryCheckBooksPage = () => <TreasuryListPage {...CHECKBOOKS_CONFIG} />;

export default TreasuryCheckBooksPage;
