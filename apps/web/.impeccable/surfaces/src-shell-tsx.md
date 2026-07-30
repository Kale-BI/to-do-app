---
version: 1
slug: "src-shell-tsx"
primary_target: "src/Shell.tsx"
related_targets: ["src/TodoPane.tsx","src/Sidebar.tsx","src/App.tsx","src/SignInPage.tsx","src/SignUpPage.tsx"]
---

# Surface: app shell (lists + sheet editor + auth)

Scope: the whole signed-in app plus auth pages. Visitor mode: **Operate** — the user came to capture and cross off tasks; expression may never slow that down.

Audience & job: one person, short daily sessions, laptop, sometimes at night. Job: open a list, add lines, strike lines through, occasionally restructure with headings/dividers.

Chosen direction (brief-pinned): **the typed sheet**. Each list is a single sheet of typewriter paper on a desk. Typewriter face for all type. No checkboxes: a todo is a typed line; hover reveals margin affordances (strike, delete); completing draws an ink line across the text. Markdown-first editing with a `/` block menu (core set: to-do, h1, h2, paragraph, divider). Sidebar = the desk's stack of labeled sheets. Auth = a typed form. Dark theme = night desk: same paper in a lamp pool on a dark desk, toggled by a lamp control.

Memorable moment: the strike — an ink line drawn left-to-right across a finished task, text settling to faded ink.

Constraints: existing REST contracts extended, not replaced; unit + e2e tests updated; no inline rich text in v1; no invented content or claims.

Unresolved: block reordering by drag (v1 ships order-by-position, insertion via Enter only); inline bold/italic deferred.
