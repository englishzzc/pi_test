import {
  BASE_BLOCK,
  BASE_GUARD,
  BULLET_BLOCKING,
  BULLET_SIZE,
  BULLET_SPEED,
  BRICK,
  COLS,
  DIR_VECTORS,
  Dir,
  EMPTY,
  ENEMY_SPECS,
  EnemyKind,
  GRASS,
  POWERUP_DURATION,
  PowerUpKind,
  PLAYER_FIRE_COOLDOWN,
  RESPAWN_INVULN,
  ROWS,
  SOLID,
  SPAWN_INTERVAL,
  STEEL,
  TANK_SIZE,
  TANK_SPEED,
  TILE,
  WATER,
} from "./constants";
import { buildGrid, LEVELS } from "./levels";

export type Input = { up: boolean; down: boolean; left: boolean; right: boolean; fire: boolean };

export type Bullet = {
  id: number;
  x: number;
  y: number;
  dir: Dir;
  speed: number;
  from: "player" | "enemy";
  power: boolean; // 可击破钢墙
  dead: boolean;
};

export type Tank = {
  id: number;
  x: number;
  y: number;
  dir: Dir;
  size: number;
  speed: number;
  hp: number;
  maxHp: number;
  kind: EnemyKind | "player";
  cooldown: number;
  moving: boolean;
  // 敌人 AI
  aiTimer: number;
  // 玩家状态
  invuln: number;
  shield: number;
  star: number;
};

export type PowerUp = { id: number; x: number; y: number; kind: PowerUpKind; timer: number };

export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

export type GameStatus = "playing" | "won" | "lost";

export type GameState = {
  grid: number[][];
  player: Tank;
  enemies: Tank[];
  bullets: Bullet[];
  powerUps: PowerUp[];
  particles: Particle[];
  levelIndex: number;
  levelName: string;
  score: number;
  lives: number;
  remainingEnemies: number; // 本关剩余待刷
  enemySpawnTimer: number;
  status: GameStatus;
  baseAlive: boolean;
  frame: number;
  message: string;
  messageTimer: number;
};

const DIRS: Dir[] = ["up", "down", "left", "right"];

let nextId = 1;
const uid = () => nextId++;

const rand = (n: number) => Math.floor(Math.random() * n);

/** 基地中心格（判断基地是否被击中） */
const baseCells = () => {
  const cx = Math.floor(COLS / 2);
  const cells: Array<[number, number]> = [];
  for (let y = ROWS - 2; y < ROWS; y++) {
    for (let x = cx - 1; x <= cx; x++) cells.push([x, y]);
  }
  return cells;
};

function makePlayer(): Tank {
  const cx = Math.floor(COLS / 2);
  return {
    id: uid(),
    x: cx * TILE - TANK_SIZE / 2 - TILE / 2,
    y: (ROWS - 5) * TILE,
    dir: "up",
    size: TANK_SIZE,
    speed: TANK_SPEED,
    hp: 1,
    maxHp: 1,
    kind: "player",
    cooldown: 0,
    moving: false,
    aiTimer: 0,
    invuln: RESPAWN_INVULN,
    shield: 0,
    star: 0,
  };
}

export function createGame(levelIndex = 0, score = 0, lives = 3, keepPlayer?: Tank): GameState {
  const level = LEVELS[levelIndex % LEVELS.length];
  const grid = buildGrid(level);
  const player = keepPlayer ?? makePlayer();
  player.x = Math.floor(COLS / 2) * TILE - TANK_SIZE / 2 - TILE / 2;
  player.y = (ROWS - 5) * TILE;
  player.dir = "up";
  player.invuln = RESPAWN_INVULN;
  player.moving = false;
  return {
    grid,
    player,
    enemies: [],
    bullets: [],
    powerUps: [],
    particles: [],
    levelIndex,
    levelName: level.name,
    score,
    lives,
    remainingEnemies: 12 + levelIndex * 4,
    enemySpawnTimer: 40,
    status: "playing",
    baseAlive: true,
    frame: 0,
    message: level.name,
    messageTimer: 120,
  };
}

