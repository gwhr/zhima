import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";

interface Role { name: string; description: string }
interface Module { name: string; features: string[]; enabled: boolean }
interface Requirements {
  summary?: string;
  roles?: Role[];
  modules?: Module[];
  tables?: string[];
}

function generateMockData(tables: string[]): string {
  const mockMap: Record<string, () => object[]> = {
    users: () => [
      { id: 1, username: "admin", name: "系统管理员", role: "管理员", email: "admin@example.com", status: "正常", createdAt: "2026-01-15" },
      { id: 2, username: "librarian", name: "李图书", role: "图书管理员", email: "lib@example.com", status: "正常", createdAt: "2026-02-01" },
      { id: 3, username: "reader01", name: "张同学", role: "读者", email: "zhang@example.com", status: "正常", createdAt: "2026-03-10" },
      { id: 4, username: "reader02", name: "王同学", role: "读者", email: "wang@example.com", status: "正常", createdAt: "2026-03-12" },
    ],
    books: () => [
      { id: 1, title: "Java 核心技术", author: "凯·霍斯特曼", isbn: "978-7-111-61893-0", category: "计算机", stock: 5, borrowed: 2, status: "在库" },
      { id: 2, title: "数据结构与算法", author: "严蔚敏", isbn: "978-7-302-33064-6", category: "计算机", stock: 3, borrowed: 1, status: "在库" },
      { id: 3, title: "操作系统概念", author: "西尔伯沙茨", isbn: "978-7-111-64087-0", category: "计算机", stock: 4, borrowed: 0, status: "在库" },
      { id: 4, title: "计算机网络", author: "谢希仁", isbn: "978-7-121-31638-4", category: "计算机", stock: 6, borrowed: 3, status: "在库" },
      { id: 5, title: "人工智能导论", author: "王万良", isbn: "978-7-040-51856-1", category: "计算机", stock: 2, borrowed: 2, status: "借出" },
    ],
    borrow_records: () => [
      { id: 1, bookTitle: "Java 核心技术", borrower: "张同学", borrowDate: "2026-03-01", returnDate: "2026-03-15", status: "已归还" },
      { id: 2, bookTitle: "数据结构与算法", borrower: "王同学", borrowDate: "2026-03-05", returnDate: null, status: "借阅中" },
      { id: 3, bookTitle: "人工智能导论", borrower: "张同学", borrowDate: "2026-03-10", returnDate: null, status: "借阅中" },
      { id: 4, bookTitle: "计算机网络", borrower: "李同学", borrowDate: "2026-02-20", returnDate: "2026-03-05", status: "已归还" },
    ],
    orders: () => [
      { id: 1, orderNo: "ORD20260301001", customer: "张三", amount: 299.00, status: "已完成", createdAt: "2026-03-01" },
      { id: 2, orderNo: "ORD20260305002", customer: "李四", amount: 599.00, status: "待发货", createdAt: "2026-03-05" },
    ],
    products: () => [
      { id: 1, name: "商品A", price: 99.00, stock: 50, category: "电子产品", status: "上架" },
      { id: 2, name: "商品B", price: 199.00, stock: 30, category: "生活用品", status: "上架" },
    ],
  };

  const data: Record<string, object[]> = {};
  for (const table of tables) {
    const key = table.toLowerCase().replace(/[-\s]/g, "_");
    const generator = mockMap[key];
    data[key] = generator
      ? generator()
      : Array.from({ length: 4 }, (_, i) => ({
          id: i + 1,
          name: `${table} 示例 ${i + 1}`,
          status: i % 2 === 0 ? "正常" : "待处理",
          createdAt: `2026-03-${String(i + 10).padStart(2, "0")}`,
        }));
  }
  return JSON.stringify(data);
}

