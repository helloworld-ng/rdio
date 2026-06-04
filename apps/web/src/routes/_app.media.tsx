import { createFileRoute } from "@tanstack/react-router";
import { MediaPage } from "@/components/pages/media-page";

export const Route = createFileRoute("/_app/media")({
  component: MediaPage,
});
