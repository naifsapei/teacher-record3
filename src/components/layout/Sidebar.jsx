import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { isPrincipal, isPrincipalOnly, isSchoolSupervisor } from "@/lib/permissions";
import {
  LayoutDashboard, Users, BookOpen, GraduationCap,
  ClipboardList, CalendarCheck, Database, BarChart2, X, Star,
  FileText, Settings, Award, LogOut, CalendarDays, Send, Archive as ArchiveIcon,
  TrendingUp, School, Clock, CalendarRange, User, Activity, MessageSquare, Ticket, Crown, GitCompareArrows, Target, Brain, ClipboardCheck } from
"lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import ContactIcons from "@/components/shared/ContactIcons";
import { genderTerm } from "@/lib/genderTerms";

const NAV_SECTIONS = [
{
  title: "الرئيسية",
  items: [
  { path: "/", label: "لوحة المعلومات", icon: LayoutDashboard },
  { path: "/analytics", label: "التحليلات", icon: BarChart2 },
  { path: "/actions", label: "الإجراءات", icon: Send },
  { path: "/notes", label: "الملاحظات", icon: MessageSquare }]
  },
  {
  title: "الإدارة الأكاديمية",
  items: [
  { path: "/classes", label: "الصفوف (الشعب)", icon: BookOpen },
  { path: "/subjects", label: "المواد", icon: GraduationCap },
  { path: "/students", label: "الطلاب", icon: Users },
  { path: "/student-classification", label: "تصنيف الطلاب", icon: Brain },
  { path: "/remedial-plans", label: "الخطط العلاجية والإثرائية", icon: ClipboardCheck },
  { path: "/grades", label: "الدرجات", icon: ClipboardList },
  { path: "/attendance", label: "الحضور والانصراف", icon: CalendarCheck },
  { path: "/calendar", label: "تقويم المعلم", icon: CalendarDays },
  { path: "/schedule", label: "جدول الحصص", icon: Clock },
  { path: "/teacher-needs", label: "احتياجات المعلم", icon: FileText },
  { path: "/teacher-tests", label: "الاختبارات", icon: FileText },
  { path: "/vark", label: "أنماط التعلم VARK", icon: Brain },
  { path: "/certificates", label: "شهادات التقدير", icon: Award },
  { path: "/teacher-reports", label: "التقارير المدرسية", icon: FileText }]

  },
  {
  title: "التقارير والسجلات",
  items: [
  { path: "/reports", label: "التقارير", icon: FileText },
  { path: "/student-tracking", label: "سجل المتابعة", icon: Star },
  { path: "/student-achievements", label: "سجل الإنجازات", icon: Award },
  { path: "/weekly-absence", label: "تقرير الغياب الأسبوعي", icon: CalendarRange },
  { path: "/absence-impact", label: "أثر الغياب على التحصيل", icon: Activity },
  { path: "/student-overview", label: "نظرة شاملة للطالب", icon: LayoutDashboard },
  { path: "/student-profile", label: "سجل أداء الطالب", icon: User },
  { path: "/monthly-performance", label: "الأداء الشهري", icon: TrendingUp },
  { path: "/subject-class-comparison", label: "مقارنة الفصول حسب المادة", icon: GitCompareArrows },
  { path: "/subject-class-analysis", label: "تحليل أداء الفصول", icon: Target }]

},
{
  title: "النظام",
  items: [
  { path: "/archives", label: "الأرشيف", icon: ArchiveIcon },
  { path: "/backups", label: "النسخ الاحتياطية", icon: Database },
  { path: "/settings", label: "الإعدادات", icon: Settings }]

}];


const PRINCIPAL_SECTION = {
  title: "إدارة المدرسة",
  items: [
  { path: "/principal", label: "لوحة المدير", icon: School }]

};

// قسم إدارة النظام الحصري لمدير النظام
const ADMIN_SECTION = {
  title: "إدارة النظام",
  items: [
  { path: "/admin", label: "المستخدمون والاشتراكات", icon: Crown },
  { path: "/discount-codes", label: "أكواد الخصم", icon: Ticket }]

};

// لوحات الأدوار الإشرافية — تظهر لمدير النظام فقط
const STUDENT_AFFAIRS_SECTION = {
  title: "لوحة وكيل شؤون الطلاب",
  items: [
  { path: "/analytics", label: "التحليلات", icon: BarChart2 },
  { path: "/attendance", label: "الحضور والانصراف", icon: CalendarCheck },
  { path: "/weekly-absence", label: "تقرير الغياب الأسبوعي", icon: CalendarRange },
  { path: "/absence-impact", label: "أثر الغياب على التحصيل", icon: Activity },
  { path: "/student-profile", label: "سجل أداء الطالب", icon: User }]

};

const TEACHER_AFFAIRS_SECTION = {
  title: "لوحة وكيل شؤون المعلمين",
  items: [
  { path: "/teachers", label: "المعلمون", icon: Users },
  { path: "/reports", label: "التقارير", icon: FileText },
  { path: "/monthly-performance", label: "الأداء الشهري", icon: TrendingUp },
  { path: "/notes", label: "الملاحظات", icon: MessageSquare }]

};

const STUDENT_COUNSELOR_SECTION = {
  title: "لوحة الموجه الطلابي",
  items: [
  { path: "/student-tracking", label: "سجل المتابعة", icon: Star },
  { path: "/student-achievements", label: "سجل الإنجازات", icon: Award },
  { path: "/student-profile", label: "سجل أداء الطالب", icon: User },
  { path: "/actions", label: "الإحالات", icon: Send }]

};

