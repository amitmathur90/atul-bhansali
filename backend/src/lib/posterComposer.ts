import path from "node:path";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import sharp from "sharp";

// Text on the poster is rendered with @napi-rs/canvas rather than sharp/librsvg's SVG
// text support: an embedded @font-face font (tried both WOFF2 and TTF) reliably worked
// locally on Windows but silently failed to load in sharp's Linux build on Render, and
// the container has no Devanagari-capable font installed system-wide either way.
// @napi-rs/canvas does its own font loading via GlobalFonts.registerFromPath(),
// entirely independent of the system/librsvg font stack, so the bundled files render
// identically on every platform.
//
// Two font files, not one: the Devanagari-subset font (extracted from Google's Noto
// Sans Devanagari, split by @fontsource for web-delivery size) covers Devanagari but
// has no Latin glyphs at all, and vice versa for the Latin subset — @napi-rs/canvas
// does not fall back across registered fonts the way a browser would, so the wrong one
// renders tofu boxes. A name is checked for Devanagari codepoints and the matching font
// picked; this covers "fully Hindi name" and "fully English name", the two realistic
// cases, though a name mixing both scripts mid-string would still only use one font.
const DEVANAGARI_FAMILY = "PosterNameDevanagari";
const LATIN_FAMILY = "PosterNameLatin";
GlobalFonts.registerFromPath(
  path.join(__dirname, "../../assets/fonts/NotoSansDevanagari-Bold.ttf"),
  DEVANAGARI_FAMILY,
);
GlobalFonts.registerFromPath(path.join(__dirname, "../../assets/fonts/NotoSansLatin-Bold.ttf"), LATIN_FAMILY);

const DEVANAGARI_RANGE = /[ऀ-ॿ]/;

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
  const family = DEVANAGARI_RANGE.test(name) ? DEVANAGARI_FAMILY : LATIN_FAMILY;
  ctx.font = `${template.nameFontSize}px ${family}`;
  ctx.fillStyle = template.nameColor;
  ctx.textAlign = (template.nameAlign as "left" | "center" | "right") ?? "center";
  ctx.textBaseline = "middle";
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
