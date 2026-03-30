export const FEEDBACK_IMAGE_MAX_COUNT = 3;
export const FEEDBACK_IMAGE_MAX_SIZE = 2 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "x";
}

export function isAllowedImageType(contentType: string): boolean {
  return ALLOWED_IMAGE_TYPES.has(contentType);
}

export function guessImageExtension(contentType: string): string {
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

export function feedbackImageKey(userId: string, ext: string): string {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `feedback/${sanitizeSegment(userId)}/${stamp}-${rand}.${sanitizeSegment(ext)}`;
}

export function toFeedbackImageUrl(key: string): string {
  const encoded = key
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `/api/feedback/image/${encoded}`;
}