// Principal-only navigation (excludes all teacher-account tools).
const PRINCIPAL_NAV_SECTIONS = [
{
  title: "إدارة المدرسة",
  items: [
  { path: "/principal", label: "لوحة المدير", icon: School },
  { path: "/subject-class-comparison", label: "مقارنة الفصول حسب المادة", icon: GitCompareArrows },
  { path: "/school-teachers", label: "معلمو المدرسة", icon: Users },
  { path: "/subject-class-analysis", label: "تحليل أداء الفصول", icon: Target },
  { path: "/notes", label: "الملاحظات", icon: MessageSquare }]

},
{
  title: "التقارير والسجلات",
  items: [
  { path: "/reports", label: "التقارير", icon: FileText },
  { path: "/student-tracking", label: "سجل المتابعة", icon: Star },
  { path: "/student-achievements", label: "سجل الإنجازات", icon: Award },
  { path: "/weekly-absence", label: "تقرير الغياب الأسبوعي", icon: CalendarRange },
  { path: "/absence-impact", label: "أثر الغياب على التحصيل", icon: Activity },
  { path: "/student-profile", label: "سجل أداء الطالب", icon: User },
  { path: "/monthly-performance", label: "الأداء الشهري", icon: TrendingUp }]

},
{
  title: "النظام",
  items: [
  { path: "/archives", label: "الأرشيف", icon: ArchiveIcon },
  { path: "/backups", label: "النسخ الاحتياطية", icon: Database },
  { path: "/settings", label: "الإعدادات", icon: Settings }]

}];

// Supervisory roles (وكيل شؤون الطلاب، موجه طلابي، وكيل شؤون المعلمين): متابعة وتقارير فقط
const SUPERVISOR_NAV_SECTIONS = [
{
  title: "المتابعة والإشراف",
  items: [
  { path: "/teachers", label: "المعلمون", icon: Users },
  { path: "/analytics", label: "التحليلات", icon: BarChart2 },
  { path: "/student-tracking", label: "سجل المتابعة", icon: Star },
  { path: "/student-achievements", label: "سجل الإنجازات", icon: Award },
  { path: "/attendance", label: "الحضور والانصراف", icon: CalendarCheck },
  { path: "/weekly-absence", label: "تقرير الغياب الأسبوعي", icon: CalendarRange },
  { path: "/absence-impact", label: "أثر الغياب على التحصيل", icon: Activity },
  { path: "/subject-class-comparison", label: "مقارنة الفصول حسب المادة", icon: GitCompareArrows },
  { path: "/subject-class-analysis", label: "تحليل أداء الفصول", icon: Target },
  { path: "/student-profile", label: "سجل أداء الطالب", icon: User }]

},
{
  title: "التقارير والسجلات",
  items: [
  { path: "/reports", label: "التقارير", icon: FileText },
  { path: "/monthly-performance", label: "الأداء الشهري", icon: TrendingUp },
  { path: "/actions", label: "الإحالات", icon: Send },
  { path: "/notes", label: "الملاحظات", icon: MessageSquare }]

},
{
  title: "النظام",
  items: [
  { path: "/settings", label: "الإعدادات", icon: Settings }]

}];


export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  let sections;
  if (me?.role === "admin") {
    sections = [...NAV_SECTIONS, PRINCIPAL_SECTION, ADMIN_SECTION, STUDENT_AFFAIRS_SECTION, TEACHER_AFFAIRS_SECTION, STUDENT_COUNSELOR_SECTION];
  } else if (isPrincipalOnly(me)) {
    sections = PRINCIPAL_NAV_SECTIONS;
  } else if (isSchoolSupervisor(me)) {
    sections = SUPERVISOR_NAV_SECTIONS;
  } else {
    sections = NAV_SECTIONS;
  }

  const term = (label) => genderTerm(me, label);

  const handleLogout = async () => {
    try {
      await import("@/api/base44Client").then(({ base44 }) => base44.auth.logout("/login"));
    } catch {
      navigate("/login");
    }
  };

  return (
    <>
      {isOpen &&
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden print:hidden"
        onClick={onClose} />

      }
      <aside
        className={cn(
          "fixed top-0 right-0 h-full w-72 bg-card border-l border-border z-[60] flex flex-col shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out print:hidden",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}>
        
        {/* Brand header */}
        <div className="relative border-b border-border bg-gradient-to-b from-primary/5 to-transparent px-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold tracking-wide text-primary">
              القائمة الرئيسية
            </span>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 hover:bg-destructive/10 hover:text-destructive" onClick={onClose} aria-label="إغلاق">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <BrandLogo size="sidebar" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto sidebar-scroll">
          {sections.map((section, sIdx) =>
          <div key={section.title} className={cn(sIdx > 0 && "mt-5")}>
              <p className="px-3 mb-2 text-sm font-bold tracking-wide text-primary font-ibm">
                {term(section.title)}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {if (typeof window !== "undefined" && window.innerWidth < 1024) onClose();}}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                      isActive ?
                      "bg-primary text-primary-foreground shadow-sm shadow-primary/20" :
                      "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}>
                    
                      <span
                      className={cn(
                        "flex items-center justify-center h-7 w-7 rounded-lg shrink-0 transition-colors",
                        isActive ?
                        "bg-primary-foreground/15" :
                        "bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                      )}>
                      
                        <item.icon className="h-4 w-4" strokeWidth={isActive ? 2.4 : 2} />
                      </span>
                      <span className="truncate">{term(item.label)}</span>
                    </Link>);

              })}
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-3">
          <div className="flex items-center justify-between px-3 py-2 mb-1">
            <span className="text-sm font-medium text-muted-foreground">تواصل معنا</span>
            <ContactIcons compact />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
            
            <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-muted/60 group-hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
            </span>
            تسجيل الخروج
          </button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/70">
            {term("سجل المعلم")} © {new Date().getFullYear()}
          </p>
        </div>
      </aside>
    </>);

}