---
name: To-Do
description: A typed sheet of paper on a desk — typewriter ink, drawn red strikes, pencil affordances.
colors:
  desk: "oklch(0.48 0.045 125)"
  desk-deep: "oklch(0.4 0.05 125)"
  desk-text: "oklch(0.975 0.008 100)"
  desk-text-dim: "oklch(0.93 0.02 110)"
  paper: "oklch(0.965 0.012 95)"
  paper-shade: "oklch(0.93 0.014 95)"
  paper-edge: "oklch(0.88 0.016 95)"
  ink: "oklch(0.27 0.015 80)"
  ink-faded: "oklch(0.54 0.012 80)"
  ink-faint: "oklch(0.7 0.012 85)"
  ribbon: "oklch(0.5 0.17 27)"
  ribbon-faded: "oklch(0.62 0.13 27)"
  pencil: "oklch(0.48 0.01 80)"
  highlight: "oklch(0.9 0.07 90)"
  lamp: "transparent"
typography:
  display:
    fontFamily: "'Special Elite', 'Courier Prime', 'Courier New', monospace"
    fontSize: "1.625rem"
    fontWeight: 400
    letterSpacing: "0.08em"
  headline:
    fontFamily: "'Special Elite', 'Courier Prime', 'Courier New', monospace"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.07em"
  title:
    fontFamily: "'Special Elite', 'Courier Prime', 'Courier New', monospace"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0.05em"
  body:
    fontFamily: "'Special Elite', 'Courier Prime', 'Courier New', monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: "'Courier Prime', 'Courier New', monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    letterSpacing: "0.12em"
rounded:
  sm: "1px"
  md: "2px"
  lg: "2px"
  xl: "3px"
components:
  button-typed:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.375rem 0.875rem"
  button-typed-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  input-typed:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "0"
    padding: "0.25rem 0.125rem"
  sheet-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  menu-paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    width: "14rem"
---

# Design System: To-Do

## Overview

**Creative North Star: "The Typed Sheet on the Desk"**

Every to-do list is a physical sheet of paper typed on an old writing machine, lying on a desk. The desk is the app chrome; the sheet is the interface. Nothing here looks like a program: there are no checkbox rows, no toolbars, no dialogs floating in a void. Editing happens on the page itself, affordances appear like pencil marks in the margin when the hand hovers a line, and finishing a task means drawing a ribbon-red stroke through it. The world reaches the whole app — the auth card is a typed sheet, the sidebar is a stack of sheets, even the loading copy speaks in desk language ("Opening the desk…", "Fetching the sheet…").

The system has exactly two materials and two voices. Materials: warm-white grained paper (everything you write on) and the desk beneath it (olive blotter by day, lamp-lit dark wood by night). Voices: Special Elite — the unsteady typewriter face — for everything typed on paper, and Courier Prime — uppercase, letterspaced — for desk labels and controls. Color is nearly monochrome ink-on-paper; the single chromatic accent is ribbon red, reserved for the strike, destructive actions, and error ink.

This build refuses the CRUD arrangement entirely (pinned direction, 2026-07-30). It is quiet, tactile, and paper-first: hand-drawn SVG strokes instead of geometric primitives, near-square corners, dashed pencil focus outlines, and motion that reads as paper settling and pen drawing rather than UI transitioning.

**Key Characteristics:**
- Paper is the only surface; the desk is the only backdrop.
- No checkboxes anywhere — completion is a red strike drawn over the line.
- Two type voices: typewriter ink on paper, uppercase Courier desk labels.
- One chromatic accent (ribbon red) with one job family: strike, destroy, error.
- Affordances hide in the margins until hover/focus, like pencil marks.
- Dark mode is a scene change (night desk under a lamp), not a palette inversion.

## Colors

An ink-on-paper monochrome world with one green-olive backdrop and one red accent; every value is authored in OKLCH (the normative format, defined in `apps/web/src/index.css`).

