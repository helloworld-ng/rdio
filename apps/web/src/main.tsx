import { RouterProvider } from "@tanstack/react-router";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "@/providers/auth-provider";
import { router } from "@/router";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element was not found.");
}

const existingRoot = (
  rootElement as Element & { _reactRoot?: ReturnType<typeof createRoot> }
)._reactRoot;
const root = existingRoot ?? createRoot(rootElement);
(
  rootElement as Element & { _reactRoot?: ReturnType<typeof createRoot> }
)._reactRoot = root;

root.render(
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
);
