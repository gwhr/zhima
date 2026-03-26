import path from "path";
import { requireAdmin } from "@/lib/auth-helpers";
import { success, error } from "@/lib/api-response";
import { db } from "@/lib/db";
import { uploadFile } from "@/lib/storage/oss";
import { logAdminAudit } from "@/lib/admin-audit";

const MAX_TEMPLATE_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".doc", ".docx"]);

export async function GET() {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  const templates = await db.thesisTemplate.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      version: true,
      path: true,
      storageKey: true,
      size: true,
      isActive: true,
      note: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  return success(templates);
}

export async function POST(req: Request) {
  const { session, error: authError } = await requireAdmin();
  if (authError) return authError;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return error("请上传模板文件", 400);
  }

  if (file.size <= 0) return error("模板文件不能为空", 400);
  if (file.size > MAX_TEMPLATE_SIZE) {
    return error("模板文件不能超过 20MB", 400);
  }

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return error("仅支持 .doc/.docx 模板", 400);
  }

  const templateNameRaw = String(formData.get("name") || "").trim();
  const templateVersion = String(formData.get("version") || "").trim();
  const templateNote = String(formData.get("note") || "").trim();
  const activateNow = String(formData.get("activate") || "true") !== "false";
  const timestamp = Date.now();
  const baseName = (templateNameRaw || file.name.replace(/\.[^.]+$/, ""))
    .replace(/[^\w\u4e00-\u9fff-]+/g, "-")
    .slice(0, 50);
  const finalName = baseName || "thesis-template";
  const dbPath = `templates/${finalName}-${timestamp}${ext}`;
  const storageKey = `platform/${dbPath}`;
  const content = Buffer.from(await file.arrayBuffer());

  await uploadFile(storageKey, content);

  const created = await db.$transaction(async (tx) => {
    if (activateNow) {
      await tx.thesisTemplate.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    return tx.thesisTemplate.create({
      data: {
        name: templateNameRaw || file.name,
        version: templateVersion || null,
        note: templateNote || null,
        path: dbPath,
        storageKey,
        size: content.length,
        isActive: activateNow,
        createdById: session!.user.id,
      },
      select: {
        id: true,
        name: true,
        version: true,
        note: true,
        path: true,
        size: true,
        isActive: true,
        createdAt: true,
      },
    });
  });

  await logAdminAudit({
    adminUserId: session!.user.id,
    action: "template.upload",
    module: "templates",
    targetType: "ThesisTemplate",
    targetId: created.id,
    summary: `上传论文模板：${created.name}`,
    after: created,
    metadata: {
      activateNow,
      fileName: file.name,
      fileSize: file.size,
    },
    req,
  });

  return success(created, 201);
}