### Primary
- **Typewriter Ink** (`--ink`): the primary "foreground" — all typed text on paper, the sheet title, filled hover state of buttons, caret color, and selection text. It is a soft warm near-black, not pure black; nothing on paper is `#000`.
- **Faded Ink** (`--ink-faded`): completed (struck) task text, placeholders, hints, secondary copy on paper, resting icon color for margin tools.
- **Faint Ink** (`--ink-faint`): the lightest ink — resting input underlines and the hand-drawn divider stroke.

### Secondary
- **Ribbon Red** (`--ribbon`): the typewriter's red ribbon and the only chromatic accent. Used for the drawn completion strike, the strike/unstrike margin buttons, destructive hover ("Tear up"), error ink in forms, and the unreachable-API badge. It maps to `--destructive` in the shadcn layer.
- **Ribbon Faded** (`--ribbon-faded`): reserved softer ribbon tone (defined, lightly used).

### Tertiary
- **Pencil** (`--pencil`): graphite gray for drawn non-ink affordances — the dashed focus outline and the pencil ellipse circling the active filter (in night mode the ring/outline switch to `--desk-text`/currentColor to stay visible).
- **Highlight** (`--highlight`): warm yellow text-selection background (`::selection`), like a highlighter pass.

### Neutral
- **Paper** (`--paper`): the sheet itself — every card, popover, sidebar sheet, and the slash-menu scrap. Always rendered with the grain texture, never flat.
- **Paper Shade** (`--paper-shade`): the sheets underneath in a stack, muted/secondary surfaces.
- **Paper Edge** (`--paper-edge`): borders and input strokes on paper.
- **Desk** (`--desk`): the backdrop — olive blotter by day. Carries a linen weave texture and a soft vignette; never hosts text directly except desk labels.
- **Desk Deep** (`--desk-deep`): darker desk reserve tone.
- **Desk Text** (`--desk-text`): near-white type sitting on the desk (session strip, sidebar heading, lamp toggle).
- **Desk Text Dim** (`--desk-text-dim`): dimmer desk copy — loading lines, placeholder text on the desk, health status.
- **Lamp** (`--lamp`): the lamp pool overlay — `transparent` by day; becomes a warm glow at night.

### The Night Desk scene

`.dark` is not an inversion — it re-lights the same scene. The desk becomes dark wood (`--desk: oklch(0.23 0.02 65)`, `--desk-deep: oklch(0.17 0.018 65)`), a lamp pool appears (`--lamp: oklch(0.84 0.07 85 / 0.3)` radial at the top of the viewport), and the paper warms one shade (`--paper: oklch(0.93 0.022 90)`, `--paper-shade: oklch(0.89 0.024 90)`, `--paper-edge: oklch(0.84 0.026 88)`). Ink deepens fractionally (`--ink: oklch(0.26 0.018 75)`, `--ink-faded: oklch(0.52 0.015 75)`, `--ink-faint: oklch(0.68 0.015 80)`), desk text warms (`--desk-text: oklch(0.87 0.025 85)`, `--desk-text-dim: oklch(0.76 0.025 80)`), and the accents shift subtly (`--ribbon: oklch(0.49 0.16 27)`, `--ribbon-faded: oklch(0.6 0.12 27)`, `--pencil: oklch(0.46 0.012 75)`, `--highlight: oklch(0.87 0.08 88)`). The toggle is a drawn lamp icon fixed top-right; the choice persists in `localStorage` and defaults to `prefers-color-scheme`.

### Named Rules
**The One Ribbon Rule.** Ribbon red is the only saturated color in the app, and it means exactly one family of things: crossed off, torn up, or gone wrong. Never use it decoratively.

**The No Pure Black Rule.** Ink is warm and soft (`oklch(0.27 0.015 80)`); shadows are the only place true black (as alpha) appears.

## Typography

**Sheet Font:** Special Elite (with Courier Prime, 'Courier New', monospace fallback) — `--font-sheet`, weight 400 only
**Desk Font:** Courier Prime (with 'Courier New', monospace fallback) — `--font-desk`, weights 400 and 700

