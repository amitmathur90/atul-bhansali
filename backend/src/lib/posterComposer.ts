import path from "node:path";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import sharp from "sharp";

// SVG text via sharp/librsvg turned out to depend on whatever system font stack the
// host happens to have — @font-face-embedded fonts (tried both WOFF2 and TTF) silently
// failed to load on Render's production Linux build even though they worked locally on
// Windows, and Render's container has no Devanagari-capable font installed anyway, so
// plain font-family="sans-serif" rendered Hindi names as tofu boxes. @napi-rs/canvas
// does its own font loading via GlobalFonts.registerFromPath() independent of the
// system/librsvg font stack, so the exact same bundled font file renders identically
// on every platform.
const FONT_FAMILY = "PosterName";
const FONT_PATH = path.join(__dirname, "../../assets/fonts/NotoSansDevanagari-Bold.ttf");
const fontRegistered = GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY);
// eslint-disable-next-line no-console
console.log(
  `[posterComposer] font registered=${fontRegistered} has("${FONT_FAMILY}")=${GlobalFonts.has(FONT_FAMILY)} families=${JSON.stringify(GlobalFonts.families.map((f) => f.family))} path=${FONT_PATH}`,
);

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

function renderNameOverlay(template: PosterTemplateGeometry, name: string): Buffer {
  const { imageWidth: width, imageHeight: height } = template;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.font = `${template.nameFontSize}px ${FONT_FAMILY}`;
  ctx.fillStyle = template.nameColor;
  ctx.textAlign = (template.nameAlign as "left" | "center" | "right") ?? "center";
  ctx.textBaseline = "middle";
  // eslint-disable-next-line no-console
  console.log(
    `[posterComposer] readback ctx.font="${ctx.font}" measure=${JSON.stringify(ctx.measureText(name))} nameCodepoints=${JSON.stringify(Array.from(name).map((c) => c.codePointAt(0)?.toString(16)))}`,
  );
  ctx.fillText(name, template.nameX * width, template.nameY * height);
  return canvas.toBuffer("image/png");
}

// Composites a citizen's selfie (cropped to a circle) and their name onto a poster
// template at the admin-defined relative positions.
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

  const textOverlay = renderNameOverlay(template, name);

  return sharp(templateBuffer)
    .resize(width, height)
    .composite([
      { input: circularSelfie, top: Math.round(selfieCenterY - radius), left: Math.round(selfieCenterX - radius) },
      { input: textOverlay, top: 0, left: 0 },
    ])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
