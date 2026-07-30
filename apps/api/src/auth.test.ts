import { MeResponseSchema } from "@todo/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createPgliteDb } from "./db";

const EMAIL = "user@example.com";
const PASSWORD = "correct-horse-battery";

function jsonRequest(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
    },
    body: JSON.stringify(body),
  };
}

function signUp(app: ReturnType<typeof createApp>, email = EMAIL) {
  return app.request(
    "/api/auth/sign-up/email",
    jsonRequest({ email, password: PASSWORD, name: "Test User" }),
  );
}

function sessionCookie(res: Response): string {
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("expected a set-cookie header");
  return cookie;
}

describe("auth", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    app = createApp(await createPgliteDb());
  });

  it("registers with email + password and lands signed in", async () => {
    const res = await signUp(app);

    expect(res.status).toBe(200);

    const me = await app.request("/api/me", {
      headers: { cookie: sessionCookie(res) },
    });

    expect(me.status).toBe(200);
    const parsed = MeResponseSchema.parse(await me.json());
    expect(parsed.user.email).toBe(EMAIL);
  });

  it("signs in an existing account with a cookie session", async () => {
    await signUp(app);

    const res = await app.request(
      "/api/auth/sign-in/email",
      jsonRequest({ email: EMAIL, password: PASSWORD }),
    );

    expect(res.status).toBe(200);

    const me = await app.request("/api/me", {
      headers: { cookie: sessionCookie(res) },
    });

    expect(me.status).toBe(200);
    expect(MeResponseSchema.parse(await me.json()).user.email).toBe(EMAIL);
  });

  it("rejects sign-in with a wrong password", async () => {
    await signUp(app);

    const res = await app.request(
      "/api/auth/sign-in/email",
      jsonRequest({ email: EMAIL, password: "wrong-password" }),
    );

    expect(res.status).toBe(401);
  });

  it("returns 401 for session-gated requests without a valid session", async () => {
    const anonymous = await app.request("/api/me");
    expect(anonymous.status).toBe(401);

    const forged = await app.request("/api/me", {
      headers: { cookie: "better-auth.session_token=forged" },
    });
    expect(forged.status).toBe(401);
  });

  it("invalidates the cookie session on sign-out", async () => {
    const cookie = sessionCookie(await signUp(app));

    const signOut = await app.request("/api/auth/sign-out", {
      ...jsonRequest({}),
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        cookie,
      },
    });
    expect(signOut.status).toBe(200);

    const me = await app.request("/api/me", { headers: { cookie } });
    expect(me.status).toBe(401);
  });
});
