import { useState, useEffect, useCallback } from "react";

export function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem("theme");
      // الوضع الداكن اختياري فقط — الافتراضي هو الوضع الفاتح ما لم يُختر الداكن صراحةً
      return saved === "dark" ? true : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      try { localStorage.setItem("theme", "dark"); } catch {}
    } else {
      root.classList.remove("dark");
      try { localStorage.setItem("theme", "light"); } catch {}
    }
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);
  return [dark, toggle, setDark];
}