import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const DEFAULT_ADMIN_PHONE = "15811410745";
const DEFAULT_ADMIN_PASSWORD = "15811410745";
const DEFAULT_ADMIN_NAME = "系统管理员";

let ensurePromise: Promise<void> | null = null;

function getBuiltinAdminConfig() {
  return {
    phone: process.env.BUILTIN_ADMIN_PHONE?.trim() || DEFAULT_ADMIN_PHONE,
    password:
      process.env.BUILTIN_ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD,
    name: process.env.BUILTIN_ADMIN_NAME?.trim() || DEFAULT_ADMIN_NAME,
  };
}

async function ensureBuiltinAdminUserInternal() {
  const { phone, password, name } = getBuiltinAdminConfig();
  const hashedPassword = await bcrypt.hash(password, 10);

  await db.user.upsert({
    where: { phone },
    update: {
      role: "ADMIN",
      name,
      password: hashedPassword,
    },
    create: {
      phone,
      password: hashedPassword,
      role: "ADMIN",
      name,
    },
  });
}

export async function ensureBuiltinAdminUser() {
  if (process.env.DISABLE_BUILTIN_ADMIN === "1") return;

  if (!ensurePromise) {
    ensurePromise = ensureBuiltinAdminUserInternal().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }

  await ensurePromise;
}
