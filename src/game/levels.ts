import { BASE_BLOCK, BASE_GUARD, BRICK, COLS, EMPTY, GRASS, ROWS, STEEL, WATER } from "./constants";

const LEGEND: Record<string, number> = {
  ".": EMPTY,
  B: BRICK,
  S: STEEL,
  G: GRASS,
  W: WATER,
};

export type Level = {
  name: string;
  /** 26 行 x 26 列的字符地图，基地区域由引擎自动生成 */
  rows: string[];
};

/**
 * 地图设计：左右对称，中间留出通道，基地在底部中央。
 * 基地附近 3x2 区域会在引擎里自动绘制。
 */
export const LEVELS: Level[] = [
  {
    name: "第 1 关 · 新兵训练场",
    rows: [
      "..........................",
      "..BB..BB..........BB..BB..",
      "..BB..BB..........BB..BB..",
      "......BB..........BB......",
      "BBBB......SSSSSS......BBBB",
      "GBBB..................BBBG",
      "......BB..BBB.BB..BB......",
      "......BB..BBB.BB..BB......",
      "..SS......BB....BB......SS",
      "..SS..................SS..",
      "..BB..WWWW....WWWW..BB....",
      "..BB..WWWW....WWWW..BB....",
      "......BB........BB........",
      "GG....BB..BBBB..BB....GG..",
      "GG....BB..BBBB..BB....GG..",
      "......BB........BB........",
      "..SS......BBBB......SS....",
      "..SS......BBBB......SS....",
      "..BB..................BB..",
      "..BB..WWWWWWWWWWWW..BB....",
      "......BBBBBBBBBBBB........",
      "GG....BB........BB....GG..",
      "GG....SS........SS....GG..",
      "..........................",
      "..........................",
      "..........................",
    ],
  },
  {
    name: "第 2 关 · 钢铁回廊",
    rows: [
      "..........................",
      "..SSSS..........SSSS......",
      "..S..................S....",
      "..S..BB..BB..BB..BB..S....",
      "..S..BB..BB..BB..BB..S....",
      "..GGGG..............GGGG..",
      "........SSSSSSSS..........",
      "..BB....B......B....BB....",
      "..BB....B..WW..B....BB....",
      "..BB....B..WW..B....BB....",
      "..SS....B......B....SS....",
      "..........GGGG............",
      "..WWWW....GGGG....WWWW....",
      "..BBBB..SSSSSSSS..BBBB....",
      "..GGGG..BB......BB..GGGG..",
      "........BB..BB..BB........",
      "..SS....BB..BB..BB....SS..",
      "..SS....BB..BB..BB....SS..",
      "..........BB..BB..........",
      "..BB..BB..BB..BB..BB..BB..",
      "..BB..BB..BB..BB..BB..BB..",
      "..GG..BB..........BB..GG..",
      "..BB......SS..SS......BB..",
      "..BB......SS..SS......BB..",
      "..............  .........",
      "..........................",
    ],
  },
  {
    name: "第 3 关 · 沼泽要塞",
    rows: [
      "..........................",
      "..BBBB..........BBBB......",
      "..BBBB..........BBBB......",
      "..BB....WWWWWWWW....BB....",
      "..BB....W......W....BB....",
      "..GG....W..SS..W....GG....",
      "..BB....W..SS..W....BB....",
      "..BB....WWWWWWWW....BB....",
      "..BBBB..........BBBB......",
      "..BBBB..........BBBB......",
      "......SSSSSSSSSSSS........",
      "..GG..B..........B..GG....",
      "..BB..B..BB..BB..B..BB....",
      "..BB..B..BB..BB..B..BB....",
      "..BB..B..........B..BB....",
      "..BB..BBBBBBBBBBBB..BB....",
      "......BB..........BB......",
      "..SS..BB..GGGG..BB..SS....",
      "..SS..BB..GGGG..BB..SS....",
      "......BB..........BB......",
      "..BBBBBB..BBBB..BBBBBB....",
      "..BB..........BB......BB..",
      "..GG..SSSS......SSSS..GG..",
      "..BB..SSSS......SSSS..BB..",
      "..........................",
      "..........................",
    ],
  },
];

/** 把字符地图转成 tile 二维数组，并在底部中央放置基地与保护墙 */
export function buildGrid(level: Level): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < ROWS; y++) {
    const row = level.rows[y] ?? "";
    const line: number[] = [];
    for (let x = 0; x < COLS; x++) {
      const ch = row[x] ?? ".";
      line.push(LEGEND[ch] ?? EMPTY);
    }
    grid.push(line);
  }

  const cx = Math.floor(COLS / 2);
  // 清空基地周边
  for (let y = ROWS - 4; y < ROWS; y++) {
    for (let x = cx - 3; x <= cx + 2; x++) {
      if (grid[y] && grid[y][x] !== undefined) grid[y][x] = EMPTY;
    }
  }
  // 基地本体
  for (let y = ROWS - 2; y < ROWS; y++) {
    for (let x = cx - 1; x <= cx; x++) {
      grid[y][x] = BASE_BLOCK;
    }
  }
  // 保护墙
  const guard: Array<[number, number]> = [
    [ROWS - 3, cx - 2], [ROWS - 3, cx - 1], [ROWS - 3, cx], [ROWS - 3, cx + 1],
    [ROWS - 4, cx - 1], [ROWS - 4, cx],
    [ROWS - 4, cx - 2], [ROWS - 4, cx + 1],
    [ROWS - 3, cx - 3], [ROWS - 3, cx + 2],
    [ROWS - 2, cx - 3], [ROWS - 2, cx + 2],
  ];
  for (const [y, x] of guard) {
    if (grid[y] && grid[y][x] !== undefined) grid[y][x] = BASE_GUARD;
  }
  return grid;
}
