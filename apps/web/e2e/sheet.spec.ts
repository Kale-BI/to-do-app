import { expect, test, type Page } from "@playwright/test";

async function registerAndOpenSheet(page: Page, slug: string) {
  const email = `e2e-${slug}-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();

  await page.getByLabel("New list name").fill("Groceries");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Groceries" })).toBeVisible();
  return email;
}

function patchSettled(page: Page, bodyIncludes: string) {
  return page.waitForResponse(
    (res) =>
      res.url().includes("/api/blocks/") &&
      res.request().method() === "PATCH" &&
      (res.request().postData() ?? "").includes(bodyIncludes),
  );
}

// The reader's own calendar day, the way the browser reads it.
function isoDaysAhead(days: number): string {
  const now = new Date();
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const month = String(day.getMonth() + 1).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${String(day.getDate()).padStart(2, "0")}`;
}

test("write lines, cross off, edit, and delete on the sheet; ink survives a reload", async ({
  page,
}) => {
  await registerAndOpenSheet(page, "sheet");

  // Start the sheet and type two task lines.
  await page.getByRole("button", { name: /start typing, or press \//i }).click();
  await page.keyboard.type("Buy milk");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Buy bread");
  await expect(page.getByText("Buy milk")).toBeVisible();
  await expect(page.getByText("Buy bread")).toBeVisible();

  // Cross one off: the line gets a stroke, not a checkbox.
  const settled = patchSettled(page, '"completed":true');
  await page.getByText("Buy milk").hover();
  await page.getByRole("button", { name: "Cross off Buy milk" }).click();
  await expect(page.getByRole("button", { name: "Uncross Buy milk" })).toBeVisible();
  await expect(page.locator('[data-kind="todo"][data-completed]')).toHaveCount(1);
  await settled;

  // Edit a line by typing at its end.
  const breadPatch = patchSettled(page, "and rye");
  await page.getByText("Buy bread").click();
  await page.keyboard.press("End");
  await page.keyboard.type(" and rye");
  await page.getByText("To-Do", { exact: true }).click(); // blur flushes the ink
  await breadPatch;
  await expect(page.getByText("Buy bread and rye")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Groceries", exact: true }).click();
  await expect(page.getByText("Buy bread and rye")).toBeVisible();
  await expect(page.getByRole("button", { name: "Uncross Buy milk" })).toBeVisible();

  // Delete a line from the margin.
  await page.getByText("Buy bread and rye").hover();
  await page.getByRole("button", { name: "Delete Buy bread and rye" }).click();
  await expect(page.getByText("Buy bread and rye")).not.toBeVisible();
  await expect(page.getByText("Buy milk")).toBeVisible();
});

test("Enter on an empty line exits the format instead of stacking placeholders", async ({
  page,
}) => {
  await registerAndOpenSheet(page, "empty-enter");

  await page.getByRole("button", { name: /start typing, or press \//i }).click();
  await page.keyboard.type("Buy milk");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-kind]")).toHaveCount(2);

  // Enter on the new empty todo demotes it to a paragraph…
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-kind="p"]')).toHaveCount(1);
  await expect(page.locator("[data-kind]")).toHaveCount(2);

  // …and Enter on the empty paragraph removes it. No placeholder trail.
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-kind]")).toHaveCount(1);

  // Focus fell back to the task line; a full Enter-Enter-Enter cycle
  // (split, demote, remove) always collapses back to one line.
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-kind]")).toHaveCount(1);
  await expect(page.getByText("Buy milk")).toBeVisible();
});

test("markdown shortcuts and the slash menu shape the sheet", async ({ page }) => {
  await registerAndOpenSheet(page, "blocks");

  await page.getByRole("button", { name: /start typing, or press \//i }).click();

  // "# " turns the line into a heading.
  await page.keyboard.type("# Weekend errands");
  await expect(
    page.locator('[data-kind="h1"]', { hasText: "Weekend errands" }),
  ).toBeVisible();

  // Enter after a heading yields a paragraph; "[] " turns it into a task.
  await page.keyboard.press("Enter");
  await page.keyboard.type("[] Fix the bike");
  await expect(
    page.locator('[data-kind="todo"]', { hasText: "Fix the bike" }),
  ).toBeVisible();

  // The slash menu inserts a divider.
  await page.keyboard.press("Enter");
  await page.keyboard.type("/");
  await expect(page.getByRole("listbox", { name: "Block menu" })).toBeVisible();
  await page.keyboard.type("div");
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-kind="divider"]')).toBeVisible();
  await expect(page.getByRole("listbox")).not.toBeVisible();

  // "---" also draws a divider.
  await page.keyboard.type("---");
  await expect(page.locator('[data-kind="divider"]')).toHaveCount(2);
});

test("a due date is typed as a token, pencilled in the margin, and cleared from it", async ({
  page,
}) => {
  await registerAndOpenSheet(page, "due");
  const tomorrow = isoDaysAhead(1);

  // Typing the token resolves it as the blank completes it: the token leaves
  // the line and the date appears in the margin instead.
  const dueSet = patchSettled(page, '"dueOn"');
  const textSaved = patchSettled(page, '"text":"Buy milk "');
  await page.getByRole("button", { name: /start typing, or press \//i }).click();
  await page.keyboard.type("Buy milk @tomorrow ");
  await expect(page.getByText("Buy milk", { exact: true })).toBeVisible();
  await expect(page.getByText("@tomorrow")).toHaveCount(0);
  const date = page.locator("[data-due]");
  await expect(date).toHaveAttribute("data-due", tomorrow);
  await expect(date).toHaveAttribute("data-due-state", "upcoming");
  await dueSet;
  await textSaved;

  // The API was sent a resolved date, never a token, so it survives a reload.
  await page.reload();
  await page.getByRole("button", { name: "Groceries", exact: true }).click();
  await expect(page.getByText("Buy milk", { exact: true })).toBeVisible();
  await expect(page.locator("[data-due]")).toHaveAttribute("data-due", tomorrow);
  await expect(page.getByText("@tomorrow")).toHaveCount(0);

  // Crossing the line off strikes the typed text; the date fades instead.
  await page.getByText("Buy milk").hover();
  await page.getByRole("button", { name: "Cross off Buy milk" }).click();
  await expect(page.locator("[data-due]")).toHaveAttribute("data-due-state", "done");

  // Clearing happens from the margin, the only place it can happen.
  const dueCleared = patchSettled(page, '"dueOn":null');
  await page.locator("[data-due]").click();
  await page.getByRole("button", { name: "Clear the due date on Buy milk" }).click();
  await expect(page.locator("[data-due]")).toHaveCount(0);
  await dueCleared;
});
