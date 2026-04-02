const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const PLATFORM_ASSET_MAX_SIZE = 3 * 1024 * 1024;

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "x";
}

export function isAllowedPlatformAssetType(contentType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(contentType);
}

export function guessPlatformAssetExtension(contentType: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

export function platformAssetKey(
  scope: "support" | "homepage-step",
  ext: string
): string {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const normalizedScope = scope === "homepage-step" ? "homepage-step" : "support";
  return `platform/public/${normalizedScope}/${stamp}-${rand}.${sanitizeSegment(ext)}`;
}

export function toPlatformAssetUrl(key: string): string {
  const encoded = key
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `/api/platform-assets/${encoded}`;
}
