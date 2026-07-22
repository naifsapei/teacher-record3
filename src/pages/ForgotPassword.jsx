import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {
      // Always show success regardless
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex items-center justify-center p-4" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-400/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <BrandLogo size="auth" />

        <div className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-border/50 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">استعادة كلمة المرور</h2>
            <p className="text-muted-foreground text-sm mt-1">سنرسل لك رابطاً لإعادة تعيين كلمة المرور</p>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-50 mb-4">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <p className="text-sm text-foreground">
                إذا كان هناك حساب مرتبط بهذا البريد، ستصل رسالة برابط استعادة كلمة المرور قريباً.
              </p>
            </div>
          ) : (
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
              <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 ml-2 animate-spin" />جارٍ الإرسال...</>
                ) : (
                  "إرسال رابط الاستعادة"
                )}
              </Button>
            </form>
          )}

          <p className="text-center text-sm text-muted-foreground mt-5">
            <Link to="/login" className="text-primary font-semibold hover:underline inline-flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />العودة لتسجيل الدخول
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}