**Character:** Two voices, strictly cast. Special Elite is the typewriter — slightly unsteady, inked, used for everything *written on paper*: task lines, headings, titles, placeholders, empty-state copy. Courier Prime is the desk — clean uppercase letterspaced labels for everything *around* the paper: buttons, filter tabs, field labels, the session strip, slash-menu hints. Both are loaded via `@fontsource`; `--font-heading` aliases the sheet voice and `--font-sans` aliases the desk voice so shadcn-layer components inherit the world.

### Hierarchy
- **Display** (400, 1.625rem, 0.08em tracking, uppercase): the sheet title — an editable input styled as typed capitals at the top of each sheet. The auth card title uses the same voice at 1.125rem/0.16em.
- **Headline** (400, 1.375rem, 1.5 line-height, 0.07em tracking, uppercase): `h1` blocks on the sheet.
- **Title** (400, 1.0625rem, 1.6 line-height, 0.05em tracking, uppercase): `h2` blocks on the sheet; auth form subtitle.
- **Body** (400, 0.9375rem, 1.9 line-height): the writing line — todos, paragraphs, placeholders, empty states. The generous 1.9 leading is the typewriter's line spacing and gives the strike room to draw.
- **Label** (400–700, 0.6875rem, 0.12em tracking, uppercase): desk labels (`.desk-label`) — filter tabs, sidebar heading "The stack", field labels, session strip. Buttons use the bold (700) cut at 0.1em tracking; hints and status lines drop to 0.625rem.

### Named Rules
**The Two Voices Rule.** If it's written *on* paper, it's Special Elite. If it labels the desk or a control, it's uppercase Courier Prime. No third font, no exceptions — including loading and error copy.

**The Uppercase Headings Rule.** Sheet headings (title, h1, h2) are uppercase with positive tracking, like typed capitals; body lines are sentence case.

## Layout

The desk fills the viewport (`min-height: 100vh`, fixed-attachment background). Content sits in a centered `max-w-5xl` container: a fixed-width sheet-stack sidebar on the left (13rem / `w-52` at `sm:`, full-width stacked above it on small screens) and the selected sheet as the main column (`flex-1`, effectively ~42rem). The sheet itself is one tall piece of paper — `min-h-[78vh]`, padded `px-10 pt-12 pb-6` (`sm:px-16`) — with the typed title and filter tabs on one baseline row, a ruled `hr` beneath (border `ink/25`), then the block lines.

Each block line is a three-column grid — `2rem | 1fr | 2rem` — pulled `-mx-8` into the sheet's padding so the outer columns act as *margins* of the page: strike/unstrike tools live in the left margin, delete in the right. Below the last line, a `min-h-16` flexible click target extends the writing surface — clicking the empty bottom of the page focuses the last line (or starts the sheet).

Desk chrome stays out of the page: a typed session strip across the top (app name left; email + sign-out right), the lamp toggle fixed top-right (`top-4 right-4`), and the API health line fixed bottom-left. Vertical rhythm on the sheet comes from line-height plus per-kind gaps (h1 `mt-5`, h2 `mt-3`, divider `my-2`, todos/paragraphs flush).

## Elevation & Depth

Depth is physical, not tonal: paper casts shadows on the desk, and nothing else does. Every `.paper` surface carries a two-part shadow — a tight contact edge plus a soft drop (`0 1px 2px oklch(0 0 0 / 0.2), 0 14px 34px -10px oklch(0 0 0 / 0.4)`). The main sheet and the auth card sit on `.sheet-stack`: two pseudo-element sheets in `--paper-shade`, rotated ±0.5° and offset a few px, so the page visibly rests on earlier pages. The desk adds ambient depth of its own — a fixed vignette (radial `oklch(0 0 0 / 0.22)` at the edges), the linen weave, and at night the lamp pool radial at the top of the viewport.

