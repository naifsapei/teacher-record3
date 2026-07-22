import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle, KeyRound } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("يجب أن تكون كلمة المرور 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      window.location.href = "/login";
    } catch {
      setError("تعذّر إعادة تعيين كلمة المرور. قد يكون الرابط منتهي الصلاحية أو تم استخدامه مسبقاً — اطلب رابطاً جديداً.");
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title="رابط غير صالح"
        subtitle="رابط إعادة تعيين كلمة المرور مفقود أو غير صحيح"
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            اطلب رابطاً جديداً
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          يبدو أن الرابط المستخدم غير مكتمل. يرجى طلب رسالة جديدة لإعادة تعيين كلمة المرور.
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={KeyRound}
      title="كلمة المرور الجديدة"
      subtitle="أدخل كلمة المرور الجديدة أدناه"
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">كلمة المرور الجديدة</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pr-10 h-12 text-right"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pr-10 h-12 text-right"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              جارٍ الإعادة...
            </>
          ) : (
            "إعادة تعيين كلمة المرور"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">طلبت رابطاً ولم يصلك؟ اطلب رابطاً جديداً</Link>
        </p>
      </form>
    </AuthLayout>
  );
}