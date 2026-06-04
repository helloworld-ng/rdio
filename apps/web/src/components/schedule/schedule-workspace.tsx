import { DailyCalendar } from "@/components/schedule/daily-calendar";
import { useScheduleWorkspace } from "@/components/schedule/use-schedule-workspace";

export function ScheduleWorkspace() {
  const { saveMessage, schedule } = useScheduleWorkspace();

  return (
    <>
      {saveMessage ? (
        <p aria-live="polite" className="schedule-save-status">
          {saveMessage}
        </p>
      ) : null}
      <DailyCalendar {...schedule} />
    </>
  );
}
