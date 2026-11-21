import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, FormControl, IconButton, InputAdornment, InputLabel,
  MenuItem, Pagination, Paper, Select, TextField, Tooltip, Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import ClearAllOutlinedIcon from '@mui/icons-material/ClearAllOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ContactPhoneOutlinedIcon from '@mui/icons-material/ContactPhoneOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined';
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import fetchAllPages from '../core/api/fetchAllPages';
import { formatPersianNumber, toPersianDigits } from '../core/utils/numberUtils';
import { toJalali } from '../core/utils/dateUtils';
import {
  PHONEBOOK_ACCENT, buildPhonebookContacts, filterPhonebookContacts, phoneHref,
  phonebookInitial, phonebookTone, phonebookTypeOptions, sortPhonebookContacts,
} from '../core/utils/phonebook';

const PAGE_SIZE = 12;

const cardSurface = {
  bgcolor: 'var(--hrms-region-card-bg, #ffffff)',
  border: 'var(--hrms-border-card, 1px solid #e8edf4)',
  borderRadius: 'var(--hrms-radius-large, 14px)',
  boxShadow: 'var(--hrms-shadow-card, none)',
};

const StatTile = ({ icon: Icon, label, value, color }) => (
  <Paper elevation={0} sx={{
    ...cardSurface, p: 1.1, display: 'flex', alignItems: 'center', gap: 1, minWidth: 0,
  }}>
    <Box sx={{
      width: 34, height: 34, borderRadius: '10px', flexShrink: 0,
      display: 'grid', placeItems: 'center', color, bgcolor: alpha(color, 0.1),
    }}>
      <Icon sx={{ fontSize: 18 }} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography noWrap sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 900, lineHeight: 1.2 }}>
        {formatPersianNumber(value)}
      </Typography>
    </Box>
  </Paper>
);

const SourceLabel = ({ contact }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: contact.sourceColor }} />
    <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: contact.sourceColor }}>
      {contact.sourceShort}
    </Typography>
  </Box>
);

const ContactLine = ({ icon: Icon, value, kind = 'phone', onCopy, copied }) => {
  if (!value) return null;
  const href = kind === 'email' ? `mailto:${value}` : phoneHref(value);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.55, minWidth: 0 }}>
      <Icon sx={{ fontSize: 14, color: 'text.secondary', flexShrink: 0 }} />
      <Typography
        component={href ? 'a' : 'span'}
        href={href || undefined}
        dir="ltr"
        onClick={(event) => event.stopPropagation()}
        sx={{
          fontSize: 11, fontWeight: 700, color: 'text.primary', textDecoration: 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          '&:hover': { color: PHONEBOOK_ACCENT },
        }}
      >
        {toPersianDigits(value)}
      </Typography>
      {href ? (
        <Tooltip title={copied ? 'کپی شد' : 'کپی'}>
          <IconButton
            size="small"
            aria-label={`کپی ${kind === 'email' ? 'ایمیل' : 'شماره تماس'}`}
            onClick={(event) => { event.stopPropagation(); onCopy(value); }}
            sx={{ p: 0.2, color: copied ? 'success.main' : 'text.disabled' }}
          >
            <ContentCopyOutlinedIcon sx={{ fontSize: 12 }} />
          </IconButton>
        </Tooltip>
      ) : null}
    </Box>
  );
};

