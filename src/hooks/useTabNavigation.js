import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Preserves an independent path history per bottom-nav tab.
 * - Switching tabs restores the last visited path for that tab (or its root).
 * - Clicking the already-active tab resets that tab to its root (double-click → root).
 * - Paths that don't match any tab root are attributed to the currently active tab.
 */
export function useTabNavigation(tabs, homePath) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(homePath);
  const activeTabRef = useRef(homePath);
  const historiesRef = useRef({});
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;

  useEffect(() => {
    const pathname = location.pathname;
    let matched = null;
    for (const t of tabsRef.current) {
      const root = t.path;
      if (pathname === root) {
        matched = root;
        break;
      }
      if (root !== "/" && pathname.startsWith(root + "/")) {
        matched = root;
        break;
      }
    }
    const tab = matched || activeTabRef.current;
    if (tab !== activeTabRef.current) {
      activeTabRef.current = tab;
      setActiveTab(tab);
    }
    const arr = historiesRef.current[tab] || (historiesRef.current[tab] = []);
    if (arr[arr.length - 1] !== pathname) arr.push(pathname);
  }, [location.pathname]);

  const onTabClick = useCallback(
    (root) => {
      if (root === activeTabRef.current) {
        // Second click on active tab → reset to root
        historiesRef.current[root] = [root];
        navigate(root);
      } else {
        activeTabRef.current = root;
        setActiveTab(root);
        const arr = historiesRef.current[root] || [];
        const dest = arr[arr.length - 1] || root;
        navigate(dest);
      }
    },
    [navigate]
  );

  return { activeTab, onTabClick };
}