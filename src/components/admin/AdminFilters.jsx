import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function AdminFilters({ filters, setFilters, schools }) {
  const update = (k, v) => setFilters((f) => ({ ...f, [k]: v }));
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
      <Select value={filters.school} onValueChange={(v) => update("school", v)}>
        <SelectTrigger><SelectValue placeholder="المدرسة" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع المدارس</SelectItem>
          {schools.map((s) => {
            const val = s.ministry_number || `__${s.principal.id}`;
            return <SelectItem key={val} value={val}>{s.school_name || s.ministry_number || "بدون اسم"}</SelectItem>;
          })}
        </SelectContent>
      </Select>

      <Select value={filters.role} onValueChange={(v) => update("role", v)}>
        <SelectTrigger><SelectValue placeholder="نوع المستخدم" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الأنواع</SelectItem>
          <SelectItem value="admin">مدير النظام</SelectItem>
          <SelectItem value="principal">مدير مدرسة</SelectItem>
          <SelectItem value="teacher">معلم</SelectItem>
          <SelectItem value="student_counselor">موجه طلابي</SelectItem>
          <SelectItem value="student_affairs">وكيل شؤون الطلاب</SelectItem>
          <SelectItem value="teacher_affairs">وكيل شؤون المعلمين</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => update("status", v)}>
        <SelectTrigger><SelectValue placeholder="حالة الحساب" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الحالات</SelectItem>
          <SelectItem value="active">نشط</SelectItem>
          <SelectItem value="inactive">غير نشط</SelectItem>
          <SelectItem value="pending">بانتظار التفعيل</SelectItem>
          <SelectItem value="expired">منتهي</SelectItem>
          <SelectItem value="free">مجاني</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.plan} onValueChange={(v) => update("plan", v)}>
        <SelectTrigger><SelectValue placeholder="الاشتراك" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">جميع الباقات</SelectItem>
          <SelectItem value="free">مجاني</SelectItem>
          <SelectItem value="semester">فصل دراسي</SelectItem>
          <SelectItem value="year">عام دراسي</SelectItem>
          <SelectItem value="admin">مدير النظام</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.date} onValueChange={(v) => update("date", v)}>
        <SelectTrigger><SelectValue placeholder="الفترة" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">كل الفترات</SelectItem>
          <SelectItem value="7d">آخر ٧ أيام</SelectItem>
          <SelectItem value="30d">آخر ٣٠ يوم</SelectItem>
          <SelectItem value="90d">آخر ٩٠ يوم</SelectItem>
          <SelectItem value="year">آخر سنة</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}