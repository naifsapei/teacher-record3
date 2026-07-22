import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import ContactIcons from "@/components/shared/ContactIcons";
import { Landmark, Check, Crown, CalendarDays, Copy, ShieldCheck, ChevronLeft, Clock, XCircle, Ticket } from "lucide-react";
import { toast } from "sonner";
import {
  PLAN_LABELS, STATUS_LABELS, STATUS_TONES,
  getSubscriptionStatus, getSubscriptionPlan, isSubscriptionActive
} from "@/lib/permissions";

const PLANS = [
  {
    id: "semester",
    label: "اشتراك فصل دراسي",
    price: 35,
    period: "لكل فصل دراسي",
    icon: CalendarDays,
    features: ["تتبع الطلاب والدرجات", "إدارة الحضور اليومي", "تصدير التقارير PDF و Excel"],
  },
  {
    id: "year",
    label: "اشتراك سنة كاملة",
    price: 60,
    period: "لسنة دراسية كاملة",
    icon: Crown,
    features: ["كل مزايا اشتراك الصف", "وفّر 10 ريال", "تحليلات وتقارير متقدمة", "دعم ذو أولوية"],
    best: true,
  },
];

const METHODS = [
  { id: "bank_transfer", label: "تحويل بنكي", desc: "حوالة بنكية مباشرة", icon: Landmark },
];

