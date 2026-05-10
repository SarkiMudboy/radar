export const TASK_QA_STATUSES = ["not_required", "to_test", "tested"] as const;

export type TaskQaStatus = (typeof TASK_QA_STATUSES)[number];

export const TASK_QA_STATUS_LABELS: Record<TaskQaStatus, string> = {
  not_required: "Not required",
  to_test: "To be tested",
  tested: "Tested",
};

export function isTaskQaStatus(v: string): v is TaskQaStatus {
  return (TASK_QA_STATUSES as readonly string[]).includes(v);
}

