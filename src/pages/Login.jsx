import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import PlatformAboutDialog from "@/components/onboarding/PlatformAboutDialog";
import { getLocalAuthUser, persistLocalAuthUser } from "@/utils/localAuth";

export default function Login() {
  const [searchParams] = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const localUser = getLocalAuthUser(email, password);
      if (localUser) {
        persistLocalAuthUser(localUser);
        window.location.href = "/";
        return;
      }

      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      const localUser = getLocalAuthUser(email, password);
      if (localUser) {
        persistLocalAuthUser(localUser);
        window.location.href = "/";
        return;
      }
      setError(err.message || "البريد الإلكتروني أو كلمة المرور غير صحيحة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4" dir="rtl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo & Brand */}
        <BrandLogo size="auth" />

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-border/50 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">مرحباً بعودتك 👋</h2>
            <p className="text-muted-foreground text-sm mt-1">سجّل دخولك للمتابعة</p>
          </div>

          {justRegistered && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm border border-emerald-200 flex gap-2 items-start">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                تم تفعيل بريدك الإلكتروني بنجاح. سجّل دخولك للبدء بحساب ضيف بصلاحيات محدودة، وسيتم تفعيل اشتراكك الكامل من قبل مدير النظام.
              </span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">البريد الإلكتروني</Label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-10 h-11 text-right"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">كلمة المرور</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 pl-10 h-11 text-right"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 font-medium mt-2" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جارٍ تسجيل الدخول...
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            ليس لديك حساب؟{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              إنشاء حساب جديد
            </Link>
          </p>
        </div>

        {/* نبذة تعريفية بالمنصة */}
        <div className="mt-4">
          <PlatformAboutDialog trigger />
        </div>
      </div>
    </div>
  );
}