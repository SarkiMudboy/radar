import { cn } from "@/lib/utils";
import {
  TASK_SEVERITY_LABELS,
  type TaskSeverity,
} from "@/lib/task-severity";

const VARIANT: Record<TaskSeverity, string> = {
  low: "border-muted-foreground/35 bg-muted/50 text-muted-foreground",
  medium:
    "border-blue-500/40 bg-blue-500/10 text-blue-800 dark:text-blue-200",
  high: "border-amber-500/45 bg-amber-500/12 text-amber-950 dark:text-amber-100",
  critical:
    "border-red-500/45 bg-red-500/12 text-red-800 dark:text-red-200",
};

export function TaskSeverityBadge({
  severity,
  className,
}: {
  severity: TaskSeverity;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-fit rounded border px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide",
        VARIANT[severity],
        className,
      )}
    >
      {TASK_SEVERITY_LABELS[severity]}
    </span>
  );
}
