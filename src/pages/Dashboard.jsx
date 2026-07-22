import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { calcPct } from "@/lib/gradeCalc";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, GraduationCap, ClipboardList, CalendarCheck, TrendingUp } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import AttendanceAlerts from "@/components/dashboard/AttendanceAlerts";
import TeacherDailySchedule from "@/components/dashboard/TeacherDailySchedule";
import SubscriptionBadge from "@/components/dashboard/SubscriptionBadge";
import QuickActions from "@/components/dashboard/QuickActions";
import ContactIcons from "@/components/shared/ContactIcons";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(168,70%,38%)", "hsl(200,70%,50%)", "hsl(36,95%,55%)", "hsl(280,60%,55%)", "hsl(0,72%,51%)"];

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      <div className={`absolute top-0 left-0 w-1.5 h-full ${color}`} />
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`h-12 w-12 rounded-xl ${color} bg-opacity-10 flex items-center justify-center`}>
          <Icon className="h-6 w-6 text-[hsl(var(--card))]" />
        </div>
        <div>
          <p className="text-base text-[hsl(var(--foreground))]">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
      </CardContent>
    </Card>);

}

export default function Dashboard() {
  const { refreshUser } = useAuth();
  useEffect(() => {refreshUser();}, [refreshUser]);

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: () => base44.entities.Class.list()
  });
  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: () => base44.entities.Student.list()
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects"],
    queryFn: () => base44.entities.Subject.list()
  });
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers"],
    queryFn: () => base44.entities.Teacher.list()
  });
  const { data: grades = [] } = useQuery({
    queryKey: ["grades"],
    queryFn: () => base44.entities.Grade.list()
  });

  const classDistribution = classes.map((cls) => ({
    name: cls.name,
    value: students.filter((s) => s.class_id === cls.id).length
  }));

  const gradeStats = subjects.map((sub) => {
    const subGrades = grades.filter((g) => g.subject_id === sub.id);
    const pcts = subGrades.map((g) => calcPct(g, sub)).filter((p) => p !== null);
    const avg = pcts.length > 0 ? Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length) : 0;
    return { name: sub.name, المتوسط: avg };
  }).filter((s) => s.المتوسط > 0);

  return (
    <div>
      <PageHeader title="لوحة المعلومات" description="نظرة عامة على سجل الدرجات" />

      <SubscriptionBadge />

      <div className="mb-6">
        <QuickActions />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-2.5 mb-6">
        <span className="text-sm font-medium text-muted-foreground">تواصل معنا</span>
        <ContactIcons compact />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="الصفوف" value={classes.length} icon={BookOpen} color="bg-primary" />
        <StatCard title="الطلاب" value={students.length} icon={Users} color="bg-chart-2" />
        <StatCard title="المواد" value={subjects.length} icon={GraduationCap} color="bg-accent" />
        <StatCard title="المعلمون" value={teachers.length} icon={ClipboardList} color="bg-chart-4" />
      </div>

      <div className="mb-8">
        <AttendanceAlerts students={students} classes={classes} />
      </div>

      <div className="mb-8">
        <TeacherDailySchedule />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {gradeStats.length > 0 &&
        <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                متوسط الدرجات حسب المادة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={gradeStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="المتوسط" fill="hsl(168,70%,38%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        }

        {classDistribution.length > 0 &&
        <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                توزيع الطلاب على الصفوف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                  data={classDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={(props) => {
                    const { name, value, x, y } = props;
                    return <text x={x} y={y} fill="hsl(var(--muted-foreground))" fontSize={11} textAnchor="middle" dy={4}>{`${name}: ${value}`}</text>;
                  }}>
                  
                    {classDistribution.map((_, i) =>
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  )}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        }
      </div>
    </div>);

}