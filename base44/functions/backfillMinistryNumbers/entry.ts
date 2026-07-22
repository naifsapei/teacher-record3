import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// الكيانات التي تحتاج ترحيل الرقم الوزاري
const ENTITIES = [
  "Student", "Class", "Subject", "Grade", "Attendance",
  "TrackingRecord", "Achievement", "StudentNote", "CalendarEvent",
  "LessonSchedule", "AcademicArchive", "Backup", "EvaluationItem",
  "StudentReferral", "ReferralResponse", "Note", "NoteReply"
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const sr = base44.asServiceRole;

    // بناء خريطة created_by_id -> الرقم الوزاري
    // من سجلات المعلمين (التي تحوي ministry_number) ثم من بيانات المستخدمين
    const mnByCreator = {};
    try {
      const teachers = await sr.entities.Teacher.list('-created_date', 1000);
      for (const t of teachers) {
        if (t && t.ministry_number && t.created_by_id) mnByCreator[t.created_by_id] = t.ministry_number;
      }
    } catch (_e) {}
    try {
      const users = await sr.entities.User.list('-created_date', 1000);
      for (const u of users) {
        if (u && u.ministry_number && u.id && !mnByCreator[u.id]) mnByCreator[u.id] = u.ministry_number;
      }
    } catch (_e) {}

    const report = {};
    for (const name of ENTITIES) {
      let items = [];
      try {
        items = await sr.entities[name].list('-created_date', 1000);
      } catch (e) {
        report[name] = { error: e.message };
        continue;
      }
      const need = items.filter(
        (i) => !i.ministry_number && i.created_by_id && mnByCreator[i.created_by_id]
      );
      let updated = 0;
      for (let i = 0; i < need.length; i += 500) {
        const chunk = need.slice(i, i + 500).map((r) => ({
          id: r.id,
          ministry_number: mnByCreator[r.created_by_id],
        }));
        try {
          await sr.entities[name].bulkUpdate(chunk);
          updated += chunk.length;
        } catch (e) {
          report[name] = { error: e.message };
          break;
        }
      }
      if (!report[name]) {
        report[name] = { scanned: items.length, updated };
      }
    }

    return Response.json({ report });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});