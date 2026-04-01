import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { syncRuntimePreviewQueue } from "@/lib/runtime-preview";

interface Role {
  name: string;
  description: string;
}

interface Module {
  name: string;
  features?: string[];
  enabled?: boolean;
}

interface Requirements {
  summary?: string;
  roles?: Role[];
  modules?: Module[];
  tables?: string[];
}

interface TechStack {
  backend?: string;
  database?: string;
  frontend?: string;
}

const DATABASE_LABELS: Record<string, string> = {
  mysql: "MySQL",
  postgresql: "PostgreSQL",
  mongodb: "MongoDB",
};

const FRONTEND_LABELS: Record<string, string> = {
  vue3: "Vue 3",
  react: "React",
};

interface PreviewRuntimePreset {
  id: string;
  label: string;
  runtimeName: string;
  command: string;
  endpointHint: string;
  note: string;
}

const PREVIEW_RUNTIME_PRESETS: Record<string, PreviewRuntimePreset> = {
  "java-springboot": {
    id: "java-springboot",
    label: "Java + SpringBoot",
    runtimeName: "Spring 容器（Mock）",
    command: "cd backend && mvn spring-boot:run",
    endpointHint: "/api/**",
    note: "适合 Java Web 毕设，默认按 Controller + Service + DAO 分层展示。",
  },
  "python-django": {
    id: "python-django",
    label: "Python + Django",
    runtimeName: "Django 开发服务（Mock）",
    command:
      "cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py runserver 0.0.0.0:8000",
    endpointHint: "/api/** 或 Django app 路由",
    note: "适合管理系统类毕设，默认按 project + app 结构展示。",
  },
  "python-flask": {
    id: "python-flask",
    label: "Python + Flask",
    runtimeName: "Flask 开发服务（Mock）",
    command:
      "cd backend && pip install -r requirements.txt && flask --app app run --host 0.0.0.0 --port 8000",
    endpointHint: "/api/**",
    note: "适合轻量 API / 管理后台，默认按 Blueprint 模块化展示。",
  },
  "python-fastapi": {
    id: "python-fastapi",
    label: "Python + FastAPI",
    runtimeName: "FastAPI 开发服务（Mock）",
    command:
      "cd backend && pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload",
    endpointHint: "/docs 与 /openapi.json",
    note: "适合接口驱动型毕设，默认按 router + schema 分层展示。",
  },
  "nodejs-express": {
    id: "nodejs-express",
    label: "Node.js + Express",
    runtimeName: "Express 运行时（Mock）",
    command: "cd backend && npm install && npm run dev",
    endpointHint: "/api/**",
    note: "适合全栈业务系统，默认按 route + controller 结构展示。",
  },
  "nodejs-koa": {
    id: "nodejs-koa",
    label: "Node.js + Koa",
    runtimeName: "Koa 运行时（Mock）",
    command: "cd backend && npm install && npm run dev",
    endpointHint: "/api/**",
    note: "适合轻中型业务系统，默认按 middleware + route 结构展示。",
  },
};

const DEFAULT_PREVIEW_PRESET: PreviewRuntimePreset = {
  id: "generic",
  label: "通用后端",
  runtimeName: "通用预览容器（Mock）",
  command: "cd backend && 参考 README 启动后端服务",
  endpointHint: "/api/**",
  note: "当前技术栈暂无专属预览模板，已切换为通用模式。",
};

function normalizeTechStack(value: unknown): TechStack {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  return {
    backend: typeof raw.backend === "string" ? raw.backend : undefined,
    database: typeof raw.database === "string" ? raw.database : undefined,
    frontend: typeof raw.frontend === "string" ? raw.frontend : undefined,
  };
}

