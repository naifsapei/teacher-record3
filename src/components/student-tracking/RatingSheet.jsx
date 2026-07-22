import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, Trophy, X, Star, CalendarCheck, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

// فئات التقييم مع الحقل المرتبط في سجل الدرجات
const RATING_CATEGORIES = [
  {
    title: "المشاركة والمشاركة الصفية",
    gradeFields: ["participation", "class_activity"], // توزّع على الحقلين بالتساوي
    options: [
      { label: "صح",                  value:  1,    emoji: "✅", color: "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" },
      { label: "خطأ",                 value: -1,    emoji: "❌", color: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100" },
      { label: "أتقن",                value:  2,    emoji: "🌟", color: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" },
      { label: "لم يتقن",             value: -2,    emoji: "😔", color: "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100" },
      { label: "مميز",                value:  2,    emoji: "💎", color: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100" },
      { label: "مؤدب",                value:  1,    emoji: "😊", color: "bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100" },
      { label: "التحدث أثناء الدرس",  value: -1,    emoji: "🗣️", color: "bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100" },
      { label: "النوم في الحصة",       value: -0.5,  emoji: "😴", color: "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100" },
      { label: "مشاغب",               value: -2,    emoji: "😈", color: "bg-red-50 border-red-300 text-red-800 hover:bg-red-100" },
      { label: "لا مبالاة",           value: -1,    emoji: "😐", color: "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100" },
      { label: "استخدام الهاتف",      value: -0.5,  emoji: "📱", color: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100" },
    ],
  },
  {
    title: "الواجبات",
    gradeField: "homework",
    options: [
      { label: "واجب المنصة",   value:  1,    emoji: "💻", color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" },
      { label: "حل الواجب",     value:  1,    emoji: "📝", color: "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100" },
      { label: "لم يحل الواجب", value: -0.5,  emoji: "📭", color: "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100" },
    ],
  },
  {
    title: "المشاريع والبحوث",
    gradeField: "research",
    options: [
      { label: "البحوث",       value: 10,  emoji: "🔬", color: "bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100" },
      { label: "إنجاز مشروع",  value:  2,  emoji: "🏆", color: "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100" },
    ],
  },
];

const NAV_ITEMS = [
  { label: "الرئيسية", path: "/",          icon: Home },
  { label: "الصفوف",   path: "/classes",   icon: BookOpen },
  { label: "ملف الإنجاز", path: "/analytics", icon: Trophy },
  { label: "الحضور",   path: "/attendance", icon: CalendarCheck },
  { label: "الطلاب",   path: "/students",  icon: User },
];

// تحديث درجة الطالب في حقل معين وفق الحد الأقصى للمادة
async function updateGradeField(studentId, subjectId, field, delta, subject) {
  if (!subjectId || !field || delta === 0) return;

  const existing = await base44.entities.Grade.filter({ student_id: studentId, subject_id: subjectId });
  const maxKey = `${field}_max`;
  const maxVal = subject?.[maxKey] ?? 10;

  if (existing.length > 0) {
    const grade = existing[0];
    const current = grade[field] || 0;
    const newVal = Math.max(0, Math.min(maxVal, current + delta));
    await base44.entities.Grade.update(grade.id, { [field]: newVal });
  } else {
    const initVal = Math.max(0, Math.min(maxVal, delta));
    await base44.entities.Grade.create({ student_id: studentId, subject_id: subjectId, [field]: initVal });
  }
}

export default function RatingSheet({ student, subject, onClose }) {
  const location = useLocation();
  const [selectedOption, setSelectedOption] = useState(null);
  const [totalAdded, setTotalAdded] = useState(0);

  const handleRate = async (option, category) => {
    setSelectedOption(option.label);
    setTotalAdded((prev) => prev + option.value);

    // حفظ سجل المتابعة
    base44.entities.TrackingRecord.create({
      student_id: student.id,
      class_id: student.class_id,
      date: format(new Date(), "yyyy-MM-dd"),
      action_label: option.label,
      action_emoji: option.emoji,
      points: option.value,
    });

    // تحديث درجة الطالب في سجل الدرجات
    if (subject?.id) {
      if (category.gradeFields) {
        // توزيع النقاط على حقلين
        const half = option.value / 2;
        for (const field of category.gradeFields) {
          updateGradeField(student.id, subject.id, field, half, subject);
        }
      } else if (category.gradeField) {
        updateGradeField(student.id, subject.id, category.gradeField, option.value, subject);
      }
    }

    toast.success(`${option.emoji} ${option.label}: ${option.value > 0 ? "+" : ""}${option.value} نقطة`, { duration: 1500 });
    setTimeout(() => setSelectedOption(null), 600);
  };

  if (!student) return null;

  const initials = student.name?.split(" ").slice(0, 2).map((n) => n[0]).join("") || "ط";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-end" dir="rtl">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh]"
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="h-4 w-4 text-gray-600" />
          </button>

          {/* Header */}
          <div className="flex flex-col items-center pt-2 pb-4 px-6 border-b border-gray-100">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">متابعة درجات الطالب</p>
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-3">
              {initials}
            </div>
            <h2 className="text-xl font-bold text-gray-800">{student.name}</h2>
            {subject && (
              <p className="text-xs text-primary font-medium mt-1 bg-primary/10 px-3 py-0.5 rounded-full">📚 {subject.name}</p>
            )}
            {student.student_number && (
              <p className="text-sm text-muted-foreground mt-0.5">رقم الطالب: {student.student_number}</p>
            )}
            {totalAdded !== 0 && (
              <div className={`mt-2 flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full ${totalAdded > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                <Star className="h-3.5 w-3.5" />
                {totalAdded > 0 ? "+" : ""}{totalAdded} نقطة هذه الجلسة
              </div>
            )}
          </div>

          {/* Rating Grid by Category */}
          <div className="overflow-y-auto flex-1 px-4 py-4 space-y-5">
            {RATING_CATEGORIES.map((category) => (
              <div key={category.title}>
                <p className="text-xs font-bold text-muted-foreground mb-2 border-b pb-1">{category.title}</p>
                <div className="grid grid-cols-2 gap-2">
                  {category.options.map((option) => (
                    <motion.button
                      key={option.label}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleRate(option, category)}
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border-2 transition-all text-right ${option.color} ${selectedOption === option.label ? "scale-95 opacity-70" : ""}`}
                    >
                      <span className="text-xl flex-shrink-0">{option.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-tight truncate">{option.label}</p>
                        <p className={`text-xs font-bold mt-0.5 ${option.value > 0 ? "text-emerald-600" : option.value < 0 ? "text-red-500" : "text-gray-400"}`}>
                          {option.value > 0 ? "+" : ""}{option.value}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Navigation */}
          <div className="border-t border-gray-100 bg-white pb-safe">
            <nav className="flex">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${isActive ? "text-primary" : "text-gray-400 hover:text-gray-600"}`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                    {isActive && <div className="w-4 h-0.5 bg-primary rounded-full" />}
                  </Link>
                );
              })}
            </nav>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}