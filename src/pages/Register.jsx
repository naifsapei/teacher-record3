import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mail, Lock, Loader2, BookOpen, Eye, EyeOff, CheckCircle2, School, User, GraduationCap, ShieldCheck, Building2, UserPlus } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import BrandLogo from "@/components/BrandLogo";
import PlatformAboutDialog from "@/components/onboarding/PlatformAboutDialog";
import { APP_ROLE_OPTIONS, SUBJECT_SPECIALIZATIONS } from "@/lib/permissions";
import { OTP_CHANNELS, normalizeOtpChannel, getOtpChannelLabel, getOtpDestination } from "@/utils/registrationProfile";
import { toast } from "sonner";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpChannel, setOtpChannel] = useState("email");
  // role + school linkage
  const [role, setRole] = useState("teacher");
  const [joinMode, setJoinMode] = useState("join"); // join | independent (teachers only)
  const [fullName, setFullName] = useState("");
  const [ministryNumber, setMinistryNumber] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [eduAdmin, setEduAdmin] = useState("");
  const [principalName, setPrincipalName] = useState("");
  const [gender, setGender] = useState("");
  const [specialization, setSpecialization] = useState("");

  const roleCfg = APP_ROLE_OPTIONS.find((r) => r.value === role) || APP_ROLE_OPTIONS[0];
  const isPrincipalRole = role === "principal";
  const isTeacherRole = role === "teacher";
  const isIndependent = isTeacherRole && joinMode === "independent";
  const needsSchoolLinkage = !isIndependent; // principal + supervisors + joining teachers

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("الاسم الكامل مطلوب"); return; }
    if (needsSchoolLinkage && !ministryNumber.trim()) { setError("الرقم الوزاري للمدرسة مطلوب"); return; }
    if (isTeacherRole && !phoneNumber.trim()) { setError("رقم الجوال للمعلم مطلوب"); return; }
    if (needsSchoolLinkage && !schoolName.trim()) { setError("اسم المدرسة مطلوب"); return; }
    if (needsSchoolLinkage && !eduAdmin.trim()) { setError("إدارة التعليم مطلوبة"); return; }
    if (needsSchoolLinkage && !isPrincipalRole && !principalName.trim()) { setError("اسم مدير المدرسة مطلوب"); return; }
    if (!gender) { setError("الرجاء تحديد الجنس"); return; }
    if (isTeacherRole && !specialization) { setError("الرجاء اختيار التخصص"); return; }
    if (password !== confirmPassword) { setError("كلمتا المرور غير متطابقتين"); return; }
    if (password.length < 6) { setError("يجب أن تكون كلمة المرور 6 أحرف على الأقل"); return; }
    setLoading(true);
    try {
      // لا نستخدم استعلام تعداد البريد قبل التسجيل؛ يتم كشف التكرار من خلال خطأ register().
      await base44.auth.register({ email, password });
      setOtpChannel(normalizeOtpChannel(otpChannel));
      setShowOtp(true);
    } catch (err) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("exist") || msg.includes("registered") || msg.includes("duplicate") || msg.includes("used")) {
        setError("هذا البريد الإلكتروني مسجّل بالفعل. سجّل الدخول أو استخدم بريداً آخر.");
      } else {
        setError(err.message || "فشل إنشاء الحساب");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }

      const safePhone = phoneNumber.trim();
      const safeOtpChannel = normalizeOtpChannel(otpChannel);
      const baseProfile = {
        app_role: role,
        display_name: fullName.trim(),
        gender,
        title: gender === "female" ? roleCfg.female : roleCfg.male,
        account_type: "guest",
        subscription_status: "pending",
        otp_channel: safeOtpChannel,
        otp_destination: getOtpDestination(safeOtpChannel, email.trim(), safePhone),
        ...(isTeacherRole ? { specialization, phone: safePhone } : {}),
      };

      try {
        if (isPrincipalRole) {
          // المدير: مرتبط تلقائياً بمدرسته برقمه الوزاري
          await base44.auth.updateMe({
            ...baseProfile,
            ministry_number: ministryNumber.trim(),
            school_name: schoolName.trim(),
            education_admin: eduAdmin.trim(),
            principal_name: fullName.trim(),
            link_status: "approved",
          });
        } else if (isIndependent) {
          // معلم مستقل: بدون مدرسة، يُنشأ سجل معلم خاص به
          await base44.auth.updateMe({
            ...baseProfile,
            link_status: "independent",
            ministry_number: "",
          });
          try {
            const me = await base44.auth.me();
            await base44.entities.Teacher.create({
              name: fullName.trim(),
              email,
              ministry_number: "",
              gender,
              user_id: me?.id,
              specialization,
              phone: phoneNumber.trim(),
            });
          } catch (tErr) { console.error("Teacher record create failed", tErr); }
        } else {
          // معلم/وكيل يطلب الانضمام لمدرسة: لا يُربط برقم وزاري حتى موافقة المدير
          await base44.auth.updateMe({
            ...baseProfile,
            link_status: "pending",
            ministry_number: "",
            school_name: schoolName.trim(),
            education_admin: eduAdmin.trim(),
            principal_name: principalName.trim(),
          });
          try {
            const res = await base44.functions.invoke("createJoinRequest", {
              ministry_number: ministryNumber.trim(),
              role,
              display_name: fullName.trim(),
              phone: phoneNumber.trim(),
              specialization,
              gender,
              school_name: schoolName.trim(),
              education_admin: eduAdmin.trim(),
              principal_name: principalName.trim(),
            });
            if (res?.data?.message) toast.success(res.data.message);
          } catch (jErr) {
            // إذا لم يوجد مدير بالرقم الوزاري، نبه المستخدم ونعكس حالة الارتباط
            console.error("Join request failed", jErr);
            toast.error(jErr?.response?.data?.error || jErr?.message || "تعذر إرسال طلب الانضمام");
            try {
              await base44.auth.updateMe({ link_status: "unlinked", school_name: "", education_admin: "", principal_name: "" });
            } catch (_e) { /* ignore */ }
          }
        }

        // بيانات المدرسة العامة (للمدير فقط يُنشئ سجل SchoolInfo)
        try {
          if (isPrincipalRole) {
            const existing = await base44.entities.SchoolInfo.list();
            const payload = {
              education_admin: eduAdmin.trim(),
              school_name: schoolName.trim(),
              principal_name: fullName.trim(),
            };
            if (existing.length > 0) {
              await base44.entities.SchoolInfo.update(existing[0].id, payload);
            } else {
              await base44.entities.SchoolInfo.create(payload);
            }
          }
        } catch (schoolErr) { console.error("SchoolInfo save failed", schoolErr); }
      } catch (profileErr) {
        console.error("Profile save failed", profileErr);
      }
      try { localStorage.removeItem("base44_access_token"); } catch (e) { /* ignore */ }
      navigate("/login?registered=1", { replace: true });
    } catch (err) {
      setError(err.message || "رمز التحقق غير صحيح");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast.success("تم إرسال الرمز مجدداً إلى بريدك الإلكتروني");
    } catch (err) {
      setError(err.message || "فشل إعادة الإرسال");
    }
  };

  // ── OTP Screen ───────────────────────────────────────────────────────────────
  if (showOtp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4" dir="rtl">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-md relative">
          <div className="mb-8"><BrandLogo size="auth" /></div>
          <div className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-border/50 p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-50 mb-4">
                <Mail className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-foreground">تحقق من بريدك الإلكتروني</h2>
              <p className="text-muted-foreground text-sm mt-2">
                أرسلنا رمز التحقق إلى<br />
                <span className="font-semibold text-foreground">{getOtpDestination(normalizeOtpChannel(otpChannel), email, phoneNumber)}</span>
              </p>
            </div>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">{error}</div>
            )}
            <div className="flex justify-center mb-6" dir="ltr">
              <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
                <InputOTPGroup>
                  <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
                  <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button className="w-full h-11 font-medium gap-2" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
              {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />جارٍ التحقق...</>) : (<><CheckCircle2 className="h-4 h-4" />تأكيد الرمز</>)}
            </Button>
            <p className="text-center text-sm text-muted-foreground mt-4">
              لم يصلك الرمز؟{" "}
              <button onClick={handleResend} className="text-primary font-semibold hover:underline">إعادة الإرسال</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Register Form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4 pt-20" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <BrandLogo size="auth" />

        <div className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-border/50 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">إنشاء حساب جديد ✨</h2>
            <p className="text-muted-foreground text-sm mt-1">انضم إلى المنصة الآن</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selection */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">نوع الحساب</Label>
              <Select value={role} onValueChange={(v) => { setRole(v); setJoinMode("join"); }}>
                <SelectTrigger className="h-11 text-right"><SelectValue placeholder="اختر نوع الحساب" /></SelectTrigger>
                <SelectContent>
                  {APP_ROLE_OPTIONS.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullname" className="text-sm font-medium">{isPrincipalRole ? "اسم المدير" : "الاسم الثلاثي"}</Label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="fullname" placeholder="الاسم الثلاثي كما في الأوراق الرسمية" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pr-10 h-11 text-right" required />
              </div>
            </div>

            {/* Independent teacher option */}
            {isTeacherRole && (
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-3">
                <Label className="text-sm font-medium block mb-2">طريقة استخدام النظام</Label>
                <div className="grid grid-cols-1 gap-2">
                  <button type="button" onClick={() => setJoinMode("join")}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium text-right transition-all ${joinMode === "join" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    <UserPlus className="h-4 w-4" />
                    <span>الانضمام إلى مدرسة بالرقم الوزاري (يتطلب موافقة المدير)</span>
                  </button>
                  <button type="button" onClick={() => setJoinMode("independent")}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium text-right transition-all ${joinMode === "independent" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                    <BookOpen className="h-4 w-4" />
                    <span>استخدام النظام بدون الانضمام إلى مدرسة (معلم مستقل)</span>
                  </button>
                </div>
                {isIndependent && (
                  <p className="text-xs text-muted-foreground mt-2 px-1">
                    كمعلم مستقل تستخدم النظام لبياناتك الخاصة فقط، ولا تصل إلى بيانات المدارس أو الطلاب. يمكنك لاحقاً طلب الانضمام إلى مدرسة من الإعدادات.
                  </p>
                )}
              </div>
            )}

            {needsSchoolLinkage && (
              <div className="space-y-1.5">
                <Label htmlFor="ministry" className="text-sm font-medium">الرقم الوزاري للمدرسة</Label>
                <div className="relative">
                  <School className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="ministry" placeholder="مثال: 123456" value={ministryNumber} onChange={(e) => setMinistryNumber(e.target.value)} className="pr-10 h-11 text-right" required />
                </div>
              </div>
            )}

            {isTeacherRole && (
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">رقم الجوال</Label>
                <div className="relative">
                  <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="phone" type="tel" placeholder="مثال: 05xxxxxxxx" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="pr-10 h-11 text-right" required />
                </div>
              </div>
            )}

            {needsSchoolLinkage && (
              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-4">
                <p className="text-xs font-bold text-primary uppercase tracking-wider">بيانات مهمة (مطلوبة لإصدار التقارير واعتمادها بالنظام)</p>
                <div className="space-y-1.5">
                  <Label htmlFor="edu" className="text-sm font-medium">إدارة التعليم</Label>
                  <div className="relative">
                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="edu" placeholder="إدارة التعليم التابع لها المدرسة" value={eduAdmin} onChange={(e) => setEduAdmin(e.target.value)} className="pr-10 h-11 text-right" required />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="school" className="text-sm font-medium">اسم المدرسة</Label>
                  <div className="relative">
                    <BookOpen className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="school" placeholder="اسم المدرسة" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} className="pr-10 h-11 text-right" required />
                  </div>
                </div>
                {!isPrincipalRole && (
                  <div className="space-y-1.5">
                    <Label htmlFor="principal" className="text-sm font-medium">اسم مدير المدرسة</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="principal" placeholder="اسم مدير المدرسة" value={principalName} onChange={(e) => setPrincipalName(e.target.value)} className="pr-10 h-11 text-right" required />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الجنس (بنين/بنات)</Label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setGender("male")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${gender === "male" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  <GraduationCap className="h-4 w-4" /> بنين
                </button>
                <button type="button" onClick={() => setGender("female")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${gender === "female" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  <GraduationCap className="h-4 w-4" /> بنات
                </button>
              </div>
            </div>

            {isTeacherRole && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">التخصص</Label>
                <Select value={specialization} onValueChange={setSpecialization}>
                  <SelectTrigger className="h-11 text-right"><SelectValue placeholder="اختر التخصص" /></SelectTrigger>
                  <SelectContent>
                    {SUBJECT_SPECIALIZATIONS.map((sp) => (<SelectItem key={sp} value={sp}>{sp}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" autoComplete="email" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pr-10 h-11 text-right" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">طريقة استلام رمز التحقق</Label>
              <div className="grid gap-2">
                {OTP_CHANNELS.map((channel) => {
                  const selected = normalizeOtpChannel(otpChannel) === channel.value;
                  return (
                    <button
                      key={channel.value}
                      type="button"
                      className={`rounded-xl border p-3 text-right transition-all ${selected ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
                      onClick={() => setOtpChannel(channel.value)}
                    >
                      <div className="font-medium">{channel.label}</div>
                      <div className="text-xs mt-1">{channel.description}</div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                سيتم استخدام {getOtpChannelLabel(otpChannel)} كوجهة الرمز بعد إنشاء الحساب.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10 pl-10 h-11 text-right" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-sm font-medium">تأكيد كلمة المرور</Label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="confirm" type={showConfirm ? "text" : "password"} autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pr-10 pl-10 h-11 text-right" required />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (<p className="text-xs text-destructive">كلمتا المرور غير متطابقتين</p>)}
            </div>

            <Button type="submit" className="w-full h-11 font-medium mt-2" disabled={loading}>
              {loading ? (<><Loader2 className="w-4 h-4 ml-2 animate-spin" />جارٍ إنشاء الحساب...</>) : "إنشاء الحساب"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            لديك حساب بالفعل؟{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">تسجيل الدخول</Link>
          </p>
        </div>

        <div className="mt-4"><PlatformAboutDialog trigger /></div>
      </div>
    </div>
  );
}