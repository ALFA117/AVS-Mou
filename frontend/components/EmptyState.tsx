import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <div className="avs-icon-badge h-12 w-12">
        <Icon className="h-6 w-6 text-primary" strokeWidth={2} />
      </div>
      <h2 className="mt-4 font-heading text-lg font-light text-foreground">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
