# 坦克大战 · Tank Battle（Next.js）

使用 **Next.js 16 + React 19 + TypeScript + Tailwind CSS 4** 与 Canvas 2D 实现的经典坦克大战网页游戏。

## 运行

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## 操作

| 操作 | 按键 |
| --- | --- |
| 移动 | 方向键 / WASD |
| 开火 | 空格 / J / K |
| 暂停 | P / Esc |
| 音效开关 | M |
| 确认（下一关 / 重开） | Enter |

移动端会自动显示虚拟方向键与开火按钮（触屏 Pointer 事件，支持按住不放）。

## 玩法

- 每关需击毁指定数量的敌军坦克，全部清空即过关，进入下一关（共 3 张地图循环）。
- 保护地图底部的**基地**：基地被击毁或生命耗尽则游戏结束。
- 地形：砖块可被击碎、钢墙需要升级火力后才能破坏、草丛遮挡视线、水面无法通行。
- 道具（从被击毁的敌人身上概率掉落）：
  - ★ 火力提升（一级：子弹可破钢墙 + 双发；二级：三发 + 更快装填）
  - ◎ 护盾（一段时间内免疫一次/持续保护）
  - ♥ 生命 +1
  - ✸ 清屏（炸毁场上所有敌人）
- 最高分保存在 `localStorage`。

## 代码结构

```
src/
├─ app/
│  ├─ page.tsx                 页面入口（渲染游戏组件）
│  ├─ layout.tsx               SEO 元信息 / 全局字体
│  ├─ globals.css              全局样式
│  └─ components/TankGame.tsx  画布、HUD、输入处理、主循环（60FPS 固定步长）
└─ game/
   ├─ constants.ts             尺寸、速度、地形与敌人属性
   ├─ levels.ts                3 关字符地图 + 基地自动生成
   ├─ engine.ts                纯逻辑引擎：移动/碰撞/子弹/敌人 AI/道具/胜负
   ├─ render.ts                Canvas 像素风渲染（含粒子、草丛遮挡、护盾）
   └─ sfx.ts                   WebAudio 程序化音效（无外部素材）
```

引擎与渲染完全解耦，`update(state, input)` 为纯函数式状态推进，可直接在 Node 中做模拟测试。

## 已做的验证

- `tsc --noEmit`、`eslint` 无错误/警告；`next build` 通过。
- Node 中模拟数千帧：地图连通性、敌人 AI、击杀/过关/失败与基地摧毁均正常。
- 用 Canvas 桩对象渲染 900 帧，无异常、无非有限坐标。
