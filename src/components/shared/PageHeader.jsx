import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { genderTerm } from "@/lib/genderTerms";

export default function PageHeader({ title, description, actions }) {
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me().catch(() => null) });
  const t = (label) => genderTerm(me, label);
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="font-bold text-accent text-xl md:text-xl">{t(title)}</h1>
        {description &&
        <p className="text-muted-foreground mt-1 text-sm">{t(description)}</p>
        }
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}