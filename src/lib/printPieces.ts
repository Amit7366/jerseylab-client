import type { DesignConfig, PartId } from "@/lib/design";
import { paintZoneTexture, TEXTURE_SIZE } from "@/lib/paintJersey";

export const PRINT_PIECES = [
  { id: "front", label: "Front", part: "front" },
  { id: "back", label: "Back", part: "back" },
  { id: "leftSleeve", label: "Left sleeve", part: "leftSleeve" },
  { id: "rightSleeve", label: "Right sleeve", part: "rightSleeve" },
  { id: "collar", label: "Collar", part: "collar" },
] as const;

export type PrintPieceId = (typeof PRINT_PIECES)[number]["id"];

function tracePiece(ctx: CanvasRenderingContext2D, id: PrintPieceId, size: number) {
  const u = (value: number) => (value / TEXTURE_SIZE) * size;
  ctx.beginPath();

  if (id === "front" || id === "back") {
    const neck = id === "front" ? 250 : 160;
    ctx.moveTo(u(210), u(980));
    ctx.lineTo(u(250), u(430));
    ctx.quadraticCurveTo(u(300), u(250), u(430), u(210));
    ctx.quadraticCurveTo(u(512), u(neck), u(594), u(210));
    ctx.quadraticCurveTo(u(724), u(250), u(774), u(430));
    ctx.lineTo(u(814), u(980));
    ctx.quadraticCurveTo(u(512), u(1010), u(210), u(980));
    ctx.closePath();
    return;
  }

  if (id === "leftSleeve" || id === "rightSleeve") {
    ctx.moveTo(u(220), u(260));
    ctx.quadraticCurveTo(u(512), u(180), u(804), u(260));
    ctx.lineTo(u(760), u(820));
    ctx.quadraticCurveTo(u(512), u(880), u(264), u(820));
    ctx.closePath();
    return;
  }

  ctx.moveTo(u(120), u(430));
  ctx.quadraticCurveTo(u(280), u(250), u(470), u(390));
  ctx.quadraticCurveTo(u(300), u(470), u(150), u(560));
  ctx.quadraticCurveTo(u(80), u(500), u(120), u(430));
  ctx.closePath();
  ctx.moveTo(u(554), u(390));
  ctx.quadraticCurveTo(u(744), u(250), u(904), u(430));
  ctx.quadraticCurveTo(u(944), u(500), u(874), u(560));
  ctx.quadraticCurveTo(u(724), u(470), u(554), u(390));
  ctx.closePath();
}

function crop(source: HTMLCanvasElement) {
  const ctx = source.getContext("2d");
  if (!ctx) return source;
  const pixels = ctx.getImageData(0, 0, source.width, source.height).data;
  let minX = source.width;
  let minY = source.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < source.height; y += 2) {
    for (let x = 0; x < source.width; x += 2) {
      if (pixels[(y * source.width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) return source;
  const pad = 8;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const width = Math.min(source.width - left, maxX - minX + pad * 2);
  const height = Math.min(source.height - top, maxY - minY + pad * 2);
  const cropped = document.createElement("canvas");
  cropped.width = width;
  cropped.height = height;
  cropped.getContext("2d")?.drawImage(source, left, top, width, height, 0, 0, width, height);
  return cropped;
}

export function renderPrintPiece(config: DesignConfig, id: PrintPieceId, scale = 1) {
  const piece = PRINT_PIECES.find((item) => item.id === id);
  const part = (piece?.part ?? "front") as PartId;
  const art = document.createElement("canvas");
  paintZoneTexture(art, config[part], config, part, scale);

  const masked = document.createElement("canvas");
  masked.width = art.width;
  masked.height = art.height;
  const ctx = masked.getContext("2d");
  if (!ctx) return art;
  ctx.drawImage(art, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = "#000";
  tracePiece(ctx, id, art.width);
  ctx.fill("evenodd");
  return crop(masked);
}

export function renderPrintSheet(config: DesignConfig, scale = 2) {
  const pieces = PRINT_PIECES.map((piece) => ({
    ...piece,
    canvas: renderPrintPiece(config, piece.id, scale),
  }));
  const gap = 48 * scale;
  const label = 36 * scale;
  const bodyWidth = pieces[0].canvas.width + gap + pieces[1].canvas.width;
  const sleeveRow = pieces[2].canvas.width + gap + pieces[3].canvas.width;
  const width = Math.max(bodyWidth, sleeveRow, pieces[4].canvas.width) + gap * 2;
  const height =
    gap +
    label +
    pieces[0].canvas.height +
    gap +
    label +
    pieces[2].canvas.height +
    gap +
    label +
    pieces[4].canvas.height +
    gap;

  const sheet = document.createElement("canvas");
  sheet.width = width;
  sheet.height = height;
  const ctx = sheet.getContext("2d");
  if (!ctx) return sheet;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#18181b";
  ctx.font = `600 ${28 * scale}px sans-serif`;
  ctx.textAlign = "center";

  let y = gap;
  const rows = [
    [pieces[0], pieces[1]],
    [pieces[2], pieces[3]],
    [pieces[4]],
  ];
  for (const row of rows) {
    const rowWidth = row.reduce((sum, item) => sum + item.canvas.width, 0) + gap * (row.length - 1);
    let x = (width - rowWidth) / 2;
    const rowHeight = Math.max(...row.map((item) => item.canvas.height));
    for (const item of row) {
      ctx.fillText(item.label, x + item.canvas.width / 2, y + 24 * scale);
      ctx.drawImage(item.canvas, x, y + label);
      x += item.canvas.width + gap;
    }
    y += label + rowHeight + gap;
  }
  return sheet;
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}
