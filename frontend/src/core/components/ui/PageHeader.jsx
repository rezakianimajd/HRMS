import React from 'react';
import { Paper, Box, Typography, Stack } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AppsOutlinedIcon from '@mui/icons-material/AppsOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import NumbersOutlinedIcon from '@mui/icons-material/NumbersOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import CalculateOutlinedIcon from '@mui/icons-material/CalculateOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import FolderSharedOutlinedIcon from '@mui/icons-material/FolderSharedOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import RequestQuoteOutlinedIcon from '@mui/icons-material/RequestQuoteOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import HandshakeOutlinedIcon from '@mui/icons-material/HandshakeOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import RuleOutlinedIcon from '@mui/icons-material/RuleOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import HistoryEduOutlinedIcon from '@mui/icons-material/HistoryEduOutlined';
import PlaylistAddCheckOutlinedIcon from '@mui/icons-material/PlaylistAddCheckOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import InputOutlinedIcon from '@mui/icons-material/InputOutlined';
import SystemUpdateAltOutlinedIcon from '@mui/icons-material/SystemUpdateAltOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined';
import { useApplication } from '../../context/ApplicationContext';
import { useModulePalette } from '../../context/ModulePaletteContext';
import { DEFAULT_TYPOGRAPHY } from '../../theme/appearanceDefaults';
import { mixHex } from '../../theme/tokens';

const OUTLINE_BY_NAME = {
  BusinessIcon: BusinessOutlinedIcon,
  Business: BusinessOutlinedIcon,
  PeopleIcon: PeopleOutlinedIcon,
  People: PeopleOutlinedIcon,
  PeopleAltIcon: PeopleOutlinedIcon,
  PersonIcon: PeopleOutlinedIcon,
  PaletteIcon: PaletteOutlinedIcon,
  HistoryIcon: HistoryOutlinedIcon,
  AdminPanelSettingsIcon: AdminPanelSettingsOutlinedIcon,
  SettingsIcon: SettingsOutlinedIcon,
  CategoryIcon: CategoryOutlinedIcon,
  NumbersIcon: NumbersOutlinedIcon,
  DashboardIcon: DashboardOutlinedIcon,
  AccountTreeIcon: AccountTreeOutlinedIcon,
  Inventory2Icon: Inventory2OutlinedIcon,
  DescriptionIcon: DescriptionOutlinedIcon,
  CalculateIcon: CalculateOutlinedIcon,
  AccountBalanceIcon: AccountBalanceOutlinedIcon,
  AccountBalanceWalletIcon: AccountBalanceWalletOutlinedIcon,
  ReceiptLongIcon: ReceiptLongOutlinedIcon,
  ReceiptIcon: ReceiptOutlinedIcon,
  PaymentsIcon: PaymentsOutlinedIcon,
  CalendarMonthIcon: CalendarMonthOutlinedIcon,
  MailOutlineIcon: MailOutlineOutlinedIcon,
  MailIcon: MailOutlinedIcon,
  FolderSharedIcon: FolderSharedOutlinedIcon,
  AssessmentIcon: AssessmentOutlinedIcon,
  AssessmentOutlinedIcon: AssessmentOutlinedIcon,
  InsightsIcon: InsightsOutlinedIcon,
  WarningIcon: WarningAmberOutlinedIcon,
  VerifiedUserIcon: VerifiedUserOutlinedIcon,
  RequestQuoteIcon: RequestQuoteOutlinedIcon,
  StorefrontIcon: StorefrontOutlinedIcon,
  LocalShippingIcon: LocalShippingOutlinedIcon,
  ShoppingCartIcon: ShoppingCartOutlinedIcon,
  HandshakeIcon: HandshakeOutlinedIcon,
  BadgeIcon: BadgeOutlinedIcon,
  EventAvailableIcon: EventAvailableOutlinedIcon,
  FactCheckIcon: FactCheckOutlinedIcon,
  PersonAddIcon: PersonAddOutlinedIcon,
  WorkIcon: WorkOutlineOutlinedIcon,
  WorkOutlineIcon: WorkOutlineOutlinedIcon,
  WorkOutlineOutlinedIcon: WorkOutlineOutlinedIcon,
  HomeIcon: HomeOutlinedIcon,
  TrendingUpIcon: TrendingUpOutlinedIcon,
  MenuBookIcon: MenuBookOutlinedIcon,
  CompareArrowsIcon: CompareArrowsOutlinedIcon,
  RuleIcon: RuleOutlinedIcon,
  UploadFileIcon: UploadFileOutlinedIcon,
  HubIcon: HubOutlinedIcon,
  LockIcon: LockOutlinedIcon,
  AccessTimeIcon: AccessTimeOutlinedIcon,
  EventBusyIcon: EventBusyOutlinedIcon,
  HistoryEduIcon: HistoryEduOutlinedIcon,
  PlaylistAddCheckIcon: PlaylistAddCheckOutlinedIcon,
  ArchiveIcon: ArchiveOutlinedIcon,
  InputIcon: InputOutlinedIcon,
  SystemUpdateAltIcon: SystemUpdateAltOutlinedIcon,
  SmartToyIcon: SmartToyOutlinedIcon,
  ChatIcon: ChatOutlinedIcon,
};

