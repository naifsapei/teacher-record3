import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// يتيح لمدير المدرسة تغيير الرقم الوزاري لمدرسته وتحديثه في كامل النظام:
// جميع كيانات البيانات المرتبطة بالرقم القديم + حسابات المستخدمين المرتبطين + طلبات الانضمام المعلّقة.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.app_role !== 'principal' && user.role !== 'admin') {
      return Response.json({ error: 'مخصصة لمدير المدرسة فقط' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const newMn = (body.new_ministry_number || '').trim();
    const oldMn = (user.ministry_number || '').trim();

    if (!newMn) return Response.json({ error: 'الرقم الوزاري الجديد مطلوب' }, { status: 400 });
    if (!oldMn) return Response.json({ error: 'لا يوجد رقم وزاري حالي لتحديثه' }, { status: 400 });
    if (newMn === oldMn) return Response.json({ error: 'الرقم الجديد مطابق للرقم الحالي' }, { status: 400 });

    const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);

    // تحقق ملكية صارم لمدير المدرسة: يجب أن يملك SchoolInfo بالرقم القديم
    // (principal_id === user.id)، ويُمنع استخدام رقم تملكه مدرسة أخرى.
    const schools = await base44.asServiceRole.entities.SchoolInfo.list('-created_date', 1000);
    if (user.role !== 'admin') {
      const mySchool = schools.find((s) => s.ministry_number === oldMn);
      if (!mySchool || mySchool.principal_id !== user.id) {
        return Response.json({ error: 'لا يمكنك تحديث هذا الرقم الوزاري؛ لست مدير المدرسة المرتبطة به' }, { status: 403 });
      }
      const conflictSchool = schools.find((s) => s.ministry_number === newMn && s.id !== mySchool.id);
      if (conflictSchool) {
        return Response.json({ error: 'هذا الرقم الوزاري مستخدم بالفعل لمدرسة أخرى' }, { status: 409 });
      }
    }
    // منع التعارض: لا يوجد مدير آخر بنفس الرقم الجديد
    const conflict = users.find((u) => u.app_role === 'principal' && u.ministry_number === newMn && u.id !== user.id);
    if (conflict) {
      return Response.json({ error: 'هذا الرقم الوزاري مستخدم بالفعل من قبل مدير مدرسة أخرى' }, { status: 409 });
    }

    const setMn = async (entityName, filterVal) => {
      let updated = 0;
      let hasMore = true;
      let guard = 0;
      while (hasMore && guard < 20) {
        guard++;
        const res = await base44.asServiceRole.entities[entityName].updateMany(
          { ministry_number: filterVal },
          { $set: { ministry_number: newMn } }
        );
        updated += res.updatedCount || res.modifiedCount || 0;
        hasMore = !!res.has_more;
      }
      return updated;
    };

    const entities = [
      'Teacher', 'Class', 'Subject', 'Student', 'Grade', 'Attendance',
      'StudentNote', 'EvaluationItem', 'TrackingRecord', 'Achievement',
      'CalendarEvent', 'LessonSchedule', 'Backup', 'AcademicArchive',
      'StudentReferral', 'ReferralResponse', 'Note', 'NoteReply',
    ];

    const counts = {};
    for (const e of entities) {
      try { counts[e] = await setMn(e, oldMn); } catch (_e) { counts[e] = -1; }
    }

    // تحديث حسابات المستخدمين المرتبطين بالمدرسة فردياً (لا يُسمح بالتحديث بالجملة للمستخدمين)
    let userUpdated = 0;
    const schoolUsers = users.filter((u) => u.ministry_number === oldMn);
    for (const u of schoolUsers) {
      try {
        await base44.asServiceRole.entities.User.update(u.id, { ministry_number: newMn });
        userUpdated++;
      } catch (_e) { /* متابعة */ }
    }

    // تحديث طلبات الانضمام المعلّقة بنفس الرقم القديم
    let reqUpdated = 0;
    try {
      const jrRes = await base44.asServiceRole.entities.JoinRequest.updateMany(
        { ministry_number: oldMn, status: 'pending' },
        { $set: { ministry_number: newMn } }
      );
      reqUpdated = jrRes.updatedCount || jrRes.modifiedCount || 0;
    } catch (_e) { /* غير حرج */ }

    return Response.json({
      status: 'success',
      old_ministry_number: oldMn,
      new_ministry_number: newMn,
      entities_updated: counts,
      users_updated: userUpdated,
      join_requests_updated: reqUpdated,
      message: 'تم تحديث الرقم الوزاري للمدرسة في كامل النظام',
    });
  } catch (error) {
    return Response.json({ error: error.message || 'فشل تحديث الرقم الوزاري' }, { status: 500 });
  }
});