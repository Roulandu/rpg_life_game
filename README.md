# 人生模拟器 RPG

一个 **RPG 风格的人生模拟器**网页游戏。玩家拥有角色属性（智力、体力、魅力等），通过回合制的**事件选择**（上学、工作、恋爱等）推进人生，随年龄不断成长。

> 当前为**项目骨架**阶段，游戏逻辑（属性系统、事件系统、存档等）仍在规划开发中。

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
   └─ components/     # 游戏组件（属性面板、事件卡等，占位）
```

## 路线图

- [x] 项目骨架初始化（git / GitHub / Vite + React + TS）
- [ ] 角色属性系统
- [ ] 回合制事件选择系统
- [ ] 年龄成长与生涯系统
- [ ] 存档 / 读档
- [ ] 游戏 UI 完善

## 许可证

尚未指定。
