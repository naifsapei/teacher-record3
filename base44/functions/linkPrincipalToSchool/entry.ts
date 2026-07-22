import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.app_role !== 'principal') {
      return Response.json({ error: 'هذه العملية لمدير المدرسة فقط' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const ministryNumber = (body.ministry_number || '').trim();
    if (!ministryNumber) {
      return Response.json({ error: 'الرقم الوزاري للمدرسة مطلوب' }, { status: 400 });
    }

    const schoolName = (body.school_name || user.school_name || user.display_name || '').trim();
    const educationAdmin = (body.education_admin || user.education_admin || '').trim();

    // البحث عن المدرسة بالرقم الوزاري
    const schools = await base44.asServiceRole.entities.SchoolInfo.list('-created_date', 1000);
    let school = schools.find((s) => s.ministry_number === ministryNumber);

    if (school) {
      // المدرسة موجودة — التحقق من ملكيتها
      if (school.principal_id && school.principal_id !== user.id) {
        return Response.json({
          error: 'هذا الرقم الوزاري مرتبط بمدير مدرسة آخر. راجع مدير النظام لحل التعارض.',
        }, { status: 409 });
      }
      // ربط المدير بالمدرسة
      school = await base44.asServiceRole.entities.SchoolInfo.update(school.id, {
        principal_id: user.id,
        principal_name: user.display_name || user.full_name || '',
        school_name: schoolName || school.school_name,
        education_admin: educationAdmin || school.education_admin,
        active: true,
      });
    } else {
      // إنشاء سجل مدرسة جديد
      school = await base44.asServiceRole.entities.SchoolInfo.create({
        ministry_number: ministryNumber,
        school_name: schoolName,
        education_admin: educationAdmin,
        principal_id: user.id,
        principal_name: user.display_name || user.full_name || '',
        active: true,
      });
    }

    // ربط حساب المدير بالمدرسة عبر school_id
    await base44.asServiceRole.entities.User.update(user.id, {
      school_id: school.id,
      ministry_number: ministryNumber,
      link_status: 'approved',
      school_name: school.school_name || schoolName,
      education_admin: school.education_admin || educationAdmin,
      principal_name: school.principal_name || user.display_name || '',
    });

    // ربط سجل المعلم المرتبط بالمدير (إن وُجد) لتحديث السجل الأساسي بدلاً من إنشاء سجل جديد
    const teachers = await base44.asServiceRole.entities.Teacher.list('-created_date', 1000);
    let mine = teachers.find((t) => t.user_id === user.id);
    if (!mine) {
      const em = (user.email || '').trim().toLowerCase();
      mine = teachers.find((t) => !t.user_id && (t.email || '').trim().toLowerCase() === em);
    }
    if (mine) {
      await base44.asServiceRole.entities.Teacher.update(mine.id, {
        user_id: user.id,
        ministry_number: ministryNumber,
        name: user.display_name || user.full_name || mine.name,
        email: user.email || mine.email,
      });
    }

    return Response.json({
      status: 'success',
      message: 'تم ربط حسابك بالمدرسة بنجاح عبر الرقم الوزاري',
      school_id: school.id,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'فشل ربط الحساب بالمدرسة' }, { status: 500 });
  }
});