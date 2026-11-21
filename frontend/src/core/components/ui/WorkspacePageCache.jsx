import React, { useEffect, useRef, useState } from 'react';
import { Routes, useLocation, UNSAFE_LocationContext } from 'react-router-dom';
import { useWorkspaceTabs } from '../../context/WorkspaceTabsContext';

const viewStyle = (visible) => ({
  display: visible ? 'block' : 'none',
  height: '100%',
  minHeight: 0,
});

const cachedLocation = (location) => ({
  pathname: location.pathname,
  search: location.search,
  hash: location.hash,
  state: location.state,
  key: location.key,
});

/**
 * هر صفحهٔ باز یک درخت React زندهٔ خودش را نگه می‌دارد؛ با تغییر تب فقط
 * نمایش عوض می‌شود، نه mount/unmount. این همان رفتار «تب‌های مرورگر» است:
 * فیلترها، فرم‌های نیمه‌کاره و اسکرول صفحه هنگام رفت‌وبرگشت حفظ می‌شوند.
 *
 * `Routes` با location ذخیره‌شدهٔ هر صفحه رندر می‌شود و provider محلی
 * `UNSAFE_LocationContext` باعث می‌شود useLocation/useSearchParams داخل
 * صفحه‌های مخفی، آدرس همان صفحه را ببینند نه آدرس تب فعال.
 */
const REDIRECT_PATHS = new Set([
  '/', '/reports', '/data-entry', '/correspondences', '/accounting/documents/new',
  '/accounting/settings', '/management-analytics',
]);

const WorkspacePageCache = ({ routes }) => {
  const location = useLocation();
  const { tabs = [] } = useWorkspaceTabs();
  const initialLocation = useRef(cachedLocation(location));
  const [views, setViews] = useState(() => ([{
    path: location.pathname,
    location: initialLocation.current,
  }]));

  useEffect(() => {
    setViews((previous) => {
      const nextLocation = cachedLocation(location);
      const index = previous.findIndex((view) => view.path === location.pathname);
      if (index >= 0) {
        const existing = previous[index];
        if (existing.location.search === nextLocation.search
          && existing.location.hash === nextLocation.hash
          && existing.location.state === nextLocation.state) {
          return previous;
        }
        const next = [...previous];
        next[index] = { ...existing, location: nextLocation };
        return next;
      }
      return [...previous, { path: location.pathname, location: nextLocation }];
    });
  }, [location.pathname, location.search, location.hash, location.key]);

  const allowedPaths = new Set(tabs.map((tab) => tab.path));
  allowedPaths.add(location.pathname);
  const cachedViews = views.filter(
    (view) => allowedPaths.has(view.path) && !REDIRECT_PATHS.has(view.path),
  );
  const activeView = cachedViews.find((view) => view.path === location.pathname);
  const renderedViews = activeView
    ? cachedViews
    : [...cachedViews, { path: location.pathname, location: cachedLocation(location) }];

  return (
    <div style={{ height: '100%', minHeight: 0 }}>
      {renderedViews.map((view) => (
        <div key={view.path} style={viewStyle(view.path === location.pathname)}>
          <UNSAFE_LocationContext.Provider
            value={{ location: view.location, navigationType: 'POP' }}
          >
            <Routes location={view.location}>
              {routes}
            </Routes>
          </UNSAFE_LocationContext.Provider>
        </div>
      ))}
    </div>
  );
};

export default WorkspacePageCache;