const ContactCard = ({ contact, onOpen, onCopy, copiedValue }) => {
  const tone = phonebookTone(contact.name);
  const hasPhone = Boolean(contact.phone || contact.mobile || contact.email);
  return (
    <Paper
      elevation={0}
      data-testid="phonebook-card"
      role="button"
      tabIndex={0}
      onClick={() => onOpen(contact)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(contact);
        }
      }}
      sx={{
        ...cardSurface,
        p: 1.25,
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        borderTop: `3px solid ${tone}`,
        transition: 'transform .16s ease, border-color .16s ease, box-shadow .16s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: alpha(tone, 0.45),
          boxShadow: 'var(--hrms-shadow-card, 0 10px 24px rgba(15,23,42,0.08))',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{
          width: 42, height: 42, borderRadius: '13px', flexShrink: 0,
          display: 'grid', placeItems: 'center', color: '#fff', fontSize: 17, fontWeight: 900,
          background: `linear-gradient(135deg, ${tone}, ${alpha(tone, 0.72)})`,
          boxShadow: `0 6px 16px ${alpha(tone, 0.28)}`,
        }}>
          {phonebookInitial(contact.name)}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: 12.5, fontWeight: 900 }}>{contact.name}</Typography>
          <Typography noWrap sx={{ fontSize: 10, color: 'text.secondary', mt: 0.25 }}>
            {[contact.typeLabel, contact.personLabel].filter(Boolean).join(' · ')}
          </Typography>
        </Box>
        <SourceLabel contact={contact} />
      </Box>

      <Divider sx={{ my: 1 }} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.55, minHeight: 48 }}>
        {contact.contactPerson ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.55, minWidth: 0 }}>
            <PersonOutlineIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography noWrap sx={{ fontSize: 10.5, fontWeight: 700 }}>
              {contact.contactPerson}
            </Typography>
          </Box>
        ) : null}
        <ContactLine
          icon={PhoneOutlinedIcon}
          value={contact.phone}
          onCopy={onCopy}
          copied={copiedValue === contact.phone}
        />
        <ContactLine
          icon={SmartphoneOutlinedIcon}
          value={contact.mobile}
          onCopy={onCopy}
          copied={copiedValue === contact.mobile}
        />
        <ContactLine
          icon={EmailOutlinedIcon}
          value={contact.email}
          kind="email"
          onCopy={onCopy}
          copied={copiedValue === contact.email}
        />
        {!hasPhone ? (
          <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>اطلاعات تماس ثبت نشده است</Typography>
        ) : null}
      </Box>

      <Box sx={{
        mt: 1, pt: 0.85, borderTop: '1px dashed', borderColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
      }}>
        <Typography noWrap sx={{ fontSize: 9.5, color: 'text.secondary' }}>
          {contact.code ? `${contact.codeLabel}: ${toPersianDigits(contact.code)}` : contact.sourceLabel}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2, color: PHONEBOOK_ACCENT }}>
          <Typography sx={{ fontSize: 10, fontWeight: 800 }}>جزئیات</Typography>
          <KeyboardArrowLeftIcon sx={{ fontSize: 15 }} />
        </Box>
      </Box>
    </Paper>
  );
};


const detailText = (contact) => [
  contact.name,
  contact.typeLabel,
  contact.personLabel,
  contact.companyType && `نوع شرکت: ${contact.companyType}`,
  contact.contactPerson && `نماینده / شخص رابط: ${contact.contactPerson}`,
  contact.phone && `تلفن: ${contact.phone}`,
  contact.mobile && `موبایل: ${contact.mobile}`,
  contact.email && `ایمیل: ${contact.email}`,
  contact.address && `آدرس: ${contact.address}`,
  contact.code && `${contact.codeLabel}: ${contact.code}`,
  contact.nationalId && `شناسه ملی: ${contact.nationalId}`,
  contact.economicCode && `کد اقتصادی: ${contact.economicCode}`,
  contact.registrationNumber && `شماره ثبت: ${contact.registrationNumber}`,
  contact.establishmentDate && `تاریخ تأسیس: ${toJalali(contact.establishmentDate)}`,
  contact.registeredCapital != null && `سرمایه ثبتی: ${formatPersianNumber(contact.registeredCapital)} ریال`,
  contact.ceoName && `مدیر عامل: ${contact.ceoName}`,
  contact.ceoPhone && `تلفن مدیر عامل: ${contact.ceoPhone}`,
  contact.financeManagerName && `مدیر مالی: ${contact.financeManagerName}`,
  contact.financeManagerPhone && `تلفن مدیر مالی: ${contact.financeManagerPhone}`,
  contact.technicalContactName && `رابط فنی: ${contact.technicalContactName}`,
  contact.technicalContactPhone && `تلفن رابط فنی: ${contact.technicalContactPhone}`,
  contact.bankName && `بانک: ${contact.bankName}`,
  contact.accountNumber && `شماره حساب: ${contact.accountNumber}`,
  contact.shebaNumber && `شبا: ${contact.shebaNumber}`,
  contact.creditLimit != null && `سقف اعتبار: ${formatPersianNumber(contact.creditLimit)} ریال`,
  contact.paymentTerms && `شرایط پرداخت: ${contact.paymentTerms}`,
  contact.postalCode && `کد پستی: ${contact.postalCode}`,
  contact.taxId && `شناسه مالیاتی: ${contact.taxId}`,
  contact.description && `توضیحات: ${contact.description}`,
].filter(Boolean).join('\n');

