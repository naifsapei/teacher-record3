import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') {
      return Response.json({ error: 'هذه العملية لمدير النظام فقط' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const userId = body.user_id;
    if (!userId || !action) {
      return Response.json({ error: 'بيانات غير صحيحة' }, { status: 400 });
    }

    const targetUser = await base44.asServiceRole.entities.User.get(userId);
    if (!targetUser) return Response.json({ error: 'المستخدم غير موجود' }, { status: 404 });

    // جلب كل المدارس للبحث
    const schools = await base44.asServiceRole.entities.SchoolInfo.list('-created_date', 1000);

    switch (action) {
      case 'fix_link': {
        // إصلاح الربط: البحث عن مدرسة بالرقم الوزاري وربط المستخدم بها
        const mn = (body.ministry_number || targetUser.ministry_number || '').trim();
        if (!mn) return Response.json({ error: 'الرقم الوزاري مطلوب' }, { status: 400 });
        const school = schools.find((s) => s.ministry_number === mn);
        if (!school) return Response.json({ error: 'لا توجد مدرسة بهذا الرقم الوزاري' }, { status: 404 });
        await base44.asServiceRole.entities.User.update(userId, {
          school_id: school.id,
          ministry_number: mn,
          link_status: 'approved',
          school_name: school.school_name || '',
          education_admin: school.education_admin || '',
          principal_name: school.principal_name || '',
        });
        return Response.json({ status: 'success', message: 'تم إصلاح الربط بنجاح' });
      }

      case 'change_school': {
        // تغيير المدرسة: ربط بمدرسة أخرى عبر school_id
        const newSchoolId = body.school_id;
        if (!newSchoolId) return Response.json({ error: 'مُعرِّف المدرسة الجديدة مطلوب' }, { status: 400 });
        const school = schools.find((s) => s.id === newSchoolId);
        if (!school) return Response.json({ error: 'المدرسة غير موجودة' }, { status: 404 });
        await base44.asServiceRole.entities.User.update(userId, {
          school_id: school.id,
          ministry_number: school.ministry_number,
          link_status: 'approved',
          school_name: school.school_name || '',
          education_admin: school.education_admin || '',
          principal_name: school.principal_name || '',
        });
        return Response.json({ status: 'success', message: 'تم تغيير المدرسة بنجاح' });
      }

      case 'make_independent': {
        // تحويل المعلم إلى مستقل
        await base44.asServiceRole.entities.User.update(userId, {
          school_id: '',
          ministry_number: '',
          link_status: 'independent',
          school_name: '',
          education_admin: '',
          principal_name: '',
        });
        return Response.json({ status: 'success', message: 'تم تحويل المستخدم إلى معلم مستقل' });
      }

      case 'approve_manually': {
        // اعتماد الربط يدوياً (بدون طلب انضمام)
        const mn = (targetUser.ministry_number || '').trim();
        if (!mn) return Response.json({ error: 'لا يوجد رقم وزاري للاعتماد' }, { status: 400 });
        const school = schools.find((s) => s.ministry_number === mn);
        if (!school) return Response.json({ error: 'لا توجد مدرسة بهذا الرقم الوزاري' }, { status: 404 });
        await base44.asServiceRole.entities.User.update(userId, {
          school_id: school.id,
          link_status: 'approved',
        });
        return Response.json({ status: 'success', message: 'تم اعتماد الربط يدوياً' });
      }

      case 'suspend': {
        await base44.asServiceRole.entities.User.update(userId, { link_status: 'suspended' });
        return Response.json({ status: 'success', message: 'تم إيقاف الربط' });
      }

      case 'needs_review': {
        await base44.asServiceRole.entities.User.update(userId, { link_status: 'needs_review' });
        return Response.json({ status: 'success', message: 'تم تحويل الحالة إلى مراجعة' });
      }

      case 'resend_request': {
        // إعادة إرسال طلب انضمام: ضبط الحالة على unlinked وإرسال طلب جديد
        await base44.asServiceRole.entities.User.update(userId, { link_status: 'unlinked' });
        return Response.json({ status: 'success', message: 'تم تصفير حالة الربط. يمكن للمستخدم إرسال طلب جديد.' });
      }

      default:
        return Response.json({ error: 'إجراء غير معروف' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message || 'فشلت العملية' }, { status: 500 });
  }
});