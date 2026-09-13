import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  Box, Chip, TextField, InputAdornment, Stack, IconButton, Avatar, Paper,
  Accordion, AccordionSummary, AccordionDetails, Grid, Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import SearchRoundedIcon from '@mui/icons-material/Search';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CategoryIcon from '@mui/icons-material/Category';
import InputIcon from '@mui/icons-material/Input';
import MailIcon from '@mui/icons-material/Mail';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SettingsIcon from '@mui/icons-material/Settings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';

const HELP_SECTIONS = [
  {
    id: 'dashboard',
    icon: <DashboardIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#6366f1',
    title: 'ط¯ط§ط´ط¨ظˆط±ط¯',
    intro: 'ظ†ظ…ط§غŒ ع©ظ„غŒ ظˆ ط³ط±غŒط¹ ط³ط§ط²ظ…ط§ظ† ط¯ط± غŒع© ظ†ع¯ط§ظ‡.',
    content: [
      'طھط¹ط¯ط§ط¯ ظ¾ط±ط³ظ†ظ„ ظپط¹ط§ظ„طŒ ظ†ط±ط® ظˆط±ظˆط¯/ط®ط±ظˆط¬ ظˆ ظ…غŒط§ظ†ع¯غŒظ† ط³ظ†غŒ ط¨ظ‡â€Œطµظˆط±طھ ع©ط§ط±طھâ€Œظ‡ط§غŒ KPI.',
      'ظ‡ط´ط¯ط§ط±ظ‡ط§غŒ ظ…ظ‡ظ…: ظ‚ط±ط§ط±ط¯ط§ط¯ظ‡ط§غŒ ط¯ط± ط´ط±ظپ ط§ظ†ظ‚ط¶ط§طŒ ظ…ط¯ط§ط±ع© ظ…ظ†ظ‚ط¶غŒ ظˆ ظپط¹ط§ظ„غŒطھâ€Œظ‡ط§غŒ ط§ط®غŒط±.',
    ],
  },
  {
    id: 'employees',
    icon: <PeopleIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#ec4899',
    title: 'ظ¾ط±ط³ظ†ظ„',
    intro: 'ظ…ط¯غŒط±غŒطھ ع©ط§ظ…ظ„ ط§ط·ظ„ط§ط¹ط§طھ ع©ط§ط±ع©ظ†ط§ظ† ط³ط§ط²ظ…ط§ظ†.',
    content: [
      'ظ„غŒط³طھ ط¨ط§ ط¬ط³طھط¬ظˆ + ظپغŒظ„طھط±ظ‡ط§غŒ طھط±ع©غŒط¨غŒ (ط¯ظ¾ط§ط±طھظ…ط§ظ†طŒ ط´ط؛ظ„طŒ ظ…ط­ظ„طŒ ظˆط¶ط¹غŒطھطŒ ط¬ظ†ط³غŒطھ).',
      'ط§ظپط²ظˆط¯ظ† ظ¾ط±ط³ظ†ظ„: ظپط±ظ… طھع©â€Œطµظپط­ظ‡ ط¨ط§ ع©ط§ط±طھâ€Œظ‡ط§غŒ ط´غŒط´ظ‡â€Œط§غŒ â€” ظپط±ط¯غŒطŒ طھظ…ط§ط³طŒ ط´ط؛ظ„غŒطŒ ط§ط±ط²غŒط§ط¨غŒطŒ ط³ظˆط§ط¨ظ‚طŒ ظ…ط¯ط§ط±ع©.',
      'ظ¾ط±ظˆظ†ط¯ظ‡ ظ¾ط±ط³ظ†ظ„غŒ: غ¶ طھط¨ (ظپط±ط¯غŒطŒ ط´ط؛ظ„غŒطŒ ط¯ط±غŒط§ظپطھغŒâ€Œظ‡ط§طŒ ع©ط§ط±ع©ط±ط¯طŒ طھط؛غŒغŒط±ط§طھطŒ ظ…ط¯ط§ط±ع©).',
      'ط¹ع©ط³ ظ¾ط±ط³ظ†ظ„غŒ ط§ط² طھط¨ ظ…ط¯ط§ط±ع© ط¢ظ¾ظ„ظˆط¯ ظ…غŒâ€Œط´ظˆط¯ ظˆ ط¯ط± ع©ظ„ ط¨ط±ظ†ط§ظ…ظ‡ ظ†ظ…ط§غŒط´ ط¯ط§ط¯ظ‡ ظ…غŒâ€Œط´ظˆط¯.',
      'طھط؛غŒغŒط±ط§طھ ط´ط؛ظ„غŒ: طھط§ط±غŒط®ع†ظ‡ ط§ط±طھظ‚ط§/طھظ†ط²ظ„/طھط؛غŒغŒط± ط¯ظ¾ط§ط±طھظ…ط§ظ†/ط­ظ‚ظˆظ‚ + ظ†ط³ط®ظ‡â€Œظ‡ط§غŒ ظ‚ط±ط§ط±ط¯ط§ط¯.',
    ],
  },
  {
    id: 'phonebook',
    icon: <ContactPhoneIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#10b981',
    title: 'ط¯ظپطھط±ع†ظ‡ طھظ„ظپظ†',
    intro: 'ط¯ط³طھط±ط³غŒ ط³ط±غŒط¹ ط¨ظ‡ ط§ط·ظ„ط§ط¹ط§طھ طھظ…ط§ط³ ع©ط§ط±ع©ظ†ط§ظ†.',
    content: [
      'ع©ط§ط±طھâ€Œظ‡ط§غŒ طھظ…ط§ط³ ط´غŒط´ظ‡â€Œط§غŒ ط¨ط§ ط¹ع©ط³طŒ ظ…ظˆط¨ط§غŒظ„طŒ طھظ„ظپظ†طŒ ط§غŒظ…غŒظ„ ظˆ طھظ…ط§ط³ ط§ط¶ط·ط±ط§ط±غŒ.',
      'ط¯ظˆ ظ†ظ…ط§غŒ ع©ط§ط±طھغŒ/ظ„غŒط³طھغŒ + ط¬ط³طھط¬ظˆ + ظپغŒظ„طھط± ط¯ظ¾ط§ط±طھظ…ط§ظ† + ط®ط±ظˆط¬غŒ ط§ع©ط³ظ„.',
    ],
  },
  {
    id: 'search',
    icon: <SearchRoundedIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#f59e0b',
    title: 'ط¬ط³طھط¬ظˆغŒ ظ¾غŒط´ط±ظپطھظ‡',
    intro: 'غŒط§ظپطھظ† ظ‡ط± ع†غŒط²غŒ ط¯ط± ظ¾ط±ط³ظ†ظ„ ظˆ ظ…ط¯ط§ط±ع©.',
    content: [
      'ط¬ط³طھط¬ظˆغŒ ظ‡ظ…ط²ظ…ط§ظ† ط¯ط± ظ¾ط±ط³ظ†ظ„ ظˆ ظ…ط¯ط§ط±ع©.',
      'ظپغŒظ„طھط±ظ‡ط§: ط¯ظ¾ط§ط±طھظ…ط§ظ†طŒ ط¹ظ†ظˆط§ظ† ط´ط؛ظ„غŒطŒ ظ…ط­ظ„طŒ ط¬ظ†ط³غŒطھطŒ طھط£ظ‡ظ„طŒ ظˆط¶ط¹غŒطھطŒ ظ†ظˆط¹ ظ…ط¯ط±ع©.',
      'ط¬ط³طھط¬ظˆغŒ ظپط§ط²غŒ (Trigram) ط±ظˆغŒ PostgreSQL â€” ظ†ط§ظ… ظ†ط§ظ‚طµ ظ‡ظ… ظ¾غŒط¯ط§ ظ…غŒâ€Œط´ظˆط¯.',
    ],
  },
  {
    id: 'orgchart',
    icon: <AccountTreeIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#8b5cf6',
    title: 'ع†ط§ط±طھ ط³ط§ط²ظ…ط§ظ†غŒ',
    intro: 'ط³ط§ط®طھط§ط± ط³ط§ط²ظ…ط§ظ†غŒ ط¨ظ‡â€Œطµظˆط±طھ ط¯ط±ط®طھ طھط¹ط§ظ…ظ„غŒ.',
    content: [
      'ط¯ط±ط®طھ ط³ظ„ط³ظ„ظ‡â€Œظ…ط±ط§طھط¨غŒ ط¨ط§ ط§طھطµط§ظ„ط§طھ ط®ظˆط¯ع©ط§ط± ظˆ ط±ظ†ع¯â€Œط¨ظ†ط¯غŒ ط¨ط± ط§ط³ط§ط³ ط¹ظ…ظ‚.',
      'طھظ…ط±ع©ط² ط¨ط± ط´ط§ط®ظ‡: ط²ظ†ط¬غŒط±ظ‡ ط¨ط§ظ„ط§ط¯ط³طھغŒ + ط²غŒط±ظ…ط¬ظ…ظˆط¹ظ‡ ع©ط§ظ…ظ„.',
      'ظˆغŒط±ط§غŒط´: ط§ظپط²ظˆط¯ظ†/ط­ط°ظپ ط¬ط§غŒع¯ط§ظ‡ + طھط®طµغŒطµ ظ†ظپط±ط§طھ.',
      'ع†ط§ظ¾/PDF ط¨ط§ ظ…ظ‚غŒط§ط³ ط®ظˆط¯ع©ط§ط± ظˆ ط¨ط¯ظˆظ† ط¨ط±ط´.',
    ],
  },
  {
    id: 'reports',
    icon: <AssessmentIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#3b82f6',
    title: 'ع¯ط²ط§ط±ط´ط§طھ',
    intro: 'طھط­ظ„غŒظ„â€Œظ‡ط§غŒ ط¢ظ…ط§ط±غŒ ظˆ ط¨طµط±غŒ ط³ط§ط²ظ…ط§ظ†.',
    content: [
      'غ±غµ+ ظ†ظ…ظˆط¯ط§ط±: ط¬ظ†ط³غŒطھطŒ ط¯ظ¾ط§ط±طھظ…ط§ظ†طŒ ط¹ظ†ظˆط§ظ† ط´ط؛ظ„غŒطŒ ظ…ط­ظ„طŒ ط¨غŒظ…ظ‡طŒ ط³ظ†طŒ ظ†ط±ط® ط®ط±ظˆط¬.',
      'طھظˆظ„ط¯ظ‡ط§غŒ غ· ط±ظˆط² ط¢غŒظ†ط¯ظ‡ (ط´ظ…ط³غŒ) + ط®ظ„ط§طµظ‡ ظ…ع©ط§طھط¨ط§طھ ظˆ ط­ظ‚ظˆظ‚.',
      'ط¯ط³طھغŒط§ط± ظ‡ظˆط´ظ…ظ†ط¯ ط¨ط±ط§غŒ ظ¾ط±ط³ط´ ظˆ ظ¾ط§ط³ط® ظ…طھظ†غŒ.',
    ],
  },
  {
    id: 'definitions',
    icon: <CategoryIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#14b8a6',
    title: 'طھط¹ط§ط±غŒظپ ط§ظˆظ„غŒظ‡',
    intro: 'ط¯ط§ط¯ظ‡â€Œظ‡ط§غŒ ظ…ط±ط¬ط¹ ظˆ ظ¾ط§غŒظ‡ ط³غŒط³طھظ….',
    content: [
      'ظ…ط´ط®طµط§طھ ط´ط±ع©طھ: ظ„ظˆع¯ظˆطŒ ط§ط·ظ„ط§ط¹ط§طھ ط­ظ‚ظˆظ‚غŒ ظˆ طھظ…ط§ط³.',
      'ط¯ظ¾ط§ط±طھظ…ط§ظ†â€Œظ‡ط§طŒ ط¹ظ†ط§ظˆغŒظ† ط´ط؛ظ„غŒطŒ ظ…ط­ظ„â€Œظ‡ط§طŒ ظ„غŒط³طھ ط¨غŒظ…ظ‡.',
      'ط§ظ†ظˆط§ط¹ ظ…ط¯ط§ط±ع© ظˆ ظ‚ط±ط§ط±ط¯ط§ط¯ (ظ¾ظˆغŒط§) + ط³ط§ط²ظ…ط§ظ†â€Œظ‡ط§غŒ ط®ط§ط±ط¬غŒ.',
    ],
  },
  {
    id: 'data-entry',
    icon: <InputIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#f97316',
    title: 'ظˆط±ظˆط¯ ط§ط·ظ„ط§ط¹ط§طھ',
    intro: 'ط«ط¨طھ طھط±ط§ع©ظ†ط´â€Œظ‡ط§غŒ ظ¾ط±ط³ظ†ظ„غŒ ط±ظˆط²ط§ظ†ظ‡.',
    content: [
      'غµ طھط¨: ظ…ط±ط®طµغŒطŒ ط؛غŒط¨طھطŒ ط­ظ‚ظˆظ‚طŒ ظ…ط²ط§غŒط§طŒ ع©ط³ظˆط±ط§طھ.',
      'ط­ظ‚ظˆظ‚: ط«ط¨طھ ظپغŒط´ ظ…ط§ظ‡ط§ظ†ظ‡ + ط¯ط±ظˆظ†â€Œط±غŒط²غŒ ط§ع©ط³ظ„.',
      'ظ…ط²ط§غŒط§غŒ ط±ظپط§ظ‡غŒ: ط¹غŒط¯غŒطŒ ط¨ظ† ع©ط§ط±طھطŒ ظˆط§ظ….',
    ],
  },
  {
    id: 'correspondences',
    icon: <MailIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#06b6d4',
    title: 'ظ…ع©ط§طھط¨ط§طھ',
    intro: 'ظ…ط¯غŒط±غŒطھ ظ†ط§ظ…ظ‡â€Œظ‡ط§ ظˆ ط§ط³ظ†ط§ط¯ ط³ط§ط²ظ…ط§ظ†غŒ.',
    content: [
      'ظ†ط§ظ…ظ‡â€Œظ‡ط§غŒ ظˆط§ط±ط¯ظ‡طŒ طµط§ط¯ط±ظ‡طŒ ط§ط¨ظ„ط§ط؛â€Œظ‡ط§ ظˆ ظپط±ظ…â€Œظ‡ط§.',
      'ظ‡ط± ظ…ظˆط±ط¯: ط´ظ…ط§ط±ظ‡طŒ طھط§ط±غŒط® ط´ظ…ط³غŒطŒ ط§ظˆظ„ظˆغŒطھ ظˆ ظ¾غŒظˆط³طھ.',
      'طھط¨ ط³ط§ط²ظ…ط§ظ†غŒ: ظ…ع©ط§طھط¨ط§طھ ط¨ط§ ط§ط¯ط§ط±ط§طھ.',
    ],
  },
  {
    id: 'scoring',
    icon: <EmojiEventsIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#f59e0b',
    title: 'ط§ط±ط²غŒط§ط¨غŒ ظˆ ط§ظ…طھغŒط§ط²ط¯ظ‡غŒ',
    intro: 'ط³ظ†ط¬ط´ ط¹ظ…ظ„ع©ط±ط¯ ع©ط§ط±ع©ظ†ط§ظ† ط¨ط§ غ±غ² ظ…ط¹غŒط§ط±.',
    content: [
      'ظ…ط¹غŒط§ط±ظ‡ط§: ط¹ظ…ظ„ع©ط±ط¯طŒ ط±ط¶ط§غŒطھطŒ طھط­طµغŒظ„ط§طھطŒ ط­ط¶ظˆط±طŒ ط§ظ†ط¶ط¨ط§ط·طŒ ظ…ط³ط§ظپطھطŒ ط³ط§ط¨ظ‚ظ‡طŒ ط±ط´ط¯ ط­ظ‚ظˆظ‚طŒ ظ…ط²ط§غŒط§طŒ ظ…ط£ظ…ظˆط±غŒطھطŒ ظ‚ط±ط§ط±ط¯ط§ط¯طŒ ظ†ظˆط¨طھ ع©ط§ط±غŒ.',
      'ط±طھط¨ظ‡â€Œط¨ظ†ط¯غŒ + ظ†ظˆط§ط± ظ¾غŒط´ط±ظپطھ ط±ظ†ع¯غŒ + طھظپع©غŒع© ط¬ط²ط¦غŒط§طھ.',
    ],
  },
  {
    id: 'settings',
    icon: <SettingsIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#64748b',
    title: 'طھظ†ط¸غŒظ…ط§طھ',
    intro: 'ظ¾غŒع©ط±ط¨ظ†ط¯غŒ ط³غŒط³طھظ… ظˆ ط´ط®طµغŒâ€Œط³ط§ط²غŒ.',
    content: [
      'طھظ†ط¸غŒظ…ط§طھ ط¹ظ…ظˆظ…غŒطŒ ع©ط§ط±ط¨ط±ط§ظ†/ظ†ظ‚ط´â€Œظ‡ط§طŒ ط¯ط±ظˆظ†â€Œط±غŒط²غŒ ط§ع©ط³ظ„.',
      'ط¸ط§ظ‡ط±: غµ ظ…ط¯ ظ†ظ…ط§غŒط´ (ط±ظˆط´ظ†طŒ طھط§ط±غŒع©طŒ F ظ…ظˆط¯طŒ F ظ…ظˆط¯ ط±ظˆط´ظ†طŒ ع©ظˆط±ط§ط³ط§ظˆط§ ط³غŒط§ظ‡â€Œظˆط³ظپغŒط¯).',
    ],
  },
  {
    id: 'assistant',
    icon: <SmartToyIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#f43f5e',
    title: 'ط¯ط³طھغŒط§ط± ظ…ظ†ط§ط¨ط¹ ط§ظ†ط³ط§ظ†غŒ',
    intro: 'ط¯ط³طھغŒط§ط± ظ‡ظˆط´ظ…ظ†ط¯ ط¢ظپظ„ط§غŒظ† ط¨ط§ ظ¾ط§ط³ط® ط§ط² ط¯ط§ط¯ظ‡â€Œظ‡ط§غŒ ظˆط§ظ‚ط¹غŒ.',
    content: [
      'آ«طھط§ط±غŒط® ط§ط³طھط®ط¯ط§ظ… / ط¢ط¯ط±ط³ / ع©ط§ط±ع©ط±ط¯ / ط­ظ‚ظˆظ‚ / ظ…ط²ط§غŒط§ / ظ…ط±ط®طµغŒ / ط¬ط±ط§ط¦ظ… / ظ…ط¯ط§ط±ع© / ط³ظˆط§ط¨ظ‚ [ظ†ط§ظ…]آ»',
      'آ«ع†ظ‡ ع©ط³ط§ظ†غŒ ط§ط­طھظ…ط§ظ„ ط§ط³طھط¹ظپط§ ط¯ط§ط±ظ†ط¯طںآ» â€” آ«ط¨ظ‡طھط±غŒظ† ع©ط§ط±ظ…ظ†ط¯ ع©غŒظ‡طںآ»',
      'آ«ظ†ظ…ظˆط¯ط§ط± ط¯ظ¾ط§ط±طھظ…ط§ظ†â€Œظ‡ط§ ط±ظˆ ظ†ط´ظˆظ† ط¨ط¯ظ‡آ» (طھطµظˆغŒط± SVG)',
      'ط³ط¤ط§ظ„ ظ…ط±ع©ط¨: آ«ع©ط§ط±ع©ط±ط¯ ظˆ ط­ظ‚ظˆظ‚ ظˆ ظ…ط²ط§غŒط§غŒ [ظ†ط§ظ…] ط¯ط± غ±غ´غ°غ´آ»',
    ],
  },
  {
    id: 'shortcuts',
    icon: <KeyboardIcon sx={{ color: '#fff', fontSize: 18 }} />,
    color: '#0ea5e9',
    title: 'ظ…غŒط§ظ†ط¨ط±ظ‡ط§غŒ طµظپط­ظ‡â€Œع©ظ„غŒط¯',
    intro: 'ط³ط±غŒط¹â€Œطھط± ع©ط§ط± ع©ظ†غŒط¯.',
    content: [
      'F1 â€” ط¨ط§ط²/ط¨ط³طھظ‡ ع©ط±ط¯ظ† ط§غŒظ† ط±ط§ظ‡ظ†ظ…ط§.',
      'Enter â€” ط§ط±ط³ط§ظ„ ظ¾غŒط§ظ… ط¯ط± ط¯ط³طھغŒط§ط±.',
    ],
  },
];

