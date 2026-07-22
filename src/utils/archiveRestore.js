import { base44 } from "@/api/base44Client";

const strip = ({ id, created_date, updated_date, created_by_id, ...rest } = {}) => rest;
const normalizeText = (value) => String(value || "").trim().toLowerCase();
const findMatchingRecord = (records, predicate) => records.find(predicate) || null;

export async function restoreArchive(archive) {
  const data = JSON.parse(archive.data || "{}");
  const { classes = [], subjects = [], students = [], grades = [] } = data;

  const existingClasses = await base44.entities.Class.list();
  const existingSubjects = await base44.entities.Subject.list();
  const existingStudents = await base44.entities.Student.list();
  const existingGrades = await base44.entities.Grade.list();

  const classMap = new Map();
  for (const c of classes) {
    const match = findMatchingRecord(existingClasses, (item) => normalizeText(item.name) === normalizeText(c.name) && normalizeText(item.grade_level || "") === normalizeText(c.grade_level || ""));
    if (match) {
      classMap.set(c.id, match.id);
      continue;
    }
    const created = await base44.entities.Class.create(strip(c));
    classMap.set(c.id, created.id);
  }

  const subjectMap = new Map();
  for (const s of subjects) {
    const match = findMatchingRecord(existingSubjects, (item) => normalizeText(item.name) === normalizeText(s.name) && (item.class_id || "") === (classMap.get(s.class_id) || s.class_id));
    if (match) {
      subjectMap.set(s.id, match.id);
      continue;
    }
    const payload = strip(s);
    payload.class_id = classMap.get(s.class_id) || s.class_id;
    const created = await base44.entities.Subject.create(payload);
    subjectMap.set(s.id, created.id);
  }

  const studentMap = new Map();
  for (const st of students) {
    const match = findMatchingRecord(existingStudents, (item) => {
      const sameNumber = normalizeText(item.student_number || "") && normalizeText(item.student_number || "") === normalizeText(st.student_number || "");
      const sameName = normalizeText(item.name || "") === normalizeText(st.name || "");
      return sameNumber || (sameName && (item.class_id || "") === (classMap.get(st.class_id) || st.class_id));
    });
    if (match) {
      studentMap.set(st.id, match.id);
      continue;
    }
    const payload = strip(st);
    payload.class_id = classMap.get(st.class_id) || st.class_id;
    const created = await base44.entities.Student.create(payload);
    studentMap.set(st.id, created.id);
  }

  const gradePayloads = grades
    .map((g) => {
      const payload = strip(g);
      const studentId = studentMap.get(g.student_id) || g.student_id;
      const subjectId = subjectMap.get(g.subject_id) || g.subject_id;
      const match = findMatchingRecord(existingGrades, (item) => (item.student_id || "") === (studentId || "") && (item.subject_id || "") === (subjectId || "") && normalizeText(item.semester || "") === normalizeText(g.semester || ""));
      if (match) return null;
      payload.student_id = studentId;
      payload.subject_id = subjectId;
      return payload;
    })
    .filter(Boolean)
    .filter((g) => g.student_id && g.subject_id);

  if (gradePayloads.length) {
    await base44.entities.Grade.bulkCreate(gradePayloads);
  }

  return {
    classes: classes.length,
    subjects: subjects.length,
    students: students.length,
    grades: gradePayloads.length,
  };
}

export async function purgeScope({ scope, classId }) {
  const students = await base44.entities.Student.list();
  const scopedStudents = scope === "class" ? students.filter((s) => s.class_id === classId) : students;
  const studentIdSet = new Set(scopedStudents.map((s) => s.id));
  const studentIds = [...studentIdSet];

  if (studentIds.length) {
    const [grades, attendance, tracking, achievements, notes, referrals] = await Promise.all([
      base44.entities.Grade.list(),
      base44.entities.Attendance.list(),
      base44.entities.TrackingRecord.list(),
      base44.entities.Achievement.list(),
      base44.entities.StudentNote.list(),
      base44.entities.StudentReferral.list(),
    ]);
    const idsOf = (list) => list.filter((x) => studentIdSet.has(x.student_id)).map((x) => x.id);
    await Promise.all([
      base44.entities.Grade.deleteMany({ id: { $in: idsOf(grades) } }),
      base44.entities.Attendance.deleteMany({ id: { $in: idsOf(attendance) } }),
      base44.entities.TrackingRecord.deleteMany({ id: { $in: idsOf(tracking) } }),
      base44.entities.Achievement.deleteMany({ id: { $in: idsOf(achievements) } }),
      base44.entities.StudentNote.deleteMany({ id: { $in: idsOf(notes) } }),
      base44.entities.StudentReferral.deleteMany({ id: { $in: idsOf(referrals) } }),
    ]);
    await base44.entities.Student.deleteMany({ id: { $in: studentIds } });
  }

  return { students: studentIds.length };
}

export function archiveCounts(archive) {
  try {
    const d = JSON.parse(archive.data || "{}");
    return {
      students: (d.students || []).length,
      subjects: (d.subjects || []).length,
      classes: (d.classes || []).length,
      grades: (d.grades || []).length,
    };
  } catch {
    return { students: 0, subjects: 0, classes: 0, grades: 0 };
  }
}