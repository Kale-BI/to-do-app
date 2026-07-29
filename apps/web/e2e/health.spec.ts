import { expect, test } from "@playwright/test";

test("the page shows the API's healthy status", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "To-Do" })).toBeVisible();
  await expect(page.getByText("API: ok")).toBeVisible();
});
