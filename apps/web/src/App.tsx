import { HealthStatus } from "./HealthStatus";

export function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2">
      <h1 className="text-2xl font-semibold">To-Do</h1>
      <HealthStatus />
    </main>
  );
}
