import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { ExternalLink, BookOpen, FileText, School, ClipboardList, Compass } from "lucide-react";

const LINKS = [
  { title: "نظام نور", href: "https://noor.moe.gov.sa", icon: School, external: true },
  { title: "منصة مدرستي", href: "https://sites.moe.gov.sa", icon: BookOpen, external: true },
  { title: "نظام فارس", href: "https://sshr.moe.gov.sa", icon: ClipboardList, external: true },
  { title: "تطبيق تحضيري (Android)", href: "https://play.google.com/store/apps/details?id=io.tahdidrrdidiappfor.apptahdiriforteacher", icon: Compass, external: true },
  { title: "تطبيق تحضيري (iOS)", href: "https://apps.apple.com/sa/app/%D8%AA%D8%AD%D8%B6%D9%8A%D8%B1%D9%8A/id1645718475?l=ar", icon: Compass, external: true },
  { title: "تطبيق حضوري (Android)", href: "https://play.google.com/store/apps/details?id=com.t2.AvailoHader", icon: Compass, external: true },
  { title: "تطبيق حضوري (iOS)", href: "https://apps.apple.com/sa/app/hudury-%D8%AD%D8%B6%D9%88%D8%B1%D9%8A/id1517475719?l=ar", icon: Compass, external: true },
  { title: "الاختبارات وأوراق العمل", href: "/teacher-tests", icon: FileText, external: false },
  { title: "التقارير المدرسية", href: "/teacher-reports", icon: FileText, external: false },
];

export default function TeacherNeeds() {
  const groups = useMemo(() => [
    { title: "الخدمات الرسمية", items: LINKS.slice(0, 3) },
    { title: "التطبيقات", items: LINKS.slice(3, 7) },
    { title: "الأدوات", items: LINKS.slice(7) },
  ], []);

  return (
    <div dir="rtl">
      <PageHeader title="احتياجات المعلم" description="مكتبة خدمات ومصادر معلمية منظمة في مكان واحد" />
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map((section) => (
          <Card key={section.title} className="border-border/60">
            <CardContent className="p-4">
              <h3 className="font-bold text-primary mb-3">{section.title}</h3>
              <div className="grid gap-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const content = (
                    <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-primary/5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="font-medium">{item.title}</span>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  );
                  return item.external ? (
                    <a key={item.title} href={item.href} target="_blank" rel="noreferrer" className="block">{content}</a>
                  ) : (
                    <Link key={item.title} to={item.href} className="block">{content}</Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
