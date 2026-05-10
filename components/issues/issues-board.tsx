"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { updateIssueStatus } from "@/app/actions/issues";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type IssueRow = {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  description: string | null;
  affectedTaskId: string | null;
  affectedTaskTitle: string | null;
  assigneeName: string | null;
  severity: "low" | "medium" | "high" | "critical";
  reporterName: string | null;
  status: "pending" | "resolved";
  createdAt: Date;
};

const GROUPS: { status: IssueRow["status"]; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "resolved", label: "Resolved" },
];

function SeverityPill({ severity }: { severity: IssueRow["severity"] }) {
  const label =
    severity === "critical"
      ? "Critical"
      : severity === "high"
        ? "High"
        : severity === "medium"
          ? "Medium"
          : "Low";
  const klass =
    severity === "critical"
      ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
      : severity === "high"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : severity === "medium"
          ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", klass)}>
      {label}
    </span>
  );
}

function IssueStatusSelect({
  organizationSlug,
  projectId,
  issueId,
  status,
}: {
  organizationSlug: string;
  projectId: string;
  issueId: string;
  status: IssueRow["status"];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <select
      className={cn(
        "h-7 max-w-34 cursor-pointer rounded border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        pending && "opacity-50",
      )}
      value={status}
      disabled={pending}
      aria-label="Change issue status"
      onChange={(e) => {
        const next = e.target.value as IssueRow["status"];
        const fd = new FormData();
        fd.set("organizationSlug", organizationSlug);
        fd.set("projectId", projectId);
        fd.set("issueId", issueId);
        fd.set("status", next);
        start(async () => {
          const result = await updateIssueStatus(null, fd);
          if (result?.error) toast.error(result.error);
          else toast.success("Issue updated");
          router.refresh();
        });
      }}
    >
      <option value="pending">Pending</option>
      <option value="resolved">Resolved</option>
    </select>
  );
}

function IssuesTable({
  rows,
  organizationSlug,
  emptyMessage,
}: {
  rows: IssueRow[];
  organizationSlug: string;
  emptyMessage: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/10">
            <th className="text-muted-foreground w-[24%] px-3 py-2 text-left font-medium">
              Issue
            </th>
            <th className="text-muted-foreground w-[14%] px-3 py-2 text-left font-medium">
              Project
            </th>
            <th className="text-muted-foreground w-[26%] px-3 py-2 text-left font-medium">
              Description
            </th>
            <th className="text-muted-foreground w-[18%] px-3 py-2 text-left font-medium">
              Affected task
            </th>
            <th className="text-muted-foreground w-[10%] px-3 py-2 text-left font-medium">
              Assignee
            </th>
            <th className="text-muted-foreground w-[8%] px-3 py-2 text-left font-medium">
              Severity
            </th>
            <th className="text-muted-foreground w-[8%] px-3 py-2 text-left font-medium">
              Reporter
            </th>
            <th className="text-muted-foreground w-[6%] px-3 py-2 text-left font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-muted-foreground px-3 py-8 text-center text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b border-border/80 transition-colors hover:bg-muted/20">
                <td className="px-3 py-2.5 align-middle">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{r.name}</div>
                    <div className="text-muted-foreground mt-0.5 text-xs tabular-nums">
                      {r.createdAt.toLocaleString()}
                    </div>
                  </div>
                </td>
                <td className="text-muted-foreground px-3 py-2.5 align-middle text-xs">
                  <Link
                    href={`/organizations/${organizationSlug}/projects/${r.projectId}/issues`}
                    className="hover:underline"
                  >
                    {r.projectName}
                  </Link>
                </td>
                <td className="text-muted-foreground max-w-[320px] px-3 py-2.5 align-middle">
                  <p className="line-clamp-2 text-xs leading-relaxed">{r.description || "—"}</p>
                </td>
                <td className="px-3 py-2.5 align-middle">
                  {r.affectedTaskId ? (
                    <Link
                      href={`/organizations/${organizationSlug}/projects/${r.projectId}/tasks/${r.affectedTaskId}`}
                      className="text-xs font-medium hover:underline"
                    >
                      {r.affectedTaskTitle ?? "Task"}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                <td className="text-muted-foreground px-3 py-2.5 align-middle text-xs">
                  {r.assigneeName || "—"}
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <SeverityPill severity={r.severity} />
                </td>
                <td className="text-muted-foreground px-3 py-2.5 align-middle text-xs">
                  {r.reporterName || "—"}
                </td>
                <td className="px-3 py-2.5 align-middle">
                  <IssueStatusSelect
                    organizationSlug={organizationSlug}
                    projectId={r.projectId}
                    issueId={r.id}
                    status={r.status}
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

export function IssuesBoard({
  organizationSlug,
  issues,
  onCreateIssueClick,
}: {
  organizationSlug: string;
  issues: IssueRow[];
  onCreateIssueClick?: () => void;
}) {
  const [openMap, setOpenMap] = useState<Record<IssueRow["status"], boolean>>({
    pending: true,
    resolved: false,
  });

  const byStatus = useMemo(() => {
    const m: Record<IssueRow["status"], IssueRow[]> = { pending: [], resolved: [] };
    for (const i of issues) m[i.status].push(i);
    return m;
  }, [issues]);

  return (
    <div className="space-y-4">
      {onCreateIssueClick ? (
        <div className="flex items-center justify-end">
          <Button type="button" variant="outline" onClick={() => onCreateIssueClick()}>
            + Create issue
          </Button>
        </div>
      ) : null}

      {GROUPS.map((g) => {
        const rows = byStatus[g.status];
        const open = openMap[g.status];
        return (
          <section
            key={g.status}
            className="overflow-hidden rounded-lg border border-border bg-card/30 ring-1 ring-foreground/6"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/15 px-3 py-2.5">
              <button
                type="button"
                onClick={() => setOpenMap((p) => ({ ...p, [g.status]: !p[g.status] }))}
                className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <span className="truncate font-semibold tracking-tight">{g.label}</span>
                <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                  {rows.length}
                </span>
              </button>
            </div>
            {open ? (
              <IssuesTable
                rows={rows}
                organizationSlug={organizationSlug}
                emptyMessage="No issues in this group yet."
              />
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

