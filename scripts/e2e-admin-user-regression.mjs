import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const LOGIN_IDENTIFIER = process.env.E2E_LOGIN_IDENTIFIER ?? "15811410745";
const LOGIN_PASSWORD = process.env.E2E_LOGIN_PASSWORD ?? "15811410745";
const ARTIFACT_DIR = path.resolve("test-results");

async function ensureArtifactDir() {
  await fs.mkdir(ARTIFACT_DIR, { recursive: true });
}

function hasRuntimeCrash(bodyText) {
  return /Application error|Unhandled Runtime Error|500 Internal Server Error|Cannot read properties of undefined|TypeError:/i.test(
    bodyText
  );
}

async function checkPageHealthy(page, pathname) {
  await page.goto(pathname, { waitUntil: "networkidle" });
  const body = await page.locator("body").innerText();
  if (hasRuntimeCrash(body)) {
    throw new Error(`页面异常: ${pathname}`);
  }
  return {
    path: pathname,
    title: await page.title(),
    h1: ((await page.locator("h1").first().textContent().catch(() => "")) ?? "").trim(),
  };
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: BASE_URL,
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();
  const stamp = Date.now();
  const screenshotPath = path.join(
    ARTIFACT_DIR,
    `e2e-admin-user-regression-${stamp}.png`
  );

  try {
    console.log("[A1] 登录");
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill("#identifier", LOGIN_IDENTIFIER);
    await page.fill("#password", LOGIN_PASSWORD);
    await page.locator("input[type='checkbox']").first().check();
    await page.locator("form").first().locator("button[type='submit']").click();
    await page.waitForURL("**/admin", { timeout: 60_000 });

    console.log("[A2] 用户端页面巡检");
    const userPaths = [
      "/dashboard",
      "/workspace",
      "/dashboard/referral",
      "/dashboard/profile",
      "/dashboard/billing",
    ];
    const userResults = [];
    for (const p of userPaths) {
      userResults.push(await checkPageHealthy(page, p));
    }

    console.log("[A3] 邀请推广功能检查");
    await page.goto("/dashboard/referral", { waitUntil: "networkidle" });
    const referralApi = await page.evaluate(async () => {
      const res = await fetch("/api/referral", { method: "GET" });
      const json = await res.json().catch(() => null);
      return {
        ok: res.ok,
        success: Boolean(json?.success),
      };
    });
    if (!referralApi.ok || !referralApi.success) {
      throw new Error("邀请推广页未成功加载 referral 数据");
    }

    const hasInviteLink = await page.evaluate(() =>
      Array.from(document.querySelectorAll("input")).some((i) =>
        typeof i.value === "string" && i.value.includes("ref=")
      )
    );
    if (!hasInviteLink) {
      throw new Error("邀请推广页未检测到带 ref 参数的推广链接");
    }

    console.log("[A4] 管理员页面巡检");
    const adminPaths = [
      "/admin",
      "/admin/users",
      "/admin/workspaces",
      "/admin/tasks",
      "/admin/usage",
      "/admin/orders",
      "/admin/models",
      "/admin/templates",
      "/admin/announcements",
      "/admin/platform",
      "/admin/audit-logs",
    ];
    const adminResults = [];
    for (const p of adminPaths) {
      adminResults.push(await checkPageHealthy(page, p));
    }

    console.log("[A5] 模型连接测试按钮冒烟");
    await page.goto("/admin/models", { waitUntil: "networkidle" });
    const testButton = page
      .locator("button")
      .filter({ hasText: /测试|娴嬭瘯/ })
      .first();
    await testButton.waitFor({ state: "visible", timeout: 30_000 });
    const modelTestResponse = page.waitForResponse(
      (r) =>
        r.url().includes("/api/admin/models/test") &&
        r.request().method() === "POST",
      { timeout: 30_000 }
    );
    await testButton.click();
    const modelResp = await modelTestResponse;
    if (modelResp.status() >= 500) {
      throw new Error(`模型测试接口异常: ${modelResp.status()}`);
    }

    console.log("[A6] 系统公告发布功能冒烟");
    await page.goto("/admin/announcements", { waitUntil: "networkidle" });
    const titleInput = page.locator("input").first();
    const contentArea = page.locator("textarea").first();
    await titleInput.fill(`E2E公告-${stamp}`);
    await contentArea.fill("这是一条 e2e 浏览器回归测试公告，请忽略。");

    const publishButton = page
      .locator("button")
      .filter({ hasText: /发布|鍙戝竷/ })
      .first();
    await publishButton.waitFor({ state: "visible", timeout: 30_000 });

    const publishRespPromise = page.waitForResponse(
      (r) =>
        r.url().includes("/api/admin/announcements") &&
        r.request().method() === "POST",
      { timeout: 30_000 }
    );
    await publishButton.click();
    const publishResp = await publishRespPromise;
    if (!publishResp.ok()) {
      throw new Error(`公告发布失败: HTTP ${publishResp.status()}`);
    }

    const summary = {
      ok: true,
      at: new Date().toISOString(),
      userResults,
      adminResults,
      modelTestStatus: modelResp.status(),
      announcementPublishStatus: publishResp.status(),
    };
    const summaryPath = path.join(
      ARTIFACT_DIR,
      `e2e-admin-user-regression-${stamp}.json`
    );
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf8");
    console.log(`E2E_ADMIN_USER_OK: ${summaryPath}`);
  } catch (error) {
    await ensureArtifactDir();
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.error(`E2E_ADMIN_USER_FAILED, screenshot: ${screenshotPath}`);
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