function resolvePreviewPreset(backendValue: string | undefined): PreviewRuntimePreset {
  const key = (backendValue || "").trim().toLowerCase();
  if (key && PREVIEW_RUNTIME_PRESETS[key]) return PREVIEW_RUNTIME_PRESETS[key];
  return DEFAULT_PREVIEW_PRESET;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toList<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeRequirements(value: unknown): Requirements {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const raw = value as Record<string, unknown>;
  return {
    summary: typeof raw.summary === "string" ? raw.summary : undefined,
    roles: toList<Role>(raw.roles),
    modules: toList<Module>(raw.modules),
    tables: toList<string>(raw.tables),
  };
}

function buildMockRows(tableName: string, count = 5) {
  return Array.from({ length: count }, (_, index) => {
    const i = index + 1;
    return {
      id: i,
      name: `${tableName} 示例${i}`,
      status: i % 3 === 0 ? "处理中" : "正常",
      createdAt: `2026-03-${String(10 + i).padStart(2, "0")}`,
    };
  });
}

function buildPreviewHTML(workspace: {
  name: string;
  topic: string;
  requirements: Requirements;
  techStack: TechStack;
}) {
  const previewPreset = resolvePreviewPreset(workspace.techStack.backend);
  const databaseLabel = workspace.techStack.database
    ? DATABASE_LABELS[workspace.techStack.database] || workspace.techStack.database
    : "未指定";
  const frontendLabel = workspace.techStack.frontend
    ? FRONTEND_LABELS[workspace.techStack.frontend] || workspace.techStack.frontend
    : "未指定";
  const techStackSummary = `${previewPreset.label} + ${databaseLabel} + ${frontendLabel}`;

  const roles = workspace.requirements.roles ?? [];
  const modules =
    (workspace.requirements.modules ?? []).filter((item) => item.enabled !== false) || [];
  const tables = workspace.requirements.tables ?? [];
  const moduleItems =
    modules.length > 0
      ? modules
      : [
          {
            name: "核心模块",
            features: ["基础列表", "详情查看", "新增编辑", "状态管理"],
          },
        ];
  const tableItems = tables.length > 0 ? tables : ["users", "orders", "products"];
  const mockData = Object.fromEntries(
    tableItems.map((table) => [table, buildMockRows(table)])
  );

  const modulesJson = JSON.stringify(moduleItems);
  const tablesJson = JSON.stringify(tableItems);
  const mockDataJson = JSON.stringify(mockData);
  const summary = workspace.requirements.summary || "可运行项目脚手架预览（示例数据）";
  const roleHtml =
    roles.length > 0
      ? roles
          .map(
            (role) =>
              `<li><strong>${escapeHtml(role.name)}</strong><span>${escapeHtml(
                role.description || "—"
              )}</span></li>`
          )
          .join("")
      : "<li><strong>默认角色</strong><span>根据你的题目自动生成</span></li>";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(workspace.topic)} · 预览</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      height: 100vh;
      display: grid;
      grid-template-columns: 250px 1fr;
    }
    .sidebar {
      background: linear-gradient(180deg, #0f172a, #1e293b);
      color: #cbd5e1;
      padding: 18px 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .brand h1 {
      margin: 0;
      font-size: 18px;
      color: #fff;
    }
    .brand p {
      margin: 6px 0 0 0;
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .module-list {
      margin: 4px 0 0 0;
      padding: 0;
      list-style: none;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .module-list button {
      width: 100%;
      border: 0;
      border-radius: 8px;
      background: rgba(255,255,255,.06);
      color: #e2e8f0;
      text-align: left;
      padding: 10px 10px;
      cursor: pointer;
      font-size: 13px;
    }
    .module-list button.active { background: #0ea5e9; color: #fff; }
    .main {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .header {
      background: #fff;
      border-bottom: 1px solid #e2e8f0;
      padding: 14px 20px;
    }
    .header h2 {
      margin: 0;
      font-size: 19px;
    }
    .header p {
      margin: 6px 0 0 0;
      color: #475569;
      font-size: 13px;
      line-height: 1.5;
    }
    .content {
      padding: 16px 18px;
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 14px;
      overflow: auto;
    }
    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      box-shadow: 0 10px 25px rgba(2, 6, 23, .04);
    }
    .card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
    }
    .feature-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .feature-tags span {
      font-size: 12px;
      border-radius: 999px;
      padding: 4px 10px;
      background: #e0f2fe;
      color: #0369a1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      font-size: 12px;
      white-space: nowrap;
    }
    th { color: #475569; background: #f8fafc; }
    .status {
      display: inline-flex;
      border-radius: 999px;
      padding: 2px 8px;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 11px;
    }
    .role-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .role-list li {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
      display: grid;
      gap: 3px;
    }
    .role-list strong { font-size: 13px; }
    .role-list span { font-size: 12px; color: #64748b; }
    .runtime-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .runtime-item {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 9px 10px;
      background: #f8fafc;
    }
    .runtime-item p {
      margin: 0;
      font-size: 11px;
      color: #64748b;
    }
    .runtime-item strong {
      display: block;
      margin-top: 4px;
      font-size: 13px;
      color: #0f172a;
      word-break: break-all;
    }
    .runtime-command {
      margin-top: 10px;
      border-radius: 8px;
      background: #0f172a;
      color: #e2e8f0;
      padding: 10px;
      font-size: 12px;
      line-height: 1.55;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-word;
    }
    @media (max-width: 1000px) {
      body { grid-template-columns: 1fr; }
      .sidebar { display: none; }
      .content { grid-template-columns: 1fr; }
      .runtime-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <aside class="sidebar">
    <div class="brand">
      <h1>${escapeHtml(workspace.name)}</h1>
      <p>运行预览（示例数据）</p>
    </div>
    <ul class="module-list" id="module-list"></ul>
  </aside>
  <main class="main">
    <header class="header">
      <h2>${escapeHtml(workspace.topic)}</h2>
      <p>${escapeHtml(summary)}</p>
    </header>
    <section class="content">
      <article class="card" style="grid-column: 1 / -1;">
        <h3>预览运行环境</h3>
        <div class="runtime-grid">
          <div class="runtime-item">
            <p>技术栈组合</p>
            <strong>${escapeHtml(techStackSummary)}</strong>
          </div>
          <div class="runtime-item">
            <p>运行容器</p>
            <strong>${escapeHtml(previewPreset.runtimeName)}</strong>
          </div>
          <div class="runtime-item">
            <p>默认接口入口</p>
            <strong>${escapeHtml(previewPreset.endpointHint)}</strong>
          </div>
          <div class="runtime-item">
            <p>说明</p>
            <strong>${escapeHtml(previewPreset.note)}</strong>
          </div>
        </div>
        <pre class="runtime-command">${escapeHtml(previewPreset.command)}</pre>
      </article>
      <article class="card">
        <h3 id="module-title">模块详情</h3>
        <div id="module-features" class="feature-tags"></div>
      </article>
      <article class="card">
        <h3>系统角色</h3>
        <ul class="role-list">
          ${roleHtml}
        </ul>
      </article>
      <article class="card" style="grid-column: 1 / -1;">
        <h3 id="table-title">数据预览</h3>
        <div style="overflow:auto;">
          <table>
            <thead><tr><th>ID</th><th>名称</th><th>状态</th><th>创建时间</th></tr></thead>
            <tbody id="table-body"></tbody>
          </table>
        </div>
      </article>
    </section>
  </main>
  <script>
    const modules = ${modulesJson};
    const tables = ${tablesJson};
    const mockData = ${mockDataJson};
    let active = 0;

    const moduleList = document.getElementById("module-list");
    const moduleTitle = document.getElementById("module-title");
    const moduleFeatures = document.getElementById("module-features");
    const tableTitle = document.getElementById("table-title");
    const tableBody = document.getElementById("table-body");

    function render() {
      moduleList.innerHTML = "";
      modules.forEach((item, index) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.textContent = item.name || ("模块" + (index + 1));
        if (index === active) btn.classList.add("active");
        btn.onclick = () => {
          active = index;
          render();
        };
        li.appendChild(btn);
        moduleList.appendChild(li);
      });

      const module = modules[active] || modules[0] || { name: "核心模块", features: [] };
      moduleTitle.textContent = module.name || "模块详情";
      moduleFeatures.innerHTML = "";
      (module.features || []).forEach((feature) => {
        const tag = document.createElement("span");
        tag.textContent = feature;
        moduleFeatures.appendChild(tag);
      });

      const tableName = tables[active] || tables[0];
      tableTitle.textContent = "数据预览 · " + tableName;
      tableBody.innerHTML = "";
      (mockData[tableName] || []).forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + row.id + "</td><td>" + row.name + "</td><td><span class='status'>" + row.status + "</span></td><td>" + row.createdAt + "</td>";
        tableBody.appendChild(tr);
      });
    }

    render();
  </script>
</body>
</html>`;
}

function runtimeInfoPage(config: {
  title: string;
  desc: string;
  autoRefreshMs?: number;
}) {
  const autoRefreshScript = config.autoRefreshMs
    ? `setTimeout(() => location.reload(), ${config.autoRefreshMs});`
    : "";

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.title}</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      box-sizing: border-box;
    }
    .card {
      width: min(560px, 100%);
      border: 1px solid #e2e8f0;
      background: #fff;
      border-radius: 12px;
      padding: 20px 18px;
      box-shadow: 0 12px 30px rgba(2, 6, 23, 0.08);
    }
    h1 {
      margin: 0 0 8px 0;
      font-size: 18px;
    }
    p {
      margin: 0;
      color: #334155;
      line-height: 1.6;
      font-size: 14px;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <section class="card">
    <h1>${config.title}</h1>
    <p>${config.desc}</p>
  </section>
  <script>${autoRefreshScript}</script>
</body>
</html>`;
}

function readRuntimeMeta(result: unknown): {
  queuePosition: number;
  queueTotal: number;
  sessionExpiresAt: string | null;
} {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return {
      queuePosition: 0,
      queueTotal: 0,
      sessionExpiresAt: null,
    };
  }
  const root = result as Record<string, unknown>;
  const runtime =
    root.runtimePreview &&
    typeof root.runtimePreview === "object" &&
    !Array.isArray(root.runtimePreview)
      ? (root.runtimePreview as Record<string, unknown>)
      : {};
  return {
    queuePosition:
      typeof runtime.queuePosition === "number" && Number.isFinite(runtime.queuePosition)
        ? Math.max(0, Math.floor(runtime.queuePosition))
        : 0,
    queueTotal:
      typeof runtime.queueTotal === "number" && Number.isFinite(runtime.queueTotal)
        ? Math.max(0, Math.floor(runtime.queueTotal))
        : 0,
    sessionExpiresAt:
      typeof runtime.sessionExpiresAt === "string" && runtime.sessionExpiresAt.trim()
        ? runtime.sessionExpiresAt.trim()
        : null,
  };
}

function runtimeDecoratedHtml(html: string, expiresAt: string | null) {
  if (!expiresAt) return html;

  const banner = `<div id="runtime-banner" style="position:fixed;top:12px;right:12px;z-index:9999;background:#0ea5e9;color:#fff;padding:8px 12px;border-radius:999px;font-size:12px;box-shadow:0 8px 20px rgba(14,165,233,.35);">运行预览剩余：计算中...</div>
<script>
  (function(){
    var target = new Date(${JSON.stringify(expiresAt)}).getTime();
    var el = document.getElementById("runtime-banner");
    if (!el || !target || Number.isNaN(target)) return;
    function tick() {
      var left = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      var m = Math.floor(left / 60);
      var s = left % 60;
      el.textContent = "运行预览剩余：" + m + "m " + s + "s";
      if (left <= 0) {
        el.textContent = "运行时段已结束，页面将刷新";
        setTimeout(function(){ location.reload(); }, 1500);
      }
    }
    tick();
    setInterval(tick, 1000);
  })();
</script>`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${banner}</body>`);
  }
  return `${html}${banner}`;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return new Response("未授权", { status: 401 });

  const { id } = await params;
  const workspace = await db.workspace.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      name: true,
      topic: true,
      requirements: true,
      techStack: true,
    },
  });

  if (!workspace) return new Response("工作空间不存在", { status: 404 });
  if (workspace.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return new Response("无权限", { status: 403 });
  }

  const url = new URL(req.url);
  const runtimeMode = url.searchParams.get("runtime") === "1";
  const runtimeJobId = (url.searchParams.get("jobId") || "").trim();
  const normalizedTechStack = normalizeTechStack(workspace.techStack);

  if (runtimeMode) {
    await syncRuntimePreviewQueue();

    if (!runtimeJobId) {
      return new Response(
        runtimeInfoPage({
          title: "缺少运行任务",
          desc: "未传入运行预览任务参数，请返回后重新点击“启动运行预览”。",
        }),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "SAMEORIGIN",
          },
        }
      );
    }

    const previewJob = await db.taskJob.findFirst({
      where: {
        id: runtimeJobId,
        workspaceId: id,
        type: "PREVIEW",
      },
      select: {
        id: true,
        status: true,
        result: true,
      },
    });

    if (!previewJob) {
      return new Response(
        runtimeInfoPage({
          title: "运行任务不存在",
          desc: "当前运行预览任务不存在，可能已失效，请重新发起。",
        }),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "SAMEORIGIN",
          },
        }
      );
    }

    const runtimeMeta = readRuntimeMeta(previewJob.result);
    if (previewJob.status === "PENDING") {
      return new Response(
        runtimeInfoPage({
          title: "排队中",
          desc:
            runtimeMeta.queuePosition > 0
              ? `你已进入运行队列：第 ${runtimeMeta.queuePosition} 位（队列总计 ${runtimeMeta.queueTotal}）。\n请保持当前页面，系统会自动刷新。`
              : "你已进入运行队列，请稍候，系统会自动刷新。",
          autoRefreshMs: 2000,
        }),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "SAMEORIGIN",
          },
        }
      );
    }

    if (previewJob.status !== "RUNNING") {
      return new Response(
        runtimeInfoPage({
          title: "运行已结束",
          desc: "当前运行预览时段已结束，可重新排队启动。",
        }),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "SAMEORIGIN",
          },
        }
      );
    }

    const html = buildPreviewHTML({
      name: workspace.name,
      topic: workspace.topic,
      requirements: normalizeRequirements(workspace.requirements),
      techStack: normalizedTechStack,
    });

    return new Response(runtimeDecoratedHtml(html, runtimeMeta.sessionExpiresAt), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  }

  const html = buildPreviewHTML({
    name: workspace.name,
    topic: workspace.topic,
    requirements: normalizeRequirements(workspace.requirements),
    techStack: normalizedTechStack,
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
