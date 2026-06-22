import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function MedicalDisclaimer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border bg-muted/60 p-4 text-sm text-muted-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p>
        A HTCare organiza dados de prevenção cardiovascular para acompanhamento entre consultas e
        conversas mais objetivas entre paciente e equipe.
      </p>
    </div>
  );
}
