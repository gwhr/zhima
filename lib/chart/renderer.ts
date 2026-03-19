import sharp from "sharp";

export async function renderMermaidToSvg(mermaidCode: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch("https://kroki.io/mermaid/svg", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: mermaidCode,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Kroki rendering failed: ${res.status}`);
    }

    return res.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function renderMermaidToPng(
  mermaidCode: string,
  width = 800
): Promise<Buffer> {
  const svg = await renderMermaidToSvg(mermaidCode);
  return svgToPng(svg, width);
}

export async function svgToPng(svg: string, width = 800): Promise<Buffer> {
  const buf = Buffer.from(svg);
  const png = await sharp(buf).resize({ width, withoutEnlargement: true }).png().toBuffer();
  return png;
}

export function extractMermaidBlocks(text: string): string[] {
  const blocks: string[] = [];
  const regex = /```mermaid\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}