const QUICK_TIPS = [
  { icon: 'ًں”چ', text: 'ط§ط² ظپغŒظ„طھط±ظ‡ط§غŒ طھط±ع©غŒط¨غŒ ط¨ط±ط§غŒ غŒط§ظپطھظ† ط³ط±غŒط¹ ظ¾ط±ط³ظ†ظ„ ط§ط³طھظپط§ط¯ظ‡ ع©ظ†غŒط¯' },
  { icon: 'ًں“¸', text: 'ط¹ع©ط³ ظ¾ط±ط³ظ†ظ„غŒ ط±ط§ ط¯ط± طھط¨ ظ…ط¯ط§ط±ع© ط¢ظ¾ظ„ظˆط¯ ع©ظ†غŒط¯ طھط§ ظ‡ظ…ظ‡â€Œط¬ط§ ط¯غŒط¯ظ‡ ط´ظˆط¯' },
  { icon: 'ًںژ¨', text: 'ط§ط² طھظ†ط¸غŒظ…ط§طھ â†’ ط¸ط§ظ‡ط±طŒ ط­ط§ظ„طھ ظ†ظ…ط§غŒط´ ط±ط§ ط¹ظˆط¶ ع©ظ†غŒط¯ (ط­طھغŒ ع©ظˆط±ط§ط³ط§ظˆط§)' },
  { icon: 'ًں¤–', text: 'ط³ط¤ط§ظ„â€Œظ‡ط§غŒ ط¯ط³طھغŒط§ط± ط±ط§ ط¨ط§ F1 ط¨ط¨غŒظ†غŒط¯' },
  { icon: 'ًں“ٹ', text: 'ظ†ظ…ظˆط¯ط§ط± ط±ط§ ط§ط² ط¯ط³طھغŒط§ط± ط¨ط§ آ«ظ†ظ…ظˆط¯ط§ط± ...آ» ط¯ط±ط®ظˆط§ط³طھ ع©ظ†غŒط¯' },
  { icon: 'âŒ¨ï¸ڈ', text: 'ط¨ط§ Enter ظ¾غŒط§ظ… ط¯ط³طھغŒط§ط± ط±ط§ ط§ط±ط³ط§ظ„ ع©ظ†غŒط¯' },
];

