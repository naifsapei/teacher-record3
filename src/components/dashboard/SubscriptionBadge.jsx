import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useCurrentTeacher } from "@/hooks/useCurrentTeacher";
import {
  getSubscriptionPlan, getSubscriptionStatus, isSubscriptionActive, subscriberTitle,
  getLinkStatus, LINK_STATUS_LABELS, ministryNumber
} from "@/lib/permissions";
import { Crown, CalendarDays, Sparkles, ChevronLeft, ShieldCheck, UserCircle, CalendarRange, Building2, BadgeCheck } from "lucide-react";

// أنواع الحساب / الاشتراك — مرتبطة بحقول حساب المستخدم التي يضبطها مدير النظام
const ACCOUNT_META = {
  admin: { label: "مدير النظام", icon: ShieldCheck },
  year: { label: "مشترك لمدة عام دراسي", icon: Crown },
  semester: { label: "مشترك لمدة فصل دراسي", icon: CalendarDays },
  free: { label: "حساب مجاني", icon: Sparkles },
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ar-SA-u-ca-gregory") : "—");

function initialsOf(name) {
  return (name || "؟")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

export default function SubscriptionBadge() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { data: freshMe } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  const me = freshMe || authUser;
  const { currentTeacher } = useCurrentTeacher();

  const isAdmin = me?.role === "admin";
  const plan = getSubscriptionPlan(me); // free / semester / year / admin
  const status = getSubscriptionStatus(me);
  const active = isSubscriptionActive(me);

  // نوع الحساب المعروض: المشترك النشط يأخذ خطته، غير النشط يظهر مجانيًا
  const kind = isAdmin ? "admin" : active ? plan : "free";
  const meta = ACCOUNT_META[kind] || ACCOUNT_META.free;
  const Icon = meta.icon;

  const name = me?.display_name || currentTeacher?.name || me?.full_name || me?.email || "—";
  const title = subscriberTitle(me);

  const statusLabel = isAdmin
    ? "صلاحيات كاملة"
    : active
    ? "مفعّل"
    : status === "expired"
    ? "انتهى الاشتراك"
    : status === "rejected"
    ? "مرفوض"
    : "غير مشترك";

  const showDates = (kind === "year" || kind === "semester") && me?.subscription_start;

  // ── بطاقة مدير النظام / المشترك (خلفية مميزة) ──────────────────────────
  if (kind === "admin" || kind === "year" || kind === "semester") {
    const gradient =
      kind === "admin"
        ? "from-[#1a1a2e] via-[#16213e] to-[#0f3460]"
        : "from-[#002060] via-[#003a7a] to-[#00B050]";

    return (
      <div className="relative overflow-hidden rounded-2xl mb-6 shadow-md">
        <div className={`absolute inset-0 bg-gradient-to-l ${gradient}`} />
        <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-4 -bottom-10 h-28 w-28 rounded-full bg-white/10 blur-2xl" />

        <div className="relative p-4 sm:p-5 text-white">
          <div className="flex items-center gap-4">
            <div className="h-9 w-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0 ring-1 ring-white/25">
              <Icon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              {/* المسمى/الجنس */}
              <div className="font-bold text-base sm:text-lg text-white/90">
                {title}
              </div>
              {/* تاريخ بداية ونهاية الاشتراك أعلى الاسم */}
              {showDates && (
                <div className="text-[11px] sm:text-xs text-white/80 flex items-center gap-1 mt-0.5">
                  <CalendarRange className="h-3.5 w-3.5" />
                  <span>بداية: {fmtDate(me.subscription_start)}</span>
                  <span className="h-1 w-1 rounded-full bg-white/50" />
                  <span>نهاية: {fmtDate(me.subscription_end)}</span>
                </div>
              )}
              {/* اسم المشترك */}
              <div className="font-extrabold text-base sm:text-lg truncate mt-0.5">
                {name}
              </div>
              {/* نوع الاشتراك ثم حالته */}
              <div className="text-xs sm:text-sm text-white/85 mt-1 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  {meta.label}
                </span>
                <span className="h-1 w-1 rounded-full bg-white/50" />
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  {statusLabel}
                </span>
              </div>
              {/* المدرسة + الرقم الوزاري + حالة الحساب */}
              {(me?.school_name || ministryNumber(me)) && (
                <div className="text-[11px] sm:text-xs text-white/75 flex items-center gap-1.5 mt-1 flex-wrap">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  {me?.school_name && <span className="truncate max-w-[12rem]">{me.school_name}</span>}
                  {me?.school_name && ministryNumber(me) && <span className="h-1 w-1 rounded-full bg-white/40" />}
                  {ministryNumber(me) && <span>وزاري: {ministryNumber(me)}</span>}
                  <span className="h-1 w-1 rounded-full bg-white/40" />
                  <span className="inline-flex items-center gap-1">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {LINK_STATUS_LABELS[getLinkStatus(me)] || "—"}
                  </span>
                </div>
              )}
            </div>

            <div className="hidden sm:flex h-12 w-12 rounded-full bg-white/15 items-center justify-center font-bold text-lg ring-1 ring-white/25 shrink-0">
              {initialsOf(name)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── بطاقة الحساب المجاني (تشمل المنتهي/المرفوض) ───────────────────────────
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-4 sm:p-5 flex items-center gap-4 mb-6">
      <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0">
        <UserCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
          {title}
        </div>
        <div className="font-bold text-sm sm:text-base text-foreground truncate mt-0.5">{name}</div>
        <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 flex-wrap mt-1">
          <span className="inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {meta.label}
          </span>
          <span className="h-1 w-1 rounded-full bg-border" />
          <span>{statusLabel}</span>
        </div>
        {(me?.school_name || ministryNumber(me)) && (
          <div className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5 mt-1 flex-wrap">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            {me?.school_name && <span className="truncate max-w-[10rem]">{me.school_name}</span>}
            {me?.school_name && ministryNumber(me) && <span className="h-1 w-1 rounded-full bg-border" />}
            {ministryNumber(me) && <span>وزاري: {ministryNumber(me)}</span>}
            <span className="h-1 w-1 rounded-full bg-border" />
            <span className="inline-flex items-center gap-1">
              <BadgeCheck className="h-3.5 w-3.5" />
              {LINK_STATUS_LABELS[getLinkStatus(me)] || "—"}
            </span>
          </div>
        )}
      </div>
      <button
        onClick={() => navigate("/subscription")}
        className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-accent transition-colors"
      >
        ترقية الاشتراك
        <ChevronLeft className="w-4 h-4" />
      </button>
    </div>
  );
}