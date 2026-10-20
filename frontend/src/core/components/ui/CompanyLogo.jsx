import React, { useEffect, useState } from 'react';
import { Avatar } from '@mui/material';

const companyLabel = (company) => (
  company?.display_name || company?.legal_name || company?.code || ''
);

/**
 * نشان شرکت — لوگوی ثبت‌شده در «مشخصات شرکت».
 * در نبود لوگو، حرف اول نام حقوقی/کد شرکت به‌صورت یک مونوگرام نمایش داده می‌شود.
 */
const CompanyLogo = ({ company, size = 40, radius = '11px', sx }) => {
  const name = companyLabel(company);
  const logo = company?.logo_url || null;
  const monogram = name.trim()?.[0] || 'ک';
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [logo]);

  return (
    <Avatar
      variant="rounded"
      src={!imageFailed ? (logo || undefined) : undefined}
      imgProps={{ alt: name || 'لوگوی شرکت', onError: () => setImageFailed(true) }}
      sx={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        bgcolor: '#eef2ff',
        color: '#4f46e5',
        fontWeight: 900,
        fontSize: size * 0.4,
        border: '1px solid rgba(79,70,229,0.14)',
        '& img': { objectFit: 'contain', p: size > 48 ? 0.5 : 0.25, bgcolor: '#fff' },
        ...sx,
      }}
    >
      {!logo || imageFailed ? monogram : null}
    </Avatar>
  );
};

export { companyLabel };
export default CompanyLogo;
