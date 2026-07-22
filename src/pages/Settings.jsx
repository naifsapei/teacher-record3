import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { resolveSchool } from "@/lib/permissions";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/shared/PageHeader";
import ContactIcons from "@/components/shared/ContactIcons";
import EvaluationItemsDialog from "@/components/settings/EvaluationItemsDialog";
import StudentImageStylesDialog from "@/components/settings/StudentImageStylesDialog";
import OnboardingStepsDialog from "@/components/onboarding/OnboardingStepsDialog";
import DisplayNameEditor from "@/components/settings/DisplayNameEditor";
import TitleSelector from "@/components/settings/TitleSelector";
import MinistryNumberEditor from "@/components/settings/MinistryNumberEditor";
import SpecializationEditor from "@/components/settings/SpecializationEditor";
import ChangePassword from "@/components/settings/ChangePassword";
import JoinSchoolSection from "@/components/settings/JoinSchoolSection";
import { canViewTeachers, isTeacher } from "@/lib/permissions";
import { genderTerm } from "@/lib/genderTerms";
import {
  Globe, Moon, Calendar, Star, BookOpen,
  GraduationCap, Image, Archive, Share2, Shield, FileText,
  Trash2, LogOut, ChevronLeft, Users, ClipboardList, Crown, Building2,
  Mail, MessageCircle, HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const SECTION_TITLE = "text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 mb-2 mt-6 first:mt-0";

function SettingRow({ icon: Icon, label, description, children, danger }) {
  return (
    <div className={`flex items-center justify-between py-4 px-1 ${danger ? "text-destructive" : ""}`}>
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? "bg-destructive/10" : "bg-muted"}`}>
          <Icon className={`h-4 w-4 ${danger ? "text-destructive" : "text-muted-foreground"}`} />
        </div>
        <div>
          <p className={`text-sm font-medium ${danger ? "text-destructive" : "text-foreground"}`}>{label}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function NavRow({ icon: Icon, label, description, onClick, danger, dir }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-between w-full py-4 px-1 rounded-xl hover:bg-muted/50 transition-colors ${dir === "ltr" ? "text-left" : "text-right"} ${danger ? "text-destructive" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? "bg-destructive/10" : "bg-muted"}`}>
          <Icon className={`h-4 w-4 ${danger ? "text-destructive" : "text-muted-foreground"}`} />
        </div>
        <div className={dir === "ltr" ? "text-left" : "text-right"}>
          <p className={`text-sm font-medium ${danger ? "text-destructive" : "text-foreground"}`}>{label}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <ChevronLeft className={`h-4 w-4 ${danger ? "text-destructive/60" : "text-muted-foreground"}`} />
    </button>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: schoolInfo } = useQuery({ queryKey: ["schoolInfo"], queryFn: () => base44.entities.SchoolInfo.list().then((r) => r[0] || null) });
  const [edu, setEdu] = useState("");
  const [school, setSchool] = useState("");
  const [principal, setPrincipal] = useState("");
  const [savingSchool, setSavingSchool] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const { lang, setLang, dir, t } = useLanguage();
  const gt = (key) => genderTerm(me, t(key));
  const [darkMode, toggleDarkMode] = useDarkMode();
  const [hijriDate, setHijriDate] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEvalDialog, setShowEvalDialog] = useState(false);
  const [showImageStyles, setShowImageStyles] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const src = resolveSchool(me, schoolInfo);
    setEdu(src.education_admin);
    setSchool(src.school_name);
    setPrincipal(src.principal_name);
    setContactEmail(schoolInfo?.contact_email || "administrator@teacher-record.com");
    setContactWhatsapp(schoolInfo?.contact_whatsapp || "");
  }, [schoolInfo, me]);

  const saveSchoolInfo = async () => {
    if (!school.trim()) { toast.error(t("schoolRequired")); return; }
    setSavingSchool(true);
    try {
      // حفظ بيانات المدرسة في ملف المشترك (مرتبطة ببيانات التسجيل وتنعكس في التقارير)
      await base44.auth.updateMe({ education_admin: edu, school_name: school, principal_name: principal });
      // مزامنة سجل SchoolInfo للإدارة (يتطلب صلاحية أدمن)
      try {
        if (schoolInfo?.id) {
          await base44.entities.SchoolInfo.update(schoolInfo.id, { education_admin: edu, school_name: school, principal_name: principal });
        } else if (me?.role === "admin") {
          await base44.entities.SchoolInfo.create({ education_admin: edu, school_name: school, principal_name: principal });
        }
      } catch { /* غير حرج */ }
      qc.invalidateQueries(["me"]);
      qc.invalidateQueries(["schoolInfo"]);
      qc.invalidateQueries(["users"]);
      toast.success(t("schoolSaved"));
    } catch { toast.error(t("schoolError")); }
    finally { setSavingSchool(false); }
  };

  const saveContact = async () => {
    setSavingContact(true);
    try {
      const payload = {
        contact_email: contactEmail.trim(),
        contact_whatsapp: contactWhatsapp.trim(),
      };
      if (schoolInfo?.id) {
        await base44.entities.SchoolInfo.update(schoolInfo.id, payload);
      } else {
        await base44.entities.SchoolInfo.create({
          school_name: school.trim() || "—",
          ...payload,
        });
      }
      qc.invalidateQueries(["schoolInfo"]);
      toast.success("تم حفظ بيانات التواصل");
    } catch {
      toast.error("تعذر حفظ بيانات التواصل");
    } finally {
      setSavingContact(false);
    }
  };

  const go = (path) => () => navigate(path);

  const handleLogout = () => {
    base44.auth.logout("/login");
  };

  const handleDeleteData = async (e) => {
    e?.preventDefault?.();
    if (!me?.id) { toast.error(t("deleteError")); return; }
    setDeleting(true);
    try {
      await base44.entities.User.delete(me.id);
      toast.success(t("deleteSuccess"));
      setShowDeleteDialog(false);
      base44.auth.logout("/login");
    } catch {
      toast.error(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    const shareData = { title: "Teacher's Log", text: genderTerm(me, t("shareText")), url: window.location.origin };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.origin);
        toast.success(t("shareCopied"));
      }
    } catch (e) {
      if (e?.name !== "AbortError") {
        try { await navigator.clipboard.writeText(window.location.origin); toast.success(t("shareCopied")); }
        catch { toast.error(t("shareError")); }
      }
    }
  };

  const comingSoon = () => toast.info(t("comingSoon"));

  return (
    <div dir={dir}>
      <PageHeader title={t("settingsTitle")} description={t("settingsDesc")} />

      <div className="max-w-2xl">
        <Card>
          <CardContent className="p-5 divide-y divide-border">

            {/* ── Preferences ───────────────────── */}
            <div>
              <p className={SECTION_TITLE}>{t("sec_preferences")}</p>

              <SettingRow icon={Globe} label={t("lang_label")} description={t("lang_desc")}>
                <Select value={lang} onValueChange={setLang}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">{t("lang_ar")}</SelectItem>
                    <SelectItem value="en">{t("lang_en")}</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>

              <Separator />
              <SettingRow icon={Moon} label={t("dark_label")} description={t("dark_desc")}>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
              </SettingRow>

              <Separator />
              <SettingRow icon={Calendar} label={t("hijri_label")} description={t("hijri_desc")}>
                <Switch checked={hijriDate} onCheckedChange={setHijriDate} />
              </SettingRow>
            </div>

            {/* ── Account Name ─────────────── */}
            <div>
              <p className={SECTION_TITLE}>بيانات المشترك</p>
              <DisplayNameEditor me={me} />
              <TitleSelector me={me} />
              {isTeacher(me) && (
                <>
                  <Separator />
                  <SpecializationEditor me={me} />
                </>
              )}
            </div>

            {/* ── School Data ─────────────── */}
            <div>
              <p className={SECTION_TITLE}>{t("sec_school")}</p>
              <div className="py-3 space-y-1">
                <JoinSchoolSection me={me} />
                {(me?.role === "admin" || me?.app_role === "principal") && (
                  <>
                    <Separator />
                    <MinistryNumberEditor me={me} />
                  </>
                )}
                <Separator />
                <SettingRow icon={Building2} label={t("edu_label")} description={t("edu_desc")}>
                  <Input value={edu} onChange={(e) => setEdu(e.target.value)} placeholder={t("edu_ph")} className="w-40 h-8 text-xs shrink-0" />
                </SettingRow>
                <Separator />
                <SettingRow icon={Building2} label={t("school_label")} description={t("edu_desc")}>
                  <Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder={t("school_ph")} className="w-40 h-8 text-xs shrink-0" />
                </SettingRow>
                <Separator />
                <SettingRow icon={Building2} label={gt("principal_label")} description={gt("principal_desc")}>
                  <Input value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder={gt("principal_ph")} className="w-40 h-8 text-xs shrink-0" />
                </SettingRow>
                <Button size="sm" className="w-full mt-2" onClick={saveSchoolInfo} disabled={savingSchool}>
                  {savingSchool ? t("saving") : t("saveSchool")}
                </Button>
              </div>
            </div>

            {/* ── Academic Management ─────────── */}
            <div>
              <p className={SECTION_TITLE}>{t("sec_academic")}</p>
              <NavRow dir={dir} icon={BookOpen} label="الصفوف (الشعب)" description="إدارة الصفوف/الشعب وربطها بالمراحل الدراسية" onClick={go("/classes")} />
              <Separator />
              <NavRow dir={dir} icon={GraduationCap} label={t("subjects_label")}    description={t("subjects_desc")} onClick={go("/subjects")} />
              <Separator />
              <NavRow dir={dir} icon={ClipboardList} label={gt("students_label")}    description={gt("students_desc")}  onClick={go("/students")} />
              <Separator />
              {canViewTeachers(me) && (
                <>
                  <NavRow dir={dir} icon={Users}      label={gt("teachers_label")}    description={gt("teachers_desc")} onClick={go("/teachers")} />
                  <Separator />
                </>
              )}
              <NavRow dir={dir} icon={BookOpen}      label={t("yearWork_label")}    description={t("yearWork_desc")} onClick={go("/subjects")} />
              <Separator />
              <NavRow dir={dir} icon={Star}          label={t("evalItems_label")}   description={t("evalItems_desc")} onClick={() => setShowEvalDialog(true)} />
              <Separator />
              <NavRow dir={dir} icon={Archive}       label={t("archived_label")}    description={t("archived_desc")} onClick={go("/classes")} />
              <Separator />
              <NavRow dir={dir} icon={Image}         label={t("images_label")}      description={t("images_desc")}   onClick={() => setShowImageStyles(true)} />
            </div>

            {/* ── Subscription ─────────────────── */}
            <div>
              <p className={SECTION_TITLE}>{t("sec_subscription")}</p>
              <NavRow dir={dir} icon={Crown} label={t("sub_label")} description={t("sub_desc")} onClick={go("/subscription")} />
              <Separator />
              <SettingRow icon={Mail} label="تواصل معنا" description="للاستفسار عن الاشتراك والمدفوعات">
                <ContactIcons compact />
              </SettingRow>
            </div>

            {/* ── General ─────────────────────── */}
            <div>
              <p className={SECTION_TITLE}>{t("sec_general")}</p>
              <NavRow dir={dir} icon={HelpCircle} label="دليل الاستخدام"   description="استعراض الإرشادات الترحيبية مرة أخرى" onClick={() => setShowOnboarding(true)} />
              <Separator />
              <NavRow dir={dir} icon={Share2}    label={t("friend_label")}  description={t("friend_desc")} onClick={handleShare} />
              <Separator />
              <NavRow dir={dir} icon={Shield}    label={t("privacy_label")} description={t("privacy_desc")} onClick={go("/privacy-policy")} />
              <Separator />
              <NavRow dir={dir} icon={FileText}  label={t("terms_label")}   description={t("terms_desc")}   onClick={go("/terms")} />
            </div>

            {me?.role === "admin" && (
              <div>
                <p className={SECTION_TITLE}>{t("sec_admin")}</p>
                <NavRow dir={dir} icon={Shield} label={t("admin_label")} description={t("admin_desc")} onClick={go("/admin")} />
                <Separator />
                <div className="py-3 space-y-3">
                  <SettingRow icon={Mail} label="بريد التواصل" description="البريد المعروض للأعضاء">
                    <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} dir="ltr" placeholder="administrator@teacher-record.com" className="w-44 h-8 text-xs shrink-0" />
                  </SettingRow>
                  <Separator />
                  <SettingRow icon={MessageCircle} label="رقم واتس آب" description="اتركه فارغًا حتى يُفعّل لاحقًا">
                    <Input value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)} dir="ltr" placeholder="9665XXXXXXXX" className="w-44 h-8 text-xs shrink-0" />
                  </SettingRow>
                  <Button size="sm" className="w-full" onClick={saveContact} disabled={savingContact}>
                    {savingContact ? t("saving") : "حفظ بيانات التواصل"}
                  </Button>
                </div>
              </div>
            )}

            {/* ── Login data ─────────────────────── */}
            <div>
              <p className={SECTION_TITLE}>بيانات الدخول</p>
              <ChangePassword />
            </div>

            {/* ── Account ─────────────────────── */}
            <div>
              <p className={SECTION_TITLE}>{t("sec_account")}</p>
              <NavRow dir={dir} icon={Trash2}  label={t("delete_label")}  description={t("delete_desc")}  onClick={() => setShowDeleteDialog(true)} danger />
              <Separator />
              <NavRow dir={dir} icon={LogOut}  label={t("logout_label")}  description={t("logout_desc")}  onClick={handleLogout} danger />
            </div>

          </CardContent>
        </Card>
      </div>

      <EvaluationItemsDialog open={showEvalDialog} onOpenChange={setShowEvalDialog} />

      <StudentImageStylesDialog open={showImageStyles} onOpenChange={setShowImageStyles} me={me} />

      <OnboardingStepsDialog open={showOnboarding} onOpenChange={setShowOnboarding} me={me} />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delDialogDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteData}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? t("deleting") : t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}