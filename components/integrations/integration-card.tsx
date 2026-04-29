import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function IntegrationCard({
  name,
  description,
  status,
  children,
  className,
}: {
  name: string;
  description?: string;
  status?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-border bg-card/40 p-5 ring-1 ring-foreground/6",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{name}</h2>
          {description ? (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          ) : null}
        </div>
        {status != null ? (
          <div className="shrink-0 text-sm font-medium">{status}</div>
        ) : null}
      </div>
      {children ? <div className="w-full">{children}</div> : null}
    </article>
  );
}
