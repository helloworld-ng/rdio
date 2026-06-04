import { createFileRoute } from "@tanstack/react-router";
import { HostsRoutePage } from "@/components/pages/hosts-page";

export const Route = createFileRoute("/_app/hosts")({
  component: HostsRoutePage,
});
