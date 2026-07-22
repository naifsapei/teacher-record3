import { useMemo } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSubscriptionStatus, APP_ROLE_LABELS } from "@/lib/permissions";

const ROLE_KEYS = ["teacher", "principal", "student_counselor", "student_affairs", "teacher_affairs"];
const STATUS_COLORS = { active: "#10b981", admin: "#6366f1", expired: "#f59e0b", pending: "#fbbf24", rejected: "#ef4444", free: "#94a3b8" };
const STATUS_LABELS = { active: "مشترك", admin: "مدير النظام", expired: "منتهي", pending: "بانتظار", rejected: "مرفوض", free: "مجاني" };
const BAR_COLOR = "#6366f1";

const ChartCard = ({ title, children }) => (
  <Card>
    <CardHeader className="py-3"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
    <CardContent className="pt-0">
      <div className="h-56">{children}</div>
    </CardContent>
  </Card>
);

export default function AdminCharts({ users, schools }) {
  const roleData = useMemo(
    () => ROLE_KEYS.map((k) => ({ name: APP_ROLE_LABELS[k], value: users.filter((u) => u.role !== "admin" && u.app_role === k).length })),
    [users]
  );
  const statusData = useMemo(() => {
    const m = {};
    users.forEach((u) => { const s = getSubscriptionStatus(u); m[s] = (m[s] || 0) + 1; });
    return Object.entries(m).map(([k, v]) => ({ name: STATUS_LABELS[k] || k, value: v, key: k }));
  }, [users]);
  const schoolData = useMemo(
    () => schools.map((s) => ({ name: (s.school_name || s.ministry_number || "بدون").slice(0, 16), value: s.users.length })).sort((a, b) => b.value - a.value).slice(0, 8),
    [schools]
  );
  const timeData = useMemo(() => {
    const m = {};
    users.forEach((u) => {
      if (!u.created_date) return;
      const d = new Date(u.created_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      m[key] = (m[key] || 0) + 1;
    });
    return Object.entries(m).sort().map(([k, v]) => ({ name: k.slice(5), value: v }));
  }, [users]);

  if (!users.length) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ChartCard title="التوزيع حسب نوع المستخدم">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={roleData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="value" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="التوزيع حسب حالة الحساب">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={{ fontSize: 11 }}>
              {statusData.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key] || "#94a3b8"} />)}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="المستخدمون حسب المدرسة">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={schoolData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="تسجيل المستخدمين عبر الزمن">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}