const DetailLine = ({ label, value, icon: Icon }) => {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, minWidth: 0 }}>
      <Icon sx={{ fontSize: 15, color: 'text.secondary', flexShrink: 0 }} />
      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', minWidth: 68 }}>{label}</Typography>
      <Typography sx={{ fontSize: 11, fontWeight: 800, minWidth: 0, wordBreak: 'break-word' }}>
        {toPersianDigits(value)}
      </Typography>
    </Box>
  );
};

const DetailSection = ({ title, icon: Icon, children }) => (
  <Paper elevation={0} sx={{ ...cardSurface, p: 1.2, mt: 1 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.8 }}>
      <Box sx={{
        width: 24, height: 24, borderRadius: '7px', display: 'grid', placeItems: 'center',
        color: PHONEBOOK_ACCENT, bgcolor: alpha(PHONEBOOK_ACCENT, 0.09),
      }}>
        <Icon sx={{ fontSize: 14 }} />
      </Box>
      <Typography sx={{ fontSize: 11, fontWeight: 900 }}>{title}</Typography>
    </Box>
    <Box sx={{
      display: 'grid', gap: 0.7, columnGap: 1.6,
      gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
    }}>
      {children}
    </Box>
  </Paper>
);

const PhonebookDetailDialog = ({ contact, open, onClose, onCopy, copiedValue }) => {
  if (!contact) return null;
  const tone = phonebookTone(contact.name);
  const keyPeople = [
    { label: 'نماینده / شخص رابط', name: contact.contactPerson, phone: '' },
    { label: 'مدیر عامل', name: contact.ceoName, phone: contact.ceoPhone },
    { label: 'مدیر مالی', name: contact.financeManagerName, phone: contact.financeManagerPhone },
    { label: 'رابط فنی', name: contact.technicalContactName, phone: contact.technicalContactPhone },
  ].filter((person) => person.name || person.phone);
  const hasLegalIdentity = Boolean(
    contact.nationalId || contact.economicCode || contact.registrationNumber
      || contact.establishmentDate || contact.registeredCapital != null
      || contact.postalCode || contact.taxId,
  );
  const hasBankInfo = Boolean(contact.bankName || contact.accountNumber || contact.shebaNumber);
  const hasPurchaseInfo = Boolean(contact.creditLimit != null || contact.paymentTerms);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ style: { borderRadius: 12 } }}
      data-testid="phonebook-detail"
    >
      <DialogTitle sx={{ p: 0 }}>
        <Box sx={{
          p: 1.6,
          background: `linear-gradient(135deg, ${alpha(tone, 0.16)}, ${alpha(tone, 0.04)})`,
          display: 'flex', alignItems: 'center', gap: 1.2,
          borderBottom: '1px solid', borderColor: 'divider',
        }}>
          <Box sx={{
            width: 48, height: 48, borderRadius: '15px', flexShrink: 0,
            display: 'grid', placeItems: 'center', color: '#fff', fontSize: 20, fontWeight: 900,
            background: `linear-gradient(135deg, ${tone}, ${alpha(tone, 0.7)})`,
            boxShadow: `0 8px 20px ${alpha(tone, 0.26)}`,
          }}>
            {phonebookInitial(contact.name)}
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography noWrap sx={{ fontSize: 16, fontWeight: 900 }}>{contact.name}</Typography>
            <Typography noWrap sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.2 }}>
              {[contact.typeLabel, contact.personLabel, contact.sourceLabel].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
          <IconButton size="small" aria-label="بستن جزئیات مخاطب" onClick={onClose}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 1.5 }}>
        <Paper elevation={0} sx={{ ...cardSurface, p: 1.2 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 900, mb: 0.8 }}>اطلاعات تماس</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
            <ContactLine
              icon={PhoneOutlinedIcon} value={contact.phone}
              onCopy={onCopy} copied={copiedValue === contact.phone}
            />
            <ContactLine
              icon={SmartphoneOutlinedIcon} value={contact.mobile}
              onCopy={onCopy} copied={copiedValue === contact.mobile}
            />
            <ContactLine
              icon={EmailOutlinedIcon} value={contact.email} kind="email"
              onCopy={onCopy} copied={copiedValue === contact.email}
            />
            {!contact.phone && !contact.mobile && !contact.email ? (
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                برای این مخاطب شماره تماس یا ایمیل ثبت نشده است.
              </Typography>
            ) : null}
          </Box>
        </Paper>


        {keyPeople.length ? (
          <Paper elevation={0} sx={{ ...cardSurface, p: 1.2, mt: 1 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 900, mb: 0.8 }}>افراد و نمایندگان</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.65 }}>
              {keyPeople.map((person) => (
                <Box key={person.label} sx={{
                  display: 'flex', alignItems: 'center', gap: 1, minWidth: 0,
                  pb: 0.55, borderBottom: '1px dashed', borderColor: 'divider',
                  '&:last-of-type': { pb: 0, borderBottom: 0 },
                }}>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', minWidth: 96 }}>
                    {person.label}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: 11, fontWeight: 800, flex: 1 }}>
                    {person.name || '—'}
                  </Typography>
                  {person.phone ? (
                    <ContactLine
                      icon={PhoneOutlinedIcon} value={person.phone}
                      onCopy={onCopy} copied={copiedValue === person.phone}
                    />
                  ) : null}
                </Box>
              ))}
            </Box>
          </Paper>
        ) : null}

        <DetailSection title="اطلاعات پایه" icon={BusinessOutlinedIcon}>
          <DetailLine
            icon={BusinessOutlinedIcon}
            label={contact.source === 'procurement' ? 'دسته' : 'نوع طرف'}
            value={contact.partyType || contact.typeLabel}
          />
          {contact.source === 'contracts' ? (
            <DetailLine icon={PersonOutlineIcon} label="نوع شخص" value={contact.personLabel} />
          ) : null}
          <DetailLine icon={BusinessOutlinedIcon} label="نوع شرکت" value={contact.companyType} />
          <DetailLine icon={BadgeOutlinedIcon} label={contact.codeLabel || 'کد'} value={contact.code} />
          <DetailLine icon={FilterAltOutlinedIcon} label="وضعیت" value={contact.statusLabel} />
          {contact.rating != null ? (
            <DetailLine icon={StarOutlinedIcon} label="امتیاز خرید" value={formatPersianNumber(contact.rating)} />
          ) : null}
          {contact.contractsCount ? (
            <DetailLine
              icon={ContactPhoneOutlinedIcon}
              label="تعداد قرارداد"
              value={formatPersianNumber(contact.contractsCount)}
            />
          ) : null}
        </DetailSection>

        {hasLegalIdentity ? (
          <DetailSection title="هویت حقوقی" icon={BadgeOutlinedIcon}>
            <DetailLine icon={BadgeOutlinedIcon} label="شناسه ملی" value={contact.nationalId} />
            <DetailLine icon={BadgeOutlinedIcon} label="کد اقتصادی" value={contact.economicCode} />
            <DetailLine icon={ReceiptLongOutlinedIcon} label="شماره ثبت" value={contact.registrationNumber} />
            <DetailLine
              icon={DescriptionOutlinedIcon}
              label="تاریخ تأسیس"
              value={contact.establishmentDate ? toJalali(contact.establishmentDate) : ''}
            />
            {contact.registeredCapital != null ? (
              <DetailLine
                icon={AccountBalanceOutlinedIcon}
                label="سرمایه ثبتی"
                value={`${formatPersianNumber(contact.registeredCapital)} ریال`}
              />
            ) : null}
            <DetailLine icon={LocationOnOutlinedIcon} label="کد پستی" value={contact.postalCode} />
            <DetailLine icon={ReceiptLongOutlinedIcon} label="شناسه مالیاتی" value={contact.taxId} />
          </DetailSection>
        ) : null}

        {hasBankInfo ? (
          <DetailSection title="اطلاعات بانکی" icon={AccountBalanceOutlinedIcon}>
            <DetailLine icon={AccountBalanceOutlinedIcon} label="بانک" value={contact.bankName} />
            <DetailLine icon={BadgeOutlinedIcon} label="شماره حساب" value={contact.accountNumber} />
            <DetailLine icon={BadgeOutlinedIcon} label="شماره شبا" value={contact.shebaNumber} />
          </DetailSection>
        ) : null}

        {hasPurchaseInfo ? (
          <DetailSection title="اعتبار و شرایط خرید" icon={StorefrontOutlinedIcon}>
            {contact.creditLimit != null ? (
              <DetailLine
                icon={AccountBalanceOutlinedIcon}
                label="سقف اعتبار"
                value={`${formatPersianNumber(contact.creditLimit)} ریال`}
              />
            ) : null}
            <DetailLine icon={DescriptionOutlinedIcon} label="شرایط پرداخت" value={contact.paymentTerms} />
          </DetailSection>
        ) : null}

        {contact.address || contact.description ? (
          <DetailSection title="آدرس و توضیحات" icon={LocationOnOutlinedIcon}>
            {contact.address ? (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <DetailLine icon={LocationOnOutlinedIcon} label="آدرس" value={contact.address} />
              </Box>
            ) : null}
            {contact.description ? (
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mb: 0.3 }}>توضیحات</Typography>
                <Typography sx={{ fontSize: 11, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
                  {contact.description}
                </Typography>
              </Box>
            ) : null}
          </DetailSection>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 1.5, pb: 1.4, pt: 0.4, gap: 0.6 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />}
          onClick={() => onCopy(detailText(contact))}
          sx={{ borderRadius: '8px' }}
        >
          کپی اطلاعات تماس
        </Button>
        <Button size="small" variant="contained" onClick={onClose} sx={{ borderRadius: '8px' }}>
          بستن
        </Button>
      </DialogActions>
    </Dialog>
  );
};


