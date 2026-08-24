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

// The margin annotation, read off the browser's own clock the same way the
// client resolves the token.
function pencilled(day: Date): string {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${day.getDate()} ${months[day.getMonth()]}`;
}

test("a date typed onto a line is pencilled into the margin, and cleared from it", async ({
  page,
}) => {
  await registerAndOpenSheet(page, "due");

  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  // Typing the token dates the line: the token is consumed out of the text
  // and the day appears in the margin.
  const dueSet = patchSettled(page, '"dueOn"');
  await page.getByRole("button", { name: /start typing, or press \//i }).click();
  await page.keyboard.type("Buy milk @tomorrow ");
  await expect(page.getByText("Buy milk", { exact: true })).toBeVisible();
  await expect(page.getByText(pencilled(tomorrow))).toBeVisible();
  await dueSet;

  // Text that is not a token is left alone as content.
  await page.keyboard.press("Enter");
  await page.keyboard.type("Email bob@example.com ");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Email bob@example.com")).toBeVisible();
  await expect(page.locator("[data-due]")).toHaveCount(1);

  // The margin affordance dates a line for anyone who does not know the token.
  const secondSet = patchSettled(page, '"dueOn"');
  await page.getByLabel("Set date for Email bob@example.com").fill("2020-01-15");
  await secondSet;
  await expect(page.getByText("15 JAN 20")).toBeVisible();
  await expect(page.locator("[data-overdue]")).toHaveCount(1);

  await page.reload();
  await page.getByRole("button", { name: "Groceries", exact: true }).click();
  await expect(page.getByText(pencilled(tomorrow))).toBeVisible();

  // Crossing the line off does not score out its date: the strike stops at
  // the margin and the date reads more faintly.
  const struck = patchSettled(page, '"completed":true');
  await page.getByText("Buy milk", { exact: true }).hover();
  await page.getByRole("button", { name: "Cross off Buy milk" }).click();
  await struck;
  await expect(page.locator('[data-completed][data-due]')).toHaveCount(1);
  await expect(page.getByText(pencilled(tomorrow))).toBeVisible();

  // Clearing is available only in the margin — there is no clearing token.
  const cleared = patchSettled(page, '"dueOn":null');
  await page.getByText("Buy milk", { exact: true }).hover();
  await page.getByRole("button", { name: "Clear date for Buy milk" }).click();
  await cleared;
  await expect(page.getByText(pencilled(tomorrow))).not.toBeVisible();
  await expect(page.getByText("Buy milk", { exact: true })).toBeVisible();
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