### Shadow Vocabulary
- **Paper contact + drop** (`box-shadow: 0 1px 2px oklch(0 0 0 / 0.2), 0 14px 34px -10px oklch(0 0 0 / 0.4)`): every sheet of paper on the desk.
- **Stacked-sheet edge** (`box-shadow: 0 1px 2px oklch(0 0 0 / 0.25)`): the shade-colored sheets beneath a stack.
- **Menu scrap** (`box-shadow: 0 2px 4px oklch(0 0 0 / 0.18), 0 12px 28px -8px oklch(0 0 0 / 0.4)`): the slash-menu paper scrap, hovering slightly closer than the sheet.

### Named Rules
**The Paper Casts Rule.** Only paper casts shadows. Buttons, inputs, icons, and text never carry their own box-shadow; they are marks *on* a surface, not surfaces.

**The Grain Rule.** Paper is never flat color: every paper surface layers the shared `--grain` SVG turbulence texture; the desk layers `--linen`. Both are inline data-URI SVGs in `index.css`.

## Shapes

The form language is paper and hand. Corners are near-square — the full radius scale is 1–3px (`sm` 1px, `md`/`lg` 2px, `xl` 3px); nothing is visibly rounded, ever. Straight geometry belongs to machines, so anything *drawn* is a hand-drawn SVG cubic curve with `stroke-linecap: round` and a slight waver: the completion strike, the pencil ellipse around the active filter, the divider rule, and every icon. Sidebar sheets in the stack tilt ±0.4–0.5° at rest (the selected one straightens and slides right instead), and stacked pseudo-sheets rotate likewise — right angles are for the sheet edge only.

Borders come in two grammars: solid 1px `--paper-edge` for paper edges, and *pencil* treatments — 1.5px dashed outlines for focus, a dashed `desk-text/50` border around the new-sheet form. Inputs have no box at all: a bottom border only (see Components).

**The Drawn Line Rule.** Any line that represents a hand gesture — strike, ring, divider, icon stroke — is an SVG path with a wobble, never a straight CSS border or `text-decoration`.

## Components

Motion note (applies across components): the world has three animations — `sheet-settle` (0.28s `cubic-bezier(0.16,1,0.3,1)`: the sheet drops ~10px and un-rotates 0.3° into place when it enters), `strike-draw` (0.4s `cubic-bezier(0.3,0,0.2,1)`: the red strike draws left-to-right via `stroke-dashoffset`), and `menu-in` (0.12s ease-out: the slash menu fades up 3px at 0.99 scale). Micro-transitions run at 0.12s ease-out (button fill, margin-tool reveal) and 150ms (sidebar tilt/slide). Under `prefers-reduced-motion: reduce`, all three animations and both transitions are disabled and the strike renders fully drawn.

### Buttons (`.typed-btn`)
- **Character:** a typed label stamped in a thin frame.
- **Shape:** near-square (2px radius), 1.5px solid `currentColor` border.
- **Style:** transparent background, bold uppercase Courier Prime (700, 0.1em tracking), padding 0.375rem 0.875rem (smaller variants down to `px-2 py-0.5` at 0.625rem). Ink-colored on paper; desk-text-colored on the desk; ribbon-colored for destructive ("Tear up").
- **Hover:** inverts — fills `--ink`, text turns `--paper` (0.12s ease-out).
- **Active:** presses down 1px (`translateY(1px)`).
- **Disabled:** opacity 0.55.
- **Focus:** pencil outline (see Focus below). There is no filled-by-default primary button anywhere.

### Inputs (`.typed-input`)
- **Character:** a line on the page you type onto, not a boxed field.
- **Style:** transparent background, no border except a 1px bottom border in `--ink-faint`; zero radius; Special Elite text; `--ink` caret; placeholder in `--ink-faded`.
- **Focus:** the underline sharpens to `--ink` and doubles (border + `box-shadow: 0 1px 0 var(--ink)`); no outline ring.
- **Labels:** desk-label style in `--ink-faded` above the field (auth form).
- **Error:** message in typed voice, ribbon red, `role="alert"` (no field-level border change).

### Focus (`.focus-pencil`)
- Every interactive element shows a pencil-drawn focus: `1.5px dashed var(--pencil)` outline, offset 3px, on `:focus-visible` only. In night mode the outline uses `currentColor` so it reads on dark surfaces.

