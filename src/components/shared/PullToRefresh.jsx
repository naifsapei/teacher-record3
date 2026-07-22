import { useState, useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Pull-to-refresh wrapper for mobile viewports.
 * Attaches touch listeners to the window and invokes `onRefresh` (async)
 * when the user pulls down at scroll-top past the threshold.
 */
export default function PullToRefresh({ onRefresh, threshold = 70, maxPull = 110, children }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const startYRef = useRef(null);
  const pullingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setPullBoth = (v) => {
    pullRef.current = v;
    setPull(v);
  };

  useEffect(() => {
    const onTouchStart = (e) => {
      if (refreshingRef.current) return;
      startYRef.current = window.scrollY <= 0 ? e.touches[0].clientY : null;
      pullingRef.current = false;
    };
    const onTouchMove = (e) => {
      if (startYRef.current == null || refreshingRef.current) return;
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0 && window.scrollY <= 0) {
        pullingRef.current = true;
        setPullBoth(Math.min(delta * 0.5, maxPull));
        if (e.cancelable) e.preventDefault();
      }
    };
    const onTouchEnd = async () => {
      if (!pullingRef.current) {
        startYRef.current = null;
        return;
      }
      pullingRef.current = false;
      if (pullRef.current >= threshold) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullBoth(threshold);
        try {
          await onRefreshRef.current();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          setPullBoth(0);
          startYRef.current = null;
        }
      } else {
        setPullBoth(0);
        startYRef.current = null;
      }
    };
    const onTouchCancel = () => {
      pullingRef.current = false;
      setPullBoth(0);
      startYRef.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchCancel);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [threshold, maxPull]);

  const progress = Math.min(pull / threshold, 1);

  return (
    <>
      <div
        style={{ height: pull }}
        className="flex items-center justify-center overflow-hidden transition-[height] duration-150 ease-out"
      >
        <RefreshCw
          className={`h-5 w-5 text-primary ${refreshing ? "animate-spin" : ""}`}
          style={{ opacity: refreshing ? 1 : progress }}
        />
      </div>
      {children}
    </>
  );
}