import { authClient } from "./lib/auth-client";

export function Shell() {
  const { data: session } = authClient.useSession();

  return (
    <section className="flex w-full max-w-2xl flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Signed in as {session?.user.email}
        </p>
        <button
          type="button"
          onClick={() => void authClient.signOut()}
          className="rounded-md border px-3 py-1 text-sm"
        >
          Sign out
        </button>
      </div>
      <p className="py-12 text-muted-foreground">
        No lists yet — they arrive with the next ticket.
      </p>
    </section>
  );
}