const loadSource = async (url) => {
  try {
    const rows = await fetchAllPages(url, { page_size: 1000 });
    return { rows: Array.isArray(rows) ? rows : [], failed: false };
  } catch (error) {
    return { rows: [], failed: true };
  }
};

/**
 * دفترچه تلفن سازمانی — داده را از طرف حساب‌های قرارداد و تأمین‌کنندگان
 * خرید می‌خواند و در یک پنجرهٔ بزرگ قابل جست‌وجو/فیلتر نمایش می‌دهد.
 */
const PhonebookPanel = () => {
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [type, setType] = useState('all');
  const [availability, setAvailability] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState(null);
  const [copiedValue, setCopiedValue] = useState('');
  const copyTimer = useRef(null);

  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
  }, []);

  const directoryQuery = useQuery({
    queryKey: ['phonebook-directory'],
    queryFn: async () => {
      const [parties, suppliers] = await Promise.all([
        loadSource('/contract-parties/'),
        loadSource('/procurement/suppliers/'),
      ]);
      return { parties, suppliers };
    },
    staleTime: 60_000,
    retry: false,
  });

  const partiesFailed = Boolean(directoryQuery.data?.parties?.failed);
  const suppliersFailed = Boolean(directoryQuery.data?.suppliers?.failed);
  const partyRows = directoryQuery.data?.parties?.rows || [];
  const supplierRows = directoryQuery.data?.suppliers?.rows || [];
  const contacts = useMemo(
    () => buildPhonebookContacts(partyRows, supplierRows),
    [partyRows, supplierRows],
  );
  const stats = useMemo(() => ({
    total: contacts.length,
    parties: partyRows.length,
    suppliers: supplierRows.length,
    withPhone: contacts.filter((contact) => contact.phone || contact.mobile).length,
    withEmail: contacts.filter((contact) => contact.email).length,
  }), [contacts, partyRows.length, supplierRows.length]);
  const typeOptions = useMemo(() => phonebookTypeOptions(contacts), [contacts]);
  const hasFilters = Boolean(
    search.trim() || source !== 'all' || type !== 'all' || availability !== 'all',
  );

  const filtered = useMemo(() => sortPhonebookContacts(
    filterPhonebookContacts(contacts, { search, source, type, availability }),
    sortBy,
  ), [contacts, search, source, type, availability, sortBy]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page],
  );

  useEffect(() => {
    setPage(0);
  }, [search, source, type, availability, sortBy]);

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1));
  }, [page, pageCount]);

  const copyValue = async (value) => {
    const text = String(value || '').trim();
    if (!text) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      setCopiedValue(text);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopiedValue(''), 1600);
    } catch (error) {
      setCopiedValue('');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setSource('all');
    setType('all');
    setAvailability('all');
    setSortBy('name_asc');
  };


  return (
    <Box
      data-testid="phonebook-panel"
      sx={{
        display: 'flex', flexDirection: 'column', gap: 1,
        height: 'calc(92vh - 150px)', minHeight: 0,
      }}
    >
      <Box sx={{
        display: 'grid', gap: 1,
        gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
      }}>
        <StatTile icon={ContactPhoneOutlinedIcon} label="کل مخاطبین" value={stats.total} color={PHONEBOOK_ACCENT} />
        <StatTile icon={BusinessOutlinedIcon} label="طرف حساب قرارداد" value={stats.parties} color="#0ea5e9" />
        <StatTile icon={StorefrontOutlinedIcon} label="تأمین‌کنندگان خرید" value={stats.suppliers} color="#f59e0b" />
        <StatTile icon={PhoneOutlinedIcon} label="دارای شماره تماس" value={stats.withPhone} color="#0f766e" />
        <StatTile icon={EmailOutlinedIcon} label="دارای ایمیل" value={stats.withEmail} color="#2563eb" />
      </Box>

      <Paper elevation={0} sx={{ ...cardSurface, p: 1 }}>
        <Box sx={{
          display: 'grid', gap: 0.9, alignItems: 'center',
          gridTemplateColumns: {
            xs: '1fr', sm: '1fr 1fr',
            lg: 'minmax(240px, 1.6fr) repeat(4, minmax(120px, .65fr))',
          },
        }}>
          <TextField
            size="small"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="نام، شماره تماس، ایمیل یا شخص رابط…"
            data-testid="phonebook-search"
            inputProps={{ 'aria-label': 'جست‌وجو در دفترچه تلفن' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: search ? (
                <InputAdornment position="end">
                  <IconButton size="small" aria-label="پاک کردن جست‌وجو" onClick={() => setSearch('')}>
                    <CloseIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
          <FormControl size="small">
            <InputLabel id="phonebook-source-label">منبع</InputLabel>
            <Select
              labelId="phonebook-source-label"
              label="منبع"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              data-testid="phonebook-source-filter"
              inputProps={{ 'aria-label': 'فیلتر منبع' }}
            >
              <MenuItem value="all">همهٔ منابع</MenuItem>
              <MenuItem value="contracts">طرف حساب قرارداد</MenuItem>
              <MenuItem value="procurement">تأمین‌کنندهٔ خرید</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel id="phonebook-type-label">نوع / دسته</InputLabel>
            <Select
              labelId="phonebook-type-label"
              label="نوع / دسته"
              value={type}
              onChange={(event) => setType(event.target.value)}
              data-testid="phonebook-type-filter"
              inputProps={{ 'aria-label': 'فیلتر نوع' }}
            >
              <MenuItem value="all">همهٔ انواع</MenuItem>
              {typeOptions.map((option) => (
                <MenuItem key={option.label} value={option.label}>
                  {option.label} ({toPersianDigits(option.count)})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel id="phonebook-availability-label">اطلاعات تماس</InputLabel>
            <Select
              labelId="phonebook-availability-label"
              label="اطلاعات تماس"
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
              data-testid="phonebook-availability-filter"
              inputProps={{ 'aria-label': 'فیلتر اطلاعات تماس' }}
            >
              <MenuItem value="all">همه</MenuItem>
              <MenuItem value="phone">دارای تلفن ثابت</MenuItem>
              <MenuItem value="mobile">دارای موبایل</MenuItem>
              <MenuItem value="email">دارای ایمیل</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <InputLabel id="phonebook-sort-label">ترتیب</InputLabel>
            <Select
              labelId="phonebook-sort-label"
              label="ترتیب"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              data-testid="phonebook-sort"
              inputProps={{ 'aria-label': 'ترتیب نمایش' }}
            >
              <MenuItem value="name_asc">نام (الف تا ی)</MenuItem>
              <MenuItem value="name_desc">نام (ی تا الف)</MenuItem>
              <MenuItem value="contracts">بیشترین قرارداد</MenuItem>
              <MenuItem value="rating">امتیاز خرید</MenuItem>
              <MenuItem value="recent">جدیدترین</MenuItem>
            </Select>
          </FormControl>
        </Box>


        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 1, mt: 0.75, flexWrap: 'wrap',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.55, color: 'text.secondary' }}>
            <FilterAltOutlinedIcon sx={{ fontSize: 15 }} />
            <Typography sx={{ fontSize: 10.5 }}>
              {formatPersianNumber(filtered.length)} مخاطب از {formatPersianNumber(contacts.length)} مخاطب
            </Typography>
          </Box>
          {hasFilters ? (
            <Button
              size="small"
              variant="text"
              startIcon={<ClearAllOutlinedIcon sx={{ fontSize: 16 }} />}
              onClick={resetFilters}
              sx={{ fontSize: 10.5, py: 0.2 }}
            >
              حذف فیلترها
            </Button>
          ) : null}
        </Box>
      </Paper>

      {partiesFailed || suppliersFailed ? (
        <Alert severity={partiesFailed && suppliersFailed ? 'error' : 'warning'} sx={{ py: 0.2 }}>
          {partiesFailed && suppliersFailed
            ? 'دریافت اطلاعات دفترچه تلفن ممکن نشد؛ دسترسی ماژول‌های قرارداد و خرید را بررسی کنید.'
            : partiesFailed
              ? 'اطلاعات طرف حساب‌های قرارداد دریافت نشد؛ سایر مخاطبین نمایش داده می‌شوند.'
              : 'اطلاعات تأمین‌کنندگان خرید دریافت نشد؛ سایر مخاطبین نمایش داده می‌شوند.'}
        </Alert>
      ) : null}

      <Box
        data-testid="phonebook-cards"
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', pr: 0.25 }}
      >
        {directoryQuery.isLoading ? (
          <Box sx={{ minHeight: 220, display: 'grid', placeItems: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={28} sx={{ color: PHONEBOOK_ACCENT }} />
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1 }}>
                در حال دریافت مخاطبین…
              </Typography>
            </Box>
          </Box>
        ) : pageRows.length ? (
          <Box sx={{
            display: 'grid', gap: 1.1,
            gridTemplateColumns: 'repeat(auto-fill, minmax(285px, 1fr))',
          }}>
            {pageRows.map((contact) => (
              <ContactCard
                key={contact.key}
                contact={contact}
                onOpen={setDetail}
                onCopy={copyValue}
                copiedValue={copiedValue}
              />
            ))}
          </Box>
        ) : (
          <Paper elevation={0} sx={{
            ...cardSurface, minHeight: 220, display: 'grid', placeItems: 'center',
            p: 3, textAlign: 'center',
          }}>
            <Box>
              <Box sx={{
                width: 54, height: 54, mx: 'auto', borderRadius: '16px',
                display: 'grid', placeItems: 'center', color: PHONEBOOK_ACCENT,
                bgcolor: alpha(PHONEBOOK_ACCENT, 0.1),
              }}>
                <InfoOutlinedIcon sx={{ fontSize: 27 }} />
              </Box>
              <Typography sx={{ fontSize: 13, fontWeight: 900, mt: 1 }}>
                مخاطبی با این فیلترها پیدا نشد
              </Typography>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.35 }}>
                عبارت جست‌وجو را کوتاه‌تر کنید یا فیلترها را بردارید.
              </Typography>
              {hasFilters ? (
                <Button size="small" onClick={resetFilters} sx={{ mt: 1, fontSize: 10.5 }}>
                  نمایش همهٔ مخاطبین
                </Button>
              ) : null}
            </Box>
          </Paper>
        )}
      </Box>

      {!directoryQuery.isLoading && filtered.length > PAGE_SIZE ? (
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 1, px: 0.5, flexWrap: 'wrap',
        }}>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
            نمایش {formatPersianNumber(page * PAGE_SIZE + 1)} تا{' '}
            {formatPersianNumber(Math.min(filtered.length, (page + 1) * PAGE_SIZE))} از{' '}
            {formatPersianNumber(filtered.length)}
          </Typography>
          <Pagination
            count={pageCount}
            page={page + 1}
            onChange={(event, value) => setPage(value - 1)}
            size="small"
            siblingCount={1}
            boundaryCount={1}
            dir="rtl"
            sx={{ '& .MuiPaginationItem-root': { borderRadius: '8px', fontSize: 11 } }}
          />
        </Box>
      ) : null}

      <PhonebookDetailDialog
        contact={detail}
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        onCopy={copyValue}
        copiedValue={copiedValue}
      />
    </Box>
  );
};

export default PhonebookPanel;

