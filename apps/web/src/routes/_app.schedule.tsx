import { createFileRoute } from "@tanstack/react-router";
import { SchedulePage } from "@/components/pages/schedule-page";

export const Route = createFileRoute("/_app/schedule")({
  component: SchedulePage,
});
