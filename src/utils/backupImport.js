import { base44 } from "@/api/base44Client";

const strip = ({ id, created_date, updated_date, created_by_id, ...rest } = {}) => rest;

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function findMatchingRecord(records, predicate) {
  return records.find(predicate) || null;
}

export async function importBackupData(payload = {}) {
  const classes = Array.isArray(payload.classes) ? payload.classes : [];
  const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];
  const students = Array.isArray(payload.students) ? payload.students : [];
  const grades = Array.isArray(payload.grades) ? payload.grades : [];
  const teachers = Array.isArray(payload.teachers) ? payload.teachers : [];
  const attendance = Array.isArray(payload.attendance) ? payload.attendance : [];

  const existingClasses = await base44.entities.Class.list();
  const existingSubjects = await base44.entities.Subject.list();
  const existingStudents = await base44.entities.Student.list();
  const existingGrades = await base44.entities.Grade.list();
  const existingTeachers = await base44.entities.Teacher.list();
  const existingAttendance = await base44.entities.Attendance.list();

  const createdClasses = [];
  const classMap = new Map();
  for (const item of classes) {
    const match = findMatchingRecord(existingClasses, (c) => normalizeText(c.name) === normalizeText(item.name) && normalizeText(c.grade_level || "") === normalizeText(item.grade_level || ""));
    if (match) {
      classMap.set(item.id, match.id);
      createdClasses.push(match);
      continue;
    }
    const created = await base44.entities.Class.create(strip(item));
    classMap.set(item.id, created.id);
    createdClasses.push(created);
  }

  const subjectMap = new Map();
  for (const item of subjects) {
    const match = findMatchingRecord(existingSubjects, (s) => normalizeText(s.name) === normalizeText(item.name) && (s.class_id || "") === (classMap.get(item.class_id) || item.class_id));
    if (match) {
      subjectMap.set(item.id, match.id);
      continue;
    }
    const payload = strip(item);
    payload.class_id = classMap.get(item.class_id) || item.class_id;
    const created = await base44.entities.Subject.create(payload);
    subjectMap.set(item.id, created.id);
  }

  const studentMap = new Map();
  for (const item of students) {
    const match = findMatchingRecord(existingStudents, (s) => {
      const sameNumber = normalizeText(s.student_number || "") && normalizeText(s.student_number || "") === normalizeText(item.student_number || "");
      const sameName = normalizeText(s.name || "") === normalizeText(item.name || "");
      return sameNumber || (sameName && (s.class_id || "") === (classMap.get(item.class_id) || item.class_id));
    });
    if (match) {
      studentMap.set(item.id, match.id);
      continue;
    }
    const payload = strip(item);
    payload.class_id = classMap.get(item.class_id) || item.class_id;
    const created = await base44.entities.Student.create(payload);
    studentMap.set(item.id, created.id);
  }

  for (const item of teachers) {
    const match = findMatchingRecord(existingTeachers, (t) => normalizeText(t.email || "") === normalizeText(item.email || "") || normalizeText(t.phone || "") === normalizeText(item.phone || ""));
    if (match) continue;
    const payload = strip(item);
    await base44.entities.Teacher.create(payload);
  }

  for (const item of attendance) {
    const match = findMatchingRecord(existingAttendance, (a) => normalizeText(a.student_id || "") === normalizeText(item.student_id || "") && normalizeText(a.date || "") === normalizeText(item.date || ""));
    if (match) continue;
    const payload = strip(item);
    payload.student_id = studentMap.get(item.student_id) || item.student_id;
    await base44.entities.Attendance.create(payload);
  }

  for (const item of grades) {
    const match = findMatchingRecord(existingGrades, (g) => (g.student_id || "") === (studentMap.get(item.student_id) || item.student_id) && (g.subject_id || "") === (subjectMap.get(item.subject_id) || item.subject_id) && normalizeText(g.semester || "") === normalizeText(item.semester || ""));
    if (match) continue;
    const payload = strip(item);
    payload.student_id = studentMap.get(item.student_id) || item.student_id;
    payload.subject_id = subjectMap.get(item.subject_id) || item.subject_id;
    await base44.entities.Grade.create(payload);
  }

  return {
    classes: classes.length,
    subjects: subjects.length,
    students: students.length,
    grades: grades.length,
    teachers: teachers.length,
    attendance: attendance.length,
  };
}
