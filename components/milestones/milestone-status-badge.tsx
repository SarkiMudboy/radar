import { cn } from "@/lib/utils";
import {
  MILESTONE_STATUS_LABELS,
  type MilestoneStatus,
} from "@/lib/milestone-status";

const VARIANT: Record<
  MilestoneStatus,
  { className: string; dot?: string }
> = {
  not_started: {
    className:
      "border-red-500/45 bg-red-500/[0.12] text-red-800 shadow-[inset_0_1px_0_0_oklch(1_0_0/0.08)] dark:border-red-400/40 dark:bg-red-500/15 dark:text-red-200",
    dot: "bg-red-500 shadow-[0_0_6px_1px] shadow-red-500/35 dark:bg-red-400",
  },
  in_progress: {
    className:
      "border-amber-500/50 bg-amber-500/[0.14] text-amber-950 shadow-[0_0_18px_-6px] shadow-amber-500/30 ring-1 ring-amber-500/25 dark:border-amber-400/45 dark:bg-amber-400/12 dark:text-amber-100 dark:shadow-amber-400/20 dark:ring-amber-400/20",
    dot: "bg-amber-500 shadow-[0_0_6px_1px] shadow-amber-500/45 dark:bg-amber-400",
  },
  completed: {
    className:
      "border-green-600/40 bg-green-600/[0.12] text-green-900 dark:border-green-400/40 dark:bg-green-500/14 dark:text-green-200",
    dot: "bg-green-600 dark:bg-green-400",
  },
  closed: {
    className:
      "border-blue-600/40 bg-blue-600/[0.12] text-blue-900 dark:border-blue-400/40 dark:bg-blue-500/14 dark:text-blue-200",
    dot: "bg-blue-600 dark:bg-blue-400",
  },
};

export function MilestoneStatusBadge({
  status,
  size = "sm",
  showDot = true,
  className,
}: {
  status: MilestoneStatus;
  size?: "sm" | "md";
  showDot?: boolean;
  className?: string;
}) {
  const v = VARIANT[status];
  return (
    <span
      data-slot="milestone-status-badge"
      className={cn(
        "inline-flex max-w-fit items-center gap-1.5 rounded-md border font-semibold uppercase tracking-[0.14em]",
        size === "sm" && "px-2 py-0.5 text-[0.62rem] leading-none",
        size === "md" && "px-2.5 py-1 text-[0.7rem] leading-none",
        v.className,
        className,
      )}
    >
      {showDot ? (
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full",
            size === "md" && "size-2",
            v.dot,
          )}
          aria-hidden
        />
      ) : null}
      {MILESTONE_STATUS_LABELS[status]}
    </span>
  );
}
