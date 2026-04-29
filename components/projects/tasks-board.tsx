"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowUpDown,
  CheckCircle2,
  ChevronRight,
  ChevronsUpDown,
  CircleDashed,
  CircleSlash2,
  Filter,
  LayoutGrid,
  List,
  Play,
  Search,
  Settings2,
  X,
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
import { AddSubtaskDialog } from "@/components/projects/add-subtask-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MILESTONE_STATUSES, MILESTONE_STATUS_LABELS } from "@/lib/milestone-status";
import type { MilestoneStatus } from "@/lib/milestone-status";
import {
  TASK_SEVERITIES,
  TASK_SEVERITY_LABELS,
  isTaskSeverity,
  type TaskSeverity,
} from "@/lib/task-severity";
import { cn } from "@/lib/utils";

const UNASSIGNED_FILTER = "__unassigned__";

const assigneeMultiClass = cn(
  "min-h-24 w-full rounded-lg border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
);

const severityMultiClass = cn(
  "min-h-20 w-full rounded-lg border border-input bg-transparent p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
);

function formatYmd(ymd: string): string {
  if (!ymd) return "";
  // Treat YYYY-MM-DD as a local calendar day for display.
  const [y, m, d] = ymd.split("-").map((n) => Number.parseInt(n, 10));
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    dt,
  );
}

