"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  CircleDashed,
  CircleSlash2,
  Play,
} from "lucide-react";

import { updateTaskStatus } from "@/app/actions/tasks";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AddTaskDialog } from "@/components/projects/add-task-dialog";
import { MILESTONE_STATUSES, MILESTONE_STATUS_LABELS } from "@/lib/milestone-status";
import type { MilestoneStatus } from "@/lib/milestone-status";
import type { TaskSeverity } from "@/lib/task-severity";
import { cn } from "@/lib/utils";

export type TaskBoardRow = {
  id: string;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  severity: TaskSeverity;
  tags: string[] | null;
  dueDate: Date | null;
  progressPct: number;
  assignees: { id: string; name: string; profileImageUrl: string | null }[];
  blockerCount: number;
  subtaskCount: number;
};

const STATUS_GROUPS: { status: MilestoneStatus; label: string }[] = [
  { status: "not_started", label: "Backlog" },
  { status: "in_progress", label: "In progress" },
  { status: "completed", label: "Completed" },
  { status: "closed", label: "Closed" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function formatTaskDue(d: Date | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function TaskStatusGlyph({ status }: { status: MilestoneStatus }) {
  switch (status) {
    case "not_started":
      return (
        <CircleDashed
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden
        />
      );
    case "in_progress":
      return (
        <span
          className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-[0_0_10px_-2px] shadow-blue-500/60"
          aria-hidden
        >
          <Play className="size-2.5 translate-x-px fill-current" />
        </span>
      );
    case "completed":
      return (
        <CheckCircle2
          className="size-4 shrink-0 text-emerald-500"
          aria-hidden
        />
      );
    case "closed":
      return (
        <CircleSlash2
          className="text-muted-foreground size-4 shrink-0"
          aria-hidden
        />
      );
    default:
      return null;
  }
}

function PrioritySignal({ severity }: { severity: TaskSeverity }) {
  const label =
    severity === "critical"
      ? "Critical"
      : severity === "high"
        ? "High"
        : severity === "medium"
          ? "Medium"
          : severity === "low"
            ? "Low"
            : severity;
  const filled =
    severity === "critical" || severity === "high"
      ? 3
      : severity === "medium"
        ? 2
        : 1;
  const colorClass =
    severity === "critical" || severity === "high"
      ? "text-red-500"
      : severity === "medium"
        ? "text-amber-500"
        : "text-emerald-500/90";

  return (
    <div className={cn("flex items-center gap-2", colorClass)}>
      <span className="flex h-3.5 items-end gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn(
              "w-1 rounded-[1px] bg-current opacity-35",
              i < filled && "opacity-100",
              i === 0 && "h-1.5",
              i === 1 && "h-2.5",
              i === 2 && "h-3.5",
            )}
          />
        ))}
      </span>
      <span className="text-xs font-medium tabular-nums">{label}</span>
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 6.5;
  const c = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(100, pct));
  const offset = c - (dash / 100) * c;
  return (
    <div className="flex items-center gap-2">
      <svg width="26" height="26" className="shrink-0 -rotate-90">
        <circle
          cx="13"
          cy="13"
          r={r}
          fill="none"
          className="stroke-muted-foreground/25"
          strokeWidth="2"
        />
        <circle
          cx="13"
          cy="13"
          r={r}
          fill="none"
          className="stroke-primary transition-[stroke-dashoffset] duration-300"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="text-muted-foreground text-xs tabular-nums">
        {pct}% completed
      </span>
    </div>
  );
}

