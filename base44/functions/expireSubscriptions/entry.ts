import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// صيانة مجدولة: يحوّل اشتراكات المستخدمين المنتهية تلقائياً إلى "مجاني".
// يتجاهل حساب مدير النظام (اشتراك مفتوح). يعمل بصلاحية الخدمة (بدون مستخدم).
Deno.serve(async (req) => {
  try {
    // التحقق من الرمز السرّي: يمرّره المجدول عبر body.args أو الإدارة عبر الترويسة
    // يجب أن يكون الرمز المُعدّ غير فارغ وأن يطابق تماماً الرمز المُقدَّم، وإلا يُرفض دائماً.
    const expected = (Deno.env.get("MAINTENANCE_TOKEN") || "").trim();
    // رفض الرموز الضعيفة/القصيرة لمنع التخمين أو التسريب.
    if (expected.length < 32) {
      return Response.json({ error: "Maintenance token not configured or too weak" }, { status: 503 });
    }
    let providedToken = req.headers.get("X-Maintenance-Token");
    if (!providedToken) {
      try {
        const body = await req.json();
        providedToken = body?.args?.token || body?.token;
      } catch (_e) { /* لا يوجد جسم صالح */ }
    }
    const provided = (providedToken || "").trim();
    // مقارنة ثابتة الزمن لمنع استخراج الرمز عبر هجمات التوقيت.
    const providedBytes = new TextEncoder().encode(provided);
    const expectedBytes = new TextEncoder().encode(expected);
    if (providedBytes.length !== expectedBytes.length || !provided) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    let diff = 0;
    for (let i = 0; i < expectedBytes.length; i++) diff |= providedBytes[i] ^ expectedBytes[i];
    if (diff !== 0) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }
    const base44 = createClientFromRequest(req);
    const now = new Date();
    const users = await base44.asServiceRole.entities.User.list(500);
    const toExpire = users.filter((u) => {
      if (u.role === "admin") return false;
      const plan = u.subscription_plan;
      if (plan !== "semester" && plan !== "year") return false;
      if (!u.subscription_end) return false;
      return new Date(u.subscription_end) < now && u.account_type !== "free";
    });
    let count = 0;
    for (const u of toExpire) {
      try {
        await base44.asServiceRole.entities.User.update(u.id, {
          account_type: "free",
          subscription_status: "expired"
        });
        count++;
      } catch (_e) { /* تجاهل الأخطاء الفردية ومتابعة الباقي */ }
    }
    return Response.json({ expired: count, checked: users.length, at: now.toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});