// ---------- 几何辅助 ----------
const overlaps = (
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

function tileSolid(grid: number[][], tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  return SOLID.has(grid[ty][tx]);
}

/** 坦克与地形碰撞检测 */
function collidesWithTerrain(grid: number[][], x: number, y: number, size: number): boolean {
  const x0 = Math.floor(x / TILE);
  const x1 = Math.floor((x + size - 0.001) / TILE);
  const y0 = Math.floor(y / TILE);
  const y1 = Math.floor((y + size - 0.001) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (tileSolid(grid, tx, ty)) return true;
    }
  }
  return false;
}

function tankHitsTanks(t: Tank, others: Tank[]): boolean {
  for (const o of others) {
    if (o === t || o.id === t.id) continue;
    if (overlaps(t.x, t.y, t.size, t.size, o.x, o.y, o.size, o.size)) return true;
  }
  return false;
}

// ---------- 移动 ----------
function tryMove(state: GameState, tank: Tank, dir: Dir, distance: number) {
  const v = DIR_VECTORS[dir];
  const moveX = v.x * distance;
  const moveY = v.y * distance;
  const others = tank.kind === "player" ? state.enemies : [state.player, ...state.enemies];
  const maxX = COLS * TILE - tank.size;
  const maxY = ROWS * TILE - tank.size;

  // 分轴移动，实现贴墙滑行
  if (moveX !== 0) {
    const nx = Math.max(0, Math.min(maxX, tank.x + moveX));
    const probe = { ...tank, x: nx };
    if (!collidesWithTerrain(state.grid, nx, tank.y, tank.size) && !tankHitsTanks(probe, others)) tank.x = nx;
  }
  if (moveY !== 0) {
    const ny = Math.max(0, Math.min(maxY, tank.y + moveY));
    const probe = { ...tank, y: ny };
    if (!collidesWithTerrain(state.grid, tank.x, ny, tank.size) && !tankHitsTanks(probe, others)) tank.y = ny;
  }
}

// ---------- 射击 ----------
function spawnBullet(state: GameState, tank: Tank, power = false, speed = BULLET_SPEED) {
  const v = DIR_VECTORS[tank.dir];
  const cx = tank.x + tank.size / 2;
  const cy = tank.y + tank.size / 2;
  const offset = tank.size / 2 + BULLET_SIZE;
  state.bullets.push({
    id: uid(),
    x: cx + v.x * offset - BULLET_SIZE / 2,
    y: cy + v.y * offset - BULLET_SIZE / 2,
    dir: tank.dir,
    speed,
    from: tank.kind === "player" ? "player" : "enemy",
    power,
    dead: false,
  });
}

function playerFire(state: GameState) {
  const p = state.player;
  if (p.cooldown > 0) return;
  const maxBullets = p.star >= 2 ? 3 : p.star >= 1 ? 2 : 1;
  const active = state.bullets.filter((b) => b.from === "player" && !b.dead).length;
  if (active >= maxBullets) return;
  spawnBullet(state, p, p.star >= 1, p.star >= 1 ? BULLET_SPEED * 1.25 : BULLET_SPEED);
  p.cooldown = p.star >= 2 ? PLAYER_FIRE_COOLDOWN - 8 : PLAYER_FIRE_COOLDOWN;
}

// ---------- 粒子 ----------
function burst(state: GameState, x: number, y: number, color: string, count = 12, speed = 2.4) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * speed + 0.4;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 24 + rand(16),
      maxLife: 40,
      color,
      size: 1.5 + Math.random() * 2,
    });
  }
}

function setMessage(state: GameState, text: string, frames: number) {
  state.message = text;
  state.messageTimer = frames;
}

