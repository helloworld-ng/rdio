import { createFileRoute } from "@tanstack/react-router";
import { MembersRoutePage } from "@/components/pages/members-page";

export const Route = createFileRoute("/_app/members")({
  component: MembersRoutePage,
});
