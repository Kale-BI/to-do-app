import { expect, test } from "@playwright/test";

test("add, toggle, edit, and delete todos; changes survive a reload", async ({
  page,
}) => {
  const email = `e2e-todos-${Date.now()}@example.com`;

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();

  await page.getByLabel("New list name").fill("Groceries");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Groceries" })).toBeVisible();

  await page.getByLabel("New todo title").fill("Buy milk");
  await page.getByRole("button", { name: "Add todo" }).click();
  await page.getByLabel("New todo title").fill("Buy bread");
  await page.getByRole("button", { name: "Add todo" }).click();
  await expect(page.getByText("Buy milk")).toBeVisible();
  await expect(page.getByText("Buy bread")).toBeVisible();

  await page.getByLabel("Toggle Buy milk").click();
  await expect(page.getByLabel("Toggle Buy milk")).toBeChecked();
  await expect(page.getByText("Buy milk")).toHaveCSS(
    "text-decoration-line",
    "line-through",
  );

  await page.getByRole("button", { name: "Edit Buy bread" }).click();
  await page.getByLabel("New title for Buy bread").fill("Buy rye bread");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Buy rye bread")).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Groceries", exact: true }).click();
  await expect(page.getByText("Buy rye bread")).toBeVisible();
  await expect(page.getByLabel("Toggle Buy milk")).toBeChecked();

  await page.getByRole("button", { name: "Delete Buy rye bread" }).click();
  await expect(page.getByText("Buy rye bread")).not.toBeVisible();
  await expect(page.getByText("Buy milk")).toBeVisible();
});
