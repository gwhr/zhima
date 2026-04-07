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
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(workspace.topic)} · 关键页面预览</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      padding: 18px 20px 14px;
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;
      box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
    }
    .title {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .title h1 {
      margin: 0;
      font-size: 20px;
      letter-spacing: 0.2px;
    }
    .badge {
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      background: #e0f2fe;
      color: #0369a1;
    }
    .summary {
      margin: 8px 0 0;
      font-size: 13px;
      color: #475569;
      line-height: 1.6;
    }
    .meta {
      margin-top: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .meta-item {
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 11px;
      color: #0f172a;
    }
    .tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 20px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .tab-btn {
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #334155;
      border-radius: 999px;
      padding: 7px 14px;
      font-size: 12px;
      cursor: pointer;
      transition: all .15s ease;
    }
    .tab-btn.active {
      border-color: #0ea5e9;
      background: #0ea5e9;
      color: #fff;
      box-shadow: 0 8px 20px rgba(14, 165, 233, 0.25);
    }
    .tab-content {
      padding: 18px 20px 22px;
    }
    .panel {
      display: none;
      gap: 14px;
    }
    .panel.active {
      display: grid;
    }
    .panel-home {
      grid-template-columns: 1.2fr 1fr;
    }
    .panel-list {
      grid-template-columns: 1fr;
    }
    .panel-admin {
      grid-template-columns: 1fr 1fr;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #fff;
      padding: 14px;
      box-shadow: 0 8px 22px rgba(2, 6, 23, 0.05);
    }
    .card h3 {
      margin: 0 0 10px;
      font-size: 14px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }
    .kpi {
      border: 1px solid #dbeafe;
      border-radius: 10px;
      padding: 10px;
      background: #eff6ff;
    }
    .kpi p {
      margin: 0;
      font-size: 11px;
      color: #475569;
    }
    .kpi strong {
      display: block;
      margin-top: 6px;
      font-size: 18px;
      color: #0f172a;
    }
    .role-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 8px;
    }
    .role-list li {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 8px 10px;
      display: grid;
      gap: 3px;
    }
    .role-list strong { font-size: 13px; }
    .role-list span { font-size: 12px; color: #64748b; line-height: 1.5; }
    .module-grid {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .module-item {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px;
      background: #f8fafc;
    }
    .module-item h4 {
      margin: 0;
      font-size: 13px;
    }
    .feature-tags {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .feature-tags span {
      border-radius: 999px;
      background: #e0f2fe;
      color: #0369a1;
      padding: 3px 8px;
      font-size: 11px;
    }
    .run-card {
      border: 1px dashed #94a3b8;
      background: #f8fafc;
      border-radius: 10px;
      padding: 10px;
      font-size: 12px;
      line-height: 1.6;
      color: #334155;
      margin-top: 10px;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .toolbar select, .toolbar input {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      background: #fff;
      color: #0f172a;
      font-size: 12px;
      padding: 7px 10px;
      min-width: 190px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    th, td {
      padding: 9px 10px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      font-size: 12px;
      white-space: nowrap;
    }
    th { background: #f8fafc; color: #475569; }
    .status {
      display: inline-flex;
      border-radius: 999px;
      padding: 2px 8px;
      background: #dcfce7;
      color: #166534;
      font-size: 11px;
    }
    .admin-kpis {
      display: grid;
      gap: 10px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .admin-card {
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      background: linear-gradient(145deg, #f8fafc, #fff);
      padding: 12px;
    }
    .admin-card p {
      margin: 0;
      font-size: 11px;
      color: #64748b;
    }
    .admin-card strong {
      margin-top: 6px;
      display: block;
      font-size: 20px;
      color: #0f172a;
    }
    .table-wrap { overflow: auto; border-radius: 10px; }
    @media (max-width: 980px) {
      .panel-home, .panel-admin { grid-template-columns: 1fr; }
      .kpi-grid { grid-template-columns: 1fr; }
      .module-grid { grid-template-columns: 1fr; }
      .admin-kpis { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="header">
    <div class="title">
      <h1>${escapeHtml(workspace.name)} · 关键页面预览</h1>
      <span class="badge">静态示例</span>
      <span class="badge">${escapeHtml(previewPreset.label)}</span>
      <span class="badge">${escapeHtml(databaseLabel)}</span>
      <span class="badge">${escapeHtml(frontendLabel)}</span>
    </div>
    <p class="summary">${escapeHtml(summary)}</p>
    <div class="meta">
      <span class="meta-item">主题：${escapeHtml(workspace.topic)}</span>
      <span class="meta-item">运行方式：${escapeHtml(previewPreset.runtimeName)}</span>
      <span class="meta-item">默认入口：${escapeHtml(previewPreset.endpointHint)}</span>
    </div>
  </header>

  <nav class="tabs">
    <button class="tab-btn active" data-tab="home">首页预览</button>
    <button class="tab-btn" data-tab="list">列表页预览</button>
    <button class="tab-btn" data-tab="admin">管理页预览</button>
  </nav>

  <main class="tab-content">
    <section class="panel panel-home active" data-panel="home">
      <article class="card">
        <h3>项目概览</h3>
        <div class="kpi-grid">
          <div class="kpi">
            <p>系统角色</p>
            <strong>${roles.length || 1}</strong>
          </div>
          <div class="kpi">
            <p>功能模块</p>
            <strong>${moduleItems.length}</strong>
          </div>
          <div class="kpi">
            <p>数据库表</p>
            <strong>${tableItems.length}</strong>
          </div>
        </div>
        <div class="run-card">
          <strong>本地运行参考命令：</strong><br />
          ${escapeHtml(previewPreset.command)}<br /><br />
          <strong>说明：</strong>${escapeHtml(previewPreset.note)}
        </div>
      </article>
      <article class="card">
        <h3>角色权限</h3>
        <ul class="role-list" id="role-list"></ul>
      </article>
      <article class="card" style="grid-column: 1 / -1;">
        <h3>功能模块总览</h3>
        <div class="module-grid" id="module-grid"></div>
      </article>
    </section>

    <section class="panel panel-list" data-panel="list">
      <article class="card">
        <h3>业务数据列表页</h3>
        <div class="toolbar">
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <select id="table-select"></select>
            <input id="search-input" type="text" placeholder="搜索名称关键字（前端筛选）" />
          </div>
          <span style="font-size:12px;color:#64748b;">用于模拟用户端/运营端常见列表交互</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>ID</th><th>名称</th><th>状态</th><th>创建时间</th></tr>
            </thead>
            <tbody id="list-table-body"></tbody>
          </table>
        </div>
      </article>
    </section>

    <section class="panel panel-admin" data-panel="admin">
      <article class="card">
        <h3>管理端看板</h3>
        <div class="admin-kpis">
          <div class="admin-card">
            <p>今日请求数</p>
            <strong>${tableItems.length * 137}</strong>
          </div>
          <div class="admin-card">
            <p>待处理任务</p>
            <strong>${moduleItems.length * 3}</strong>
          </div>
          <div class="admin-card">
            <p>异常告警</p>
            <strong>${Math.max(1, Math.floor(moduleItems.length / 2))}</strong>
          </div>
          <div class="admin-card">
            <p>活跃用户</p>
            <strong>${roles.length * 24 + 86}</strong>
          </div>
        </div>
      </article>
      <article class="card">
        <h3>模块管理视图</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>模块</th><th>功能数</th><th>示例状态</th></tr>
            </thead>
            <tbody id="admin-module-body"></tbody>
          </table>
        </div>
      </article>
      <article class="card" style="grid-column: 1 / -1;">
        <h3>管理说明</h3>
        <p style="margin:0;font-size:13px;line-height:1.7;color:#334155;">
          这里展示的是关键页面效果预览，帮助用户理解“生成后大概长什么样”。真实工程代码请在“文件浏览”中查看，
          并下载到本地后按 README 启动后端与前端服务。
        </p>
      </article>
    </section>
  </main>

  <script>
    const modules = ${modulesJson};
    const tables = ${tablesJson};
    const mockData = ${mockDataJson};
    const roles = ${JSON.stringify(roles.length > 0 ? roles : [{ name: "默认角色", description: "根据你的题目自动生成" }])};

    const roleList = document.getElementById("role-list");
    const moduleGrid = document.getElementById("module-grid");
    const tableSelect = document.getElementById("table-select");
    const searchInput = document.getElementById("search-input");
    const listTableBody = document.getElementById("list-table-body");
    const adminModuleBody = document.getElementById("admin-module-body");

    function renderRoles() {
      roleList.innerHTML = "";
      roles.forEach((role) => {
        const li = document.createElement("li");
        const title = document.createElement("strong");
        title.textContent = role.name || "角色";
        const desc = document.createElement("span");
        desc.textContent = role.description || "—";
        li.appendChild(title);
        li.appendChild(desc);
        roleList.appendChild(li);
      });
    }

    function renderModules() {
      moduleGrid.innerHTML = "";
      modules.forEach((module) => {
        const item = document.createElement("div");
        item.className = "module-item";
        const h4 = document.createElement("h4");
        h4.textContent = module.name || "模块";
        const tags = document.createElement("div");
        tags.className = "feature-tags";
        (module.features || []).slice(0, 6).forEach((feature) => {
          const tag = document.createElement("span");
          tag.textContent = feature;
          tags.appendChild(tag);
        });
        if (!tags.childNodes.length) {
          const tag = document.createElement("span");
          tag.textContent = "基础增删改查";
          tags.appendChild(tag);
        }
        item.appendChild(h4);
        item.appendChild(tags);
        moduleGrid.appendChild(item);
      });
    }

    function renderTableOptions() {
      tableSelect.innerHTML = "";
      tables.forEach((table) => {
        const option = document.createElement("option");
        option.value = table;
        option.textContent = table;
        tableSelect.appendChild(option);
      });
    }

    function renderListRows() {
      const tableName = tableSelect.value || tables[0];
      const keyword = (searchInput.value || "").trim().toLowerCase();
      const rows = (mockData[tableName] || []).filter((row) =>
        !keyword || String(row.name || "").toLowerCase().includes(keyword)
      );
      listTableBody.innerHTML = "";
      rows.forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" + row.id + "</td>" +
          "<td>" + row.name + "</td>" +
          "<td><span class='status'>" + row.status + "</span></td>" +
          "<td>" + row.createdAt + "</td>";
        listTableBody.appendChild(tr);
      });
      if (!rows.length) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td colspan='4' style='text-align:center;color:#94a3b8;'>暂无匹配数据</td>";
        listTableBody.appendChild(tr);
      }
    }

    function renderAdminModules() {
      adminModuleBody.innerHTML = "";
      modules.forEach((module, index) => {
        const tr = document.createElement("tr");
        const featureCount = Array.isArray(module.features) ? module.features.length : 0;
        const status = index % 2 === 0 ? "运行中" : "待优化";
        tr.innerHTML =
          "<td>" + (module.name || ("模块" + (index + 1))) + "</td>" +
          "<td>" + (featureCount || 4) + "</td>" +
          "<td>" + status + "</td>";
        adminModuleBody.appendChild(tr);
      });
    }

    function bindTabs() {
      const buttons = document.querySelectorAll(".tab-btn");
      const panels = document.querySelectorAll(".panel");
      buttons.forEach((button) => {
        button.addEventListener("click", () => {
          const tab = button.getAttribute("data-tab");
          buttons.forEach((b) => b.classList.remove("active"));
          panels.forEach((p) => p.classList.remove("active"));
          button.classList.add("active");
          const target = document.querySelector('.panel[data-panel=\"' + tab + '\"]');
          if (target) target.classList.add("active");
        });
      });
    }

    renderRoles();
    renderModules();
    renderTableOptions();
    renderListRows();
    renderAdminModules();
    bindTabs();

    tableSelect.addEventListener("change", renderListRows);
    searchInput.addEventListener("input", renderListRows);
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
