import { expect, test } from "@playwright/test";

test("landing page should be reachable", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /毕设不再难/i })
  ).toBeVisible();
});

