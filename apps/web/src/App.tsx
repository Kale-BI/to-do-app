import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { HealthStatus } from "./HealthStatus";
import { Shell } from "./Shell";
import { SignInPage } from "./SignInPage";
import { SignUpPage } from "./SignUpPage";
import { authClient } from "./lib/auth-client";
import { LampIcon } from "./sheet/icons";

function useNightDesk() {
  const [night, setNight] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("desk");
    if (stored === "night" || stored === "day") return stored === "night";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", night);
  }, [night]);

  return {
    night,
    toggle: () => {
      setNight((current) => {
        window.localStorage.setItem("desk", current ? "day" : "night");
        return !current;
      });
    },
  };
}

function LampToggle() {
  const { night, toggle } = useNightDesk();

  return (
    <button
      type="button"
      aria-pressed={night}
      aria-label={night ? "Switch to day desk" : "Switch to night desk"}
      title={night ? "Day desk" : "Night desk"}
      onClick={toggle}
      className="focus-pencil fixed top-4 right-4 z-30 h-8 w-8 p-1 text-desk-text"
    >
      <LampIcon className="h-full w-full" />
    </button>
  );
}

function Layout() {
  return (
    <>
      <LampToggle />
      <Outlet />
      <footer className="pointer-events-none fixed bottom-3 left-4 z-30">
        <HealthStatus />
      </footer>
    </>
  );
}

function RequireSession({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending)
    return (
      <p className="desk-label px-8 pt-8 text-xs text-desk-text-dim">
        Opening the desk…
      </p>
    );
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
