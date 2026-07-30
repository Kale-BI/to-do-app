import { useState, type FormEvent, type ReactNode } from "react";

export function AuthForm({
  title,
  submitLabel,
  onSubmit,
  footer,
}: {
  title: string;
  submitLabel: string;
  onSubmit: (email: string, password: string) => Promise<string | null>;
  footer: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    const failure = await onSubmit(
      String(form.get("email")),
      String(form.get("password")),
    );
    setBusy(false);
    if (failure) setError(failure);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="paper sheet-stack sheet-enter w-full max-w-sm px-8 py-10 sm:px-10">
        <h1 className="typed text-center text-lg tracking-[0.16em] text-ink uppercase">
          To-Do
        </h1>
        <hr className="mx-auto mt-3 w-16 border-t border-ink/30" />
        <hr className="mx-auto mt-0.5 mb-8 w-16 border-t border-ink/30" />
        <h2 className="typed mb-6 text-[1.0625rem] tracking-[0.05em] text-ink uppercase">
          {title}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="flex flex-col gap-1">
            <span className="desk-label text-[0.6875rem] text-ink-faded">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="typed-input w-full text-[0.9375rem]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="desk-label text-[0.6875rem] text-ink-faded">
              Password
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="typed-input w-full text-[0.9375rem]"
            />
          </label>
          {error ? (
            <p role="alert" className="typed text-sm text-ribbon">
              {error} — check it and try again.
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="typed-btn focus-pencil mt-2 w-full py-2.5 text-xs text-ink"
          >
            {busy ? "One moment…" : submitLabel}
          </button>
        </form>
        <p className="typed mt-6 text-center text-sm text-ink-faded">{footer}</p>
      </section>
    </main>
  );
}
