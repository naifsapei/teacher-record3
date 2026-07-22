import { useState, useEffect, useMemo } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useTabNavigation } from "@/hooks/useTabNavigation";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Menu, LayoutDashboard, BarChart2, Star, CalendarCheck, Send, School, FileText, Archive as ArchiveIcon, Database, Settings, ChevronRight, Users, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isPrincipalOnly } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { genderTerm } from "@/lib/genderTerms";
import AutoBackup from "@/components/AutoBackup";
import WelcomeOnboarding from "@/components/onboarding/WelcomeOnboarding";
import InstallPrompt from "@/components/pwa/InstallPrompt";
import GenderTextProvider from "@/components/GenderTextProvider";

const BOTTOM_NAV = [
{ path: "/", label: "الرئيسية", icon: LayoutDashboard },
{ path: "/analytics", label: "التحليل", icon: BarChart2 },
{ path: "/student-tracking", label: "المتابعة", icon: Star },
{ path: "/attendance", label: "الحضور", icon: CalendarCheck },
{ path: "/actions", label: "الإجراءات", icon: Send }];


const PRINCIPAL_BOTTOM_NAV = [
{ path: "/principal", label: "المدير", icon: School },
{ path: "/teachers", label: "المعلمون", icon: Users },
{ path: "/reports", label: "التقارير", icon: FileText },
{ path: "/notes", label: "الملاحظات", icon: MessageSquare },
{ path: "/settings", label: "الإعدادات", icon: Settings }];


