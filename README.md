# 人生模拟器 RPG

一个 **RPG 风格的人生模拟器**网页游戏。玩家拥有角色属性（智力、体力、魅力等），通过回合制的**事件选择**（上学、工作、恋爱等）推进人生，随年龄不断成长。

> 当前已完成核心游戏逻辑（属性、事件、存档，均含单元测试），UI 界面仍在开发中。

## 技术栈

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) 构建工具
- [oxlint](https://oxc.rs/) 代码检查

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 类型检查 + 生产构建
npm run build

# 代码检查
npm run lint

# 预览构建产物
npm run preview
```

## 项目结构

```
rpg_life_game/
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig*.json
├─ public/
└─ src/
   ├─ main.tsx        # 应用入口
   ├─ App.tsx         # 根组件
   ├─ App.css
   ├─ index.css
   ├─ components/     # 游戏组件（AttributePanel、EventCard、LogPanel）
   └─ game/           # 游戏纯逻辑（属性、事件、存档，含单元测试）
```

## 路线图

- [x] 项目骨架初始化（git / GitHub / Vite + React + TS）
- [x] 角色属性系统（纯逻辑 + 单元测试）
- [x] 回合制事件系统（事件定义、效果计算、按阶段随机选择 + 事件池）
- [x] 事件随机权重（`weight` 字段，加权随机选择）+ 扩充事件池（20 个事件）
- [x] 事件前置条件（`requires`：按属性/财富/里程碑解锁特定事件）
- [x] 更多结局（声名显赫/隐世智者等，共 9 种）与事件内容（扩充至 29 个）
- [x] 难度（简单/普通/困难，影响成长倍率与开局财富）+ 开局出身选择（6 种预设），并随存档持久化
- [x] 多周目统计（各结局收集率，独立持久化）+ 背景音乐（Web Audio 合成循环旋律，可开关）
- [x] 年龄成长与生涯系统（80 岁终局，按属性/财富评估多种结局）
- [x] 结局多样性（里程碑系统：抉择影响专属结局，如创业传奇/学术人生）
- [x] 存档 / 读档（localStorage 序列化，读取失败回退默认角色）
- [x] 游戏 UI 完善（属性面板 + 事件卡 + 人生回顾日志，可玩最小循环）
- [x] UI 视觉美化（复古手账/怀旧风：纸张纹理、手写体、便签胶带、印章式结局）
- [x] 音效（Web Audio 合成：选择/里程碑/结局）+ 动画（卡片入场、日志淡入、结局弹出，支持减弱动态）
- [x] 成就系统（里程碑/属性/财富条件，跨存档独立持久化 + 解锁通知/音效 + 成就图鉴）

## 许可证

尚未指定。
