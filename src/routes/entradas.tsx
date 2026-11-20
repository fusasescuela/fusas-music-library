import { createFileRoute, redirect } from "@tanstack/react-router";

const ENTRADAS_URL = "https://entradas-fusas.lovable.app/";

export const Route = createFileRoute("/entradas")({
  beforeLoad: () => {
    throw redirect({ href: ENTRADAS_URL, statusCode: 302 });
  },
  component: () => null,
});
