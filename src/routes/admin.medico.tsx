import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/medico")({
  beforeLoad: () => {
    throw redirect({ to: "/medico" });
  },
});
