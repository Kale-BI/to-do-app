import { expect, test } from "@playwright/test";

test("create, rename, and delete a list; changes survive a reload", async ({
  page,
}) => {
  const email = `e2e-lists-${Date.now()}@example.com`;

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(
    page.getByText("No sheets yet — name one above to get started."),
  ).toBeVisible();

  await page.getByLabel("New list name").fill("Groceries");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByRole("button", { name: "Groceries", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Groceries", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Rename Groceries" }).click();
  await page.getByLabel("New name for Groceries").fill("Weekly shop");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Weekly shop", exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Weekly shop", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Delete Weekly shop" }).click();
  await page.getByRole("button", { name: "Tear up Weekly shop" }).click();
  await expect(
    page.getByText("No sheets yet — name one above to get started."),
  ).toBeVisible();
});
