import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// دمج سجلات المعلمين المكررة لكل شخص (نفس البريد أو الاسم) في سجل واحد أساسي:
// - يختار السجل الأساسي (المفضّل ذو user_id، وإلا الأحدث)
// - يدمج الحقول الناقصة من المكررات إلى الأساسي
// - يعيد ربط المواد والجدول الدراسي (LessonSchedule) من المكررات إلى الأساسي
// - يحذف السجلات المكررة
// مخصصة لمدير النظام فقط وتعمل بصلاحية service role.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'مخصصة لمدير النظام فقط' }, { status: 403 });
    }

    const b = base44.asServiceRole;
    const teachers = await b.entities.Teacher.list('-created_date', 2000);
    const subjects = await b.entities.Subject.list('-created_date', 2000);
    const lessons = await b.entities.LessonSchedule.list('-created_date', 2000);

    const norm = (s) => (s || '').trim().toLowerCase();
    const keyOf = (t) => norm(t.email) || norm(t.name);

    const groups = new Map();
    for (const t of teachers) {
      const k = keyOf(t);
      if (!k) continue;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(t);
    }

    const report = [];
    for (const [key, group] of groups) {
      if (group.length < 2) continue;
      const withUid = group.filter((t) => t.user_id);
      let primary = withUid.length ? withUid[0] : [...group].sort((a, c) => new Date(c.created_date) - new Date(a.created_date))[0];
      const dups = group.filter((t) => t.id !== primary.id);

      const patch = {};
      for (const d of dups) {
        if (!primary.user_id && d.user_id) patch.user_id = d.user_id;
        if (!primary.ministry_number && d.ministry_number) patch.ministry_number = d.ministry_number;
        if (!primary.phone && d.phone) patch.phone = d.phone;
        if (!primary.specialization && d.specialization) patch.specialization = d.specialization;
        if (!primary.email && d.email) patch.email = d.email;
        if (!primary.gender && d.gender) patch.gender = d.gender;
        if (!primary.grade_level && d.grade_level) patch.grade_level = d.grade_level;
      }
      if (Object.keys(patch).length) {
        await b.entities.Teacher.update(primary.id, patch);
        primary = { ...primary, ...patch };
      }

      let relinkedSubjects = 0;
      let relinkedLessons = 0;
      for (const d of dups) {
        const dupSubs = subjects.filter((s) => s.teacher_id === d.id);
        if (dupSubs.length) {
          await b.entities.Subject.bulkUpdate(dupSubs.map((s) => ({ id: s.id, teacher_id: primary.id })));
          relinkedSubjects += dupSubs.length;
        }
        const dupLessons = lessons.filter((l) => l.teacher_id === d.id);
        if (dupLessons.length) {
          await b.entities.LessonSchedule.bulkUpdate(dupLessons.map((l) => ({ id: l.id, teacher_id: primary.id })));
          relinkedLessons += dupLessons.length;
        }
        await b.entities.Teacher.delete(d.id);
      }

      report.push({
        key,
        primary_id: primary.id,
        merged: dups.map((d) => d.id),
        relinked_subjects: relinkedSubjects,
        relinked_lessons: relinkedLessons,
      });
    }

    return Response.json({
      status: 'success',
      groups_merged: report.length,
      details: report,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'فشل الدمج' }, { status: 500 });
  }
});