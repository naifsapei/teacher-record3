import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// إنشاء سجلات Teacher لكل مستخدم معلم (app_role=teacher) مرتبط بمدرسة (له رقم وزاري)
// ولا يملك سجل Teacher مطابق عبر user_id. يُستدعى من لوحة الأدمن.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'مخصصة لمدير النظام فقط' }, { status: 403 });
    }

    const teachers = await base44.asServiceRole.entities.Teacher.list('-created_date', 1000);
    const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);

    const normEmail = (e) => (e || '').trim().toLowerCase();
    const existingByUserId = new Map();
    const existingByEmail = new Map();
    for (const t of teachers) {
      if (t.user_id) existingByUserId.set(t.user_id, t);
      const em = normEmail(t.email);
      if (em && !t.user_id && !existingByEmail.has(em)) existingByEmail.set(em, t);
    }

    const toCreate = [];
    let claimed = 0;
    for (const u of users) {
      if (u.app_role !== 'teacher') continue;
      if (!u.ministry_number) continue;
      if (existingByUserId.has(u.id)) continue;
      const em = normEmail(u.email);
      const claim = em ? existingByEmail.get(em) : null;
      if (claim) {
        // تحديث السجل الأساسي الموجود وربطه بحساب المستخدم بدلاً من إنشاء سجل جديد
        try {
          await base44.asServiceRole.entities.Teacher.update(claim.id, {
            user_id: u.id,
            ministry_number: u.ministry_number,
            email: u.email || claim.email,
            name: u.display_name || u.full_name || claim.name,
          });
          existingByEmail.delete(em);
          claimed++;
        } catch (_e) { /* متابعة */ }
        continue;
      }
      toCreate.push({
        name: u.display_name || u.full_name || u.email,
        email: u.email,
        phone: u.phone || '',
        ministry_number: u.ministry_number,
        gender: u.gender || '',
        user_id: u.id,
        specialization: u.specialization || '',
        grade_level: '',
      });
    }

    let created = 0;
    for (const payload of toCreate) {
      try {
        await base44.asServiceRole.entities.Teacher.create(payload);
        created++;
      } catch (e) {
        // متابعة بقية السجلات
      }
    }

    // مزامنة سجلات المعلمين الموجودة: تحديث الرقم الوزاري ليتطابق مع المستخدم المرتبط به
    let synced = 0;
    for (const t of teachers) {
      if (!t.user_id) continue;
      const u = users.find((x) => x.id === t.user_id);
      if (!u || !u.ministry_number) continue;
      if (t.ministry_number !== u.ministry_number) {
        try {
          await base44.asServiceRole.entities.Teacher.update(t.id, { ministry_number: u.ministry_number });
          synced++;
        } catch (e) {
          // متابعة بقية السجلات
        }
      }
    }

    return Response.json({
      status: 'success',
      total_teachers_existing: teachers.length,
      linked_teacher_users: users.filter((u) => u.app_role === 'teacher' && u.ministry_number).length,
      created,
      claimed,
      synced,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'فشل التعبئة' }, { status: 500 });
  }
});