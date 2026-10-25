# 数据包

联赛、俱乐部、姓名池和国籍权重都放在 `data/`，不写死在引擎里。启动时由 `src/world/datapack.ts` 用 Zod 校验，格式错误会立即抛错。

```text
data/
  countries/england.json
  names/pools.json
  names/nationalities.json
  denylist/england.json
```

## countries/*.json

```jsonc
{
  "code": "ENG",
  "nameZh": "英格兰",
  "leagues": [
    {
      "id": "league:ENG:1",
      "nameZh": "英伦超级联赛",
      "tier": 1,
      "promotionSlots": 0,
      "relegationSlots": 3,
      "reputation": 90
    }
  ],
  "clubs": [
    {
      "id": "club:ENG:1:01",
      "city": "伦敦",
      "nameZh": "伦敦雄鹰",
      "nameEn": "London Eagles",
      "tier": 1,
      "reputation": 92,
      "colors": { "primary": "#c9f56b", "secondary": "#12200b" },
      "style": "highPress",
      "stadium": "伦敦竞技场"
    }
  ],
  "namePools": {
    "英格兰": { "first": ["James"], "last": ["Smith"] }
  },
  "nationalityWeights": [{ "value": "英格兰", "weight": 58 }]
}
```

约束：

- `id` 必须符合 `club:<国家代码>:<层级>:<两位序号>` / `league:<国家代码>:<层级>`，且层级与 `tier` 一致。
- 同一层级至少 2 家俱乐部；tier 必须有对应联赛。
- 俱乐部 ID、中文名、英文名在全部数据包内唯一。
- `reputation` 为 1–100 的整数。
- `style` 只能是 `possession` / `counter` / `highPress` / `direct`。
- 每个国家必须有本国姓名池；`nationalities.json` 中每个国籍都必须有姓名池。
- 同一联赛不能同时有升级和降级名额。

## 新增国家

1. 复制 `data/countries/england.json`，填写新的 `code`、联赛、俱乐部和姓名池。
2. 在 `src/world/datapack.ts` 的 `COUNTRY_PACKS` 中注册新的 JSON。
3. 在 `data/denylist/` 添加对应真实俱乐部名单。
4. 运行 `npm run validate:data` 和 `npm run test`。

首版只有英格兰；加入更多国家时，生成器仍只为玩家所在联赛完整模拟，其余联赛按聚合 LOD 处理（见实施计划 §6.2）。

## 命名与版权

联赛、俱乐部、球员、教练、球场全部使用化名，不使用真实队徽、球衣、赞助商或球员肖像。生成名会和 `data/denylist/*.json` 做归一化比较：完全同名或长名称只差一个字符会直接让校验失败。

## 校验

```bash
npm run validate:data
```

脚本检查 ID 唯一性、层级引用、声望范围、姓名池覆盖、可选起点是否存在，以及 denylist 相似度。CI 会执行同一命令。
