import { expect, test } from "@playwright/test";

test("full journey: register → list → todos → toggle → filter → sign out", async ({
  page,
}) => {
  const email = `e2e-journey-${Date.now()}@example.com`;

  // Register a fresh account and land signed in.
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  // Create a list.
  await page.getByLabel("New list name").fill("Groceries");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Groceries" })).toBeVisible();

  // Add todos.
  await page.getByLabel("New todo title").fill("Buy milk");
  await page.getByRole("button", { name: "Add todo" }).click();
  await page.getByLabel("New todo title").fill("Buy bread");
  await page.getByRole("button", { name: "Add todo" }).click();
  await expect(page.getByText("Buy milk")).toBeVisible();
  await expect(page.getByText("Buy bread")).toBeVisible();

  // Toggle one complete.
  await page.getByLabel("Toggle Buy milk").click();
  await expect(page.getByLabel("Toggle Buy milk")).toBeChecked();
  await expect(page.getByText("Buy milk")).toHaveCSS(
    "text-decoration-line",
    "line-through",
  );

  // Filter to Active, then Completed.
  await page.getByRole("tab", { name: "Active" }).click();
  await expect(page.getByText("Buy bread")).toBeVisible();
  await expect(page.getByText("Buy milk")).not.toBeVisible();

  await page.getByRole("tab", { name: "Completed" }).click();
  await expect(page.getByText("Buy milk")).toBeVisible();
  await expect(page.getByText("Buy bread")).not.toBeVisible();

  // Sign out lands back on the sign-in gate.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