function buildPreviewHTML(workspace: {
  name: string;
  topic: string;
  techStack: Record<string, string>;
  requirements: Requirements;
}): string {
  const { requirements, topic } = workspace;
  const roles = requirements?.roles || [];
  const modules = requirements?.modules || [];
  const tables = requirements?.tables || [];
  const mockData = generateMockData(tables);

  const menuItems = modules.map((m, i) => `{ id: ${i}, name: '${m.name}', icon: '${["📋","📦","📊","⚙️","👤","📝","🔍","📁"][i % 8]}', features: ${JSON.stringify(m.features)} }`).join(",\n        ");

  const tableViews = tables.map((t) => {
    const key = t.toLowerCase().replace(/[-\s]/g, "_");
    return `
      case '${t}':
        return mockData['${key}'] || [];`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${topic}</title>
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"><\/script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; color: #333; }
  .layout { display: flex; height: 100vh; }
  .sidebar { width: 220px; background: #1e293b; color: #fff; display: flex; flex-direction: column; flex-shrink: 0; }
  .sidebar-header { padding: 20px 16px; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .sidebar-header h1 { font-size: 16px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sidebar-header p { font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .nav-menu { flex: 1; padding: 8px; overflow-y: auto; }
  .nav-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all .15s; margin-bottom: 2px; color: #cbd5e1; }
  .nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
  .nav-item.active { background: #3b82f6; color: #fff; }
  .nav-icon { font-size: 16px; }
  .sidebar-footer { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.1); }
  .user-info { display: flex; align-items: center; gap: 8px; }
  .avatar { width: 32px; height: 32px; border-radius: 50%; background: #3b82f6; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  .user-name { font-size: 12px; }
  .user-role { font-size: 10px; color: #94a3b8; }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { height: 56px; background: #fff; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; flex-shrink: 0; }
  .topbar h2 { font-size: 16px; font-weight: 600; }
  .topbar-actions { display: flex; gap: 8px; }
  .btn { padding: 6px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; border: 1px solid #d1d5db; background: #fff; transition: all .15s; }
  .btn:hover { background: #f9fafb; }
  .btn-primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
  .btn-primary:hover { background: #2563eb; }
  .btn-sm { padding: 4px 10px; font-size: 12px; }
  .btn-danger { color: #ef4444; border-color: #fca5a5; }
  .content { flex: 1; padding: 24px; overflow-y: auto; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .stat-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  .stat-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
  .stat-value { font-size: 28px; font-weight: 700; }
  .stat-value.blue { color: #3b82f6; }
  .stat-value.green { color: #10b981; }
  .stat-value.orange { color: #f59e0b; }
  .stat-value.purple { color: #8b5cf6; }
  .card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 16px; }
  .card-title { font-size: 15px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; padding: 10px 12px; font-size: 12px; color: #6b7280; font-weight: 500; border-bottom: 1px solid #e5e7eb; background: #f9fafb; }
  td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
  tr:hover td { background: #f9fafb; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .search-box { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px; width: 240px; outline: none; }
  .search-box:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
  .empty { text-align: center; padding: 60px 20px; color: #9ca3af; }
  .empty-icon { font-size: 48px; margin-bottom: 12px; }
  .features-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .feature-tag { padding: 3px 10px; background: #eff6ff; color: #3b82f6; border-radius: 6px; font-size: 11px; }
  .dashboard-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
  @media (max-width: 900px) { .dashboard-grid { grid-template-columns: 1fr; } .sidebar { display: none; } }
</style>
</head>
<body>
<div id="app">
  <div class="layout">
    <div class="sidebar">
      <div class="sidebar-header">
        <h1>{{projectName}}</h1>
        <p>{{currentRole}}</p>
      </div>
      <div class="nav-menu">
        <div v-for="item in menuItems" :key="item.id"
             :class="['nav-item', { active: activeMenu === item.id }]"
             @click="activeMenu = item.id">
          <span class="nav-icon">{{item.icon}}</span>
          <span>{{item.name}}</span>
        </div>
      </div>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="avatar">👤</div>
          <div>
            <div class="user-name">{{currentUser}}</div>
            <div class="user-role">{{currentRole}}</div>
          </div>
        </div>
      </div>
    </div>
    <div class="main">
      <div class="topbar">
        <h2>{{currentModuleName}}</h2>
        <div class="topbar-actions">
          <input class="search-box" placeholder="搜索..." v-model="searchQuery" />
          <button class="btn btn-primary" @click="showAddHint">+ 新增</button>
        </div>
      </div>
      <div class="content">
        <template v-if="activeMenu === -1">
          <div class="stats">
            <div class="stat-card" v-for="(s, i) in dashboardStats" :key="i">
              <div class="stat-label">{{s.label}}</div>
              <div :class="['stat-value', s.color]">{{s.value}}</div>
            </div>
          </div>
          <div class="dashboard-grid">
            <div class="card">
              <div class="card-title">最近操作</div>
              <table>
                <thead><tr><th>操作</th><th>对象</th><th>时间</th><th>状态</th></tr></thead>
                <tbody>
                  <tr v-for="r in recentActions" :key="r.id">
                    <td>{{r.action}}</td><td>{{r.target}}</td><td>{{r.time}}</td>
                    <td><span :class="'badge badge-' + r.badgeColor">{{r.status}}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="card">
              <div class="card-title">系统角色</div>
              <div v-for="role in roles" :key="role.name" style="padding:8px 0;border-bottom:1px solid #f3f4f6">
                <div style="font-size:13px;font-weight:500">{{role.name}}</div>
                <div style="font-size:11px;color:#6b7280;margin-top:2px">{{role.description}}</div>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="card">
            <div class="card-title">
              <span>{{currentModuleName}}</span>
              <span style="font-size:12px;color:#6b7280">共 {{filteredData.length}} 条记录</span>
            </div>
            <div class="features-list" style="margin-bottom:16px">
              <span class="feature-tag" v-for="f in currentFeatures" :key="f">{{f}}</span>
            </div>
            <table v-if="filteredData.length > 0">
              <thead><tr><th v-for="col in tableColumns" :key="col">{{col}}</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="row in filteredData" :key="row.id">
                  <td v-for="col in tableColumns" :key="col">
                    <span v-if="col==='status'||col==='状态'" :class="'badge badge-' + getStatusColor(row[col])">{{row[col]}}</span>
                    <span v-else>{{row[col]}}</span>
                  </td>
                  <td>
                    <button class="btn btn-sm" @click="showEditHint(row)">编辑</button>
                    <button class="btn btn-sm btn-danger" @click="showDeleteHint(row)" style="margin-left:4px">删除</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="empty" v-else>
              <div class="empty-icon">📭</div>
              <p>暂无数据</p>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
  <div v-if="toast" style="position:fixed;top:20px;right:20px;background:#1e293b;color:#fff;padding:12px 20px;border-radius:8px;font-size:13px;z-index:999;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:all .3s">
    {{toast}}
  </div>
</div>
<script>
const { createApp } = Vue;
const mockData = ${mockData};

createApp({
  data() {
    return {
      projectName: '${topic.replace(/'/g, "\\'")}',
      activeMenu: -1,
      searchQuery: '',
      currentUser: '管理员',
      currentRole: '${roles[0]?.name || "系统管理员"}',
      toast: '',
      menuItems: [
        { id: -1, name: '仪表盘', icon: '📊', features: ['数据概览','统计分析'] },
        ${menuItems}
      ],
      roles: ${JSON.stringify(roles)},
      dashboardStats: [
        ${tables.map((t, i) => {
          const colors = ['blue','green','orange','purple'];
          const counts = [156, 42, 89, 12];
          return `{ label: '${t}', value: ${counts[i % 4]}, color: '${colors[i % 4]}' }`;
        }).join(",\n        ")}
      ],
      recentActions: [
        { id: 1, action: '新增', target: '示例记录 #1', time: '3 分钟前', status: '成功', badgeColor: 'green' },
        { id: 2, action: '修改', target: '示例记录 #2', time: '10 分钟前', status: '成功', badgeColor: 'green' },
        { id: 3, action: '查询', target: '批量查询', time: '30 分钟前', status: '完成', badgeColor: 'blue' },
        { id: 4, action: '删除', target: '示例记录 #5', time: '1 小时前', status: '已处理', badgeColor: 'yellow' },
      ]
    };
  },
  computed: {
    currentModuleName() {
      const item = this.menuItems.find(m => m.id === this.activeMenu);
      return item ? item.name : '仪表盘';
    },
    currentFeatures() {
      const item = this.menuItems.find(m => m.id === this.activeMenu);
      return item ? item.features : [];
    },
    currentTableData() {
      const tables = ${JSON.stringify(tables)};
      const idx = this.activeMenu;
      if (idx < 0 || idx >= tables.length) return [];
      const key = tables[idx].toLowerCase().replace(/[-\\s]/g, '_');
      return mockData[key] || [];
    },
    tableColumns() {
      const data = this.currentTableData;
      if (data.length === 0) return [];
      return Object.keys(data[0]).filter(k => k !== 'id');
    },
    filteredData() {
      const q = this.searchQuery.toLowerCase();
      if (!q) return this.currentTableData;
      return this.currentTableData.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      );
    }
  },
  methods: {
    getStatusColor(status) {
      if (!status) return 'blue';
      const s = String(status);
      if (s.includes('正常') || s.includes('成功') || s.includes('已归还') || s.includes('在库') || s.includes('上架')) return 'green';
      if (s.includes('借阅') || s.includes('处理') || s.includes('待')) return 'yellow';
      if (s.includes('禁用') || s.includes('借出') || s.includes('过期')) return 'red';
      return 'blue';
    },
    showToast(msg) {
      this.toast = msg;
      setTimeout(() => { this.toast = ''; }, 2000);
    },
    showAddHint() { this.showToast('✨ 新增功能演示 — 实际项目中将弹出表单'); },
    showEditHint(row) { this.showToast('✏️ 编辑: ' + (row.name || row.title || row.username || 'ID ' + row.id)); },
    showDeleteHint(row) { this.showToast('🗑️ 删除: ' + (row.name || row.title || row.username || 'ID ' + row.id)); }
  }
}).mount('#app');
<\/script>
</body>
</html>`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error: authError } = await requireAuth();
  if (authError) return new Response("未授权", { status: 401 });

  const { id } = await params;

  const workspace = await db.workspace.findUnique({ where: { id } });
  if (!workspace) return new Response("工作空间不存在", { status: 404 });
  if (workspace.userId !== session!.user.id && session!.user.role !== "ADMIN") {
    return new Response("无权限", { status: 403 });
  }

  const html = buildPreviewHTML({
    name: workspace.name,
    topic: workspace.topic,
    techStack: (workspace.techStack as Record<string, string>) || {},
    requirements: (workspace.requirements as Requirements) || {},
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