// ---------- 敌人 ----------
function spawnEnemy(state: GameState) {
  const spawnPoints = [
    { x: TILE * 0.5, y: TILE * 0.5 },
    { x: (COLS / 2) * TILE - TILE / 2, y: TILE * 0.5 },
    { x: (COLS - 1.5) * TILE, y: TILE * 0.5 },
  ];
  const spot = spawnPoints[rand(spawnPoints.length)];
  // 检查是否被占用
  for (const e of state.enemies) {
    if (overlaps(spot.x, spot.y, TANK_SIZE, TANK_SIZE, e.x, e.y, e.size, e.size)) return;
  }
  if (overlaps(spot.x, spot.y, TANK_SIZE, TANK_SIZE, state.player.x, state.player.y, TANK_SIZE, TANK_SIZE)) return;
  if (collidesWithTerrain(state.grid, spot.x, spot.y, TANK_SIZE)) return;

  const diff = state.levelIndex * 0.3;
  const pool: EnemyKind[] = ["basic", "basic", "fast"];
  if (diff > 0.05) pool.push("power");
  if (diff > 0.25) pool.push("armor", "fast");
  const kind = pool[rand(pool.length)];
  const spec = ENEMY_SPECS[kind];
  state.enemies.push({
    id: uid(),
    x: spot.x,
    y: spot.y,
    dir: "down",
    size: TANK_SIZE,
    speed: spec.speed,
    hp: spec.hp,
    maxHp: spec.hp,
    kind,
    cooldown: 40 + rand(40),
    moving: false,
    aiTimer: 30 + rand(40),
    invuln: 0,
    shield: 0,
    star: 0,
  });
  state.remainingEnemies -= 1;
}

function updateEnemyAI(state: GameState, e: Tank) {
  const v = DIR_VECTORS[e.dir];
  const nx = e.x + v.x * e.speed * 4;
  const ny = e.y + v.y * e.speed * 4;
  const blocked =
    collidesWithTerrain(state.grid, nx, ny, e.size) ||
    tankHitsTanks({ ...e, x: nx, y: ny }, [state.player, ...state.enemies]);

  // 玩家在正前方时优先开火
  const pcx = state.player.x + state.player.size / 2;
  const pcy = state.player.y + state.player.size / 2;
  const ecx = e.x + e.size / 2;
  const ecy = e.y + e.size / 2;
  const aligned =
    (e.dir === "up" && Math.abs(pcx - ecx) < TILE * 0.6 && pcy < ecy) ||
    (e.dir === "down" && Math.abs(pcx - ecx) < TILE * 0.6 && pcy > ecy) ||
    (e.dir === "left" && Math.abs(pcy - ecy) < TILE * 0.6 && pcx < ecx) ||
    (e.dir === "right" && Math.abs(pcy - ecy) < TILE * 0.6 && pcx > ecx);

  if (aligned && e.cooldown <= 0) {
    spawnBullet(state, e, false, ENEMY_SPECS[e.kind as EnemyKind].bulletSpeed);
    e.cooldown = ENEMY_SPECS[e.kind as EnemyKind].fire;
  }

  e.aiTimer -= 1;
  if (e.aiTimer <= 0 || blocked) {
    e.aiTimer = 30 + rand(60);
    // 倾向朝基地方向
    const cx = Math.floor(COLS / 2);
    const baseTx = cx * TILE;
    const baseTy = ROWS * TILE;
    const towardsBaseVertical = baseTy > e.y + e.size ? "down" : "up";
    const towardsBaseHorizontal = baseTx < e.x ? "left" : "right";
    const roll = Math.random();
    if (roll < 0.45) {
      e.dir = towardsBaseVertical as Dir;
    } else if (roll < 0.85) {
      e.dir = towardsBaseHorizontal as Dir;
    } else {
      e.dir = DIRS[rand(4)];
    }
  }
}

// ---------- 子弹更新 ----------
function updateBullets(state: GameState) {
  for (const b of state.bullets) {
    if (b.dead) continue;
    const v = DIR_VECTORS[b.dir];
    // 分步推进，避免穿墙
    const steps = Math.ceil(b.speed / 2);
    const step = b.speed / steps;
    for (let s = 0; s < steps && !b.dead; s++) {
      b.x += v.x * step;
      b.y += v.y * step;
      resolveBullet(state, b);
    }
  }
  state.bullets = state.bullets.filter((b) => !b.dead && b.x > -20 && b.y > -20 && b.x < COLS * TILE + 20 && b.y < ROWS * TILE + 20);
}

