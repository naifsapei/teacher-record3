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
    const dryRun = body.dry_run !== false;

    const users = await base44.asServiceRole.entities.User.list('-created_date', 1000);
    const schools = await base44.asServiceRole.entities.SchoolInfo.list('-created_date', 1000);

    const results = { processed: 0, linked: 0, pending: 0, independent: 0, needs_review: 0, schools_created: 0, errors: [] };

    for (const u of users) {
      results.processed++;
      try {
        const mn = (u.ministry_number || '').trim();

        // المدير: ربط تلقائي بمدرسته
        if (u.app_role === 'principal' && mn) {
          let school = schools.find((s) => s.ministry_number === mn);
          if (!school) {
            if (!dryRun) {
              school = await base44.asServiceRole.entities.SchoolInfo.create({
                ministry_number: mn,
                school_name: u.school_name || u.display_name || u.full_name || '',
                education_admin: u.education_admin || '',
                principal_id: u.id,
                principal_name: u.display_name || u.full_name || '',
                active: true,
              });
              schools.push(school);
            }
            results.schools_created++;
          } else if (!school.principal_id || school.principal_id !== u.id) {
            if (!dryRun) {
              school = await base44.asServiceRole.entities.SchoolInfo.update(school.id, {
                principal_id: u.id,
                principal_name: u.display_name || u.full_name || '',
              });
            }
          }
          if (!dryRun) {
            await base44.asServiceRole.entities.User.update(u.id, {
              school_id: school.id,
              link_status: 'approved',
              school_name: school.school_name || u.school_name || '',
            });
          }
          results.linked++;
          continue;
        }

        // المعلم/الوكيل/الموجه بدون رقم وزاري: معلم مستقل (للمعلم) أو غير مرتبط
        if (!mn) {
          if (!dryRun) {
            const status = u.app_role === 'teacher' ? 'independent' : 'unlinked';
            await base44.asServiceRole.entities.User.update(u.id, { link_status: status, school_id: '' });
          }
          if (u.app_role === 'teacher') results.independent++;
          else results.needs_review++;
          continue;
        }

        // المعلم/الوكيل/الموجه برقم وزاري: مطابقة مع SchoolInfo
        const school = schools.find((s) => s.ministry_number === mn);
        if (!school) {
          // لا توجد مدرسة بهذا الرقم — يحتاج مراجعة
          if (!dryRun) {
            await base44.asServiceRole.entities.User.update(u.id, { link_status: 'needs_review' });
          }
          results.needs_review++;
          continue;
        }

        if (school.principal_id) {
          // توجد مدرسة بمدير مرتبط — اعتماد الربط
          if (!dryRun) {
            await base44.asServiceRole.entities.User.update(u.id, {
              school_id: school.id,
              link_status: 'approved',
              school_name: school.school_name || u.school_name || '',
              education_admin: school.education_admin || u.education_admin || '',
              principal_name: school.principal_name || '',
            });
          }
          results.linked++;
        } else {
          // المدرسة موجودة لكن بدون مدير — بانتظار الموافقة (في الواقع بانتظار ربط مدير)
          if (!dryRun) {
            await base44.asServiceRole.entities.User.update(u.id, {
              school_id: school.id,
              link_status: 'pending',
            });
          }
          results.pending++;
        }
      } catch (e) {
        results.errors.push({ user_id: u.id, error: e.message });
      }
    }

    return Response.json({
      status: 'success',
      dry_run: dryRun,
      message: dryRun
        ? `معاينة: ${results.processed} مستخدم، ${results.linked} مرتبط، ${results.pending} بانتظار، ${results.independent} مستقل، ${results.needs_review} يحتاج مراجعة، ${results.schools_created} مدرسة جديدة`
        : `تم تحديث ${results.processed} مستخدم: ${results.linked} مرتبط، ${results.pending} بانتظار، ${results.independent} مستقل، ${results.needs_review} يحتاج مراجعة، ${results.schools_created} مدرسة جديدة`,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'فشل التحديث' }, { status: 500 });
  }
});