function startOfLocalDay(ymd: string): number | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map((n) => Number.parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function endOfLocalDay(ymd: string): number | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map((n) => Number.parseInt(n, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

function taskMatchesDueRange(
  task: TaskBoardRow,
  dueFrom: string,
  dueTo: string,
): boolean {
  if (!dueFrom && !dueTo) return true;
  if (!task.dueDate) return false;
  const t = task.dueDate.getTime();
  const from = dueFrom ? startOfLocalDay(dueFrom) : null;
  const to = dueTo ? endOfLocalDay(dueTo) : null;
  if (from != null && t < from) return false;
  if (to != null && t > to) return false;
  return true;
}

function taskMatchesAssigneeFilter(
  task: TaskBoardRow,
  selected: readonly string[],
): boolean {
  if (selected.length === 0) return true;
  const wantUnassigned = selected.includes(UNASSIGNED_FILTER);
  const userIds = selected.filter((id) => id !== UNASSIGNED_FILTER);
  const assigneeIds = new Set(task.assignees.map((a) => a.id));
  if (wantUnassigned && task.assignees.length === 0) return true;
  if (userIds.some((id) => assigneeIds.has(id))) return true;
  return false;
}

function taskMatchesSeverityFilter(
  task: TaskBoardRow,
  selected: readonly TaskSeverity[],
): boolean {
  if (selected.length === 0) return true;
  return selected.includes(task.severity);
}

function filterTasks(
  tasks: TaskBoardRow[],
  assigneeKeys: readonly string[],
  severities: readonly TaskSeverity[],
  dueFrom: string,
  dueTo: string,
): TaskBoardRow[] {
  return tasks.filter(
    (t) =>
      taskMatchesAssigneeFilter(t, assigneeKeys) &&
      taskMatchesSeverityFilter(t, severities) &&
      taskMatchesDueRange(t, dueFrom, dueTo),
  );
}

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
          className="flex size-5 shrink-0 items-center justify-center rounded-full text-white shadow-[0_0_10px_-2px] shadow-blue-500/60"
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
          const result = await updateTaskStatus(null, fd);
          if (result?.error) {
            toast.error(result.error);
          } else {
            toast.success("Task stage updated");
          }
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

function TaskBoardTable({
  rows,
  organizationSlug,
  projectId,
  emptyMessage,
}: {
  rows: TaskBoardRow[];
  organizationSlug: string;
  projectId: string;
  emptyMessage: string;
}) {
  return (
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
                {emptyMessage}
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
                      <Link
                        href={`/organizations/${organizationSlug}/projects/${projectId}/tasks/${task.id}`}
                        className="truncate font-medium text-foreground hover:underline"
                      >
                        {task.title}
                      </Link>
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
  );
}

function TaskGroupSection({
  organizationSlug,
  projectId,
  group,
  rows,
  open,
  onToggleOpen,
  onAddClick,
}: {
  organizationSlug: string;
  projectId: string;
  group: (typeof STATUS_GROUPS)[number];
  rows: TaskBoardRow[];
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
        <TaskBoardTable
          rows={rows}
          organizationSlug={organizationSlug}
          projectId={projectId}
          emptyMessage="No tasks in this group yet."
        />
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
  milestoneOptions = [],
  lockedMilestoneId = null,
  createUnderTaskId,
  createUnderTaskTitle,
}: {
  organizationSlug: string;
  projectId: string;
  tasks: TaskBoardRow[];
  users: { id: string; name: string; email: string }[];
  parentTaskOptions?: { id: string; title: string }[];
  milestoneOptions?: { id: string; name: string }[];
  lockedMilestoneId?: string | null;
  createUnderTaskId?: string;
  createUnderTaskTitle?: string;
}) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filterOpen, setFilterOpen] = useState(false);
  const [chipOverflowOpen, setChipOverflowOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [assigneeKeys, setAssigneeKeys] = useState<string[]>([]);
  const [severityKeys, setSeverityKeys] = useState<TaskSeverity[]>([]);
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");

  const activeFilterCount =
    assigneeKeys.length + severityKeys.length + (dueFrom || dueTo ? 1 : 0);

  const hasActiveFilters =
    assigneeKeys.length > 0 ||
    severityKeys.length > 0 ||
    Boolean(dueFrom) ||
    Boolean(dueTo);

  const filteredTasks = useMemo(() => {
    const base = filterTasks(tasks, assigneeKeys, severityKeys, dueFrom, dueTo);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((t) => {
      if (t.title.toLowerCase().includes(q)) return true;
      if ((t.description ?? "").toLowerCase().includes(q)) return true;
      return false;
    });
  }, [tasks, assigneeKeys, severityKeys, dueFrom, dueTo, query]);

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

  const clearFilters = () => {
    setAssigneeKeys([]);
    setSeverityKeys([]);
    setDueFrom("");
    setDueTo("");
  };

  const removeAssigneeChip = (key: string) => {
    setAssigneeKeys((prev) => prev.filter((k) => k !== key));
  };

  const removeSeverityChip = (sev: TaskSeverity) => {
    setSeverityKeys((prev) => prev.filter((s) => s !== sev));
  };

  const clearDueChip = () => {
    setDueFrom("");
    setDueTo("");
  };

  const assigneeLabel = (key: string) => {
    if (key === UNASSIGNED_FILTER) return "Unassigned";
    const u = users.find((x) => x.id === key);
    return u ? u.name : key;
  };

  const dueLabel =
    dueFrom || dueTo
      ? `Due: ${
          dueFrom && dueTo
            ? `${formatYmd(dueFrom)}–${formatYmd(dueTo)}`
            : dueFrom
              ? `from ${formatYmd(dueFrom)}`
              : `to ${formatYmd(dueTo)}`
        }`
      : "";

  const chips: { key: string; label: string; onRemove: () => void }[] = [
    ...assigneeKeys.map((k) => ({
      key: `assignee:${k}`,
      label: assigneeLabel(k),
      onRemove: () => removeAssigneeChip(k),
    })),
    ...severityKeys.map((s) => ({
      key: `severity:${s}`,
      label: TASK_SEVERITY_LABELS[s],
      onRemove: () => removeSeverityChip(s),
    })),
    ...(dueFrom || dueTo
      ? [
          {
            key: "due",
            label: dueLabel,
            onRemove: clearDueChip,
          },
        ]
      : []),
  ];

  const maxVisibleChips = 6;
  const visibleChips = chipOverflowOpen ? chips : chips.slice(0, maxVisibleChips);
  const overflowCount = Math.max(0, chips.length - visibleChips.length);

  return (
    <div className="space-y-4">
      <section
        className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/10 p-2 ring-1 ring-foreground/6"
        aria-label="Task toolbar"
      >
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="List view"
            onClick={() => setViewMode("list")}
          >
            <List />
          </Button>
          <Button
            type="button"
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="Grid view"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  aria-label="Filters"
                />
              }
            >
              <Filter />
              Filters
              {activeFilterCount > 0 ? (
                <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-foreground/10 px-1.5 py-0.5 text-[0.65rem] font-medium tabular-nums text-foreground">
                  {activeFilterCount}
                </span>
              ) : null}
            </PopoverTrigger>
            <PopoverContent sideOffset={8} align="start" className="p-0">
              <div className="border-b border-border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold tracking-tight">Filters</p>
                  {hasActiveFilters ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        clearFilters();
                        setChipOverflowOpen(false);
                      }}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="space-y-4 p-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="task-filter-assignees">Assignees</Label>
                  <select
                    id="task-filter-assignees"
                    multiple
                    value={assigneeKeys}
                    onChange={(e) =>
                      setAssigneeKeys(
                        [...e.target.selectedOptions].map((o) => o.value),
                      )
                    }
                    className={assigneeMultiClass}
                    aria-describedby="task-filter-assignees-hint"
                  >
                    <option value={UNASSIGNED_FILTER}>Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  <p
                    id="task-filter-assignees-hint"
                    className="text-muted-foreground text-xs"
                  >
                    Hold Ctrl/Cmd to select multiple.
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="task-filter-severity">Severity</Label>
                  <select
                    id="task-filter-severity"
                    multiple
                    value={severityKeys}
                    onChange={(e) =>
                      setSeverityKeys(
                        [...e.target.selectedOptions]
                          .map((o) => o.value)
                          .filter((v): v is TaskSeverity => isTaskSeverity(v)),
                      )
                    }
                    className={severityMultiClass}
                    aria-describedby="task-filter-severity-hint"
                  >
                    {TASK_SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {TASK_SEVERITY_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <p
                    id="task-filter-severity-hint"
                    className="text-muted-foreground text-xs"
                  >
                    Leave empty for any priority.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="task-filter-due-from">Due from</Label>
                    <Input
                      id="task-filter-due-from"
                      type="date"
                      value={dueFrom}
                      onChange={(e) => setDueFrom(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="task-filter-due-to">Due to</Label>
                    <Input
                      id="task-filter-due-to"
                      type="date"
                      value={dueTo}
                      onChange={(e) => setDueTo(e.target.value)}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs sm:col-span-2">
                    Tasks without a due date are hidden while either date is set.
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            aria-label="Sort"
          >
            <ArrowUpDown />
            Sort
          </Button>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              className="h-7 w-[min(16rem,60vw)] pl-7 text-xs"
              aria-label="Search tasks"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Settings"
          >
            <Settings2 />
          </Button>
        </div>
      </section>

      {chips.length > 0 ? (
        <section
          className="flex flex-wrap items-center gap-2"
          aria-label="Active filters"
        >
          {visibleChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs text-foreground"
            >
              <span className="max-w-[18rem] truncate">{chip.label}</span>
              <button
                type="button"
                onClick={chip.onRemove}
                className="text-muted-foreground hover:text-foreground inline-flex size-4 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label={`Remove ${chip.label}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}

          {overflowCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setChipOverflowOpen(true)}
              aria-label={`Show ${overflowCount} more filters`}
            >
              +{overflowCount} more
            </Button>
          ) : null}

          {chipOverflowOpen && chips.length > maxVisibleChips ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setChipOverflowOpen(false)}
              aria-label="Collapse filters"
            >
              Show less
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => {
              clearFilters();
              setChipOverflowOpen(false);
            }}
          >
            Clear all
          </Button>
        </section>
      ) : null}

      {hasActiveFilters ? (
        <section className="overflow-hidden rounded-lg border border-border bg-card/30 ring-1 ring-foreground/6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/15 px-3 py-2.5">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold tracking-tight">
                Filtered tasks
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                {filteredTasks.length} matching
                {filteredTasks.length !== tasks.length
                  ? ` of ${tasks.length} total`
                  : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-7 shrink-0 px-2 text-xs"
              onClick={() =>
                setAddForStatus((cur) => (cur === "not_started" ? null : "not_started"))
              }
            >
              + Add {createUnderTaskId ? "subtask" : "task"}
            </Button>
          </div>
          <TaskBoardTable
            rows={filteredTasks}
            organizationSlug={organizationSlug}
            projectId={projectId}
            emptyMessage="No tasks match these filters."
          />
        </section>
      ) : (
        <>
          {STATUS_GROUPS.map((group) => (
            <TaskGroupSection
              key={group.status}
              organizationSlug={organizationSlug}
              projectId={projectId}
              group={group}
              rows={byStatus[group.status]}
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
        </>
      )}
      {createUnderTaskId ? (
        <AddSubtaskDialog
          organizationSlug={organizationSlug}
          projectId={projectId}
          parentTaskId={createUnderTaskId}
          parentTaskTitle={createUnderTaskTitle ?? "this task"}
          users={users}
          lockedMilestoneId={lockedMilestoneId}
          lockedStatus={addForStatus ?? "not_started"}
          open={addForStatus !== null}
          onOpenChange={(next) => {
            if (!next) setAddForStatus(null);
          }}
        />
      ) : (
        <AddTaskDialog
          organizationSlug={organizationSlug}
          projectId={projectId}
          users={users}
          parentTaskOptions={parentTaskOptions}
          milestoneOptions={milestoneOptions}
          lockedMilestoneId={lockedMilestoneId}
          lockedStatus={addForStatus ?? "not_started"}
          open={addForStatus !== null}
          onOpenChange={(next) => {
            if (!next) setAddForStatus(null);
          }}
        />
      )}
    </div>
  );
}
