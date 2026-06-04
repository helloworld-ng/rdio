import { useAppLayout } from "@/app";
import { DailyCalendar } from "@/components/schedule/daily-calendar";

export function SchedulePage() {
  const { schedule } = useAppLayout();

  return <DailyCalendar {...schedule} />;
}
