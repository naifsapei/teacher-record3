import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "app_language";

export const TRANSLATIONS = {
  settingsTitle:    { ar: "الإعدادات",                 en: "Settings" },
  settingsDesc:     { ar: "تخصيص النظام وإدارة الحساب", en: "Customize the system and manage your account" },

  sec_preferences:  { ar: "التفضيلات",          en: "Preferences" },
  sec_school:       { ar: "بيانات المدرسة",     en: "School Data" },
  sec_academic:     { ar: "الإدارة الأكاديمية", en: "Academic Management" },
  sec_subscription: { ar: "الاشتراك",           en: "Subscription" },
  sec_general:      { ar: "عام",                en: "General" },
  sec_admin:        { ar: "إدارة النظام",       en: "System Administration" },
  sec_account:      { ar: "الحساب",             en: "Account" },

  lang_label:       { ar: "اللغة",              en: "Language" },
  lang_desc:        { ar: "لغة واجهة النظام",   en: "System interface language" },
  lang_ar:          { ar: "العربية",            en: "Arabic" },
  lang_en:          { ar: "English",            en: "English" },

  dark_label:       { ar: "السمة الداكنة",              en: "Dark Mode" },
  dark_desc:        { ar: "تبديل بين الفاتح والداكن",   en: "Switch between light and dark" },
  hijri_label:      { ar: "التاريخ الهجري",            en: "Hijri Date" },
  hijri_desc:       { ar: "عرض التواريخ بالتقويم الهجري", en: "Display dates in Hijri calendar" },

  edu_label:        { ar: "اسم إدارة التعليم",          en: "Education Department" },
  edu_desc:         { ar: "يظهر في ترويسة التقارير والسجلات", en: "Shown in report headers and records" },
  edu_ph:           { ar: "إدارة التعليم بـ...",        en: "Education Dept. of..." },
  school_label:     { ar: "اسم المدرسة",                en: "School Name" },
  school_ph:        { ar: "اسم المدرسة",                en: "School name" },
  principal_label:  { ar: "اسم مدير المدرسة",           en: "Principal Name" },
  principal_desc:   { ar: "يظهر في خانة الاعتماد أسفل السجلات", en: "Shown in the approval footer of records" },
  principal_ph:     { ar: "اسم مدير المدرسة",           en: "Principal name" },
  saveSchool:       { ar: "حفظ بيانات المدرسة",         en: "Save school data" },
  saving:           { ar: "جارٍ الحفظ...",              en: "Saving..." },

  students_label:    { ar: "الطلاب",                en: "Students" },
  students_desc:     { ar: "إضافة وتعديل بيانات الطلاب", en: "Add and edit student data" },
  subjects_label:    { ar: "المواد",                en: "Subjects" },
  subjects_desc:     { ar: "إدارة المواد وتوزيع الدرجات", en: "Manage subjects and grade distribution" },
  teachers_label:    { ar: "المعلمون",              en: "Teachers" },
  teachers_desc:     { ar: "إدارة بيانات المعلمين",  en: "Manage teacher data" },
  yearWork_label:    { ar: "تعديل أعمال السنة",     en: "Edit Year Work" },
  yearWork_desc:     { ar: "ضبط توزيع درجات السنة لكل مادة", en: "Adjust yearly grade distribution per subject" },
  evalItems_label:   { ar: "تعديل عناصر التقييم",   en: "Edit Evaluation Items" },
  evalItems_desc:    { ar: "إضافة وتفعيل عناصر التقييم السريع", en: "Add and enable quick evaluation items" },
  archived_label:    { ar: "الصفوف المؤرشفة",       en: "Archived Classes" },
  archived_desc:     { ar: "إدارة الصفوف والمؤرشفة", en: "Manage classes and archives" },
  images_label:      { ar: "أنماط صور الطلاب",      en: "Student Image Styles" },
  images_desc:       { ar: "شكل عرض صور ملفات الطلاب", en: "Student profile image display style" },

  sub_label:         { ar: "الاشتراك والمدفوعات",   en: "Subscription & Payments" },
  sub_desc:          { ar: "خطط الاشتراك وطرق الدفع (35/60 ريال)", en: "Subscription plans and payment methods (35/60 SAR)" },

  friend_label:      { ar: "أخبر صديق",             en: "Tell a Friend" },
  friend_desc:       { ar: "شارك التطبيق مع أصدقائك", en: "Share the app with your friends" },
  privacy_label:     { ar: "سياسة الخصوصية",       en: "Privacy Policy" },
  privacy_desc:      { ar: "اقرأ سياسة الخصوصية الخاصة بنا", en: "Read our privacy policy" },
  terms_label:       { ar: "الشروط والأحكام",      en: "Terms & Conditions" },
  terms_desc:        { ar: "اقرأ شروط وأحكام الاستخدام", en: "Read the terms of use" },

  admin_label:       { ar: "لوحة مدير النظام",     en: "Admin Panel" },
  admin_desc:        { ar: "إدارة المشتركين والاشتراكات والنظام بالكامل", en: "Manage subscribers, subscriptions and the whole system" },
  userSubs_label:    { ar: "تفعيل اشتراكات المستخدمين", en: "User Subscriptions" },
  userSubs_desc:     { ar: "تحكم في تفعيل اشتراك الحسابات وتحديد نوع الاشتراك", en: "Control account subscription activation and type" },

  delete_label:      { ar: "حذف البيانات",         en: "Delete Data" },
  delete_desc:       { ar: "حذف جميع بيانات الحساب نهائياً", en: "Permanently delete all account data" },
  logout_label:      { ar: "تسجيل الخروج",         en: "Log Out" },
  logout_desc:       { ar: "الخروج من الحساب الحالي", en: "Sign out of the current account" },

  schoolRequired:    { ar: "اسم المدرسة مطلوب",    en: "School name is required" },
  schoolSaved:       { ar: "تم حفظ بيانات المدرسة ✅", en: "School data saved ✅" },
  schoolError:       { ar: "تعذر حفظ البيانات",    en: "Could not save data" },
  deleteRequest:     { ar: "تم إرسال طلب حذف البيانات", en: "Data deletion request submitted" },
  comingSoon:        { ar: "قريباً...",            en: "Coming soon..." },
  shareCopied:       { ar: "تم نسخ الرابط ✅",     en: "Link copied ✅" },
  shareText:         { ar: "جرّب تطبيق سجل المعلم لإدارة الصفوف ومتابعة الطلاب والدرجات!", en: "Try the Teacher's Log app to manage classes, students and grades!" },
  shareError:        { ar: "تعذر المشاركة",        en: "Could not share" },

  delDialogTitle:    { ar: "تأكيد حذف البيانات",   en: "Confirm Data Deletion" },
  delDialogDesc:     { ar: "هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بيانات حسابك نهائياً.", en: "This action cannot be undone. All your account data will be permanently deleted." },
  cancel:            { ar: "إلغاء",                en: "Cancel" },
  confirmDelete:     { ar: "نعم، احذف البيانات",   en: "Yes, delete data" },
  deleteSuccess:     { ar: "تم حذف الحساب بنجاح",     en: "Account deleted successfully" },
  deleteError:       { ar: "تعذر حذف الحساب، حاول مجدداً", en: "Could not delete account, try again" },
  deleting:          { ar: "جارٍ الحذف...",           en: "Deleting..." },
};

export function useLanguage() {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || "ar"; } catch { return "ar"; }
  });

  const dir = lang === "en" ? "ltr" : "rtl";

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    }
  }, [lang, dir]);

  const setLang = useCallback((l) => setLangState(l), []);
  const t = useCallback((key) => (TRANSLATIONS[key]?.[lang] ?? key), [lang]);

  return { lang, setLang, dir, t };
}