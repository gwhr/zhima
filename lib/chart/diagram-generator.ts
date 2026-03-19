interface Role { name: string; description: string }
interface Module { name: string; features: string[]; enabled?: boolean }
interface Requirements {
  summary?: string;
  roles?: Role[];
  modules?: Module[];
  tables?: string[];
}

export function generateUseCaseDiagram(requirements: Requirements): string {
  const roles = requirements.roles || [];
  const modules = requirements.modules || [];

  const lines: string[] = ["graph LR"];

  for (const role of roles) {
    const id = `R_${sanitize(role.name)}`;
    lines.push(`  ${id}["👤 ${role.name}"]`);
    lines.push(`  style ${id} fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e`);
  }

  for (const mod of modules) {
    const modId = `M_${sanitize(mod.name)}`;
    lines.push(`  ${modId}{"${mod.name}"}`);
    lines.push(`  style ${modId} fill:#f0fdf4,stroke:#16a34a,color:#14532d`);

    for (const feat of mod.features) {
      const featId = `F_${sanitize(mod.name)}_${sanitize(feat)}`;
      lines.push(`  ${featId}["${feat}"]`);
      lines.push(`  ${modId} --> ${featId}`);
    }
  }

  for (const role of roles) {
    const roleId = `R_${sanitize(role.name)}`;
    for (const mod of modules) {
      const modId = `M_${sanitize(mod.name)}`;
      if (isRoleRelatedToModule(role, mod)) {
        lines.push(`  ${roleId} --> ${modId}`);
      }
    }
  }

  return lines.join("\n");
}

export function generateERDiagram(requirements: Requirements): string {
  const tables = requirements.tables || [];
  const lines: string[] = ["erDiagram"];

  const tableSchemas = inferTableSchemas(tables, requirements);

  for (const schema of tableSchemas) {
    lines.push(`  ${schema.name} {`);
    for (const field of schema.fields) {
      lines.push(`    ${field.type} ${field.name} "${field.comment}"`);
    }
    lines.push("  }");
  }

  const relations = inferRelations(tableSchemas);
  for (const rel of relations) {
    lines.push(`  ${rel.from} ${rel.relation} ${rel.to} : "${rel.label}"`);
  }

  return lines.join("\n");
}

export function generateArchitectureDiagram(
  techStack: Record<string, string>,
  requirements: Requirements
): string {
  const frontend = techStack.frontend || "前端";
  const backend = techStack.backend || "后端";
  const database = techStack.database || "数据库";
  const modules = requirements.modules || [];

  const lines: string[] = [
    "graph TB",
    `  subgraph Client["🖥️ 客户端"]`,
    `    Browser["浏览器"]`,
    `    Browser --> FE["${frontend}"]`,
    "  end",
    "",
    `  subgraph Server["⚙️ 服务端"]`,
    `    API["${backend}<br/>REST API"]`,
  ];

  if (modules.length > 0) {
    lines.push(`    subgraph Services["业务模块"]`);
    for (const mod of modules) {
      lines.push(`      SVC_${sanitize(mod.name)}["${mod.name}"]`);
    }
    lines.push("    end");
    lines.push("    API --> Services");
  }

  lines.push("  end");
  lines.push("");
  lines.push(`  subgraph Data["💾 数据层"]`);
  lines.push(`    DB[("${database}")]`);
  lines.push("  end");
  lines.push("");
  lines.push("  FE -->|HTTP 请求| API");
  lines.push("  Services -->|SQL| DB");
  lines.push("");
  lines.push("  style Client fill:#eff6ff,stroke:#3b82f6");
  lines.push("  style Server fill:#f0fdf4,stroke:#22c55e");
  lines.push("  style Data fill:#fef3c7,stroke:#f59e0b");

  return lines.join("\n");
}

export interface TableSchema {
  name: string;
  displayName: string;
  fields: { name: string; type: string; comment: string }[];
}

