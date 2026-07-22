import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const ministryNumber = (body.ministry_number || '').trim();
    if (!ministryNumber) {
      return Response.json({ error: 'الرقم الوزاري للمدرسة مطلوب' }, { status: 400 });
    }

    const role = body.role || user.app_role || 'teacher';
    if (!['teacher', 'student_affairs', 'teacher_affairs', 'student_counselor'].includes(role)) {
      return Response.json({ error: 'الدور غير صالح للانضمام لمدرسة' }, { status: 400 });
    }

    // البحث عن المدرسة في SchoolInfo بالرقم الوزاري (مصدر الحقيقة)
    const schools = await base44.asServiceRole.entities.SchoolInfo.list('-created_date', 1000);
    const school = schools.find((s) => s.ministry_number === ministryNumber);
    if (!school) {
      // لا توجد مدرسة مسجّلة بهذا الرقم الوزاري
      try {
        await base44.auth.updateMe({ link_status: 'invalid_ministry' });
      } catch (_e) { /* غير حرج */ }
      return Response.json({
        error: 'لا توجد مدرسة مسجّلة بهذا الرقم الوزاري. تأكد من الرقم أو اطلب من مدير المدرسة إنشاء حساب وتسجيل المدرسة أولاً.',
      }, { status: 404 });
    }

    // التحقق من وجود مدير مرتبط بالمدرسة
    if (!school.principal_id) {
      return Response.json({
        error: 'المدرسة موجودة لكن ليس لها مدير مرتبط بعد. اطلب من مدير المدرسة تسجيل الدخول وإكمال ربط حسابه بالمدرسة.',
      }, { status: 404 });
    }

    // منع تكرار الطلبات المعلّقة لنفس المستخدم ونفس المدرسة
    const existing = await base44.asServiceRole.entities.JoinRequest.list('-created_date', 500);
    const dup = existing.find(
      (r) => r.requestor_id === user.id && r.school_id === school.id && r.status === 'pending'
    );
    if (dup) {
      return Response.json({ error: 'لديك طلب انضمام معلّق لهذه المدرسة بالفعل، بانتظار موافقة المدير.' }, { status: 409 });
    }

    await base44.entities.JoinRequest.create({
      requestor_id: user.id,
      requestor_name: body.display_name || user.display_name || user.email,
      requestor_email: user.email,
      role,
      school_id: school.id,
      ministry_number: ministryNumber,
      school_name: school.school_name || '',
      principal_name: school.principal_name || '',
      education_admin: school.education_admin || '',
      display_name: body.display_name || '',
      phone: body.phone || '',
      specialization: body.specialization || '',
      gender: body.gender || '',
      status: 'pending',
    });

    // ربط حالة المستخدم:
    // - طلب انضمام جديد (غير مرتبط): نضبطه «بانتظار الموافقة» ونفرغ الرقم الوزاري حتى الموافقة.
    // - نقل لمدرسة أخرى (مرتبط سابقاً وموافق عليه): نحافظ على وضعه الحالي حتى موافقة المدير الجديد.
    const alreadyLinked = user.link_status === 'approved' && user.school_id && user.school_id !== school.id;
    if (!alreadyLinked) {
      try {
        await base44.auth.updateMe({ link_status: 'pending', ministry_number: '' });
      } catch (_e) { /* غير حرج */ }
    }

    return Response.json({
      status: 'success',
      message: alreadyLinked
        ? 'تم إرسال طلب نقل إلى المدرسة الجديدة. ستبقى مرتبطاً بمدرستك الحالية حتى موافقة مدير المدرسة الجديدة.'
        : 'تم إرسال طلب الانضمام إلى مدير المدرسة. ستظهر صلاحيات المدرسة بعد الموافقة.',
    });
  } catch (error) {
    return Response.json({ error: error.message || 'فشل إنشاء طلب الانضمام' }, { status: 500 });
  }
});