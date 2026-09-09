# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

An individual keeping personal to-do lists. Signs in with email/password, keeps a handful of named lists (errands, projects, groceries), and works through them over days — adding items, crossing them off, reorganizing. Single-user data: every list belongs to exactly one account.

## Product Purpose

A personal to-do app: capture tasks fast, see what's left, cross off what's done. Success is a list you trust — quick to add to, satisfying to complete, never in the way.

## Positioning

Each list is a single typed sheet you write on directly — tasks, headings, and notes live together in one document you edit in place (markdown shortcuts and a `/` block menu), rather than a form-and-rows CRUD screen. Completion is expressive: you cross a line off the page, you don't tick a box.

## Operating Context

Daily-driver utility, used in short frequent sessions on a laptop, sometimes at night (a dedicated night look exists). Monorepo: Hono + Drizzle/SQLite API (`apps/api`), React 19 + Vite + Tailwind 4 web client (`apps/web`), shared zod contracts (`packages/shared`). Auth via better-auth sessions. Issues/PRDs tracked in Linear (To-do App project, Engineering team, `ENG-<n>`).

## Capabilities and Constraints

- Auth: sign-up, sign-in, session gate, sign-out.
- Lists: create, rename, delete; owned by the signed-in user.
- Sheet content: blocks of kind todo / paragraph / heading 1 / heading 2 / divider, ordered within a list; todos toggle done.
- Editing: markdown-first line conversions (`# `, `## `, `---`, `[] `) and a `/` block menu (core set only in v1: to-do, heading 1, heading 2, paragraph, divider). Inline rich text (bold/italic) is explicitly out of scope for v1.
- No checkboxes anywhere: completion is a strike-through drawn over the line (confirmed 2026-07-30).
- No collaboration, sharing, reminders, or due dates.
- Tests are part of done: vitest unit tests (API + web) and a Playwright full-journey smoke.

## Brand Commitments

Pinned visual world (user brief, 2026-07-30): the app is a sheet of paper; type is an old writing machine (typewriter). Done tasks get a line written over them. Destructive/complete affordances appear on hover. Dark theme is a "night desk" scene — the same paper under a desk lamp — not an inverted palette. The world reaches the whole app: auth, sidebar, and sheet.

## Product Principles

- The page is the interface: editing happens on the document itself, not in dialogs or side forms.
- Completion feels physical and earned — crossing off, not checking off.
- Keyboard-first: everything the `/` menu does has a typed markdown path.
- Expression never blocks the task: adding and crossing off a todo stays a two-second act.
- Contracts live in `packages/shared`; client and API both parse them.

## Evidence on Hand

Working incumbent implementation (auth, lists, todos CRUD, filters) with passing test suite. No marketing copy, testimonials, or metrics exist — none may be invented.