### Margin tools (`.line-tool`)
- **Character:** pencil marks in the page margin that appear when the hand hovers the line.
- **Behavior:** opacity 0 at rest; revealed (0.12s) by row hover, `:focus-within`, or their own `:focus-visible`. On touch devices (`hover: none`) they rest at opacity 0.6 instead of hiding.
- **Instances:** strike/unstrike (ribbon, left margin), delete line (`--ink-faded`, turning ribbon on hover, right margin), sidebar rename (pencil icon) and delete. All are 1.25rem (`h-5 w-5`) icon buttons.

### Cards / Paper surfaces (`.paper`, `.sheet-stack`, `.menu-paper`)
- **Corner Style:** 1px radius (2px for the menu scrap).
- **Background:** `--paper` + grain texture, `--ink` text.
- **Shadow Strategy:** paper contact + drop (see Elevation); `.sheet-stack` adds the two rotated under-sheets.
- **Border:** none on the sheet; 1px `--paper-edge` on the menu scrap.
- **Internal Padding:** the main sheet `px-10 pt-12 pb-6 sm:px-16`; the auth card `px-8 py-10 sm:px-10`; sidebar sheets `px-3 py-2`.

### The Sheet (signature: `sheet/Sheet.tsx`)
The whole document surface. Editable typed title (uppercase input, commits on blur/Enter), filter tabs on the same baseline, a ruled line, then contentEditable block lines of kinds `todo | p | h1 | h2 | divider`. Empty sheet shows a typed prompt ("Start typing, or press / for blocks…"); filtered-empty states answer in the world's voice ("Everything here is crossed off."). Markdown conversions happen as you type: `# `, `## `, `---`, `[] ` / `[ ] `. Cmd/Ctrl+Enter toggles a todo from the keyboard. Enters with `sheet-settle`.

### The Strike (signature: `StrikeOverlay` in `BlockLine.tsx`)
Completion, and the reason there are no checkboxes. A single-line task gets an absolutely positioned SVG path in `--ribbon` (`.strike-path`: stroke-width 1.75, round caps, wavering cubic curve) sized to the text width, drawn with `strike-draw` on toggle; wrapped tasks fall back to a per-visual-line repeating-gradient rule in `--ribbon` at 0.8 opacity. Struck text fades to `--ink-faded` but stays legible. Toggling back removes the strike without animation.

### The Due Date (signature: `DueMargin` in `BlockLine.tsx`, `.due-mark` / `.due-slot`)
A date penciled into the line's right margin — a fixed `4.75rem` column between the words and the tear-up mark, so the strike stops before it. The date is a desk-label annotation at 0.625rem (`29 AUG`, gaining a two-digit year only when it is another year), sitting on the line's baseline: `--ink-faded` at rest, full `--ink` once it is late, `--ink-faint` once the task is crossed off — a finished task's date recedes and stops reading as late. No pill, no badge, no ribbon red; only task lines wear one.

Dates are typed as part of writing the line — `buy milk @friday` — from a fixed vocabulary (`today`, `tomorrow`, weekday names and their three-letter forms, ISO days), resolved in the browser and consumed out of the text once a space or the line's commit finishes the token. For anyone who does not know the token, the margin is also the affordance: a `.line-tool` "Date" mark appears on hover with an invisible native picker over it, and a hidden-at-rest cross beside a set date clears it. Clearing lives only there — there is no clearing token.

### Slash Menu (`SlashMenu.tsx`, `.menu-paper`)
A scrap of grained paper (`w-56`, 2px radius, `menu-in` animation) opened by typing `/` in a line, positioned by the caret's line (flips above when near the viewport bottom). Exactly five core blocks: To-do, Heading 1, Heading 2, Paragraph, Divider — each row a pencil icon + typed label + desk-label markdown hint (`[]`, `#`, `##`, `---`). Filterable by typing; arrow keys/Enter/Escape drive it from the line; active row gets an `ink/8` wash. No other blocks exist in v1.

