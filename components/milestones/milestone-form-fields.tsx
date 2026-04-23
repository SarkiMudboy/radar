import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  MILESTONE_STATUS_LABELS,
  MILESTONE_STATUSES,
  type MilestoneStatus,
} from "@/lib/milestone-status";

const selectClass = cn(
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
);

const textareaClass = cn(
  "min-h-18 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
);

export function MilestoneFormFields({
  nameId,
  descriptionId,
  timelineId,
  statusId,
  defaultStatus = "not_started",
  disabled,
}: {
  nameId: string;
  descriptionId: string;
  timelineId: string;
  statusId: string;
  defaultStatus?: MilestoneStatus;
  disabled?: boolean;
}) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          name="name"
          required
          placeholder="Launch beta"
          autoComplete="off"
          disabled={disabled}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={descriptionId}>Description</Label>
        <textarea
          id={descriptionId}
          name="description"
          rows={3}
          placeholder="What this milestone delivers"
          className={textareaClass}
          disabled={disabled}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={timelineId}>Timeline</Label>
        <Input
          id={timelineId}
          name="timeline"
          placeholder="e.g. Jan–Mar 2026, Sprint 3"
          autoComplete="off"
          disabled={disabled}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={statusId}>Status</Label>
        <select
          id={statusId}
          name="status"
          className={selectClass}
          defaultValue={defaultStatus}
          disabled={disabled}
        >
          {MILESTONE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {MILESTONE_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
