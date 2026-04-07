export type SourceScope = "core" | "full";

const EXCLUDED_SEGMENTS = [
  "/node_modules/",
  "/target/",
  "/build/",
  "/dist/",
  "/coverage/",
  "/.next/",
  "/out/",
  "/.git/",
];

const ROOT_CORE_FILES = new Set([
  "readme.md",
  "package.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "npm-shrinkwrap.json",
  "docker-compose.yml",
  "docker-compose.prod.yml",
  ".env.example",
  "backend/pom.xml",
  "backend/build.gradle",
  "backend/build.gradle.kts",
  "backend/settings.gradle",
  "backend/settings.gradle.kts",
  "backend/requirements.txt",
  "frontend/package.json",
  "frontend/pnpm-lock.yaml",
  "frontend/yarn.lock",
]);

const CORE_PREFIXES = [
  "backend/src/",
  "backend/sql/",
  "frontend/src/",
  "frontend/public/",
  "sql/",
  "docs/",
];

export function normalizeSourcePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\/+/, "").toLowerCase();
}

export function isCoreCodeFilePath(path: string): boolean {
  const normalized = normalizeSourcePath(path);
  if (!normalized) return false;

  if (EXCLUDED_SEGMENTS.some((segment) => normalized.includes(segment))) {
    return false;
  }

  if (ROOT_CORE_FILES.has(normalized)) return true;
  if (normalized.endsWith(".sql")) return true;
  if (normalized.endsWith(".md")) return true;

  return CORE_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

export function filterCodeFilesByScope<T extends { path: string }>(
  files: T[],
  scope: SourceScope
): T[] {
  if (scope === "full") return files;
  return files.filter((file) => isCoreCodeFilePath(file.path));
}
