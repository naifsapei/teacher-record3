import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import { getStyleMeta, VARK_STYLE_TYPES } from "@/utils/varkData";

const STORAGE_KEY = "vark_forms_v1";
const RESPONSE_STORAGE_KEY = "vark_responses_v1";

export default function VarkStats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);

  useEffect(() => {
    const rawForms = localStorage.getItem(STORAGE_KEY);
    const rawResponses = localStorage.getItem(RESPONSE_STORAGE_KEY);
    if (rawForms) {
      const forms = JSON.parse(rawForms);
      setForm(forms.find((item) => item.id === id));
    }
    if (rawResponses) setResponses(JSON.parse(rawResponses));
  }, [id]);

  const formResponses = useMemo(() => responses.filter((item) => item.formId === id), [id, responses]);

  if (!form) return null;

  return (
    <div dir="rtl">
      <PageHeader title="الإحصائيات" description={`نتائج ${form.title}`} actions={[<Button key="back" variant="outline" onClick={() => navigate(-1)}>العودة</Button>]} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-[24px] border-0 shadow-sm">
          <CardHeader><CardTitle>إجمالي المشاركين</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-bold text-primary">{formResponses.length}</div></CardContent>
        </Card>
        <Card className="rounded-[24px] border-0 shadow-sm">
          <CardHeader><CardTitle>بصري</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-bold text-primary">{formResponses.filter((item) => item.dominantStyle === VARK_STYLE_TYPES.visual).length}</div></CardContent>
        </Card>
        <Card className="rounded-[24px] border-0 shadow-sm">
          <CardHeader><CardTitle>سمعي</CardTitle></CardHeader>
          <CardContent><div className="text-4xl font-bold text-primary">{formResponses.filter((item) => item.dominantStyle === VARK_STYLE_TYPES.auditory).length}</div></CardContent>
        </Card>
      </div>
      <Card className="mt-4 rounded-[24px] border-0 shadow-sm">
        <CardHeader><CardTitle>قائمة الطلاب</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {formResponses.map((item) => (
            <div key={item.studentName + item.createdAt} className="flex flex-wrap items-center justify-between rounded-2xl border border-border bg-card p-3">
              <div>
                <div className="font-bold">{item.studentName}</div>
                <div className="text-sm text-muted-foreground">{item.className}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge>{item.dominantStyle === "multiple" ? "متعدد الأنماط" : getStyleMeta(item.dominantStyle)?.label}</Badge>
                <span className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString("ar-SA")}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
