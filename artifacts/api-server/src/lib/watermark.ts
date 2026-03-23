import sharp from "sharp";

export async function applyWatermark(
  inputBuffer: Buffer,
  photographerName: string = process.env.PHOTOGRAPHER_NAME ?? "Photo Store",
): Promise<Buffer> {
  const image = sharp(inputBuffer);
  const metadata = await image.metadata();

  const width = metadata.width ?? 1200;
  const height = metadata.height ?? 800;

  const fontSize = Math.round(Math.min(width, height) * 0.07);
  const lineHeight = Math.round(fontSize * 1.4);

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          .wm {
            font-family: Arial, Helvetica, sans-serif;
            font-size: ${fontSize}px;
            font-weight: bold;
            fill: white;
            fill-opacity: 0.55;
            stroke: rgba(0,0,0,0.35);
            stroke-width: 2;
            paint-order: stroke fill;
          }
          .wm-sub {
            font-family: Arial, Helvetica, sans-serif;
            font-size: ${Math.round(fontSize * 0.55)}px;
            font-weight: normal;
            fill: white;
            fill-opacity: 0.50;
            stroke: rgba(0,0,0,0.3);
            stroke-width: 1.5;
            paint-order: stroke fill;
            letter-spacing: 4px;
          }
        </style>
      </defs>
      <rect
        x="${width * 0.05}"
        y="${height / 2 - lineHeight * 1.5}"
        width="${width * 0.9}"
        height="${lineHeight * 3}"
        fill="rgba(0,0,0,0.18)"
        rx="8"
      />
      <text
        x="50%"
        y="${height / 2 - lineHeight * 0.15}"
        text-anchor="middle"
        dominant-baseline="middle"
        class="wm"
      >${escapeXml(photographerName)}</text>
      <text
        x="50%"
        y="${height / 2 + lineHeight * 1.05}"
        text-anchor="middle"
        dominant-baseline="middle"
        class="wm-sub"
      >© WATERMARKED PREVIEW</text>
    </svg>
  `;

  return image
    .composite([{ input: Buffer.from(svg), blend: "over" }])
    .jpeg({ quality: 85, progressive: true })
    .toBuffer();
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
