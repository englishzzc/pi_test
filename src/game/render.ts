import {
  BASE_BLOCK,
  BASE_GUARD,
  BRICK,
  BULLET_SIZE,
  COLS,
  DIR_VECTORS,
  Dir,
  ENEMY_SPECS,
  EnemyKind,
  GRASS,
  HEIGHT,
  POWERUP_DURATION,
  STEEL,
  TILE,
  WATER,
  WIDTH,
} from "./constants";
import type { GameState, Tank } from "./engine";

const dirAngle: Record<Dir, number> = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };

function drawBrick(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#8a4b2a";
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = "#c97a4d";
  ctx.fillRect(x + 1, y + 1, TILE - 2, TILE / 2 - 2);
  ctx.fillRect(x + 1, y + TILE / 2 + 1, TILE / 2 - 2, TILE / 2 - 2);
  ctx.fillRect(x + TILE / 2 + 1, y + TILE / 2 + 1, TILE / 2 - 2, TILE / 2 - 2);
}

function drawSteel(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#4a5563";
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = "#8d9bb0";
  ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = "#c3cede";
  ctx.fillRect(x + 2, y + 2, TILE - 4, 3);
  ctx.fillStyle = "#5d6b7f";
  ctx.fillRect(x + 2, y + TILE - 5, TILE - 4, 3);
}

function drawGrass(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = "#1f6b34";
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = "#2f9b4c";
  const d = TILE / 4;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      if ((i + j) % 2 === 0) ctx.fillRect(x + i * d + 1, y + j * d + 1, d - 2, d - 2);
    }
  }
}

function drawWater(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  ctx.fillStyle = "#123a6b";
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = "#2a6fb5";
  const off = Math.floor(frame / 12) % 2;
  ctx.fillRect(x + 1 + off * 3, y + 4, TILE - 6, 2);
  ctx.fillRect(x + 4 - off * 3, y + 10, TILE - 6, 2);
}

function drawBase(ctx: CanvasRenderingContext2D, x: number, y: number, alive: boolean) {
  ctx.fillStyle = alive ? "#e8b04b" : "#5a5a5a";
  ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
  ctx.fillStyle = alive ? "#fff2c2" : "#8a8a8a";
  ctx.fillRect(x + 4, y + 3, TILE - 8, TILE - 8);
  ctx.fillStyle = alive ? "#b5761d" : "#3f3f3f";
  ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
}