const PAGE_TITLES = {
  "/": "لوحة المعلومات",
  "/analytics": "التحليلات",
  "/student-tracking": "سجل المتابعة",
  "/student-achievements": "سجل الإنجازات",
  "/attendance": "الحضور",
  "/calendar": "تقويم المعلم",
  "/schedule": "جدول الحصص",
  "/weekly-absence": "تقرير الغياب الأسبوعي",
  "/absence-impact": "أثر الغياب على التحصيل",
  "/student-profile": "سجل أداء الطالب",
  "/actions": "الإجراءات",
  "/archives": "الأرشيف",
  "/settings": "الإعدادات",
  "/classes": "الصفوف",
  "/students": "الطلاب",
  "/grades": "الدرجات",
  "/reports": "التقارير",
  "/monthly-performance": "الأداء الشهري",
  "/principal": "لوحة المدير",
  "/subjects": "المواد",
  "/backups": "النسخ الاحتياطية",
  "/notes": "الملاحظات",
  "/student-classification": "تصنيف الطلاب",
  "/remedial-plans": "الخطط العلاجية والإثرائية"
};

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(() =>
  typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const principalOnly = isPrincipalOnly(me);
  const homePath = principalOnly ? "/principal" : "/";
  const tabs = useMemo(() => principalOnly ? PRINCIPAL_BOTTOM_NAV : BOTTOM_NAV, [principalOnly]);
  const { activeTab, onTabClick } = useTabNavigation(tabs, homePath);
  const term = (label) => genderTerm(me, label);
  const title = term(PAGE_TITLES[location.pathname] || "نظام إدارة الصف");
  const isHome = location.pathname === homePath;

  // Redirect principals away from the teacher dashboard to their own panel.
  useEffect(() => {
    if (principalOnly && location.pathname === "/") {
      navigate("/principal", { replace: true });
    }
  }, [principalOnly, location.pathname, navigate]);

  // Smooth back: return to previous page, or fall back to home when there is no history.
  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(homePath);
    }
  };

  // Auto-close on route change for mobile/tablet
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) setSidebarOpen(false);
  }, [location.pathname]);

  // Close sidebar on Escape
  useEffect(() => {
    const onKey = (e) => {if (e.key === "Escape") setSidebarOpen(false);};
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 dark:from-background dark:via-background dark:to-background" dir="rtl">
      <AutoBackup />
      <WelcomeOnboarding />
      <InstallPrompt />
      <GenderTextProvider />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />



      <main
        className={cn(
          "min-h-screen overflow-x-clip flex flex-col transition-[margin] duration-300 ease-in-out",
          sidebarOpen ? "lg:mr-72" : "lg:mr-0"
        )}>
        
        {/* Mobile / tablet header */}
        <header
          className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b-[4px] px-3 lg:hidden grid grid-cols-[2.75rem_2.75rem_1fr_2.75rem] items-center text-primary print:hidden shadow-sm"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.4rem)", paddingBottom: "0.4rem", borderImage: "linear-gradient(to left, #002060, #00B050) 1" }}>
          
          <button type="button" onClick={() => setSidebarOpen((o) => !o)} aria-label="القائمة" className="relative z-40 flex items-center justify-center h-11 w-11 -mr-1 rounded-lg text-primary hover:text-accent hover:bg-accent/10 active:scale-90 transition-all duration-150 touch-manipulation cursor-pointer [-webkit-tap-highlight-color:transparent]">
            <Menu className="h-6 w-6" strokeWidth={2.4} />
          </button>
          {!isHome ?
          <button
            type="button"
            onClick={goBack}
            aria-label="رجوع"
            className="relative z-40 flex items-center justify-center h-11 w-11 -mr-1 rounded-lg text-primary hover:text-accent hover:bg-accent/10 active:scale-90 transition-all duration-150 touch-manipulation cursor-pointer [-webkit-tap-highlight-color:transparent]">
            
              <ChevronRight className="h-7 w-7" strokeWidth={2.8} />
            </button> :
          <div />}
          <h1 className="text-base font-bold text-primary truncate text-center px-1">{title}</h1>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            aria-label="الإعدادات"
            className="relative z-40 flex items-center justify-center h-11 w-11 -ml-1 rounded-xl text-primary hover:text-accent hover:bg-accent/10 active:scale-90 active:bg-accent/20 transition-all duration-150 touch-manipulation cursor-pointer [-webkit-tap-highlight-color:transparent]">
            
            <Settings className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </header>

        {/* Desktop header */}
        <header
          className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b-[4px] px-6 hidden lg:grid grid-cols-[2.75rem_2.75rem_1fr_2.75rem] items-center text-primary print:hidden shadow-sm"
          style={{ paddingTop: "calc(0.55rem + env(safe-area-inset-top))", paddingBottom: "0.55rem", borderImage: "linear-gradient(to left, #002060, #00B050) 1" }}>
          
          <button type="button" onClick={() => setSidebarOpen((o) => !o)} aria-label="القائمة" className="relative z-40 flex items-center justify-center h-11 w-11 -mr-1 rounded-lg text-primary hover:text-accent hover:bg-accent/10 active:scale-90 transition-all duration-150 touch-manipulation cursor-pointer [-webkit-tap-highlight-color:transparent]">
            <Menu className="h-6 w-6" strokeWidth={2.4} />
          </button>
          {!isHome ?
          <button
            type="button"
            onClick={goBack}
            aria-label="رجوع"
            className="relative z-40 flex items-center justify-center h-11 w-11 -mr-1 rounded-lg text-primary hover:text-accent hover:bg-accent/10 active:scale-90 transition-all duration-150 touch-manipulation cursor-pointer [-webkit-tap-highlight-color:transparent]">
            
              <ChevronRight className="h-7 w-7" strokeWidth={2.8} />
            </button> :
          <div />}
          <h1 className="text-lg font-bold text-primary truncate text-center px-4">{title}</h1>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            aria-label="الإعدادات"
            className="relative z-40 flex items-center justify-center h-11 w-11 -ml-1 rounded-xl text-primary hover:text-accent hover:bg-accent/10 active:scale-90 active:bg-accent/20 transition-all duration-150 touch-manipulation cursor-pointer [-webkit-tap-highlight-color:transparent]">
            
            <Settings className="h-5 w-5" strokeWidth={2.2} />
          </button>
        </header>

        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-28 lg:pb-8">
          <Outlet />
        </div>

        {/* Bottom navigation — mobile only */}
        <nav className="fixed bottom-0 inset-x-0 z-40 lg:hidden print:hidden">
          <div
            className="relative bg-background border-t-[4px] shadow-[0_-6px_20px_-12px_rgba(0,0,0,0.22)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)", borderImage: "linear-gradient(to left, #002060, #00B050) 1" }}>
            
            <div className="flex items-stretch justify-around px-2 pt-1.5 pb-1">
              {tabs.map((item) => {
                const active = activeTab === item.path;
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.path}
                    onClick={() => onTabClick(item.path)}
                    className="relative flex-1 flex flex-col items-center justify-center gap-1 py-1 transition-all duration-200 active:scale-95 touch-manipulation cursor-pointer [-webkit-tap-highlight-color:transparent]">
                    
                    {active &&
                    <span className="absolute -top-[2px] h-[4px] w-7 rounded-full bg-gradient-to-l from-[#002060] to-[#00B050]" />
                    }
                    <span
                      className={cn(
                        "flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-200",
                        active ?
                        "bg-gradient-to-br from-[#002060] to-[#00B050] text-white shadow-md shadow-primary/25 scale-105" :
                        "text-foreground/70 hover:text-primary hover:bg-accent/10"
                      )}>
                      
                      <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.6 : 2} />
                    </span>
                    <span
                      className={cn(
                        "font-bold leading-none transition-colors text-[11px]",
                        active ? "text-primary" : "text-foreground/70"
                      )}>
                      
                      {term(item.label)}
                    </span>
                  </button>);

              })}
            </div>
          </div>
        </nav>
      </main>

    </div>);

}