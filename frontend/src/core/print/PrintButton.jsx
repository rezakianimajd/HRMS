/**
 * دکمهٔ چاپ یکپارچه — به‌جای ``window.print()`` در همهٔ صفحات.
 *
 * ``target`` می‌تواند ref، عنصر DOM، یا سلکتور CSS باشد (پیش‌فرض: ناحیهٔ اصلی صفحه
 * ``main``) تا فقط محتوای گزارش چاپ شود، نه سایدبار و نوار ابزار.
 */
import React from 'react';
import { Button } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import { printElement } from './printEngine';

export const PrintButton = ({
  target = 'main',
  title = '',
  subtitle = '',
  paper = 'A4',
  orientation = 'portrait',
  label = 'چاپ',
  icon = true,
  children,
  onClick,
  ...rest
}) => {
  const handleClick = (event) => {
    onClick?.(event);
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    printElement(element?.current ?? element, { title, subtitle, paper, orientation });
  };
  return (
    <Button
      variant="outlined"
      size="small"
      startIcon={icon ? <PrintIcon fontSize="small" /> : null}
      onClick={handleClick}
      {...rest}
    >
      {children || label}
    </Button>
  );
};

export default PrintButton;