function drawTank(ctx: CanvasRenderingContext2D, t: Tank, frame: number, blink: boolean) {
  const { x, y, size } = t;
  const cx = x + size / 2;
  const cy = y + size / 2;

  if (t.kind === "player") {
    if (blink) ctx.globalAlpha = 0.45;
    if (t.shield > 0) {
      const pulse = 0.55 + 0.35 * Math.sin(frame / 4);
      ctx.strokeStyle = `rgba(123, 211, 255, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.95, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 敌人受击闪烁（多血坦克颜色变化）
  let body = t.kind === "player" ? "#3ea8ff" : ENEMY_SPECS[t.kind as EnemyKind].color;
  if (t.kind !== "player" && t.maxHp > 1) {
    const ratio = t.hp / t.maxHp;
    if (ratio <= 0.34) body = "#e05656";
    else if (ratio <= 0.67) body = "#e0a556";
  }
  const accent = t.kind === "player" ? "#0f5c96" : "#2b2f36";

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(dirAngle[t.dir]);

  // 履带
  ctx.fillStyle = accent;
  ctx.fillRect(-size / 2, -size / 2, size / 4, size);
  ctx.fillRect(size / 4, -size / 2, size / 4, size);
  const trackOff = t.moving ? Math.floor(frame / 3) % 3 : 0;
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  for (let i = -2; i <= 2; i++) {
    ctx.fillRect(-size / 2, i * 4 + trackOff - 2, size / 4, 1.5);
    ctx.fillRect(size / 4, i * 4 + trackOff - 2, size / 4, 1.5);
  }

  // 车身
  ctx.fillStyle = body;
  ctx.fillRect(-size / 4, -size / 2 + 1, size / 2, size - 2);

  // 炮塔
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, size / 4, 0, Math.PI * 2);
  ctx.fill();

  // 炮管
  ctx.fillStyle = "#dfe7ef";
  ctx.fillRect(-1.5, -size / 2 - 4, 3, size / 2 + 5);

  // 玩家火力等级标记
  if (t.kind === "player" && t.star > 0) {
    ctx.fillStyle = t.star >= 2 ? "#ffd166" : "#ffe9a8";
    ctx.fillRect(-2, 2, 4, 4);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

const POWERUP_ICON: Record<string, { bg: string; label: string }> = {
  star: { bg: "#ffd166", label: "★" },
  shield: { bg: "#7bd3ff", label: "◎" },
  life: { bg: "#ff8fa3", label: "♥" },
  bomb: { bg: "#c084fc", label: "✸" },
};

function drawPowerUp(ctx: CanvasRenderingContext2D, kind: string, x: number, y: number, timer: number) {
  const visible = timer > 120 || Math.floor(timer / 8) % 2 === 0;
  if (!visible) return;
  const style = POWERUP_ICON[kind] ?? POWERUP_ICON.star;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = style.bg;
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.fillStyle = "#10161f";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(style.label, x + TILE / 2, y + TILE / 2 + 1);
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, dpr = 1) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  // 背景
  ctx.fillStyle = "#0b0f14";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < COLS; j++) {
      if ((i + j) % 2 === 0) ctx.fillRect(i * TILE, j * TILE, TILE, TILE);
    }
  }

  const frame = state.frame;
  const grassLayer: Array<[number, number]> = [];

  for (let y = 0; y < state.grid.length; y++) {
    for (let x = 0; x < state.grid[y].length; x++) {
      const t = state.grid[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (t === BRICK || t === BASE_GUARD) drawBrick(ctx, px, py);
      else if (t === STEEL) drawSteel(ctx, px, py);
      else if (t === WATER) drawWater(ctx, px, py, frame);
      else if (t === BASE_BLOCK) drawBase(ctx, px, py, state.baseAlive);
      else if (t === GRASS) grassLayer.push([px, py]);
    }
  }

  // 道具
  for (const pu of state.powerUps) drawPowerUp(ctx, pu.kind, pu.x, pu.y, pu.timer);

  // 坦克
  const blinkPlayer = state.player.invuln > 0 && Math.floor(frame / 5) % 2 === 0;
  for (const e of state.enemies) drawTank(ctx, e, frame, false);
  drawTank(ctx, state.player, frame, blinkPlayer);

  // 子弹
  for (const b of state.bullets) {
    ctx.fillStyle = b.from === "player" ? "#fff4b8" : "#ff7b7b";
    ctx.fillRect(b.x, b.y, BULLET_SIZE, BULLET_SIZE);
    ctx.fillStyle = b.from === "player" ? "rgba(255,244,184,0.35)" : "rgba(255,123,123,0.35)";
    const v = DIR_VECTORS[b.dir];
    ctx.fillRect(b.x - v.x * 4, b.y - v.y * 4, BULLET_SIZE, BULLET_SIZE);
  }

  // 草丛覆盖在坦克之上
  for (const [px, py] of grassLayer) drawGrass(ctx, px, py);

  // 粒子
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // 护盾计时条
  if (state.player.shield > 0) {
    const ratio = state.player.shield / POWERUP_DURATION;
    ctx.fillStyle = "rgba(123,211,255,0.85)";
    ctx.fillRect(4, HEIGHT - 6, (WIDTH - 8) * ratio, 3);
  }

  // 暂停 / 提示遮罩
  if (state.messageTimer > 0 && state.message) {
    ctx.fillStyle = "rgba(5,10,16,0.72)";
    ctx.fillRect(0, HEIGHT / 2 - 34, WIDTH, 68);
    ctx.fillStyle = "#e8f1ff";
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.message, WIDTH / 2, HEIGHT / 2);
  }
}
