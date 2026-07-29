import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HealthStatus } from "./HealthStatus";

describe("HealthStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows a checking state, then the healthy status reported by the API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "ok" }), {
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    render(<HealthStatus />);

    expect(screen.getByText(/checking/i)).toBeDefined();
    expect(await screen.findByText(/api: ok/i)).toBeDefined();
  });

  it("shows an unreachable state when the API cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("boom")));

    render(<HealthStatus />);

    expect(await screen.findByText(/unreachable/i)).toBeDefined();
  });
});
