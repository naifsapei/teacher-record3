import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AGE_GROUPS, calculateVarkResult, getStyleMeta, getVarkQuestions, VARK_STYLE_TYPES } from "@/utils/varkData";

const STORAGE_KEY = "vark_forms_v1";
const RESPONSE_STORAGE_KEY = "vark_responses_v1";

const styleCards = [
  { styleType: VARK_STYLE_TYPES.visual, emoji: "👁️", label: "بصري", description: "يتعلم بشكل أفضل بالصور والرسوم." },
  { styleType: VARK_STYLE_TYPES.auditory, emoji: "👂", label: "سمعي", description: "يتعلم بشكل أفضل بالاستماع والتحدث." },
  { styleType: VARK_STYLE_TYPES.readingWriting, emoji: "📖", label: "قرائي/كتابي", description: "يتعلم بشكل أفضل بالقراءة والكتابة." },
  { styleType: VARK_STYLE_TYPES.kinesthetic, emoji: "✋", label: "حركي", description: "يتعلم بشكل أفضل بالتجربة والحركة." },
];

const createEmptyAnswers = (questions) => questions.map(() => "");

export default function VarkLearning() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [started, setStarted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [answers, setAnswers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const forms = JSON.parse(raw);
    const match = forms.find((item) => item.shareToken === token || item.id === token || item.shareToken === searchParams.get("token"));
    if (match) {
      setForm(match);
      setAnswers(createEmptyAnswers(getVarkQuestions(match.ageGroup)));
    }
  }, [searchParams, token]);

  const questions = useMemo(() => form ? getVarkQuestions(form.ageGroup) : [], [form]);

  const handleAnswer = (value) => {
    const next = [...answers];
    next[currentIndex] = value;
    setAnswers(next);
  };

  const handleSubmit = () => {
    if (!studentName.trim()) {
      toast.error("يرجى إدخال اسمك الكامل أولاً");
      return;
    }
    if (answers.some((item) => !item)) {
      toast.error("يرجى الإجابة عن جميع الأسئلة قبل الإرسال");
      return;
    }
    const selectedAnswers = questions.map((question, index) => {
      const selectedOption = question.options.find((option) => option.label === answers[index]);
      return selectedOption || question.options[0];
    });
    const evaluation = calculateVarkResult(selectedAnswers);
    const payload = {
      formId: form.id,
      studentName: studentName.trim(),
      className: form.className,
      createdAt: new Date().toISOString(),
      ...evaluation,
      percentages: evaluation.percentages,
    };
    const previous = JSON.parse(localStorage.getItem(RESPONSE_STORAGE_KEY) || "[]");
    localStorage.setItem(RESPONSE_STORAGE_KEY, JSON.stringify([...previous, payload]));
    setResult(payload);
    setSubmitted(true);
    toast.success("تم إرسال إجاباتك بنجاح");
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  if (!form) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50 p-4" dir="rtl">
        <Card className="mx-auto max-w-2xl rounded-3xl border-0 shadow-xl">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold text-primary">هذا الاستبيان غير متاح حاليًا</h1>
            <p className="mt-3 text-muted-foreground">لم يتم العثور على نموذج نشط أو الرابط غير صحيح.</p>
            <Button className="mt-6" onClick={() => navigate("/login")}>العودة</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-blue-50 p-4" dir="rtl">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="rounded-[28px] bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">اكتشف نمط تعلمك</h1>
              <p className="mt-1 text-sm text-white/85">{form.title}</p>
            </div>
            <div className="rounded-full bg-white/15 px-4 py-2 text-sm">{form.className}</div>
          </div>
        </div>

        {!submitted ? (
          <>
            {!started ? (
              <Card className="rounded-[24px] border-0 shadow-lg">
                <CardContent className="space-y-4 p-6">
                  <div className="rounded-2xl bg-gradient-to-r from-violet-50 to-blue-50 p-4">
                    <h2 className="text-xl font-bold text-primary">مرحبًا!</h2>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">هذا الاستبيان يساعدك على اكتشاف أسلوب تعلمك المفضل. أجب بصدق عن 16 سؤالًا بسيطًا.</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {styleCards.map((item) => (
                      <div key={item.styleType} className="rounded-2xl border border-border bg-card p-4">
                        <div className="text-2xl">{item.emoji}</div>
                        <div className="mt-2 font-bold">{item.label}</div>
                        <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>اسمك الكامل</Label>
                    <Input value={studentName} onChange={(e) => setStudentName(e.target.value)} placeholder="أدخل اسمك هنا..." />
                  </div>
                  <Button className="w-full" onClick={() => setStarted(true)}>ابدأ الاستبيان</Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-[24px] border-0 shadow-lg">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">السؤال {currentIndex + 1} من {questions.length}</p>
                      <div className="mt-2 h-2 w-full rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <Badge variant="secondary">{form.ageGroup === "adults" ? "نموذج الكبار" : "نموذج الصغار"}</Badge>
                  </div>
                  <h3 className="text-lg font-bold leading-8">{currentQuestion.text}</h3>
                  <div className="grid gap-2">
                    {currentQuestion.options.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => handleAnswer(option.label)}
                        className={`rounded-2xl border p-3 text-right transition ${answers[currentIndex] === option.label ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <Button variant="outline" disabled={currentIndex === 0} onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}>السابق</Button>
                    {currentIndex < questions.length - 1 ? (
                      <Button onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}>التالي</Button>
                    ) : (
                      <Button onClick={handleSubmit}>إرسال الإجابات</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="rounded-[24px] border-0 shadow-lg">
            <CardContent className="space-y-4 p-6">
              <div className="rounded-2xl bg-gradient-to-r from-violet-50 to-blue-50 p-4">
                <h2 className="text-xl font-bold text-primary">تم إرسال إجاباتك بنجاح</h2>
                <p className="mt-2 text-sm text-muted-foreground">مرحبًا {result?.studentName}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="text-lg font-bold">النمط الرئيسي</h3>
                <p className="mt-2 text-xl text-primary">{result?.dominantStyle === "multiple" ? "متعدد الأنماط" : getStyleMeta(result?.dominantStyle)?.label || "—"}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(result?.percentages || {}).map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-border bg-card p-4">
                    <div className="font-bold">{getStyleMeta(key)?.label}</div>
                    <div className="text-sm text-muted-foreground">{value}%</div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="text-lg font-bold">شرح مختصر</h3>
                <p className="mt-2 text-sm text-muted-foreground">{result?.dominantStyle === "multiple" ? "أنت تتميز بمرونة في التعلم وتستفيد من أكثر من أسلوب." : getStyleMeta(result?.dominantStyle)?.description}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
