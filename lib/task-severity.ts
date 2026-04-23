export const TASK_SEVERITIES = ["low", "medium", "high", "critical"] as const;

export type TaskSeverity = (typeof TASK_SEVERITIES)[number];

export const TASK_SEVERITY_LABELS: Record<TaskSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function isTaskSeverity(value: string): value is TaskSeverity {
  return (TASK_SEVERITIES as readonly string[]).includes(value);
}