const BANK = {
  bank: "مصرف الراجحي",
  iban: "SA32 8000 0311 6080 1626 9916",
  holder: "إدارة النظام المدرسي",
  note: "بعد إتمام التحويل، أرسل إيصال التحويل لتأكيد تفعيل الاشتراك.",
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ar-SA-u-ca-gregory") : "—");

export default function Subscription() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [plan, setPlan] = useState("year");
  const [method, setMethod] = useState("bank_transfer");
  const [submitting, setSubmitting] = useState(false);
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [codeError, setCodeError] = useState("");
  const [validating, setValidating] = useState(false);

  useEffect(() => { setAppliedDiscount(null); setCodeError(""); }, [plan]);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: mySubs = [] } = useQuery({
    queryKey: ["my-subscriptions"],
    queryFn: () => base44.entities.Subscription.list("-created_date", 10),
  });

  const pendingReq = mySubs.find((s) => s.status === "pending");
  const status = me ? getSubscriptionStatus(me) : "free";
  const planType = me ? getSubscriptionPlan(me) : "free";
  const active = me ? isSubscriptionActive(me) : false;
  const selectedPlan = PLANS.find((p) => p.id === plan);

  const applyCode = async () => {
    if (!discountInput.trim()) { setAppliedDiscount(null); setCodeError(""); return; }
    setValidating(true); setCodeError("");
    try {
      const res = await base44.functions.invoke("validateDiscountCode", {
        code: discountInput.trim(), plan, amount: selectedPlan.price, apply: false,
      });
      const d = res.data;
      if (d.valid) { setAppliedDiscount(d); setCodeError(""); }
      else { setAppliedDiscount(null); setCodeError(d.error || "الكود غير صالح"); }
    } catch {
      setCodeError("تعذر التحقق من الكود"); setAppliedDiscount(null);
    } finally { setValidating(false); }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      let finalAmount = selectedPlan.price;
      let discount = null;
      if (discountInput.trim()) {
        const res = await base44.functions.invoke("validateDiscountCode", {
          code: discountInput.trim(), plan, amount: selectedPlan.price, apply: true,
        });
        const d = res.data;
        if (!d.valid) { toast.error(d.error || "الكود غير صالح"); setSubmitting(false); return; }
        finalAmount = d.final_amount; discount = d;
      }
      await base44.entities.Subscription.create({
        plan,
        amount: finalAmount,
        original_amount: selectedPlan.price,
        discount_code: discount ? discount.code : "",
        discount_amount: discount ? discount.discount_amount : 0,
        payment_method: method,
        status: "pending",
        notes: discount
          ? `كود خصم ${discount.code} — خصم ${discount.discount_amount} ريال`
          : "بانتظار مراجعة الإدارة",
      });
      qc.invalidateQueries(["my-subscriptions"]);
      toast.success("تم إرسال طلب الاشتراك بنجاح، وسيتم مراجعته من قبل الإدارة.");
    } catch {
      toast.error("تعذر تسجيل الطلب");
    } finally {
      setSubmitting(false);
    }
  };

  const copyIban = () => {
    navigator.clipboard?.writeText(BANK.iban.replace(/\s/g, ""));
    toast.success("تم نسخ رقم الآيبان");
  };

  const Info = ({ label, children }) => (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div>{children}</div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-28 px-4">
      <PageHeader
        title="الاشتراك والمدفوعات"
        description="اختر خطة الاشتراك وطريقة الدفع المناسبة لك"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate("/settings")} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> رجوع
          </Button>
        }
      />

      {/* بطاقة حالة الاشتراك الحالية */}
      {me && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-5 h-5 text-primary" /> حالة اشتراكك الحالية
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Info label="حالة الاشتراك">
              <Badge className={STATUS_TONES[status]}>{STATUS_LABELS[status]}</Badge>
            </Info>
            <Info label="فعالية الحساب">
              <Badge variant={active ? "success" : "outline"}>{active ? "فعّال" : "غير فعّال"}</Badge>
            </Info>
            <Info label="نوع الاشتراك">
              <span className="text-sm font-medium">{PLAN_LABELS[planType]}</span>
            </Info>
            <Info label="تاريخ بداية الاشتراك">
              <span className="text-sm font-medium">{fmtDate(me.subscription_start)}</span>
            </Info>
            <Info label="تاريخ نهاية الاشتراك">
              <span className="text-sm font-medium">
                {me.subscription_end ? fmtDate(me.subscription_end) : status === "admin" ? "بدون انتهاء" : "—"}
              </span>
            </Info>
          </CardContent>
        </Card>
      )}

      {/* طلب قيد المراجعة */}
      {pendingReq && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600 shrink-0" />
            <div className="flex-1">
              <div className="font-bold">طلبك قيد المراجعة</div>
              <div className="text-sm text-muted-foreground">
                تم إرسال طلب اشتراك ({PLAN_LABELS[pendingReq.plan]}) بتاريخ {fmtDate(pendingReq.created_date)}، وسيتم مراجعته من قبل الإدارة.
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* حالة مرفوضة */}
      {status === "rejected" && !pendingReq && (
        <Card className="border-red-300 bg-red-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-600 shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-red-700">تم رفض طلب الاشتراك</div>
              <div className="text-sm text-muted-foreground">يمكنك إرسال طلب اشتراك جديد أدناه.</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* اشتراك مفعّل */}
      {active && (
        <Card className="border-emerald-300 bg-emerald-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Check className="w-8 h-8 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <div className="font-bold text-emerald-700">اشتراكك مفعّل</div>
              <div className="text-sm text-muted-foreground">استمتع بكامل صلاحيات المشترك حتى {fmtDate(me?.subscription_end)}.</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* خطط وتأكيد الطلب — تظهر فقط عند عدم وجود طلب معلّق وعدم وجود اشتراك نشط */}
      {!pendingReq && !active && (
        <>
          <div>
            <h2 className="text-lg font-bold mb-3">خطط الاشتراك</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {PLANS.map((p) => {
                const Icon = p.icon;
                const isActive = plan === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    className={`text-right relative rounded-2xl border-2 p-5 transition-all bg-card ${
                      isActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                    }`}
                  >
                    {p.best && (
                      <span className="absolute -top-3 right-4 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full shadow">
                        أفضل قيمة
                      </span>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{p.label}</div>
                        <div className="text-xs text-muted-foreground">{p.period}</div>
                      </div>
                      {isActive && <Check className="w-5 h-5 text-primary mr-auto" />}
                    </div>
                    <div className="text-3xl font-extrabold text-foreground mb-3">
                      {p.price} <span className="text-base font-medium text-muted-foreground">ريال</span>
                    </div>
                    <ul className="space-y-2">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-primary shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>طريقة الدفع</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-3 gap-3">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const isActive = method === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={`relative rounded-xl border-2 p-4 text-center transition-all ${
                      isActive ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/40"
                    }`}
                  >
                    {isActive && <Check className="w-4 h-4 text-primary absolute top-2 left-2" />}
                    <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-sm text-foreground">{m.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {method === "bank_transfer" && (
            <Card>
              <CardHeader>
                <CardTitle>تفاصيل التحويل البنكي</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Row label="اسم البنك" value={BANK.bank} />
                <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/60 p-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">رقم الآيبان (IBAN)</div>
                    <div className="font-mono font-bold text-foreground" dir="ltr">{BANK.iban}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={copyIban} className="gap-1 shrink-0">
                    <Copy className="w-4 h-4" /> نسخ
                  </Button>
                </div>
                <Row label="اسم المستفيد" value={BANK.holder} />
                <p className="text-sm text-muted-foreground bg-accent/10 rounded-lg p-3 flex gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" /> {BANK.note}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Ticket className="w-5 h-5 text-primary" /> كود خصم
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                  placeholder="أدخل كود الخصم"
                  dir="ltr"
                  className="flex-1"
                />
                <Button variant="outline" onClick={applyCode} disabled={validating || !discountInput.trim()} className="shrink-0">
                  {validating ? "جارٍ التحقق..." : "تطبيق"}
                </Button>
              </div>
              {codeError && (
                <p className="text-sm text-destructive flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" /> {codeError}
                </p>
              )}
              {appliedDiscount && (
                <div className="rounded-lg bg-accent/10 p-3 space-y-1">
                  <p className="text-sm text-accent font-medium flex items-center gap-1.5">
                    <Check className="w-4 h-4 shrink-0" /> تم تطبيق الكود — خصم {appliedDiscount.discount_amount} ريال
                  </p>
                  <p className="text-xs text-muted-foreground">
                    المبلغ قبل الخصم {appliedDiscount.original_amount} ريال · بعد الخصم {appliedDiscount.final_amount} ريال
                  </p>
                </div>
              )}
              {appliedDiscount && (
                <div className="grid grid-cols-2 gap-2">
                  {PLANS.map((p) => {
                    const valid = p.id === plan;
                    const disc = valid ? appliedDiscount.discount_amount : 0;
                    return (
                      <div key={p.id} className={`rounded-lg border p-2 text-center ${valid ? "border-accent bg-accent/5" : "border-border opacity-60"}`}>
                        <div className="text-xs text-muted-foreground">{p.label}</div>
                        {disc > 0 ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-xs text-muted-foreground line-through">{p.price}</span>
                            <span className="font-bold text-accent">{Math.max(p.price - disc, 0)} ريال</span>
                          </div>
                        ) : (
                          <div className="font-bold">{valid ? appliedDiscount.final_amount : p.price} ريال</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="sticky bottom-20 lg:bottom-6 shadow-lg">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">المبلغ المستحق</div>
                {appliedDiscount ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground line-through">{selectedPlan.price} ريال</span>
                    <span className="text-2xl font-extrabold text-accent">{appliedDiscount.final_amount} ريال</span>
                  </div>
                ) : (
                  <div className="text-2xl font-extrabold text-foreground">{selectedPlan.price} ريال</div>
                )}
              </div>
              <Button size="lg" onClick={handleConfirm} disabled={submitting} className="px-8">
                {submitting ? "جارٍ الإرسال..." : "تأكيد الطلب"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="border-primary/15 bg-primary/5">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-bold text-sm">تواصل معنا</div>
            <div className="text-xs text-muted-foreground">للاستفسار عن الاشتراك والمدفوعات</div>
          </div>
          <ContactIcons />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground" dir="ltr">{value}</span>
    </div>
  );
}