### Sidebar — the stack (`Sidebar.tsx`)
The list of lists as a pile of small paper sheets on the desk. Desk-label heading "The stack"; a dashed-border new-sheet form with a typed inline input and a small typed-btn. Each sheet: paper surface, typed name, resting at alternating ±0.4–0.5° tilt and opacity 0.85; the selected sheet straightens and slides right 1.5px (`translate-x-1.5`, 150ms). Rename swaps the row for an inline typed-input form; delete asks in place on the paper — "Tear up ‘name’? Every line on it goes too." with a ribbon "Tear up" typed-btn. No modals.

### Navigation / Filter tabs
Desk-label buttons (All / Active / Completed, `role="tablist"`) at 0.6875rem; inactive tabs in `--ink-faded` (hover to `--ink`), the active tab in `--ink` with the signature pencil-ring — a hand-drawn SVG ellipse (`.pencil-ring`, 1.25 stroke, `--pencil`, non-scaling) circled around the word, as if marked in pencil.

### Auth card (`AuthForm.tsx`)
The world's front door: a centered `max-w-sm` paper sheet on a stack (with `sheet-settle`), typed uppercase "To-Do" masthead over a double ruled line, typed section title, desk-label field labels, typed-input fields, a full-width typed-btn, and typed footer links. Errors are ribbon-red typed lines.

### Desk chrome (`Shell.tsx`, `App.tsx`, `HealthStatus.tsx`)
Text sitting directly on the desk in desk voices: the session strip (desk-label app name, small desk-text email, typed-btn sign out), the lamp toggle (drawn `LampIcon`, fixed top-right, `aria-pressed`), loading lines in desk-label dim, and the health status fixed bottom-left (0.625rem desk-label; hops onto a small paper badge in ribbon red only when the API is unreachable).

### Icons (`sheet/icons.tsx`)
A closed, hand-drawn set — no icon library. Grammar: single pencil-weight strokes (`stroke-width` 1.5, secondary strokes 1.1–1.25), `currentColor`, round caps and joins, no filled shapes, every line a slightly unsteady cubic curve, 16×16 viewBox (lamp 20×20). Set: Strike, Unstrike, Cross, Pencil, TaskLine, Heading1, Heading2, Paragraph, Divider, Lamp.

## Do's and Don'ts

### Do:
- **Do** put every writable surface on `.paper` with the grain texture and the paper shadow; put every ambient label directly on the desk in desk voice.
- **Do** draw completion as the ribbon strike (`.strike-path` + `strike-draw`) and fade struck text to `--ink-faded` — struck lines stay on the page and stay legible.
- **Do** hide per-line actions with `.line-tool` until hover/focus-within, and keep them at resting opacity 0.6 on touch devices.
- **Do** use `.focus-pencil` (1.5px dashed pencil outline, 3px offset) on every interactive element, and `.typed-btn` / `.typed-input` for controls — ink-inverting hover, underline-only fields.
- **Do** confirm destruction in place, on the paper, in the world's language ("Tear up…?") — never in a modal.
- **Do** honor `prefers-reduced-motion`: no settle, no menu-in, strike pre-drawn.
- **Do** author new colors in OKLCH and give every token a night-desk value in `.dark` that re-lights the scene rather than inverting it.

### Don't:
- **Don't** render a checkbox, toggle, or tick mark anywhere — completion is the strike; this is a pinned product commitment.
- **Don't** use ribbon red for anything but strike/destroy/error, and don't introduce a second accent color.
- **Don't** use rounded corners beyond 3px, filled buttons at rest, boxed inputs, or drop shadows on non-paper elements.
- **Don't** pull in an icon library or use straight CSS lines for strikes, dividers, or rings — drawn lines are wobbling SVG paths in the icon grammar.
- **Don't** use a third typeface, non-uppercase desk labels, or `text-decoration: line-through`.
- **Don't** open dialogs, drawers, or side panels for editing — the page is the interface; the slash menu's paper scrap is the only floating surface.
