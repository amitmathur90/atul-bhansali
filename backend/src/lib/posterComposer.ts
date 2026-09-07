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

const DEVANAGARI_CHAR = /[ऀ-ॿ]/;

// Splits into runs of consecutive Devanagari vs. non-Devanagari characters, so a single
// line mixing scripts (e.g. an English city name next to a Hindi ward label) picks the
// right bundled font per run instead of one font for the whole line — which, since
// neither bundled subset covers both scripts, would render the other script as tofu.
function splitByScript(text: string): { text: string; devanagari: boolean }[] {
  const runs: { text: string; devanagari: boolean }[] = [];
  for (const char of text) {
    const devanagari = DEVANAGARI_CHAR.test(char);
    const last = runs[runs.length - 1];
    if (last && last.devanagari === devanagari) {
      last.text += char;
    } else {
      runs.push({ text: char, devanagari });
    }
  }
  return runs;
}

type CanvasContext2D = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

// Draws text that may mix Devanagari and Latin runs, honoring left/center/right
// alignment by measuring the full line (across both fonts) before drawing any of it.
function fillMixedScriptText(
  ctx: CanvasContext2D,
  text: string,
  x: number,
  y: number,
  fontSizePx: number,
  align: "left" | "center" | "right",
): void {
  const runs = splitByScript(text);
  const originalAlign = ctx.textAlign;
  ctx.textAlign = "left";

  const widths = runs.map((run) => {
    ctx.font = `${fontSizePx}px ${run.devanagari ? DEVANAGARI_FAMILY : LATIN_FAMILY}`;
    return ctx.measureText(run.text).width;
  });
  const totalWidth = widths.reduce((sum, w) => sum + w, 0);
  let cursor = align === "center" ? x - totalWidth / 2 : align === "right" ? x - totalWidth : x;

  runs.forEach((run, i) => {
    ctx.font = `${fontSizePx}px ${run.devanagari ? DEVANAGARI_FAMILY : LATIN_FAMILY}`;
    ctx.fillText(run.text, cursor, y);
    cursor += widths[i];
  });

  ctx.textAlign = originalAlign;
}

interface PosterTemplateGeometry {
  imageWidth: number;
  imageHeight: number;
  selfieX: number;
  selfieY: number;
  selfieSize: number;
  selfieShape: string;
  nameX: number;
  nameY: number;
  nameFontSize: number;
  nameColor: string;
  nameAlign: string;
}

export interface PosterTextInput {
  name: string;
  city?: string;
  ward?: string;
  designation?: string;
  message?: string;
}

function selfieMaskSvg(shape: string, size: number): string {
  if (shape === "square") {
    return `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#fff"/></svg>`;
  }
  if (shape === "rounded") {
    const r = size * 0.12;
    return `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/></svg>`;
  }
  const radius = size / 2;
  return `<svg width="${size}" height="${size}"><circle cx="${radius}" cy="${radius}" r="${radius}" fill="#fff"/></svg>`;
}

// The name is the primary line; an optional subtitle (city/ward/designation, joined)
// and an optional supporter message stack below it at decreasing sizes — all anchored
// at the single admin-configured name position rather than needing separately
// positioned fields for what is realistically one grouped "who is this" text block.
function renderNameOverlay(template: PosterTemplateGeometry, text: PosterTextInput): Buffer {
  const { imageWidth: width, imageHeight: height } = template;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  const align = (template.nameAlign as "left" | "center" | "right") ?? "center";
  const x = template.nameX * width;
  let y = template.nameY * height;

  ctx.fillStyle = template.nameColor;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  fillMixedScriptText(ctx, text.name, x, y, template.nameFontSize, align);
  y += template.nameFontSize * 0.85;

  const subtitle = [text.city, text.ward, text.designation].filter(Boolean).join(" • ");
  if (subtitle) {
    const subtitleSize = Math.round(template.nameFontSize * 0.55);
    fillMixedScriptText(ctx, subtitle, x, y, subtitleSize, align);
    y += subtitleSize * 0.85;
  }

  if (text.message) {
    const messageSize = Math.round(template.nameFontSize * 0.45);
    fillMixedScriptText(ctx, text.message, x, y, messageSize, align);
  }

  return canvas.toBuffer("image/png");
}

// Composites a citizen's selfie (cropped to the template's configured shape) and their
// name/details onto a poster template at the admin-defined relative positions.
export async function composePoster(
  template: PosterTemplateGeometry,
  templateBuffer: Buffer,
  selfieBuffer: Buffer,
  text: PosterTextInput,
): Promise<Buffer> {
  const { imageWidth: width, imageHeight: height } = template;
  const size = Math.round(template.selfieSize * width);
  const selfieCenterX = Math.round(template.selfieX * width);
  const selfieCenterY = Math.round(template.selfieY * height);

  const mask = Buffer.from(selfieMaskSvg(template.selfieShape, size));

  const shapedSelfie = await sharp(selfieBuffer)
    .rotate()
    .resize(size, size, { fit: "cover", position: "attention" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const textOverlay = renderNameOverlay(template, text);

  return sharp(templateBuffer)
    .resize(width, height)
    .composite([
      { input: shapedSelfie, top: Math.round(selfieCenterY - size / 2), left: Math.round(selfieCenterX - size / 2) },
      { input: textOverlay, top: 0, left: 0 },
    ])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
