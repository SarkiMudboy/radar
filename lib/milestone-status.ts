export const MILESTONE_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
  "closed",
] as const;

export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  closed: "Closed",
};

export function isMilestoneStatus(value: string): value is MilestoneStatus {
  return (MILESTONE_STATUSES as readonly string[]).includes(value);
}
