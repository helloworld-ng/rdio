import { createFileRoute } from "@tanstack/react-router";
import { ProgramsPage } from "@/components/pages/programs-page";

export const Route = createFileRoute("/_app/programs")({
  component: ProgramsPage,
});
