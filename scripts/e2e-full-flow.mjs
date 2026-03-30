import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const LOGIN_IDENTIFIER = process.env.E2E_LOGIN_IDENTIFIER ?? "15811410745";
const LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD ?? "15811410745";
const TOPIC = process.env.E2E_TOPIC ?? "基于 Vue3 的校园二手交易平台";

const ARTIFACT_DIR = path.resolve("test-results");

async function ensureArtifactDir() {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
}

async function waitForStepCompletion(page, stepTitle, timeoutMs) {
  const titleNode = page.getByText(stepTitle, { exact: true }).first();
  await titleNode.waitFor({ state: "visible", timeout: 30_000 });

  const stepCard = titleNode
    .locator("xpath=ancestor::div[contains(@class,'rounded-lg border p-3')]")
    .first();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const text = await stepCard.innerText();
    if (text.includes("失败") || text.includes("任务失败")) {
      throw new Error(`${stepTitle} 执行失败:\n${text}`);
    }
    if (text.includes("完成") || text.includes("已完成")) {
      return text;
    }
    await page.waitForTimeout(5_000);
  }

  throw new Error(`${stepTitle} 超时未完成（>${Math.floor(timeoutMs / 1000)}s）`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();

  const stamp = Date.now();
  const workspaceName = `E2E浏览器全链路-${stamp}`;
  const screenshotPath = path.join(ARTIFACT_DIR, `e2e-full-flow-${stamp}.png`);

  try {
    console.log("[1/8] 打开登录页并登录");
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill("#identifier", LOGIN_IDENTIFIER);
    await page.fill("#password", LOGIN_PASSWORD);
    await page.locator("input[type='checkbox']").first().check();
    await page.locator("form").first().locator("button[type='submit']").click();
    await page.waitForURL("**/admin", { timeout: 60_000 });

    console.log("[2/8] 创建工作空间");
    await page.goto("/workspace", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "新建项目" }).first().click();
    let dialog = page.getByRole("dialog");
    const opened = await dialog
      .waitFor({ state: "visible", timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (!opened) {
      await page.getByRole("button", { name: "新建项目" }).first().click();
      await dialog.waitFor({ state: "visible", timeout: 8_000 });
    }

    await dialog.getByRole("button", { name: "我已有题目，直接输入" }).click();

    dialog = page.getByRole("dialog");
    await dialog.getByPlaceholder("如：基于 Vue3 的校园二手交易平台").fill(TOPIC);
    await dialog.getByRole("button", { name: "下一步" }).click();
    await dialog.locator("input").first().fill(workspaceName);
    await dialog.getByRole("button", { name: "下一步：查看功能清单" }).click();

    dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "确认创建工作空间" })
      .waitFor({ state: "visible", timeout: 180_000 });
    await dialog.getByRole("button", { name: "确认创建工作空间" }).click();

    await page.waitForURL("**/workspace/**", { timeout: 60_000 });
    console.log(`workspace: ${page.url()}`);

    console.log("[3/8] 功能确认与难度评估");
    await page.getByRole("button", { name: "确认当前功能" }).click();
    await page.getByText("综合分：").first().waitFor({ timeout: 180_000 });

    console.log("[4/8] 生成代码");
    await page.getByRole("button", { name: "生成代码" }).click();
    await waitForStepCompletion(page, "生成项目代码", 20 * 60_000);

    console.log("[5/8] 代码预览");
    await page.getByRole("button", { name: /^预览$/ }).first().click();
    await page.getByRole("dialog").getByText("项目预览").waitFor({ timeout: 30_000 });
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 10_000 });
    await page.getByRole("button", { name: "预览通过" }).click();

    console.log("[6/8] 生成论文");
    await page.getByRole("button", { name: "生成论文" }).click();
    await waitForStepCompletion(page, "生成毕业论文", 20 * 60_000);

    console.log("[7/8] 下载验证");
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 120_000 }),
      page.getByRole("button", { name: "下载全部" }).click(),
    ]);
    console.log(`download: ${download.suggestedFilename()}`);

    console.log("[8/8] 管理端关键页面冒烟");
    const adminPaths = [
      "/admin",
      "/admin/users",
      "/admin/workspaces",
      "/admin/tasks",
      "/admin/usage",
      "/admin/models",
      "/admin/templates",
      "/admin/announcements",
      "/admin/platform",
      "/admin/audit-logs",
    ];

    for (const p of adminPaths) {
      await page.goto(p, { waitUntil: "networkidle" });
      const body = await page.locator("body").innerText();
      if (/Application error|Unhandled Runtime Error|500 Internal Server Error/i.test(body)) {
        throw new Error(`管理端页面异常: ${p}`);
      }
    }

    console.log("E2E_FULL_FLOW_OK");
  } catch (error) {
    await ensureArtifactDir();
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error(`E2E_FULL_FLOW_FAILED, screenshot: ${screenshotPath}`);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
