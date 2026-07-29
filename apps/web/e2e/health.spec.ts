import { expect, test } from "@playwright/test";

test("a signed-out visitor is gated to sign-in and sees the API's healthy status", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "To-Do" })).toBeVisible();
  await expect(page.getByText("API: ok")).toBeVisible();
});