function hitTile(state: GameState, tx: number, ty: number, b: Bullet): boolean {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const t = state.grid[ty][tx];
  if (!BULLET_BLOCKING.has(t)) return false;

  if (t === BRICK || t === BASE_BLOCK) {
    destroyBrickPatch(state, tx, ty, b);
    b.dead = true;
    burst(state, b.x, b.y, t === BASE_BLOCK ? "#ff6b6b" : "#d98f5a", 8, 1.8);
    if (t === BASE_BLOCK) {
      state.baseAlive = false;
      state.status = "lost";
      setMessage(state, "基地被摧毁！", 999);
      for (const [x, y] of baseCells()) {
        burst(state, x * TILE - TILE / 2, y * TILE, "#ff4d4d", 20, 3.5);
      }
    }
    return true;
  }
  if (t === STEEL) {
    if (b.power) {
      state.grid[ty][tx] = EMPTY;
      burst(state, b.x, b.y, "#9aa5b1", 10, 2);
    }
    b.dead = true;
    return true;
  }
  if (t === BASE_GUARD) {
    destroyBrickPatch(state, tx, ty, b);
    b.dead = true;
    burst(state, b.x, b.y, "#d98f5a", 8, 1.8);
    return true;
  }
  return false;
}

/** 子弹击中砖块时，按方向破坏邻近的砖块（更接近原版手感） */
function destroyBrickPatch(state: GameState, tx: number, ty: number, b: Bullet) {
  const breakAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
    const t = state.grid[y][x];
    if (t === BRICK || t === BASE_GUARD || t === BASE_BLOCK) state.grid[y][x] = EMPTY;
  };
  breakAt(tx, ty);
  if (b.dir === "up" || b.dir === "down") {
    breakAt(tx - 1, ty);
    breakAt(tx + 1, ty);
  } else {
    breakAt(tx, ty - 1);
    breakAt(tx, ty + 1);
  }
}

function resolveBullet(state: GameState, b: Bullet) {
  // 地形
  const tx = Math.floor((b.x + BULLET_SIZE / 2) / TILE);
  const ty = Math.floor((b.y + BULLET_SIZE / 2) / TILE);
  if (hitTile(state, tx, ty, b)) return;

  // 子弹互撞
  for (const o of state.bullets) {
    if (o === b || o.dead || o.from === b.from) continue;
    if (overlaps(b.x, b.y, BULLET_SIZE, BULLET_SIZE, o.x, o.y, BULLET_SIZE, BULLET_SIZE)) {
      b.dead = true;
      o.dead = true;
      burst(state, b.x, b.y, "#ffe08a", 6, 1.6);
      return;
    }
  }

  if (b.from === "player") {
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      if (overlaps(b.x, b.y, BULLET_SIZE, BULLET_SIZE, e.x, e.y, e.size, e.size)) {
        b.dead = true;
        e.hp -= 1;
        burst(state, b.x, b.y, "#ffd166", 8, 2);
        if (e.hp <= 0) {
          const spec = ENEMY_SPECS[e.kind as EnemyKind];
          state.score += spec.score;
          burst(state, e.x + e.size / 2, e.y + e.size / 2, "#ff8a3d", 18, 3);
          maybeDropPowerUp(state, e);
        }
        return;
      }
    }
  } else {
    const p = state.player;
    if (p.invuln <= 0 && !p.shield && overlaps(b.x, b.y, BULLET_SIZE, BULLET_SIZE, p.x, p.y, p.size, p.size)) {
      b.dead = true;
      killPlayer(state);
      return;
    }
    if (p.shield && overlaps(b.x, b.y, BULLET_SIZE, BULLET_SIZE, p.x, p.y, p.size, p.size)) {
      b.dead = true;
      p.shield = 0;
      burst(state, b.x, b.y, "#7bd3ff", 12, 2.2);
    }
  }
}

function maybeDropPowerUp(state: GameState, e: Tank) {
  if (Math.random() > 0.22) return;
  const kinds: PowerUpKind[] = ["star", "shield", "life", "bomb"];
  const kind = kinds[rand(kinds.length)];
  state.powerUps.push({
    id: uid(),
    x: e.x + e.size / 2 - TILE / 2,
    y: e.y + e.size / 2 - TILE / 2,
    kind,
    timer: 600,
  });
}

