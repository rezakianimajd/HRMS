import React, { createContext, useContext, useState, useCallback } from 'react';

const WorkspaceTabsContext = createContext(null);

export const WorkspaceTabsProvider = ({ children }) => {
  const [tabs, setTabs] = useState([]);
  const [active, setActive] = useState(null);

  const openTab = useCallback((tab) => {
    if (!tab || !tab.path) return;
    setTabs((prev) => {
      const found = prev.find((t) => t.path === tab.path);
      if (found) {
        return prev.map((t) => (t.path === tab.path ? { ...t, title: tab.title || t.title } : t));
      }
      return [...prev, tab];
    });
    setActive(tab.path);
  }, []);

  const closeTab = useCallback((path) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.path === path);
      const next = prev.filter((t) => t.path !== path);
      if (active === path) {
        const fallback = next[idx] || next[idx - 1] || next[0] || null;
        setActive(fallback ? fallback.path : null);
      }
      return next;
    });
  }, [active]);

  const closeAll = useCallback(() => {
    setTabs([]);
    setActive(null);
  }, []);

  return (
    <WorkspaceTabsContext.Provider value={{ tabs, active, openTab, closeTab, closeAll, setActive }}>
      {children}
    </WorkspaceTabsContext.Provider>
  );
};

export const useWorkspaceTabs = () => {
  const ctx = useContext(WorkspaceTabsContext);
  if (!ctx) throw new Error('useWorkspaceTabs must be used within WorkspaceTabsProvider');
  return ctx;
};

export default WorkspaceTabsContext;