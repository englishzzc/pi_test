"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HEIGHT, WIDTH } from "@/game/constants";
import { createGame, GameState, Input, update } from "@/game/engine";
import { render } from "@/game/render";
import { playSfx } from "@/game/sfx";

const STORAGE_KEY = "tank-battle-highscore";

type HudState = {
  score: number;
  lives: number;
  levelName: string;
  levelIndex: number;
  enemiesLeft: number;
  status: GameState["status"];
  star: number;
  shield: boolean;
  message: string;
};

const emptyInput: Input = { up: false, down: false, left: false, right: false, fire: false };

const KEY_MAP: Record<string, keyof Input> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
  Space: "fire",
  KeyJ: "fire",
  KeyK: "fire",
};

export default function TankGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState | null>(null);
  const inputRef = useRef<Input>({ ...emptyInput });
  const pausedRef = useRef(false);
  const mutedRef = useRef(false);
  const prevRef = useRef({ bullets: 0, enemies: 0, lives: 3, status: "playing" as GameState["status"], score: 0, powerUps: 0 });

  const [hud, setHud] = useState<HudState>({
    score: 0,
    lives: 3,
    levelName: "",
    levelIndex: 0,
    enemiesLeft: 0,
    status: "playing",
    star: 0,
    shield: false,
    message: "",
  });
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [highScore, setHighScore] = useState(0);

  // 首次渲染后在客户端回填最高分
  useEffect(() => {
    let saved = 0;
    try {
      saved = Number(window.localStorage.getItem(STORAGE_KEY) ?? 0);
    } catch {
      saved = 0;
    }
    const value = Number.isNaN(saved) ? 0 : saved;
    if (value <= 0) return;
    const id = window.setTimeout(() => setHighScore((old) => Math.max(old, value)), 0);
    return () => window.clearTimeout(id);
  }, []);

  const resetGame = useCallback((level = 0) => {
    stateRef.current = createGame(level);
    setPaused(false);
    pausedRef.current = false;
  }, []);


  /** 关卡通过 -> 进入下一关；失败或全通关后重新开始 */
  const proceed = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    if (s.status === "won") {
      stateRef.current = createGame(s.levelIndex + 1, s.score, s.lives, s.player);
    } else {
      const finalScore = s.score;
      stateRef.current = createGame(0);
      if (finalScore > highScore) {
        setHighScore(finalScore);
        window.localStorage.setItem(STORAGE_KEY, String(finalScore));
      }
    }
  }, [highScore]);

  const togglePause = useCallback(() => {
    setPaused((p) => {
      pausedRef.current = !p;
      return !p;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      mutedRef.current = !m;
      return !m;
    });
  }, []);

  // 键盘输入
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        togglePause();
        return;
      }
      if (e.code === "KeyM") {
        toggleMute();
        return;
      }
      if (e.code === "Enter") {
        const s = stateRef.current;
        if (s && s.status !== "playing") proceed();
        return;
      }
      const k = KEY_MAP[e.code];
      if (k) {
        e.preventDefault();
        inputRef.current[k] = true;
        if (k === "fire") playSfx("shoot", mutedRef.current);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = KEY_MAP[e.code];
      if (k) {
        e.preventDefault();
        inputRef.current[k] = false;
      }
    };
    const onBlur = () => {
      inputRef.current = { ...emptyInput };
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [togglePause, toggleMute, proceed]);

  // 游戏主循环
  useEffect(() => {
    if (!stateRef.current) stateRef.current = createGame(0);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;

    let raf = 0;
    let last = 0;
    const step = 1000 / 60;

    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      if (time - last < step) return;
      last = time;

      const s = stateRef.current;
      if (!s) return;

      if (!pausedRef.current) {
        update(s, inputRef.current);

        // 声音事件检测
        const prev = prevRef.current;
        const playerBullets = s.bullets.filter((b) => b.from === "player").length;
        if (playerBullets > prev.bullets) playSfx("shoot", mutedRef.current);
        if (s.enemies.length < prev.enemies) playSfx("explode", mutedRef.current);
        if (s.lives < prev.lives) playSfx("explode", mutedRef.current);
        if (s.powerUps.length < prev.powerUps) playSfx("powerup", mutedRef.current);
        if (s.status !== prev.status) playSfx(s.status === "won" ? "win" : "lose", mutedRef.current);
        else if (s.score > prev.score) playSfx("hit", mutedRef.current);
        prevRef.current = {
          bullets: playerBullets,
          enemies: s.enemies.length,
          lives: s.lives,
          status: s.status,
          score: s.score,
          powerUps: s.powerUps.length,
        };
      }

      render(ctx, s, dpr);

      setHud((old) => {
        const next: HudState = {
          score: s.score,
          lives: s.lives,
          levelName: s.levelName,
          levelIndex: s.levelIndex,
          enemiesLeft: s.remainingEnemies + s.enemies.length,
          status: s.status,
          star: s.player.star,
          shield: s.player.shield > 0,
          message: s.messageTimer > 0 ? s.message : "",
        };
        if (
          old.score === next.score &&
          old.lives === next.lives &&
          old.levelIndex === next.levelIndex &&
          old.enemiesLeft === next.enemiesLeft &&
          old.status === next.status &&
          old.star === next.star &&
          old.shield === next.shield &&
          old.message === next.message
        ) {
          return old;
        }
        return next;
      });
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 触屏按键绑定
  const bindTouch = (key: keyof Input) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      inputRef.current[key] = true;
      if (key === "fire") playSfx("shoot", mutedRef.current);
    },
    onPointerUp: (e: React.PointerEvent) => {
      e.preventDefault();
      inputRef.current[key] = false;
    },
    onPointerLeave: () => {
      inputRef.current[key] = false;
    },
    onPointerCancel: () => {
      inputRef.current[key] = false;
    },
  });

  const padBtn =
    "select-none touch-none flex items-center justify-center rounded-xl bg-slate-800/80 text-slate-100 text-xl font-bold border border-slate-600/60 active:bg-cyan-600/80 active:scale-95 transition shadow-lg shadow-black/40";

  const isOver = hud.status !== "playing";

  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-4 px-3 py-5 sm:py-8">
      <header className="flex w-full flex-col items-center gap-1">
        <h1 className="text-2xl font-black tracking-[0.25em] text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.55)] sm:text-3xl">
          TANK BATTLE
        </h1>
        <p className="text-xs tracking-widest text-slate-500">坦克大战 · NEXT.JS EDITION</p>
      </header>

      {/* HUD */}
      <div className="grid w-full grid-cols-2 gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 p-3 text-xs sm:grid-cols-4 sm:text-sm">
        <Stat label="得分" value={hud.score.toString().padStart(6, "0")} accent="text-amber-300" />
        <Stat label="最高分" value={Math.max(highScore, hud.score).toString().padStart(6, "0")} accent="text-fuchsia-300" />
        <Stat label="生命" value={"♥".repeat(Math.max(0, hud.lives)) || "—"} accent="text-rose-400" />
        <Stat label="剩余敌人" value={String(hud.enemiesLeft)} accent="text-cyan-300" />
      </div>

      <div className="flex w-full items-center justify-between text-xs text-slate-400">
        <span className="truncate">{hud.levelName}</span>
        <span className="flex items-center gap-2">
          {hud.star > 0 && <span className="text-amber-300">火力 {"★".repeat(hud.star)}</span>}
          {hud.shield && <span className="text-sky-300">护盾</span>}
        </span>
      </div>

      {/* 画布 */}
      <div className="relative w-full max-w-[640px]">
        <div
          className="relative w-full overflow-hidden rounded-xl border-2 border-slate-700 bg-black shadow-[0_0_40px_rgba(34,211,238,0.15)]"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        >
          <canvas ref={canvasRef} className="h-full w-full" style={{ imageRendering: "pixelated" }} />

          {(paused || isOver) && !hud.message && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/75 backdrop-blur-sm">
              <p className="text-lg font-bold text-cyan-200">{paused ? "已暂停" : hud.status === "won" ? "关卡通过" : "游戏结束"}</p>
              <p className="text-xs text-slate-400">
                {paused ? "按 P 或点击下方按钮继续" : hud.status === "won" ? "按 Enter 进入下一关" : "按 Enter 重新开始"}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (paused) togglePause();
                  else proceed();
                }}
                className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 active:scale-95"
              >
                {paused ? "继续" : hud.status === "won" ? "下一关" : "重新开始"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex w-full max-w-[640px] items-center justify-center gap-2">
        <button
          type="button"
          onClick={togglePause}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700 active:scale-95"
        >
          {paused ? "▶ 继续 (P)" : "⏸ 暂停 (P)"}
        </button>
        <button
          type="button"
          onClick={toggleMute}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700 active:scale-95"
        >
          {muted ? "🔇 静音 (M)" : "🔊 音效 (M)"}
        </button>
        <button
          type="button"
          onClick={() => {
            const s = stateRef.current;
            if (s && s.status === "lost") proceed();
            else resetGame(0);
          }}
          className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 transition hover:bg-slate-700 active:scale-95"
        >
          ↻ 重新开始
        </button>
      </div>

      {/* 触屏方向键 */}
      <div className="flex w-full max-w-[640px] items-center justify-between gap-4 select-none sm:hidden">
        <div className="grid grid-cols-3 grid-rows-3 gap-1.5" style={{ width: 168 }}>
          <span />
          <button type="button" aria-label="上" className={`${padBtn} h-12`} {...bindTouch("up")}>▲</button>
          <span />
          <button type="button" aria-label="左" className={`${padBtn} h-12`} {...bindTouch("left")}>◀</button>
          <span />
          <button type="button" aria-label="右" className={`${padBtn} h-12`} {...bindTouch("right")}>▶</button>
          <span />
          <button type="button" aria-label="下" className={`${padBtn} h-12`} {...bindTouch("down")}>▼</button>
          <span />
        </div>
        <button type="button" aria-label="开火" className={`${padBtn} h-20 w-20 rounded-full text-2xl`} {...bindTouch("fire")}>
          🔥
        </button>
      </div>

      <footer className="text-center text-[11px] leading-relaxed text-slate-500">
        <p>方向键 / WASD 移动 · 空格 / J 开火 · P 暂停 · M 音效 · Enter 确认</p>
        <p className="mt-1">保护基地！击破 ★ 提升火力，◎ 护盾，♥ 加命，✸ 清屏</p>
        <p className="mt-1 text-slate-600">砖块可被击毁，钢墙需要提升火力后才能破坏，水面无法通行</p>
      </footer>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
      <span className={`font-mono text-base font-bold tabular-nums ${accent}`}>{value}</span>
    </div>
  );
}
