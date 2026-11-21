import React, { memo, useEffect, useRef, useState } from 'react';
import { Routes, useLocation, UNSAFE_LocationContext } from 'react-router-dom';
import { useWorkspaceTabs } from '../../context/WorkspaceTabsContext';

const MAX_CACHED_PAGES = 8;

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

const normalizeTabPath = (path) => String(path || '').split('?')[0].split('#')[0] || '/';

const CachedRouteView = memo(({ routes, location, visible }) => (
  <div style={viewStyle(visible)} aria-hidden={!visible}>
    <UNSAFE_LocationContext.Provider value={{ location, navigationType: 'POP' }}>
      <Routes location={location}>
        {routes}
      </Routes>
    </UNSAFE_LocationContext.Provider>
  </div>
));
CachedRouteView.displayName = 'CachedRouteView';

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
  const activityRef = useRef(1);
  const [views, setViews] = useState(() => ([{
    path: location.pathname,
    location: initialLocation.current,
    lastActive: 1,
  }]));

  useEffect(() => {
    setViews((previous) => {
      const nextLocation = cachedLocation(location);
      const stamp = activityRef.current + 1;
      activityRef.current = stamp;
      const index = previous.findIndex((view) => view.path === location.pathname);
      if (index >= 0) {
        const existing = previous[index];
        const next = [...previous];
        next[index] = {
          ...existing,
          lastActive: stamp,
          location: (
            existing.location.search === nextLocation.search
            && existing.location.hash === nextLocation.hash
            && existing.location.state === nextLocation.state
          ) ? existing.location : nextLocation,
        };
        return next;
      }
      return [...previous, { path: location.pathname, location: nextLocation, lastActive: stamp }];
    });
  }, [location.pathname, location.search, location.hash, location.key]);

  useEffect(() => {
    setViews((previous) => {
      const allowed = new Set(tabs.map((tab) => normalizeTabPath(tab.path)));
      allowed.add(normalizeTabPath(location.pathname));
      const next = previous.filter((view) => allowed.has(view.path));
      return next.length === previous.length ? previous : next;
    });
  }, [tabs, location.pathname]);

  const allowedPaths = new Set(tabs.map((tab) => normalizeTabPath(tab.path)));
  allowedPaths.add(normalizeTabPath(location.pathname));
  const availableViews = views.filter(
    (view) => allowedPaths.has(view.path) && !REDIRECT_PATHS.has(view.path),
  );
  // سقف کش، هم state را حفظ می‌کند و هم از نگه‌داشتن بی‌نهایت صفحه/پرس‌وجو
  // در حافظه جلوگیری می‌کند. صفحهٔ فعال همیشه در کش می‌ماند.
  const retainedViews = availableViews.length > MAX_CACHED_PAGES
    ? (() => {
      const keep = new Set(
        [...availableViews]
          .sort((a, b) => (
            (b.path === location.pathname ? 1 : 0) - (a.path === location.pathname ? 1 : 0)
            || (b.lastActive || 0) - (a.lastActive || 0)
          ))
          .slice(0, MAX_CACHED_PAGES)
          .map((view) => view.path),
      );
      return availableViews.filter((view) => keep.has(view.path));
    })()
    : availableViews;
  const activeView = retainedViews.find((view) => view.path === location.pathname);
  const renderedViews = activeView
    ? retainedViews
    : [...retainedViews, { path: location.pathname, location: cachedLocation(location) }];

  return (
    <div style={{ height: '100%', minHeight: 0 }}>
      {renderedViews.map((view) => (
        <CachedRouteView
          key={view.path}
          routes={routes}
          location={view.location}
          visible={view.path === location.pathname}
        />
      ))}
    </div>
  );
};

export default WorkspacePageCache;
