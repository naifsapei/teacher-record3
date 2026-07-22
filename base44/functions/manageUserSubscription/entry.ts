import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// دالة إدارية آمنة: تحديث حقول اشتراك مستخدم عبر صلاحية الخدمة (asServiceRole).
// يُسمح باستدعائها لمدير النظام فقط؛ أي استدعاء من مستخدم عادي (من واجهة غير إدارية
// أو من Console المتصفح) يُرفض بـ 403. تمنع تعديل حقول الاشتراك مباشرةً من العميل.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let caller = null;
    try {
      caller = await base44.auth.me();
    } catch (_e) { caller = null; }
    if (!caller || caller.role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const args = body?.args ?? body ?? {};
    const targetId = args.user_id;
    if (!targetId) {
      return Response.json({ error: "user_id required" }, { status: 400 });
    }
    // حقول مسموح بها فقط — لا يمكن للمستدعي تجاوزها إلى حقول أخرى
    const ALLOWED = [
      "subscription_plan", "subscription_start", "subscription_end",
      "account_type", "subscription_status", "full_name", "ministry_number",
      "phone"
    ];
    const update = {};
    for (const k of ALLOWED) {
      if (k in args) update[k] = args[k];
    }
    if (Object.keys(update).length === 0) {
      return Response.json({ error: "no updatable fields" }, { status: 400 });
    }
    // منع التحديث الأعمى على معرّفات عشوائية: تأكّد من وجود المستخدم المستهدف فعلاً.
    const target = await base44.asServiceRole.entities.User.get(targetId).catch(() => null);
    if (!target) {
      return Response.json({ error: "target user not found" }, { status: 404 });
    }
    await base44.asServiceRole.entities.User.update(targetId, update);

    // إغلاق طلب الاشتراك المرتبط إن وُجد
    if (args.request_id && args.request_status) {
      try {
        await base44.asServiceRole.entities.Subscription.update(args.request_id, {
          status: args.request_status
        });
      } catch (_e) { /* تجاهل خطأ تحديث الطلب */ }
    }

    // احتساب استخدام كود الخصم فقط عند تفعيل الاشتراك من الإدارة (مصدر موثوق).
    if (args.request_id && args.subscription_status === "active") {
      try {
        const subReq = await base44.asServiceRole.entities.Subscription.get(args.request_id);
        const codeStr = subReq && subReq.discount_code ? String(subReq.discount_code).trim().toUpperCase() : "";
        if (codeStr) {
          const found = await base44.asServiceRole.entities.DiscountCode.filter({ code: codeStr });
          const dc = found && found[0];
          if (dc && dc.active) {
            await base44.asServiceRole.entities.DiscountCode.update(dc.id, {
              used_count: (dc.used_count || 0) + 1
            });
          }
        }
      } catch (_e) { /* تجاهل خطأ احتساب الكود */ }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});