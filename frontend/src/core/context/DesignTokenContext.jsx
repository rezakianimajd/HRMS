import React, { createContext, useContext } from 'react';
import { DEFAULT_DESIGN_TOKENS } from '../theme/designTokens';

const DesignTokenContext = createContext({
  tokens: DEFAULT_DESIGN_TOKENS,
});

/**
 * توکن‌های مؤثر (شامل حالت تم و رنگ ماژول) را در اختیار کامپوننت‌های
 * مشترک قرار می‌دهد. Theme Studio فقط یک مصرف‌کنندهٔ همین context است.
 */
export const DesignTokenProvider = ({ tokens, children }) => (
  <DesignTokenContext.Provider value={{ tokens: tokens || DEFAULT_DESIGN_TOKENS }}>
    {children}
  </DesignTokenContext.Provider>
);

export const useDesignTokens = () => useContext(DesignTokenContext);

export default DesignTokenContext;