const iconName = (icon) => icon?.type?.displayName || icon?.type?.name || '';

export const OutlineIcon = ({ icon, size = 20, sx }) => {
  const element = React.isValidElement(icon) ? icon : icon ? React.createElement(icon) : null;
  const Icon = OUTLINE_BY_NAME[iconName(element)] || AppsOutlinedIcon;
  return <Icon sx={{ fontSize: size, ...sx }} />;
};

const semantic = ':not(.MuiButton-containedError):not(.MuiButton-containedWarning):not(.MuiButton-containedSuccess):not(.MuiButton-containedInfo)';

/**
 * هدر استاندارد تمام صفحه‌ها:
 *  - کارت سفید با گوشهٔ ۱۶px (هم‌اندازهٔ هدر مشخصات شرکت)
 *  - آیکون اوت‌لاین در مربع کم‌رنگ به رنگ تاکیدی ماژول
 *  - بدون توضیح زیر عنوان
 *  - دکمه‌های هدر با رنگ تاکیدی، متن سفید و فونت مستقلِ قابل تنظیم
 */
const PageHeader = ({ icon, title, badge, actions, action, subtitle, color, ...rest }) => {
  const theme = useTheme();
  const { currentApp } = useApplication();
  const { getPalette, typography } = useModulePalette();
  const type = { ...DEFAULT_TYPOGRAPHY, ...(typography || {}) };
  const moduleAccent = getPalette(currentApp?.slug)?.accent;
  const accent = moduleAccent || color || theme.palette.primary.main;
  const actionNode = actions || action || null;

  return (
    <Paper
      elevation={0}
      {...rest}
      sx={{
        mb: 1.75,
        px: { xs: 1.5, md: 1.75 },
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        borderRadius: '16px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 4px 18px rgba(15,23,42,0.04)',
        [`& .MuiButton-contained${semantic}`]: {
          backgroundColor: `${accent} !important`,
          color: '#ffffff !important',
          fontSize: `${type.buttonSize}px !important`,
          fontWeight: `${type.buttonWeight} !important`,
          borderRadius: '9px',
          boxShadow: 'none',
        },
        [`& .MuiButton-contained${semantic}:hover`]: {
          backgroundColor: `${mixHex(accent, '#000000', 0.14)} !important`,
          boxShadow: 'none',
        },
        '& .MuiButton-outlined:not(.MuiButton-outlinedError):not(.MuiButton-outlinedWarning):not(.MuiButton-outlinedSuccess):not(.MuiButton-outlinedInfo)': {
          borderColor: alpha(accent, 0.45),
          color: accent,
          fontSize: `${type.buttonSize}px !important`,
          fontWeight: `${type.buttonWeight} !important`,
          borderRadius: '9px',
        },
        '& .MuiButton-text:not(.MuiButton-textError):not(.MuiButton-textWarning):not(.MuiButton-textSuccess):not(.MuiButton-textInfo)': {
          color: accent,
          fontSize: `${type.buttonSize}px !important`,
          fontWeight: `${type.buttonWeight} !important`,
        },
        ...rest.sx,
      }}
    >
      <Box sx={{
        width: 40, height: 40, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '12px',
        bgcolor: alpha(accent, 0.09),
        border: `1px solid ${alpha(accent, 0.16)}`,
        color: accent,
      }}>
        <OutlineIcon icon={icon} size={20} />
      </Box>

      <Box sx={{
        flex: 1, minWidth: 0,
        display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap',
      }}>
        <Typography variant="h4">{title}</Typography>
        {badge}
      </Box>

      {actionNode ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          {actionNode}
        </Stack>
      ) : null}
    </Paper>
  );
};

export default PageHeader;

