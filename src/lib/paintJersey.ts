import type { BadgeId, DesignConfig, PartId, ZoneStyle } from "@/lib/design";

const SIZE = 1024;

function stripe(ctx: CanvasRenderingContext2D, color: string, y: number, thickness: number) {
  ctx.fillStyle = color;
  ctx.fillRect(0, y, SIZE, thickness);
}

function paintPattern(ctx: CanvasRenderingContext2D, zone: ZoneStyle) {
  ctx.fillStyle = zone.color;
  ctx.fillRect(0, 0, SIZE, SIZE);

  if (zone.pattern === "solid") return;

  if (zone.pattern === "thin-hoops") {
    for (let y = 28; y < SIZE; y += 72) stripe(ctx, zone.stripeColor, y, 12);
    return;
  }

  if (zone.pattern === "wide-hoops") {
    for (let y = 0; y < SIZE; y += 160) stripe(ctx, zone.stripeColor, y, 64);
    return;
  }

  if (zone.pattern === "vertical-stripes") {
    ctx.fillStyle = zone.stripeColor;
    for (let x = 0; x < SIZE; x += 128) ctx.fillRect(x, 0, 56, SIZE);
    return;
  }

  ctx.fillStyle = zone.stripeColor;
  for (let x = 0; x < SIZE; x += 36) ctx.fillRect(x, 0, 6, SIZE);
}

function drawBadge(ctx: CanvasRenderingContext2D, id: BadgeId, x: number, y: number, scale = 1) {
  if (id === "none") return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";
  ctx.lineWidth = 8;
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#0f172a";

  if (id === "crest") {
    ctx.beginPath();
    ctx.moveTo(0, -78);
    ctx.lineTo(62, -48);
    ctx.lineTo(62, 18);
    ctx.quadraticCurveTo(62, 78, 0, 96);
    ctx.quadraticCurveTo(-62, 78, -62, 18);
    ctx.lineTo(-62, -48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1d4ed8";
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(22, 8);
    ctx.lineTo(0, 22);
    ctx.lineTo(-22, 8);
    ctx.closePath();
    ctx.fill();
  } else if (id === "star") {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const radius = i % 2 === 0 ? 78 : 34;
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (id === "shield") {
    ctx.beginPath();
    ctx.moveTo(-64, -70);
    ctx.lineTo(64, -70);
    ctx.lineTo(64, 10);
    ctx.quadraticCurveTo(64, 78, 0, 98);
    ctx.quadraticCurveTo(-64, 78, -64, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(0, 28);
    ctx.lineTo(36, -24);
    ctx.stroke();
  } else if (id === "ball") {
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.moveTo(-70, 0);
    ctx.lineTo(-28, 0);
    ctx.moveTo(28, 0);
    ctx.lineTo(70, 0);
    ctx.moveTo(0, -70);
    ctx.lineTo(0, -28);
    ctx.moveTo(0, 28);
    ctx.lineTo(0, 70);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(-24, 8, 46, 70, -0.5, Math.PI * 0.15, Math.PI * 1.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(24, 8, 46, 70, 0.5, Math.PI * -0.15, Math.PI * 0.85, true);
    ctx.stroke();
    ctx.fillStyle = "#eab308";
    ctx.beginPath();
    ctx.arc(0, 8, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string) {
  const label = text.trim();
  if (!label) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = Math.max(4, size * 0.06);
  ctx.font = `700 ${size}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText(label, x, y);
  ctx.fillText(label, x, y);
  ctx.restore();
}

export function paintZoneTexture(
  canvas: HTMLCanvasElement,
  zone: ZoneStyle,
  config: DesignConfig,
  part: PartId,
  scale = 1,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = SIZE * scale;
  canvas.height = SIZE * scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  paintPattern(ctx, zone);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const grain = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < grain.data.length; i += 16) {
    const shift = (i * 17) % 11 - 5;
    grain.data[i] = Math.min(255, Math.max(0, grain.data[i] + shift));
    grain.data[i + 1] = Math.min(255, Math.max(0, grain.data[i + 1] + shift));
    grain.data[i + 2] = Math.min(255, Math.max(0, grain.data[i + 2] + shift));
  }
  ctx.putImageData(grain, 0, 0);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  const ink = config.lettering.color;
  if (part === "front") {
    drawBadge(ctx, config.logos.frontRight, 330, 360, 0.72);
    drawBadge(ctx, config.logos.frontCenter, 512, 300, 0.72);
    drawBadge(ctx, config.logos.frontLeft, 694, 360, 0.72);
    drawText(ctx, config.lettering.teamName.toUpperCase(), 512, 520, 78, ink);
  } else if (part === "back") {
    drawText(ctx, config.lettering.playerName.toUpperCase(), 512, 200, 68, ink);
    drawText(ctx, config.lettering.number, 512, 470, 240, ink);
    drawText(ctx, config.lettering.sponsor.toUpperCase(), 512, 800, 52, ink);
  } else if (part === "leftSleeve") {
    drawBadge(ctx, config.logos.leftSleeve, 512, 430, 1.05);
  } else if (part === "rightSleeve") {
    drawBadge(ctx, config.logos.rightSleeve, 512, 430, 1.05);
  }
}

export const TEXTURE_SIZE = SIZE;
