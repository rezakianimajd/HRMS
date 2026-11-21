import React, { createContext, useContext, useState, useCallback } from 'react';

const WorkspaceTabsContext = createContext(null);

const normalizeTabPath = (path) => String(path || '').split('?')[0].split('#')[0] || '/';

export const WorkspaceTabsProvider = ({ children }) => {
  const [tabs, setTabs] = useState([]);
  const [active, setActive] = useState(null);

  const openTab = useCallback((tab) => {
    if (!tab || !tab.path) return;
    const path = normalizeTabPath(tab.path);
    const url = tab.url || tab.path;
    setTabs((prev) => {
      const found = prev.find((t) => t.path === path);
      if (found) {
        return prev.map((t) => (t.path === path ? {
          ...t,
          title: tab.title || t.title,
          color: tab.color || t.color,
          icon: tab.icon || t.icon,
          url,
        } : t));
      }
      return [...prev, { ...tab, path, url }];
    });
    setActive(path);
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

  const closeOthers = useCallback((path) => {
    setTabs((prev) => prev.filter((tab) => tab.path === path));
    setActive(path || null);
  }, []);

  return (
    <WorkspaceTabsContext.Provider value={{
      tabs, active, openTab, closeTab, closeAll, closeOthers, setActive,
    }}>
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