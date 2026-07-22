import { MailOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import WhatsAppIcon from "@/components/shared/WhatsAppIcon";

const DEFAULT_EMAIL = "administrator@teacher-record.com";

export default function ContactIcons({ compact = false }) {
  const { data: schoolInfo } = useQuery({
    queryKey: ["schoolInfo"],
    queryFn: () => base44.entities.SchoolInfo.list().then((r) => r[0] || null)
  });

  const email = schoolInfo?.contact_email?.trim() || DEFAULT_EMAIL;
  const whatsapp = schoolInfo?.contact_whatsapp?.trim() || "";

  const openEmail = () => {
    window.location.href = `mailto:${email}`;
  };

  const openWhatsapp = () => {
    if (!whatsapp) {
      toast.info("واتس آب قريباً");
      return;
    }
    window.open(`https://wa.me/${whatsapp.replace(/\D/g, "")}`, "_blank");
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={openEmail}
          aria-label="تواصل عبر البريد"
          className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors">
          
          <MailOpen className="h-4 w-4 bg-[hsl(var(--chart-3))] text-[hsl(var(--background))]" />
        </button>
        <button
          onClick={openWhatsapp}
          aria-label="تواصل عبر واتس آب"
          className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent/10 hover:text-accent transition-colors bg-[hsl(var(--sidebar-primary-foreground))]">
          
          <WhatsAppIcon className="h-4 w-4 bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]" />
        </button>
      </div>);

  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={openEmail}
        className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-colors">
        
        <MailOpen className="h-4 w-4" /> البريد الإلكتروني
      </button>
      <button
        onClick={openWhatsapp}
        className="inline-flex items-center gap-2 px-3 h-9 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/15 transition-colors">
        
        <WhatsAppIcon className="h-4 w-4" /> واتس آب{whatsapp ? "" : " (قريباً)"}
      </button>
    </div>);

}