function TaskStageSelect({
  organizationSlug,
  projectId,
  taskId,
  status,
}: {
  organizationSlug: string;
  projectId: string;
  taskId: string;
  status: MilestoneStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      className={cn(
        "h-7 max-w-38 cursor-pointer rounded border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        pending && "opacity-50",
      )}
      value={status}
      disabled={pending}
      aria-label="Change task stage"
      onChange={(e) => {
        const next = e.target.value as MilestoneStatus;
        const fd = new FormData();
        fd.set("organizationSlug", organizationSlug);
        fd.set("projectId", projectId);
        fd.set("taskId", taskId);
        fd.set("status", next);
        startTransition(async () => {
          await updateTaskStatus(null, fd);
          router.refresh();
        });
      }}
    >
      {MILESTONE_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s === "not_started" ? "Backlog" : MILESTONE_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

function TaskGroupSection({
  organizationSlug,
  projectId,
  group,
  rows,
  users,
  open,
  onToggleOpen,
  onAddClick,
}: {
  organizationSlug: string;
  projectId: string;
  group: (typeof STATUS_GROUPS)[number];
  rows: TaskBoardRow[];
  users: { id: string; name: string; email: string }[];
  open: boolean;
  onToggleOpen: () => void;
  onAddClick: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card/30 ring-1 ring-foreground/6">
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/15 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ChevronRight
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
              open && "rotate-90",
            )}
            aria-hidden
          />
          <span className="truncate font-semibold tracking-tight">
            {group.label}
          </span>
          <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
            {rows.length}
          </span>
        </button>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onAddClick();
          }}
        >
          + Add
        </Button>
      </div>

      {open ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="text-muted-foreground w-[28%] px-3 py-2 text-left font-medium">
                  <span className="inline-flex items-center gap-1">
                    Task
                    <ChevronsUpDown className="text-muted-foreground/60 size-3.5" aria-hidden />
                  </span>
                </th>
                <th className="text-muted-foreground w-[22%] px-3 py-2 text-left font-medium">
                  Description
                </th>
                <th className="text-muted-foreground w-[14%] px-3 py-2 text-left font-medium">
                  Assignee
                </th>
                <th className="text-muted-foreground w-[12%] px-3 py-2 text-left font-medium">
                  Due date
                </th>
                <th className="text-muted-foreground w-[12%] px-3 py-2 text-left font-medium">
                  Priority
                </th>
                <th className="text-muted-foreground w-[12%] px-3 py-2 text-left font-medium">
                  Progress
                </th>
                <th className="text-muted-foreground w-[10%] px-3 py-2 text-left font-medium">
                  Stage
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="text-muted-foreground px-3 py-8 text-center text-sm"
                  >
                    No tasks in this group yet.
                  </td>
                </tr>
              ) : (
                rows.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-border/80 transition-colors hover:bg-muted/20"
                  >
                    <td className="px-3 py-2.5 align-middle">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          <TaskStatusGlyph status={task.status} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {task.title}
                          </p>
                          {task.tags && task.tags.length > 0 ? (
                            <p className="text-muted-foreground mt-0.5 truncate text-xs">
                              {task.tags.join(" · ")}
                            </p>
                          ) : null}
                          {task.blockerCount > 0 || task.subtaskCount > 0 ? (
                            <p className="text-muted-foreground mt-1 text-[0.65rem]">
                              {task.blockerCount > 0
                                ? `${task.blockerCount} blocker${task.blockerCount === 1 ? "" : "s"}`
                                : ""}
                              {task.blockerCount > 0 && task.subtaskCount > 0
                                ? " · "
                                : ""}
                              {task.subtaskCount > 0
                                ? `${task.subtaskCount} sub-task${task.subtaskCount === 1 ? "" : "s"}`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground max-w-[220px] px-3 py-2.5 align-middle">
                      <p className="line-clamp-2 text-xs leading-relaxed">
                        {task.description || "—"}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      {task.assignees.length === 0 ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <AvatarGroup>
                          {task.assignees.slice(0, 4).map((u) => (
                            <Avatar key={u.id} size="sm" title={u.name}>
                              {u.profileImageUrl ? (
                                <AvatarImage
                                  src={u.profileImageUrl}
                                  alt={u.name}
                                />
                              ) : null}
                              <AvatarFallback>
                                {initials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {task.assignees.length > 4 ? (
                            <AvatarGroupCount>
                              +{task.assignees.length - 4}
                            </AvatarGroupCount>
                          ) : null}
                        </AvatarGroup>
                      )}
                    </td>
                    <td className="text-muted-foreground whitespace-nowrap px-3 py-2.5 align-middle text-xs">
                      {formatTaskDue(task.dueDate)}
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <PrioritySignal severity={task.severity} />
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <ProgressRing pct={task.progressPct} />
                    </td>
                    <td className="px-3 py-2.5 align-middle">
                      <TaskStageSelect
                        organizationSlug={organizationSlug}
                        projectId={projectId}
                        taskId={task.id}
                        status={task.status}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

export function TasksBoard({
  organizationSlug,
  projectId,
  tasks,
  users,
  parentTaskOptions = [],
}: {
  organizationSlug: string;
  projectId: string;
  tasks: TaskBoardRow[];
  users: { id: string; name: string; email: string }[];
  parentTaskOptions?: { id: string; title: string }[];
}) {
  const byStatus = useMemo(() => {
    const m: Record<MilestoneStatus, TaskBoardRow[]> = {
      not_started: [],
      in_progress: [],
      completed: [],
      closed: [],
    };
    for (const t of tasks) {
      m[t.status].push(t);
    }
    return m;
  }, [tasks]);

  const [openMap, setOpenMap] = useState<Record<MilestoneStatus, boolean>>({
    not_started: true,
    in_progress: true,
    completed: true,
    closed: true,
  });

  const [addForStatus, setAddForStatus] = useState<MilestoneStatus | null>(
    null,
  );

  return (
    <div className="space-y-4">
      {STATUS_GROUPS.map((group) => (
        <TaskGroupSection
          key={group.status}
          organizationSlug={organizationSlug}
          projectId={projectId}
          group={group}
          rows={byStatus[group.status]}
          users={users}
          open={openMap[group.status]}
          onToggleOpen={() =>
            setOpenMap((prev) => ({
              ...prev,
              [group.status]: !prev[group.status],
            }))
          }
          onAddClick={() =>
            setAddForStatus((cur) =>
              cur === group.status ? null : group.status,
            )
          }
        />
      ))}
      <AddTaskDialog
        organizationSlug={organizationSlug}
        projectId={projectId}
        users={users}
        parentTaskOptions={parentTaskOptions}
        lockedStatus={addForStatus ?? "not_started"}
        open={addForStatus !== null}
        onOpenChange={(next) => {
          if (!next) setAddForStatus(null);
        }}
      />
    </div>
  );
}
