import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const requestId = body.request_id;
    if (!requestId || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'بيانات غير صحيحة' }, { status: 400 });
    }

    const request = await base44.asServiceRole.entities.JoinRequest.get(requestId);
    if (!request) return Response.json({ error: 'الطلب غير موجود' }, { status: 404 });
    if (request.status !== 'pending') {
      return Response.json({ error: 'تمت مراجعة هذا الطلب مسبقاً' }, { status: 409 });
    }

    // الصلاحية: أدمن النظام أو مدير المدرسة المطابقة (نفس school_id)
    const authorized = user.role === 'admin' ||
      (user.app_role === 'principal' && user.school_id && user.school_id === request.school_id);
    if (!authorized) return Response.json({ error: 'غير مصرّح بمراجعة هذا الطلب' }, { status: 403 });

    // تحقق ثانٍ: لمدير المدرسة، تأكّد أن المدرسة المرتبطة بالطلب مملوكة فعلاً له
    // (SchoolInfo.principal_id === user.id) لمنع الموافقة على طلبات مدارس أخرى.
    if (user.role !== 'admin' && user.app_role === 'principal') {
      const schoolInfo = request.school_id
        ? await base44.asServiceRole.entities.SchoolInfo.get(request.school_id).catch(() => null)
        : null;
      if (!schoolInfo || schoolInfo.principal_id !== user.id) {
        return Response.json({ error: 'غير مصرّح بمراجعة هذا الطلب' }, { status: 403 });
      }
    }

    const reviewerName = user.display_name || user.email;
    const reviewedDate = new Date().toISOString();

    if (action === 'approve') {
      await base44.asServiceRole.entities.JoinRequest.update(requestId, {
        status: 'approved',
        reviewed_by_id: user.id,
        reviewed_by_name: reviewerName,
        reviewed_date: reviewedDate,
      });

      // جلب بيانات المدرسة من SchoolInfo لتضمين القيم الصحيحة
      const school = request.school_id
        ? await base44.asServiceRole.entities.SchoolInfo.get(request.school_id)
        : null;

      // ربط المستخدم بالمدرسة عبر school_id (الربط الثابت المُتحقَّق منه)
      await base44.asServiceRole.entities.User.update(request.requestor_id, {
        school_id: request.school_id,
        ministry_number: request.ministry_number,
        link_status: 'approved',
        school_name: school?.school_name || request.school_name || '',
        principal_name: school?.principal_name || request.principal_name || '',
        education_admin: school?.education_admin || request.education_admin || '',
      });

      // للمعلم: إنشاء سجل معلم مرتبط بالمدرسة إن لم يكن موجوداً
      if (request.role === 'teacher') {
        const teachers = await base44.asServiceRole.entities.Teacher.list('-created_date', 500);
        let has = teachers.find((t) => t.user_id === request.requestor_id);
        // إن لم يوجد سجل مرتبط بالحساب، ابحث عن سجل موجود بنفس البريد (بدون user_id) وحدّثه بدلاً من إنشاء سجل جديد
        if (!has) {
          const em = (request.requestor_email || '').trim().toLowerCase();
          has = teachers.find((t) => !t.user_id && (t.email || '').trim().toLowerCase() === em);
        }
        if (!has) {
          await base44.asServiceRole.entities.Teacher.create({
            name: request.display_name || request.requestor_name,
            email: request.requestor_email,
            ministry_number: request.ministry_number,
            gender: request.gender || '',
            user_id: request.requestor_id,
            specialization: request.specialization || '',
            phone: request.phone || '',
          });
        } else {
          await base44.asServiceRole.entities.Teacher.update(has.id, {
            ministry_number: request.ministry_number,
            user_id: request.requestor_id,
            email: request.requestor_email || has.email,
            name: request.display_name || has.name,
          });
        }
      }

      return Response.json({ status: 'success', message: 'تمت الموافقة على الطلب وربط المستخدم بالمدرسة' });
    }

    // reject
    await base44.asServiceRole.entities.JoinRequest.update(requestId, {
      status: 'rejected',
      reviewed_by_id: user.id,
      reviewed_by_name: reviewerName,
      reviewed_date: reviewedDate,
    });
    await base44.asServiceRole.entities.User.update(request.requestor_id, { link_status: 'rejected' });
    return Response.json({ status: 'success', message: 'تم رفض الطلب' });
  } catch (error) {
    return Response.json({ error: error.message || 'فشلت مراجعة الطلب' }, { status: 500 });
  }
});