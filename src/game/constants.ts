// 游戏核心常量
export const TILE = 16; // 逻辑格子尺寸（像素）
export const COLS = 26; // 地图宽（格）
export const ROWS = 26; // 地图高（格）
export const WIDTH = TILE * COLS;
export const HEIGHT = TILE * ROWS;

export const TANK_SIZE = 14;
export const BULLET_SIZE = 3;

export const TANK_SPEED = 1.4; // 玩家每帧移动速度
export const ENEMY_SPEED = 0.85;
export const FAST_ENEMY_SPEED = 1.4;
export const BULLET_SPEED = 4.2;
export const FAST_BULLET_SPEED = 6.0;

export const PLAYER_FIRE_COOLDOWN = 22; // 帧
export const ENEMY_FIRE_COOLDOWN = 80;
export const SPAWN_INTERVAL = 110; // 敌人刷新间隔帧
export const RESPAWN_INVULN = 120; // 玩家复活无敌帧
export const POWERUP_DURATION = 600; // 道具持续时间帧

// 地图块类型
export const EMPTY = 0;
export const BRICK = 1;
export const STEEL = 2;
export const GRASS = 3;
export const WATER = 4;
export const BASE_BLOCK = 5; // 基地本体
export const BASE_GUARD = 6; // 基地保护砖墙

export type TileType = number;

export const SOLID = new Set([BRICK, STEEL, WATER, BASE_BLOCK, BASE_GUARD]);
export const BULLET_BLOCKING = new Set([BRICK, STEEL, BASE_BLOCK, BASE_GUARD]);

export type Dir = "up" | "down" | "left" | "right";

export const DIR_VECTORS: Record<Dir, { x: number; y: number }> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export type PowerUpKind = "shield" | "star" | "life" | "bomb";

export type EnemyKind = "basic" | "fast" | "power" | "armor";

export const ENEMY_KINDS: EnemyKind[] = ["basic", "fast", "power", "armor"];

export const ENEMY_SPECS: Record<
  EnemyKind,
  { speed: number; hp: number; score: number; fire: number; bulletSpeed: number; color: string }
> = {
  basic: { speed: ENEMY_SPEED, hp: 1, score: 100, fire: ENEMY_FIRE_COOLDOWN, bulletSpeed: BULLET_SPEED, color: "#c7c7c7" },
  fast: { speed: FAST_ENEMY_SPEED, hp: 1, score: 200, fire: ENEMY_FIRE_COOLDOWN + 20, bulletSpeed: BULLET_SPEED, color: "#8fd3ff" },
  power: { speed: ENEMY_SPEED, hp: 2, score: 300, fire: ENEMY_FIRE_COOLDOWN - 30, bulletSpeed: FAST_BULLET_SPEED, color: "#ffd166" },
  armor: { speed: ENEMY_SPEED * 0.8, hp: 3, score: 400, fire: ENEMY_FIRE_COOLDOWN, bulletSpeed: BULLET_SPEED, color: "#7bd88f" },
};