const FAQ = [
  { q: 'ع†ط·ظˆط± ط¹ع©ط³ ظ¾ط±ط³ظ†ظ„ ط§ط¶ط§ظپظ‡ ع©ظ†ظ…طں', a: 'ط¯ط± ظ¾ط±ظˆظ†ط¯ظ‡ ظ¾ط±ط³ظ†ظ„ â†’ طھط¨ ظ…ط¯ط§ط±ع©طŒ ط¯ع©ظ…ظ‡ آ«ط¢ظ¾ظ„ظˆط¯ ط¹ع©ط³ ظ¾ط±ط³ظ†ظ„غŒآ».' },
  { q: 'ع†ط·ظˆط± ط®ط±ظˆط¬غŒ ط§ع©ط³ظ„ ط¨ع¯غŒط±ظ…طں', a: 'ط¯ط± ط¯ظپطھط±ع†ظ‡ طھظ„ظپظ†طŒ ط¯ع©ظ…ظ‡ آ«ط®ط±ظˆط¬غŒ ط§ع©ط³ظ„آ». ط¨ط±ط§غŒ ط¯ط±ظˆظ†â€Œط±غŒط²غŒطŒ طھظ†ط¸غŒظ…ط§طھ â†’ ط¯ط±ظˆظ†â€Œط±غŒط²غŒ ط§ع©ط³ظ„.' },
  { q: 'ع†ط·ظˆط± ط­ط§ظ„طھ ظ†ظ…ط§غŒط´ ط±ط§ ط¹ظˆط¶ ع©ظ†ظ…طں', a: 'طھظ†ط¸غŒظ…ط§طھ â†’ طھط¨ ط¸ط§ظ‡ط± â†’ ط§ظ†طھط®ط§ط¨ ط§ط² غµ ظ…ط¯ ظ†ظ…ط§غŒط´.' },
  { q: 'ع†ط·ظˆط± ط§ط­طھظ…ط§ظ„ ط§ط³طھط¹ظپط§ ط±ط§ ط¨ط¨غŒظ†ظ…طں', a: 'ط§ط² ط¯ط³طھغŒط§ط± ط¨ظ¾ط±ط³غŒط¯: آ«ع†ظ‡ ع©ط³ط§ظ†غŒ ط§ط­طھظ…ط§ظ„ ط§ط³طھط¹ظپط§ ط¯ط§ط±ظ†ط¯طںآ» غŒط§ طµظپط­ظ‡ ط§ط±ط²غŒط§ط¨غŒ.' },
  { q: 'ع†ط§ط±طھ ط³ط§ط²ظ…ط§ظ†غŒ ط±ط§ ع†ط·ظˆط± ع†ط§ظ¾ ع©ظ†ظ…طں', a: 'ط¯ط± طµظپط­ظ‡ ع†ط§ط±طھطŒ ط¯ع©ظ…ظ‡ آ«ع†ط§ظ¾ / PDFآ».' },
];

