import { type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { HealthStatus } from "./HealthStatus";
import { Shell } from "./Shell";
import { SignInPage } from "./SignInPage";
import { SignUpPage } from "./SignUpPage";
import { authClient } from "./lib/auth-client";

function Layout() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">To-Do</h1>
      <Outlet />
      <footer className="mt-8">
        <HealthStatus />
      </footer>
    </main>
  );
}

function RequireSession({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <p className="text-sm">Loading…</p>;
  if (!session) return <Navigate to="/sign-in" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route
          path="/"
          element={
            <RequireSession>
              <Shell />
            </RequireSession>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
