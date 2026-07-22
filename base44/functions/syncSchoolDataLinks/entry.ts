import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// مزامنة ربط المواد بالمعلمين داخل نفس المدرسة (الرقم الوزاري).
// يُصلح المواد التي يشير teacher_id فيها إلى معلم خارج نطاق مدرستها (أو سجل مفقود)
// بإعادة ربطها بمعلم بنفس الهوية (user_id ثم الاسم+البريد ثم الاسم) داخل رقم المادة الوزاري.
// مخصصة لمدير النظام فقط وتعمل بصلاحية service role لمعالجة جميع المدارس.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'مخصصة لمدير النظام فقط' }, { status: 403 });
    }

    const b = base44.asServiceRole;
    const subjects = await b.entities.Subject.list('-created_date', 1000);
    const teachers = await b.entities.Teacher.list('-created_date', 1000);

    const teacherById = new Map(teachers.map((t) => [t.id, t]));
    const byMinistry = new Map();
    for (const t of teachers) {
      const mn = t.ministry_number || '';
      if (!byMinistry.has(mn)) byMinistry.set(mn, []);
      byMinistry.get(mn).push(t);
    }

    const norm = (s) => (s || '').trim();
    const updates = [];
    for (const sub of subjects) {
      const subMn = sub.ministry_number || '';
      if (!subMn) continue;
      const cur = sub.teacher_id ? teacherById.get(sub.teacher_id) : null;
      // فقط عندما يكون المعلم مفقودًا أو في مدرسة مختلفة عن المادة
      if (cur && (cur.ministry_number || '') === subMn) continue;

      const candidates = byMinistry.get(subMn) || [];
      if (!candidates.length) continue;

      let target = null;
      if (cur) {
        if (cur.user_id) target = candidates.find((t) => t.user_id === cur.user_id);
        if (!target) {
          const key = norm(cur.name) + '|' + norm(cur.email);
          target = candidates.find((t) => (norm(t.name) + '|' + norm(t.email)) === key);
        }
        if (!target) target = candidates.find((t) => norm(t.name) === norm(cur.name));
      }
      if (!target) continue;
      if (target.id === sub.teacher_id) continue;
      updates.push({ id: sub.id, teacher_id: target.id });
    }

    let updated = 0;
    if (updates.length) {
      await b.entities.Subject.bulkUpdate(updates);
      updated = updates.length;
    }

    return Response.json({
      status: 'success',
      subjects_checked: subjects.length,
      subjects_relinked: updated,
      details: updates.map((u) => ({ subject_id: u.id, new_teacher_id: u.teacher_id })),
    });
  } catch (error) {
    return Response.json({ error: error.message || 'فشلت المزامنة' }, { status: 500 });
  }
});