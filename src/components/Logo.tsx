import { cn } from "@/lib/utils";
import htcareLogo from "@/assets/brand/htcare-logo.png";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src={htcareLogo}
        alt="HTCare"
        className={cn("h-10 w-auto object-contain", !showText && "h-9")}
      />
    </span>
  );
}
