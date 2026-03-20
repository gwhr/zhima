import { expect, test, type Page } from "@playwright/test";

const RUN_LIVE = process.env.E2E_LIVE === "1";

async function waitForStepCompletion(
  page: Page,
  stepTitle: string,
  timeoutMs: number
) {
  const titleNode = page.getByText(stepTitle, { exact: true }).first();
  await expect(titleNode).toBeVisible({ timeout: 30_000 });

  const stepCard = titleNode
    .locator("xpath=ancestor::div[contains(@class,'rounded-lg border p-3')]")
    .first();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const content = await stepCard.innerText();
    if (content.includes("失败")) {
      throw new Error(`${stepTitle} 执行失败。\n${content}`);
    }
    if (content.includes("已完成")) {
      return;
    }
    await page.waitForTimeout(5_000);
  }

  throw new Error(`${stepTitle} 超时未完成（>${timeoutMs / 1000}s）`);
}

test.describe("live browser full-flow", () => {
  test.skip(!RUN_LIVE, "Set E2E_LIVE=1 to run live full-flow browser test.");

  test("register -> create workspace -> generate code/thesis -> preview/download", async ({
    page,
  }) => {
    test.setTimeout(25 * 60_000);

    const stamp = Date.now();
    const email = `e2e.live.${stamp}@example.com`;
    const password = "Passw0rd!123";
    const topic = "基于 Vue3 的校园二手交易平台";
    const projectName = `E2E全链路-${stamp}`;

    await page.goto("/register");
    await page.locator("#reg-email").fill(email);
    await page.locator("#reg-password").fill(password);
    await page.locator("#reg-confirm").fill(password);
    await page.getByRole("button", { name: "注册" }).click();
    await page.waitForURL("**/dashboard", { timeout: 60_000 });

    await page.goto("/workspace");
    await expect(page.getByRole("heading", { name: "我的工作空间" })).toBeVisible();

    const createButton = page.getByRole("button", {
      name: /新建项目|创建第一个项目/,
    });
    await createButton.first().click();

    await expect(page.getByText("选题推荐")).toBeVisible();
    await page.getByRole("button", { name: "我已有题目，直接输入" }).click();
    await page.getByPlaceholder("如：基于 Vue3 的校园二手交易平台").fill(topic);
    await page.getByRole("button", { name: "下一步" }).click();

    await page.getByLabel("项目名称").fill(projectName);
    await page.getByRole("button", { name: "下一步：查看功能清单" }).click();

    await expect(page.getByRole("button", { name: "确认创建工作空间" })).toBeVisible({
      timeout: 120_000,
    });
    await page.getByRole("button", { name: "确认创建工作空间" }).click();

    await page.waitForURL("**/workspace/**", { timeout: 60_000 });
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible();

    await page.getByRole("button", { name: "生成代码" }).click();
    await waitForStepCompletion(page, "生成项目代码", 12 * 60_000);

    const codeCard = page
      .locator("div")
      .filter({ hasText: "项目源代码" })
      .filter({ hasText: "下载" })
      .first();
    await expect(codeCard).toBeVisible();
    await expect(codeCard).not.toContainText("尚未生成");

    await page.getByRole("button", { name: "生成论文" }).click();
    await waitForStepCompletion(page, "生成毕业论文", 12 * 60_000);

    const thesisCard = page
      .locator("div")
      .filter({ hasText: "毕业论文" })
      .filter({ hasText: "下载" })
      .first();
    await expect(thesisCard).toBeVisible();
    await expect(thesisCard).not.toContainText("尚未生成");

    await page.getByRole("button", { name: "预览" }).click();
    await expect(page.getByRole("dialog")).toContainText("项目预览");
    await page.getByRole("button", { name: "文件浏览" }).click();
    await expect(page.getByRole("dialog")).toContainText("源代码");

    const previewDialog = page.getByRole("dialog");
    const codePre = previewDialog.locator("pre").first();
    await expect(codePre).toBeVisible({ timeout: 30_000 });
    await expect(codePre).not.toContainText("选择左侧文件查看内容");

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const downloadPromise = page.waitForEvent("download", { timeout: 120_000 });
    await page.getByRole("button", { name: "下载全部" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain(".zip");
  });
});
