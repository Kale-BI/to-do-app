import { expect, test } from "@playwright/test";

test("filter tabs narrow task lines and default to All per sheet", async ({
  page,
}) => {
  const email = `e2e-filter-${Date.now()}@example.com`;

  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByRole("button", { name: "Create account" }).click();

  await page.getByLabel("New list name").fill("Groceries");
  await page.getByRole("button", { name: "Add", exact: true }).click();

  await page.getByRole("button", { name: /start typing, or press \//i }).click();
  await page.keyboard.type("Buy milk");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Buy bread");

  await page.getByText("Buy bread").hover();
  await page.getByRole("button", { name: "Cross off Buy bread" }).click();
  await expect(page.getByRole("button", { name: "Uncross Buy bread" })).toBeVisible();

  await expect(page.getByRole("tab", { name: "All" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.getByRole("tab", { name: "Active" }).click();
  await expect(page.getByText("Buy milk")).toBeVisible();
  await expect(page.getByText("Buy bread")).not.toBeVisible();

  await page.getByRole("tab", { name: "Completed" }).click();
  await expect(page.getByText("Buy bread")).toBeVisible();
  await expect(page.getByText("Buy milk")).not.toBeVisible();

  await page.getByRole("tab", { name: "All" }).click();
  await expect(page.getByText("Buy milk")).toBeVisible();
  await expect(page.getByText("Buy bread")).toBeVisible();

  // The filter is per sheet: a second list starts back on All.
  await page.getByLabel("New list name").fill("Errands");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Errands" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "All" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
