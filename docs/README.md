# 文档索引

本目录是项目的“可执行文档”：规则能被门禁检查，架构和功能文档与代码同仓库、同提交维护。

## 先读什么

| 你的问题 | 看这里 |
|---|---|
| 我能不能这样改？ | `AGENTS.md` |
| 提交信息怎么写？ | `docs/process/commit.md` |
| 为什么要先写失败测试？ | `docs/process/tdd.md` |
| 这个文件属于哪个模块、能依赖谁？ | `docs/modules.yaml` |
| 技术债阈值和基线怎么算？ | `docs/process/tech-debt.md` |
| 改代码要不要改文档？ | `docs/process/docs-sync.md` |
| 改到别人改过的文件要注意什么？ | `docs/process/anti-regression.md` |
| 以后上 iOS / 微信小程序怎么办？ | `docs/process/platform.md`、`docs/architecture/platform-strategy.md` |
| 系统现在怎么跑？ | `docs/architecture/overview.md` |
| 某个功能的业务规则？ | `docs/features/` |
| 存档结构是什么？ | `docs/data-model.md` |
| LLM 工具契约是什么？ | `docs/interfaces/agent-tools.md` |
| 产品下一步做什么？ | `docs/roadmap.md` |

## 目录结构

```text
docs/
  README.md                  # 本文件
  modules.yaml               # 模块、依赖、测试、文档、已知违规的唯一事实源
  process/                   # 开发流程细则（强制）
  architecture/              # 架构总览、生成式模块索引、多端策略
  features/                  # 每个核心功能的业务说明与时序图
  interfaces/                # engine 公共接口、LLM 工具契约
  data-model.md              # 世界状态、存档 envelope、IndexedDB、迁移策略
  templates/                 # 功能文档与 ADR 模板
  decisions/                 # 架构决策记录（ADR）
  roadmap.md                 # 产品路线（不是开发规范）
  datapack.md                # 数据包格式
  android.md                 # Android 构建
  proxy.md                   # LLM 代理
```

## 文档状态

功能文档 frontmatter 的 `status`：

- `implemented`：代码已存在，文档按当前行为维护。
- `planned`：计划中；`plannedCode` 允许不存在，链接用 `planned:` 前缀，不参与存在性检查。
- `deprecated`：保留作历史参考，代码可能已移除。

## 生成文件

`docs/architecture/modules.md` 由 `docs/modules.yaml` 生成。不要手改；运行：

```bash
npm run docs:build
```

CI 会检查生成文件与结果逐字节一致。

## 维护规则

1. 改行为的提交必须同步改对应功能文档，或写 `Docs-Impact: none: <理由≥4字>`。
2. 新增模块/功能：先注册 `docs/modules.yaml`，再写功能文档，再写代码。
3. 文档路径、frontmatter `code/tests` 路径必须真实存在（`planned` 除外）。
4. 影响模块边界、状态模型、平台策略的决策写 ADR，并链接到相关文档。
5. 文档过期检查：`last_reviewed` 超过 180 天会告警，不阻断；review 时顺手更新。
