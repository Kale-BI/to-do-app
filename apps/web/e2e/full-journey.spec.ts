import { expect, test } from "@playwright/test";

test("full journey: register → sheet → type blocks → cross off → filter → sign out", async ({
  page,
}) => {
  const email = `e2e-journey-${Date.now()}@example.com`;

  // Register a fresh account and land signed in.
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  // Create a sheet.
  await page.getByLabel("New list name").fill("Groceries");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Groceries" })).toBeVisible();

  // Write on it: a heading, then two task lines.
  await page.getByRole("button", { name: /start typing, or press \//i }).click();
  await page.keyboard.type("# This weekend");
  await page.keyboard.press("Enter");
  await page.keyboard.type("[] Buy milk");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Buy bread");
  await expect(
    page.locator('[data-kind="h1"]', { hasText: "This weekend" }),
  ).toBeVisible();
  await expect(page.getByText("Buy milk")).toBeVisible();
  await expect(page.getByText("Buy bread")).toBeVisible();

  // Cross one off — a line is drawn over it, no checkbox anywhere.
  await page.getByText("Buy milk").hover();
  await page.getByRole("button", { name: "Cross off Buy milk" }).click();
  await expect(page.getByRole("button", { name: "Uncross Buy milk" })).toBeVisible();
  await expect(page.locator('[data-kind="todo"][data-completed]')).toHaveCount(1);

  // Filter to Active, then Completed; the heading stays on the sheet.
  await page.getByRole("tab", { name: "Active" }).click();
  await expect(page.getByText("Buy bread")).toBeVisible();
  await expect(page.getByText("Buy milk")).not.toBeVisible();
  await expect(page.getByText("This weekend")).toBeVisible();

  await page.getByRole("tab", { name: "Completed" }).click();
  await expect(page.getByText("Buy milk")).toBeVisible();
  await expect(page.getByText("Buy bread")).not.toBeVisible();

  // Sign out lands back on the sign-in gate.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