export function inferTableSchemas(
  tables: string[],
  requirements: Requirements
): TableSchema[] {
  const commonFields: Record<string, { name: string; type: string; comment: string }[]> = {
    users: [
      { name: "id", type: "bigint", comment: "PK 主键" },
      { name: "username", type: "varchar", comment: "用户名" },
      { name: "password", type: "varchar", comment: "密码" },
      { name: "name", type: "varchar", comment: "姓名" },
      { name: "email", type: "varchar", comment: "邮箱" },
      { name: "phone", type: "varchar", comment: "手机号" },
      { name: "role", type: "varchar", comment: "角色" },
      { name: "status", type: "tinyint", comment: "状态 0禁用 1正常" },
      { name: "created_at", type: "datetime", comment: "创建时间" },
      { name: "updated_at", type: "datetime", comment: "更新时间" },
    ],
    books: [
      { name: "id", type: "bigint", comment: "PK 主键" },
      { name: "title", type: "varchar", comment: "书名" },
      { name: "author", type: "varchar", comment: "作者" },
      { name: "isbn", type: "varchar", comment: "ISBN编号" },
      { name: "publisher", type: "varchar", comment: "出版社" },
      { name: "category_id", type: "bigint", comment: "FK 分类ID" },
      { name: "stock", type: "int", comment: "库存数量" },
      { name: "location", type: "varchar", comment: "馆藏位置" },
      { name: "status", type: "tinyint", comment: "状态 0下架 1在库 2借出" },
      { name: "created_at", type: "datetime", comment: "入库时间" },
    ],
    borrow_records: [
      { name: "id", type: "bigint", comment: "PK 主键" },
      { name: "user_id", type: "bigint", comment: "FK 借阅人ID" },
      { name: "book_id", type: "bigint", comment: "FK 图书ID" },
      { name: "borrow_date", type: "date", comment: "借阅日期" },
      { name: "due_date", type: "date", comment: "应还日期" },
      { name: "return_date", type: "date", comment: "实际归还日期" },
      { name: "status", type: "tinyint", comment: "状态 0借阅中 1已归还 2逾期" },
      { name: "remark", type: "varchar", comment: "备注" },
    ],
    orders: [
      { name: "id", type: "bigint", comment: "PK 主键" },
      { name: "order_no", type: "varchar", comment: "订单编号" },
      { name: "user_id", type: "bigint", comment: "FK 用户ID" },
      { name: "total_amount", type: "decimal", comment: "总金额" },
      { name: "status", type: "tinyint", comment: "状态" },
      { name: "created_at", type: "datetime", comment: "创建时间" },
    ],
    products: [
      { name: "id", type: "bigint", comment: "PK 主键" },
      { name: "name", type: "varchar", comment: "商品名" },
      { name: "price", type: "decimal", comment: "价格" },
      { name: "stock", type: "int", comment: "库存" },
      { name: "category", type: "varchar", comment: "分类" },
      { name: "status", type: "tinyint", comment: "状态" },
    ],
    categories: [
      { name: "id", type: "bigint", comment: "PK 主键" },
      { name: "name", type: "varchar", comment: "分类名称" },
      { name: "parent_id", type: "bigint", comment: "父分类ID" },
      { name: "sort_order", type: "int", comment: "排序" },
    ],
  };

  return tables.map((table) => {
    const key = table.toLowerCase().replace(/[-\s]/g, "_");
    const known = commonFields[key];
    const fields = known || [
      { name: "id", type: "bigint", comment: "PK 主键" },
      { name: "name", type: "varchar", comment: "名称" },
      { name: "description", type: "text", comment: "描述" },
      { name: "status", type: "tinyint", comment: "状态" },
      { name: "created_at", type: "datetime", comment: "创建时间" },
      { name: "updated_at", type: "datetime", comment: "更新时间" },
    ];

    return { name: key, displayName: table, fields };
  });
}

interface Relation {
  from: string;
  to: string;
  relation: string;
  label: string;
}

function inferRelations(schemas: TableSchema[]): Relation[] {
  const relations: Relation[] = [];
  const tableNames = new Set(schemas.map((s) => s.name));

  for (const schema of schemas) {
    for (const field of schema.fields) {
      if (field.name.endsWith("_id") && field.name !== "id") {
        const refTable = field.name.replace(/_id$/, "");
        const plural = refTable + "s";
        const target = tableNames.has(refTable) ? refTable : tableNames.has(plural) ? plural : null;
        if (target) {
          relations.push({
            from: target,
            to: schema.name,
            relation: "||--o{",
            label: field.comment.replace(/FK\s*/, ""),
          });
        }
      }
    }
  }
  return relations;
}

function sanitize(str: string): string {
  return str.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_").slice(0, 20);
}

function isRoleRelatedToModule(role: Role, mod: Module): boolean {
  const roleName = role.name.toLowerCase();
  const roleDesc = role.description.toLowerCase();
  const modName = mod.name.toLowerCase();
  const modFeatures = mod.features.join(" ").toLowerCase();

  if (roleName.includes("管理员") || roleName.includes("admin")) return true;
  if (roleDesc.includes(modName) || modName.includes(roleName.replace("员", ""))) return true;
  if (modFeatures.includes(roleName.replace("员", ""))) return true;

  return false;
}