function killPlayer(state: GameState) {
  const p = state.player;
  burst(state, p.x + p.size / 2, p.y + p.size / 2, "#7bd3ff", 26, 3.4);
  state.lives -= 1;
  p.star = 0;
  p.shield = 0;
  if (state.lives < 0) {
    state.status = "lost";
    setMessage(state, "游戏结束", 999);
    return;
  }
  p.x = Math.floor(COLS / 2) * TILE - TANK_SIZE / 2 - TILE / 2;
  p.y = (ROWS - 5) * TILE;
  p.dir = "up";
  p.invuln = RESPAWN_INVULN;
}

// ---------- 道具 ----------
function applyPowerUp(state: GameState, pu: PowerUp) {
  const p = state.player;
  switch (pu.kind) {
    case "star":
      p.star = Math.min(2, p.star + 1);
      setMessage(state, p.star >= 2 ? "火力全开！" : "火力提升！", 80);
      break;
    case "shield":
      p.shield = POWERUP_DURATION;
      setMessage(state, "获得护盾！", 80);
      break;
    case "life":
      state.lives += 1;
      setMessage(state, "生命 +1", 80);
      break;
    case "bomb":
      for (const e of state.enemies) {
        burst(state, e.x + e.size / 2, e.y + e.size / 2, "#ff8a3d", 16, 3);
        state.score += ENEMY_SPECS[e.kind as EnemyKind].score;
      }
      state.enemies = [];
      setMessage(state, "屏幕清空！", 80);
      break;
  }
  burst(state, pu.x + TILE / 2, pu.y + TILE / 2, "#ffffff", 14, 2.6);
}

// ---------- 主更新 ----------
export function update(state: GameState, input: Input): GameState {
  state.frame += 1;
  if (state.messageTimer > 0) state.messageTimer -= 1;

  if (state.status === "playing") {
    const p = state.player;
    p.cooldown = Math.max(0, p.cooldown - 1);
    p.invuln = Math.max(0, p.invuln - 1);
    if (p.shield > 0) p.shield -= 1;

    // 玩家移动
    const dirs: Dir[] = [];
    if (input.up) dirs.push("up");
    if (input.down) dirs.push("down");
    if (input.left) dirs.push("left");
    if (input.right) dirs.push("right");
    if (dirs.length > 0) {
      const dir = dirs[dirs.length - 1];
      p.dir = dir;
      p.moving = true;
      tryMove(state, p, dir, p.speed);
    } else {
      p.moving = false;
    }
    if (input.fire) playerFire(state);

    // 敌人
    for (const e of state.enemies) {
      e.cooldown = Math.max(0, e.cooldown - 1);
      updateEnemyAI(state, e);
      e.moving = true;
      tryMove(state, e, e.dir, e.speed);
    }

    // 移除已死亡敌人
    state.enemies = state.enemies.filter((e) => e.hp > 0);

    // 刷新敌人
    if (state.remainingEnemies > 0 && state.enemies.length < 4) {
      state.enemySpawnTimer -= 1;
      if (state.enemySpawnTimer <= 0) {
        spawnEnemy(state);
        state.enemySpawnTimer = SPAWN_INTERVAL;
      }
    }

    // 过关判定
    if (state.remainingEnemies <= 0 && state.enemies.length === 0) {
      state.status = "won";
      setMessage(state, "关卡通过！", 999);
    }
  }

  updateBullets(state);

  // 道具拾取
  state.powerUps = state.powerUps.filter((pu) => {
    pu.timer -= 1;
    if (pu.timer <= 0) return false;
    const p = state.player;
    if (overlaps(pu.x, pu.y, TILE, TILE, p.x, p.y, p.size, p.size)) {
      applyPowerUp(state, pu);
      return false;
    }
    return true;
  });

  // 粒子
  state.particles = state.particles.filter((pt) => {
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vx *= 0.95;
    pt.vy *= 0.95;
    pt.life -= 1;
    return pt.life > 0;
  });

  return state;
}

export { LEVELS };
export const GRASS_TILE = GRASS;
export const WATER_TILE = WATER;
