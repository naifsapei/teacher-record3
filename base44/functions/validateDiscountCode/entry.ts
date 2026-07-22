import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// التحقق من كود خصم وحساب قيمة الخصم (للقراءة فقط).
// يقرأ الأكواد عبر صلاحية الخدمة (asServiceRole) فلا يحتاج المستخدم لصلاحية قراءة الكيان.
// لا يقوم هذا الخادم العام بتعديل عدّاد الاستخدام — يُحتسب used_count داخل معالج إكمال
// الاشتراك الآمن (manageUserSubscription) المخصّص للإدارة فقط، لمنع استنزاف الأكواد.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_e) { user = null; }
    if (!user) return Response.json({ valid: false, error: "يجب تسجيل الدخول لاستخدام كود الخصم" }, { status: 401 });

    const body = await req.json();
    const args = body?.args ?? body ?? {};
    const codeStr = String(args.code || "").trim().toUpperCase();
    const plan = args.plan || null;
    const amount = typeof args.amount === "number" ? args.amount : null;
    // ملاحظة: علم apply لم يعد مؤثّرًا من هذا الخادم العام؛ يُحتسب الاستخدام عند إكمال الاشتراك فقط.

    if (!codeStr) return Response.json({ valid: false, error: "أدخل كود الخصم" });

    const found = await base44.asServiceRole.entities.DiscountCode.filter({ code: codeStr });
    const dc = found && found[0];
    if (!dc) return Response.json({ valid: false, error: "الكود غير صحيح" });
    if (!dc.active) return Response.json({ valid: false, error: "الكود غير مفعّل" });

    const today = new Date().toISOString().slice(0, 10);
    if (dc.start_date && today < dc.start_date) return Response.json({ valid: false, error: "الكود لم يبدأ بعد" });
    if (dc.end_date && today > dc.end_date) return Response.json({ valid: false, error: "الكود منتهي الصلاحية" });

    if (dc.max_usage && dc.max_usage > 0 && (dc.used_count || 0) >= dc.max_usage) {
      return Response.json({ valid: false, error: "تم بلوغ الحد الأقصى لاستخدام هذا الكود" });
    }

    // التحقق من الباقة المسموح لها
    if (plan) {
      let plans: any = ["all"];
      try { plans = JSON.parse(dc.applicable_plans || JSON.stringify(["all"])); } catch (_e) { plans = ["all"]; }
      const isAll = Array.isArray(plans) && (plans.includes("all") || plans.length === 0);
      if (!isAll && !(Array.isArray(plans) && plans.includes(plan))) {
        return Response.json({ valid: false, error: "الكود غير متاح لهذه الباقة" });
      }
    }

    // التحقق من المستخدمين المسموح لهم
    let users: any = ["all"];
    try { users = JSON.parse(dc.allowed_user_ids || JSON.stringify(["all"])); } catch (_e) { users = ["all"]; }
    const isAllUsers = Array.isArray(users) && (users.includes("all") || users.length === 0);
    if (!isAllUsers && !(Array.isArray(users) && users.includes(user.id))) {
      return Response.json({ valid: false, error: "الكود غير متاح لحسابك" });
    }

    // حساب الخصم
    const base = amount != null ? amount : 0;
    let discountAmount = 0;
    if (dc.discount_type === "percentage") {
      discountAmount = Math.round((base * (dc.discount_value || 0)) / 100 * 100) / 100;
    } else {
      discountAmount = Math.min(dc.discount_value || 0, base);
    }
    const final = Math.max(base - discountAmount, 0);

    return Response.json({
      valid: true,
      code_id: dc.id,
      code: dc.code,
      description: dc.description || "",
      discount_type: dc.discount_type,
      discount_value: dc.discount_value || 0,
      discount_amount: discountAmount,
      original_amount: base,
      final_amount: final,
      validity_days: dc.validity_days || null
    });
  } catch (error) {
    return Response.json({ valid: false, error: "تعذّر التحقق من الكود" }, { status: 500 });
  }
});