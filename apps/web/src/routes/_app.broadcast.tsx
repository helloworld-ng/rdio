import { createFileRoute } from "@tanstack/react-router";
import { BroadcastPage } from "@/components/pages/broadcast-page";

export const Route = createFileRoute("/_app/broadcast")({
  component: BroadcastPage,
});
