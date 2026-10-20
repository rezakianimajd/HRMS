import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import SellOutlinedIcon from '@mui/icons-material/SellOutlined';
import FactoryOutlinedIcon from '@mui/icons-material/FactoryOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

/**
 * آیکون‌های واحد و اوت‌لاین ماژول‌ها.
 * همین مجموعه در سوئیچر ماژول، صفحهٔ انتخاب ماژول و صفحهٔ ورود استفاده می‌شود.
 */
export const MODULE_ICONS = {
  hrms: BadgeOutlinedIcon,
  contracts: DescriptionOutlinedIcon,
  projects: AccountTreeOutlinedIcon,
  inventory: Inventory2OutlinedIcon,
  accounting: CalculateOutlinedIcon,
  assets: HomeWorkOutlinedIcon,
  treasury: AccountBalanceOutlinedIcon,
  crm: PeopleAltOutlinedIcon,
  procurement: ShoppingCartOutlinedIcon,
  sales: SellOutlinedIcon,
  production: FactoryOutlinedIcon,
  settings: SettingsOutlinedIcon,
  pettycash: AccountBalanceWalletOutlinedIcon,
};

export const getModuleIcon = (slug) => MODULE_ICONS[slug] || AppsOutlinedIcon;

/**
 * صفحهٔ ورودی/داشبورد هر ماژول.
 * بعد از انتخاب یا سوئیچ ماژول باید به همین مسیر رفت؛ نه همیشه /dashboard.
 */
export const MODULE_LANDING_PATHS = {
  hrms: '/dashboard',
  contracts: '/contracts-dashboard',
  projects: '/projects/dashboard',
  accounting: '/accounting',
  assets: '/assets',
  treasury: '/treasury',
  procurement: '/procurement',
  settings: '/settings',
  pettycash: '/petty-cash/dashboard',
};

export const getModuleLandingPath = (slug) => MODULE_LANDING_PATHS[slug] || '/dashboard';