const HelpDialog = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setOpen(p => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const normalized = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    let result = HELP_SECTIONS;
    if (activeCategory !== 'all') result = result.filter(s => s.id === activeCategory);
    if (normalized) {
      result = result.filter(s =>
        s.title.toLowerCase().includes(normalized) ||
        s.intro.toLowerCase().includes(normalized) ||
        s.content.some(c => c.toLowerCase().includes(normalized))
      );
    }
    return result;
  }, [activeCategory, normalized]);

  const showQuickTips = activeCategory === 'all' && !normalized;

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '10px',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 24px 80px rgba(99,102,241,0.18)',
        },
      }}
    >
      {/* Header */}
      <DialogTitle sx={{
        m: 0, p: 0,
        background: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(236,72,153,0.08))',
        borderBottom: '1px solid rgba(99,102,241,0.14)',
      }}>
        <Box sx={{ px: 3.5, py: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{
            width: 56, height: 56,
            background: 'linear-gradient(135deg, #6366f1, #ec4899)',
            boxShadow: '0 6px 18px rgba(99,102,241,0.4)',
          }}>
            <HelpOutlineIcon sx={{ fontSize: 30, color: '#fff' }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={800}>ط±ط§ظ‡ظ†ظ…ط§غŒ ط¬ط§ظ…ط¹ HRMS</Typography>
            <Typography variant="body2" color="textSecondary">ظ‡ط± ط¢ظ†ع†ظ‡ ط¨ط±ط§غŒ ط§ط³طھظپط§ط¯ظ‡ ط§ط² ط³غŒط³طھظ… ظ†غŒط§ط² ط¯ط§ط±غŒط¯</Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} aria-label="ط¨ط³طھظ†"
            sx={{ border: '1px solid rgba(0,0,0,0.1)', '&:hover': { background: 'rgba(99,102,241,0.08)' } }}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3.5, py: 3 }}>
        {/* Search */}
        <TextField
          fullWidth
          size="small"
          placeholder="ط¬ط³طھط¬ظˆ ط¯ط± ط±ط§ظ‡ظ†ظ…ط§... (ظ…ط«ظ„ط§ظ‹: ط¬ط³طھط¬ظˆطŒ ظ†ظ…ظˆط¯ط§ط±طŒ ط¯ط³طھغŒط§ط±طŒ ظ…ط±ط®طµغŒ)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon color="primary" /></InputAdornment>,
          }}
          sx={{ mb: 1.5 }}
        />

        {/* Category chips */}
        <Paper sx={{
          p: 1.5, mb: 2,
          display: 'flex', gap: 1, flexWrap: 'wrap',
          maxHeight: 104, overflowY: 'auto',
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.5)',
          borderRadius: '10px',
        }}>
          <Chip
            label="ظ‡ظ…ظ‡"
            onClick={() => setActiveCategory('all')}
            variant={activeCategory === 'all' ? 'filled' : 'outlined'}
            color={activeCategory === 'all' ? 'primary' : 'default'}
            clickable
          />
          {HELP_SECTIONS.filter(s => s.id !== 'shortcuts').map(s => (
            <Chip
              key={s.id}
              label={s.title}
              onClick={() => setActiveCategory(activeCategory === s.id ? 'all' : s.id)}
              variant={activeCategory === s.id ? 'filled' : 'outlined'}
              sx={{
                ...(activeCategory === s.id && {
                  background: s.color,
                  color: '#fff',
                  '&:hover': { background: s.color },
                }),
              }}
              clickable
            />
          ))}
        </Paper>

        {/* Category intro banner */}
        {activeCategory !== 'all' && !normalized && (
          <Paper sx={{
            mb: 2, px: 2, py: 1.25,
            background: `linear-gradient(135deg, ${HELP_SECTIONS.find(s => s.id === activeCategory)?.color}0d, transparent)`,
            border: `1px solid ${HELP_SECTIONS.find(s => s.id === activeCategory)?.color}20`,
            borderRadius: '10px',
          }}>
            <Typography variant="body2" fontWeight={600} color="textSecondary">
              {HELP_SECTIONS.find(s => s.id === activeCategory)?.intro}
            </Typography>
          </Paper>
        )}

        {/* Sections */}
        {filtered.length === 0 ? (
          <Box textAlign="center" py={5}>
            <HelpOutlineIcon sx={{ fontSize: 52, color: 'text.disabled', mb: 1 }} />
            <Typography color="textSecondary">ظ†طھغŒط¬ظ‡â€Œط§غŒ غŒط§ظپطھ ظ†ط´ط¯</Typography>
          </Box>
        ) : (
          <Stack spacing={1.5}>
            {filtered.map(section => (
              <Accordion
                key={section.id}
                defaultExpanded={!normalized && activeCategory === 'all'}
                sx={{
                  borderRadius: '16px !important',
                  background: `linear-gradient(135deg, ${section.color}10, ${section.color}04)`,
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: `1px solid ${section.color}22`,
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { my: 1 },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: section.color }} />}>
                  <Avatar sx={{
                    width: 30, height: 30, mr: 1.5,
                    background: `linear-gradient(135deg, ${section.color}, ${section.color}90)`,
                    boxShadow: `0 2px 8px ${section.color}40`,
                  }}>
                    {section.icon}
                  </Avatar>
                  <Typography fontWeight={700} sx={{ color: section.color }}>{section.title}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={0.6}>
                    {section.intro && (
                      <Typography variant="caption" fontWeight={600} color="textSecondary">
                        {section.intro}
                      </Typography>
                    )}
                    {section.content.map((c, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                        <CheckCircleIcon sx={{ fontSize: 15, color: section.color, mt: '2px', flexShrink: 0 }} />
                        <Typography variant="body2" color="textSecondary">{c}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}

        {/* Quick tips */}
        {showQuickTips && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <LightbulbIcon sx={{ color: '#f59e0b' }} />
              <Typography variant="subtitle1" fontWeight={700}>ظ†ع©ط§طھ ط³ط±غŒط¹</Typography>
            </Box>
            <Grid container spacing={1.5}>
              {QUICK_TIPS.map((tip, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Paper sx={{
                    p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5,
                    background: 'rgba(255,255,255,0.6)', borderRadius: '10px',
                    border: '1px solid rgba(99,102,241,0.12)',
                  }}>
                    <Typography variant="h6">{tip.icon}</Typography>
                    <Typography variant="body2">{tip.text}</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* FAQ */}
        {showQuickTips && (
          <Box sx={{ mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <QuestionAnswerIcon sx={{ color: '#10b981' }} />
              <Typography variant="subtitle1" fontWeight={700}>ط³ط¤ط§ظ„ط§طھ ظ…طھط¯ط§ظˆظ„</Typography>
            </Box>
            <Stack spacing={1}>
              {FAQ.map((f, i) => (
                <Accordion key={i} sx={{ borderRadius: '12px !important', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" fontWeight={600}>{f.q}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" color="textSecondary">{f.a}</Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{
        px: 3.5, py: 2,
        borderTop: '1px solid rgba(99,102,241,0.12)',
      }}>
        <Chip
          size="small"
          icon={<KeyboardIcon sx={{ fontSize: 14 }} />}
          label="F1 ط¨ط±ط§غŒ ط¨ط§ط²/ط¨ط³طھظ‡ ع©ط±ط¯ظ†"
          variant="outlined"
          sx={{ mr: 'auto', borderColor: 'rgba(99,102,241,0.3)', color: '#6366f1' }}
        />
        <Button variant="contained" onClick={() => setOpen(false)}>ط¨ط³طھظ†</Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;