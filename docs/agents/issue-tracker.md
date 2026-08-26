# Issue tracker: Linear

Issues and PRDs for this repo live in Linear, in the **To-do App** project on the **Eng** team (issue keys `VETTA-<n>`). Use the `linear-server` MCP tools for all operations.

- Project: `To-do App` (https://linear.app/vetta/project/to-do-app-fb8a539c66e3)
- Team: `Eng`

## Conventions

- **Create an issue**: `save_issue` with `title`, `team: "Eng"`, `project: "To-do App"`, and a Markdown `description`. Do not pass `id` when creating.
- **Read an issue**: `get_issue` with the identifier (e.g. `VETTA-42`); pass `includeRelations: true` when blocking/related links matter. Fetch discussion with `list_comments`.
- **List issues**: `list_issues` with `project: "To-do App"`, plus `state`, `label`, or `assignee` filters as needed. Use `fields` to keep responses lean (e.g. `["title", "status", "labels", "assignee", "parentId"]`).
- **Comment on an issue**: `save_comment` with `issueId` and a Markdown `body`.
- **Apply / remove labels**: `save_issue` with the `labels` array. It **replaces the full label set**, so read the issue's current labels first and send the complete desired list.
- **Close**: `save_issue` with `state: "Done"`; use `state: "Canceled"` for work that will not be actioned. Leave a closing `save_comment` explaining why.

Triage label vocabulary is defined in `docs/agents/triage-labels.md`. It is a closed set of four waiting states, all of which already exist in Linear — do not create new triage labels.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

Pull requests still live on GitHub. When set to `yes`, PRs run through the same triage vocabulary using the `gh` CLI:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

Cross-linking: reference Linear issues from PRs by identifier (`VETTA-42`) in the PR title or branch name — Linear links them automatically. `get_issue` returns a suggested `gitBranchName`.

## When a skill says "publish to the issue tracker"

Create a Linear issue in the **To-do App** project (`save_issue`).

## When a skill says "fetch the relevant ticket"

Run `get_issue` with the `VETTA-<n>` identifier, then `list_comments` for the discussion.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single issue with **child** issues as tickets.

- **Map**: a single issue labelled `wayfinder:map`, holding the Notes / Decisions-so-far / Fog body. Create with `save_issue` (`labels: ["wayfinder:map"]`).
- **Child ticket**: an issue created with `parentId` set to the map issue — Linear sub-issues are native. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: Linear's native issue relations. Add an edge with `save_issue` on the child passing `blockedBy: ["VETTA-<blocker>"]` (append-only; remove with `removeBlockedBy`). Read edges back with `get_issue` + `includeRelations: true`. A ticket is unblocked when every blocker is completed or canceled.
- **Frontier query**: `list_issues` with `parentId: <map>` and `state: "started"`-or-`"backlog"`/`"unstarted"` state types (i.e. not completed/canceled); drop any with an open blocker (check relations) or an assignee; first in map order wins.
- **Claim**: `save_issue` with `assignee: "me"` — the session's first write.
- **Resolve**: `save_comment` with the answer, then `save_issue` with `state: "Done"`, then append a context pointer (gist + link) to the map's Decisions-so-far.
