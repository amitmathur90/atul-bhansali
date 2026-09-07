import sharp from "sharp";

interface PosterTemplateGeometry {
  imageWidth: number;
  imageHeight: number;
  selfieX: number;
  selfieY: number;
  selfieSize: number;
  nameX: number;
  nameY: number;
  nameFontSize: number;
  nameColor: string;
  nameAlign: string;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Composites a citizen's selfie (cropped to a circle) and their name onto a poster
// template at the admin-defined relative positions. Both overlays are built as small
// SVGs and rasterized by sharp/librsvg rather than using a font-rendering canvas lib,
// since sharp+libvips (already a dependency for image resizing) covers this natively
// without adding another native module.
export async function composePoster(
  template: PosterTemplateGeometry,
  templateBuffer: Buffer,
  selfieBuffer: Buffer,
  name: string,
): Promise<Buffer> {
  const { imageWidth: width, imageHeight: height } = template;
  const diameter = Math.round(template.selfieSize * width);
  const radius = diameter / 2;
  const selfieCenterX = Math.round(template.selfieX * width);
  const selfieCenterY = Math.round(template.selfieY * height);

  const circleMask = Buffer.from(
    `<svg width="${diameter}" height="${diameter}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#fff"/></svg>`,
  );

  const circularSelfie = await sharp(selfieBuffer)
    .rotate()
    .resize(diameter, diameter, { fit: "cover", position: "attention" })
    .composite([{ input: circleMask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const textAnchor = template.nameAlign === "left" ? "start" : template.nameAlign === "right" ? "end" : "middle";
  const textX = Math.round(template.nameX * width);
  const textY = Math.round(template.nameY * height);
  const textSvg = Buffer.from(
    `<svg width="${width}" height="${height}">
      <text
        x="${textX}" y="${textY}"
        font-family="sans-serif" font-weight="700" font-size="${template.nameFontSize}"
        fill="${escapeXml(template.nameColor)}"
        text-anchor="${textAnchor}" dominant-baseline="central"
      >${escapeXml(name)}</text>
    </svg>`,
  );

  return sharp(templateBuffer)
    .resize(width, height)
    .composite([
      { input: circularSelfie, top: Math.round(selfieCenterY - radius), left: Math.round(selfieCenterX - radius) },
      { input: textSvg, top: 0, left: 0 },
    ])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
