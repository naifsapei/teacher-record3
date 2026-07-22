import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, PlusSquare, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_DAYS = 14;
const SHOW_DELAY = 3500;

const isStandalone = () =>
  (typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)")?.matches) ||
  window.navigator?.standalone === true;

const isDismissedRecently = () => {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (!at) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

const isIOS = () =>
  typeof window !== "undefined" &&
  /iphone|ipad|ipod/i.test(navigator.userAgent) &&
  !/crios|fxios/i.test(navigator.userAgent) &&
  !window.MSStream;

const isMobileOrTablet = () =>
  typeof window !== "undefined" && window.matchMedia?.("(max-width: 1023px)")?.matches;

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissedRecently() || !isMobileOrTablet()) return;

    let showTimer = null;
    const scheduleShow = () => {
      clearTimeout(showTimer);
      showTimer = setTimeout(() => {
        if (!isStandalone() && !isDismissedRecently() && isMobileOrTablet()) {
          setVisible(true);
        }
      }, SHOW_DELAY);
    };

    const onBIP = (e) => {
      e.preventDefault();
      setDeferred(e);
      setIos(false);
      scheduleShow();
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    };

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);

    // iOS لا يدعم beforeinstallprompt — اعرض الإرشادات مباشرة
    if (isIOS()) {
      setIos(true);
      scheduleShow();
    }

    return () => {
      clearTimeout(showTimer);
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    const onResize = () => { if (!isMobileOrTablet()) setVisible(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
  };

  const installNow = async () => {
    if (deferred) {
      try {
        deferred.prompt();
        await deferred.userChoice;
      } catch {
        /* تجاهل */
      }
      setDeferred(null);
      setVisible(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pwa-install"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-3 z-50 lg:hidden"
          style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto max-w-md rounded-2xl border border-border bg-card shadow-xl ring-1 ring-black/5 overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-[#002060] to-[#00B050] flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-foreground">ثبّت التطبيق على جوالك</h3>
                  <button
                    onClick={dismiss}
                    aria-label="إغلاق"
                    className="-mt-1 -ml-1 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  يمكنك إضافة الموقع إلى الشاشة الرئيسية للوصول السريع للنظام مثل التطبيق.
                </p>

                {ios && (
                  <ol className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">1</span>
                      اضغط زر المشاركة <Share className="inline h-3.5 w-3.5 text-primary" /> في شريط المتصفح السفلي.
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">2</span>
                      اختر <span className="font-semibold text-foreground">«إضافة إلى الشاشة الرئيسية»</span> <PlusSquare className="inline h-3.5 w-3.5 text-primary" />.
                    </li>
                  </ol>
                )}
              </div>
            </div>

            <div className="flex gap-2 px-4 pb-4">
              <Button
                size="sm"
                onClick={ios ? dismiss : installNow}
                className="flex-1 h-9 gap-1.5"
              >
                <Download className="h-4 w-4" />
                {ios ? "تم" : "تثبيت الآن"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={dismiss}
                className="h-9 px-4 text-muted-foreground"
              >
                لاحقًا
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}