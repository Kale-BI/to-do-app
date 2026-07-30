import { HealthResponseSchema } from "@todo/shared";
import { useEffect, useState } from "react";

type HealthState = "checking" | "ok" | "unreachable";

export function HealthStatus() {
  const [state, setState] = useState<HealthState>("checking");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/health")
      .then(async (res) => {
        const body = HealthResponseSchema.parse(await res.json());
        if (!cancelled) setState(body.status);
      })
      .catch(() => {
        if (!cancelled) setState("unreachable");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "checking") {
    return (
      <p className="desk-label hidden text-[0.625rem] text-desk-text-dim sm:block">
        Checking API…
      </p>
    );
  }

  if (state === "unreachable") {
    return (
      <p className="paper desk-label px-2 py-1 text-[0.625rem] text-ribbon">
        API: unreachable
      </p>
    );
  }

  return (
    <p className="desk-label hidden text-[0.625rem] text-desk-text-dim sm:block">
      API: {state}
    </p>
  );
}
