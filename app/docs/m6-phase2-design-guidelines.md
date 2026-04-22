# 九泰临研 V1 · M6 第二阶段 UI 设计规范

> 版本：V1 · 2026-04-20 · 由 tech-lead 兜底起草（UI-Designer 未在 SLA 内交付）
>
> 目标：KPI 看板、CSV 导出按钮、FAQ / 社区分区 / 敏感词三套 CRUD 界面，**全部复用 admin.css 现有 token 与组件语言**，不引新字体、不引新色、不引图表库。

---

## 零、硬规则（踩线即退回）

1. **禁止自立门户**：本次所有 UI 必须复用 `app/src/app/admin/admin.css` 已定义的 class 与 design token。
2. **不引图表库**：KPI 看板的所有图形用**原生 SVG**（< 30 行），数据驱动，桌面优先。
3. **不引 UI 组件库**：按钮、表单、表格全部走 admin.css 已有 class。
4. **不加新色**：只能使用 `--ink-*` / `--cream-*` / `--gray-*` / `--accent` / `--lime` / `--danger-*` / `--warning-*` / `--success-*` / `--info-*` 既有 token。
5. **桌面优先**：最小宽度 1280px（与现有 admin 一致）；不做移动端响应式适配（V1 out of scope）。
6. **交互态四件套**：空态、加载、错误、成功反馈——每个页面都要覆盖。
7. **文案中文**，按钮一律 `.btn-admin` 体系（`--primary` / `--danger` / `--ghost` / `--sm`）。

---

## 一、T1 · KPI 看板 `/admin`（工作台首页升级）

### 信息架构（从上到下）

```
┌──────────────────────────────────────────────────────────────┐
│ admin-topbar：                                                │
│   h1 工作台 / 01        [时间范围切换 7d/30d]  [+ 新建试验]   │
│   sub 运营指标 · 实时快照                                     │
└──────────────────────────────────────────────────────────────┘

┌─── 主指标卡区（kpi-grid，6 张）──────────────────────────────┐
│ [新增线索 7d]  [新增报名 7d]  [待跟进新线索]                  │
│ [社区待审]    [招募中试验]   [累计入组]                       │
└──────────────────────────────────────────────────────────────┘

┌─── 线索漏斗 + 报名阶段分布（两栏 1:1） ─────────────────────┐
│  ┌ admin-card ────────┐   ┌ admin-card ────────────────┐     │
│  │ h2 线索漏斗        │   │ h2 报名阶段分布              │     │
│  │ SVG 漏斗图          │   │ 水平堆叠条（6 段）          │     │
│  │ 四态 + 转化率        │   │                            │     │
│  └───────────────────┘   └────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘

┌─── Top 5 热门试验表 ──────────────────────────────────────┐
│  h2 Top 5 热门试验 / 近 30 日                                │
│  [admin-table]                                                │
└──────────────────────────────────────────────────────────────┘

┌─── 待办区（admin-card）───────────────────────────────────┐
│  h2 待办清单                                                 │
│  · 待跟进新线索 N 条 →                                       │
│  · 社区待审核 N 条 →                                         │
│  · 报名待审核 N 条 →                                         │
└──────────────────────────────────────────────────────────────┘
```

### 关键组件规格

#### 1. 主指标卡（6 张）
- 沿用现有 `.kpi-grid` + `.kpi-card`
- 结构：`.label`（mono 11px uppercase） → `.value`（serif 48px） → `.hint`（12px gray-500）
- 趋势指示器放在 `.value` 右侧同行的小 span：
  - 上升：`+12%` `--success-700` 字 + `▲` 三角符号
  - 下降：`-5%` `--danger-700` 字 + `▼`
  - 持平：`0%` `--gray-500` 字
  - 字体 `--font-mono`，11px
- 当 `range=7d` 时趋势对比**上一个同期 7d**；`range=30d` 对比**上一个 30d**

#### 2. 时间范围切换
```html
<div class="range-switch">
  <a href="?range=7d" class="btn-admin btn-admin--sm" aria-current="page">近 7 天</a>
  <a href="?range=30d" class="btn-admin btn-admin--sm btn-admin--ghost">近 30 天</a>
</div>
```
- 当前选中：`.btn-admin`（默认暖米底）；非选中：`.btn-admin--ghost`
- 放在 admin-topbar 右侧，与「+ 新建试验」同行

#### 3. 线索漏斗 SVG
- 容器 `.funnel` 480×200，内嵌 `<svg viewBox="0 0 480 200">`
- 4 个梯形段：new / contacted / qualified / disqualified
  - 宽度按数量比例缩放；最大段固定 480
  - 填充色：
    - new → `--info-50`，描边 `--info-700`
    - contacted → `--warning-50`，描边 `--warning-700`
    - qualified → `--success-50`，描边 `--success-700`
    - disqualified → `--gray-50`，描边 `--gray-400`
  - 每段中央 `<text>`：状态名（13px）+ 数值（20px serif 粗）
- 段间显示箭头 `▶` + 转化率文本（如 `42%`），mono 11px
- 无障碍：外层 `role="img" aria-label="线索漏斗..."`

#### 4. 报名阶段分布（水平堆叠条）
- 单行容器宽 100%，高 48px，`border-radius: 8px`，`overflow: hidden`
- 6 段按比例填色：
  - submitted → `--info-50`
  - in_review → `--warning-50`
  - contacted → `--warning-100`（若无则用 `--warning-50` 加边框）
  - enrolled → `--success-50`
  - withdrawn → `--gray-50`
  - closed → `--gray-100`
- 段内显示 N（若 ≥ 8% 才展示，否则只在图例显示）
- 下方 legend 一行：每阶段 `[色块 + 名称 + 数值]`，mono 11px

#### 5. Top 5 热门试验表
- 沿用 `.admin-table`
- 列：排名（#01–#05 mono 橙字）、标题（serif 16px）、病种、城市、近 30 日线索、累计线索、状态 chip
- 行 hover：`.admin-table tr:hover td` 已有样式（cream-50 底）
- 行 click 跳 edit 页（整行包 `<Link>` 或每列 td 加 js click）

#### 6. 待办区 `.admin-card`
- 每条结构：`<a class="btn-admin btn-admin--ghost">`，左对齐 flex，`justify-content: space-between`
- 左：大数字（serif 32px） + 说明（14px）
- 右：`→` 箭头
- 空态（0 条）：「✓ 暂无待办」淡绿色小字

### 交互状态
- **加载**：整页服务端渲染，不做 client loading
- **空数据**：每个指标卡 value = 0 + hint「暂无数据」；漏斗显示「暂无线索数据」
- **错误**：指标卡 value 显示 `—` + hint「加载失败」，`--gray-500`
- **成功反馈**：无（只读页面）

### 色彩 token 清单（已有）
- 背景：`--cream-50`（页）/ `--cream-0`（卡）
- 边框：`--ink-100`
- 主色：`--ink-900`
- 语义：`--info-*` / `--warning-*` / `--success-*` / `--danger-*` / `--lime` / `--accent`
- 字：`--gray-500` / `--gray-600`

---

## 二、T2 · CSV 导出按钮

### 放置位置
- `/admin/leads`：`admin-topbar` 右侧 admin-actions 区
- `/admin/applications`：同上

### 按钮规格
```html
<a
  href="/admin/api/leads/export.csv?{当前筛选}"
  class="btn-admin"
  download
>
  ⬇ 导出 CSV
</a>
```
- 用 `.btn-admin`（次级，非 primary；primary 留给「新建」类主动作）
- 图标 `⬇` 纯文本（不引 icon 库）
- 悬停走 `.btn-admin:hover` 已有规则

### 交互状态
- **loading**：点击后按钮置 `aria-disabled="true"`，文字变「导出中…」；因是原生 download，loading 基本只存在于浏览器侧，不需要 client JS 特殊处理
- **权限不足（operator）**：按钮不渲染；若直接访问 API 返 403
- **空筛选结果**：仍下载，只含表头

### 无障碍
- 按钮有 `aria-label="按当前筛选条件导出 CSV"`

---

## 三、T3 · FAQ 后台 `/admin/faq/*`

### 3a. 列表页 `/admin/faq`

信息架构：
```
admin-topbar：h1 FAQ 管理 / {总数}      [+ 新建 FAQ]
admin-filters：[搜索] [分类下拉] [状态下拉] [查询] [清空]
admin-table：
  | 排序 | 分类 | 问题 | 状态 | 更新时间 | 操作 |
```

- `.chip--published`（lime 色）/ `.chip--draft`（gray 色，新增两个 class，沿用现有 chip 色语义）
- 操作列：`[查看 / 编辑]` `[下架 / 上架]`（server action 按钮）

**新增 chip 变体 CSS**（加在 admin.css）：
```css
.chip--published { color: var(--success-700); background: var(--success-50); border-color: var(--success-700); }
.chip--draft { color: var(--gray-500); background: var(--gray-50); border-color: var(--gray-400); }
```

### 3b. 新建 / 编辑页

信息架构：左侧表单 `.admin-form`（max-width 960）+ 顶部 topbar + 底部 `.form-actions`

- 字段走 `.admin-form .field`
- `question` 必填，单行 input，`maxlength=120`，右下计数
- `answer` 必填，`<textarea>`，`min-height: 200px`
- `category` 下拉（7 选）
- `tags` 单行 input，placeholder「逗号分隔，如 高血压,糖尿病」
- `order` number input，默认 100
- `slug` 单行 input，placeholder「英文小写+连字符，留空自动生成」
- `isPublished` checkbox，label「立即发布」
- 提交按钮 `.btn-admin--primary`；取消按钮 `.btn-admin--ghost`
- 删除按钮（仅编辑页）：`<DeleteButton>` client 组件（复用 `DeleteTrialButton` 模式），`.btn-admin--danger`，二次 confirm
- 错误展示：表单顶部 `.admin-form .error`

### 交互状态
- 空列表：表格下方 colSpan 行「还没有 FAQ，点击上方「新建 FAQ」开始」
- 保存成功：server action redirect 回列表 + revalidatePath
- 保存失败：表单 `.error` 块展示原因
- 删除二次确认：`confirm("确定删除这条 FAQ？此操作不可撤销。")`

---

## 四、T4 · 社区分区配置 `/admin/community/groups`

### 4a. 列表页

```
admin-topbar：h1 社区分区 / {总数}      [+ 新建分区]
admin-table：
  | 排序 | 名称 | slug | 病种标签 | 简介（截断） | 帖子数 | 本周新增 | 启用 | 操作 |
```

- `启用` 列：小型 toggle（原生 checkbox + css 伪类样式，**禁止引第三方**）
- 分区名用 `serif 18px`（复用现有表格内嵌 `<strong>` 样式）
- `帖子数` 和 `本周新增` 用 `--font-mono`

**新增 toggle CSS**（加在 admin.css）：
```css
.admin-toggle { position: relative; display: inline-block; width: 36px; height: 20px; }
.admin-toggle input { opacity: 0; width: 100%; height: 100%; cursor: pointer; }
.admin-toggle .track { position: absolute; inset: 0; background: var(--gray-400); border-radius: 999px; transition: background .15s; }
.admin-toggle .thumb { position: absolute; left: 2px; top: 2px; width: 16px; height: 16px; background: var(--cream-0); border-radius: 50%; transition: transform .15s; }
.admin-toggle input:checked + .track { background: var(--success-700); }
.admin-toggle input:checked + .track + .thumb { transform: translateX(16px); }
```

### 4b. 新建 / 编辑页

字段：
- `name` 必填
- `slug` 必填，Zod `^[a-z0-9-]+$`
- `diseaseTag` 可选，下拉 + 自由输入（用 `<input list="...">` datalist，值来自现有 trial.disease 聚合）
- `introduction` textarea，最多 500 字
- `sortOrder` number，默认 100
- `isEnabled` checkbox

### 交互状态
- 删除：若 `帖子数 > 0`，删除按钮禁用 + tooltip「存在 N 条帖子，无法删除」
- slug 冲突：表单 error
- 空列表：「还没有分区，点击上方「新建分区」开始」

---

## 五、T5 · 敏感词后台 `/admin/community/sensitive-words`

### 5a. 列表页

```
admin-topbar：h1 敏感词词库 / {总数}   [+ 新建词] [批量导入]
admin-filters：[搜索关键词] [类型下拉] [级别下拉] [仅看启用] [查询]
admin-table：
  | 关键词 | 类型 | 级别 | 命中数 | 最近命中 | 启用 | 操作 |
```

- `关键词` 字段使用 `--font-mono`，14px
- `类型` 用 chip：`chip--contact` / `chip--drug-sale` / `chip--enroll-promise` / `chip--quackery` / `chip--ad`，统一用 `--info-50/--info-700` 色（新增 5 个 chip 变体或复用一个通用 `chip--type`）
- `级别` 用 chip：
  - high → `chip--rejected`（danger 红）
  - medium → `chip--pending`（warning 黄）
  - low → `chip--hidden`（gray）
  - （复用已有 chip 变体，不新增色）
- `启用` 同 T4 toggle

**类型 chip 中文映射**：
- contact → 联系方式
- drug-sale → 药品推销
- enroll-promise → 入组承诺
- quackery → 伪医疗
- ad → 广告

**新增 chip 变体**（加在 admin.css，统一用 info 色系）：
```css
.chip--type { color: var(--info-700); background: var(--info-50); border-color: var(--info-700); }
```

### 5b. 新建 / 编辑页

字段：
- `keyword` 必填，唯一
- `riskType` 必选（5 选 1 下拉）
- `riskLevel` 必选（3 选 1 radio：high / medium / low）
- `isEnabled` checkbox
- `note` textarea，可选，解释为何收录

### 5c. 批量导入（`/admin/community/sensitive-words/import`）

独立页（不弹 modal，便于粘贴大量内容）：
```
admin-topbar：h1 批量导入敏感词  [返回列表]
admin-card：
  说明区：格式 "level|type|keyword"，每行一条；例 "high|contact|加我微信"
  textarea：min-height 320px，mono 字体
  [提交] 按钮
```

提交后跳转 `/admin/community/sensitive-words?imported={new}+{updated}+{failed}`，列表页顶部显示成功提示条（浅绿 success-50 底）。

### 交互状态
- 缓存刷新提示：编辑页保存成功后顶部显示「已生效，运行中扫描会在 60 秒内加载新词」
- 批量导入有失败行：列出失败行号 + 原因
- 空列表：「还没有敏感词，点击上方「批量导入」从 data/sensitive-words.txt 同步一批」

---

## 六、通用无障碍

- 所有 icon-only 按钮必须有 `aria-label`
- 过渡 150ms ease-out
- 表格行 hover 只变底色（`.admin-table` 已有规则），不平移
- 表单 error 用 `role="alert"`
- SVG 漏斗 / 堆叠条用 `role="img" aria-label="..."`

---

## 七、切忌

- ❌ 不引图表库（recharts / echarts / visx）
- ❌ 不引 UI 组件库（antd / shadcn / headlessui）
- ❌ 不新增色 token，只用 admin.css / design-system 已有的
- ❌ 不引 icon 字体，用 Unicode 字符或纯 SVG
- ❌ 不在 admin 页面混入患者端 `--accent` 主按钮（保留给患者端转化）——**本次敏感词后台、分区后台的「新建」按钮全部用 `.btn-admin--primary`（ink 底），不用 accent**
- ❌ 不做移动端响应式（V1 后台桌面专用）

---

## 八、落地清单（给工程师的验收抽查点）

- [ ] `/admin` 首页展示 6 张指标卡 + 漏斗 + 堆叠条 + Top5 + 待办
- [ ] `/admin/leads` 顶部有「⬇ 导出 CSV」按钮
- [ ] `/admin/applications` 顶部有「⬇ 导出 CSV」按钮
- [ ] `/admin/faq` 列表 + `/admin/faq/new` + `/admin/faq/[id]/edit` 路由正常
- [ ] `/admin/community/groups` 列表 + new + edit 路由正常
- [ ] `/admin/community/sensitive-words` 列表 + new + edit + import 路由正常
- [ ] admin-sidebar 左侧 nav 新增 3 项：FAQ / 分区 / 敏感词
- [ ] 所有新增 class 都加在 `admin.css`，不污染其他样式表
- [ ] tsc 零错误、build 通过

---

*本规范由 tech-lead 兜底起草于 2026-04-20；UI-Designer 回来后可在此基础上 review 补充组件细节或 micro-interaction。*

---

## 九、交互态补丁（UI-Designer 补充 · 2026-04-20）

> 经 ui-ux-pro-max skill + admin.css + community-ui-guidelines.md 三方交叉 review 后的 7 条增量。所有补丁**不新增 CSS var、不新增字体、不引第三方库**，只在 `admin.css` 末尾追加。

### Gap 1 · 焦点环统一规范（P0）

**问题**：`design-system.css:208` 定义的全局 `:focus-visible { box-shadow: 0 0 0 3px rgba(255, 90, 31, .35) }` 是暖橙色——admin 后台的硬规则是"不混 accent 色"，所以 admin 页面所有键盘焦点都在违规。

**补丁方案**：在 `.admin-shell` / `.login-page` 命名空间下用 `--lime`（品牌电青绿）覆盖全局 focus 环。`--lime` 在 cream 底（对比度 1.54:1）和 ink-900 底（对比度 13:1）都可见，符合 WCAG non-text contrast 3:1 要求。

**代码**（已加入 `admin.css`）：
```css
.admin-shell :focus-visible,
.login-page :focus-visible {
  outline: 2px solid var(--lime);
  outline-offset: 2px;
  box-shadow: none;
  border-radius: var(--r-sm);
}
.admin-shell .btn-admin:focus-visible,
.admin-shell .admin-toggle input:focus-visible ~ .track {
  outline: 2px solid var(--lime);
  outline-offset: 2px;
}
```

### Gap 2 · KPI 看板三态字色（P0）

**问题**：当前 KPI 卡 `value` 无论真实 0、冷启动无数据、加载失败都用同一字色 `--ink-900`，运营看到 `0` 和 `—` 很难一眼区分"今天就是没有"和"系统坏了"。

**补丁方案**：三态字色区分 + hint 文案区分：

| 状态 | value 内容 | value 字色 | hint 文案 | hint 字色 |
|---|---|---|---|---|
| 真实 0 | `0` | `--ink-900` | `近 7 天无新增` | `--gray-500` |
| 冷启动无数据 | `—` | `--gray-400` | `暂无数据` | `--gray-500` |
| 加载失败 | `—` | `--danger-500` | `加载失败，请刷新` | `--danger-700` |

**CSS**（已加入 `admin.css`）：
```css
.kpi-card .value { color: var(--ink-900); }
.kpi-card .value--muted { color: var(--gray-400); }
.kpi-card .value--error { color: var(--danger-500); }
.kpi-card .hint--error { color: var(--danger-700); }
```

**工程侧使用（归 admin-engineer 落地）**：
```tsx
<div className={`value${isEmpty ? " value--muted" : ""}${isError ? " value--error" : ""}`}>{value}</div>
<div className={`hint${isError ? " hint--error" : ""}`}>{hint}</div>
```

补充 DeltaBadge 边界：`prev === 0 && cur > 0` 时不显示 `▲ 100%`，改为文字 `新增`（避免误导）；`prev === 0 && cur === 0` 显示 `0%` 持平（现行逻辑保留）。

### Gap 3 · 图表 a11y fallback 表（P1）

**问题**：SVG 漏斗与水平堆叠条仅靠 `aria-label` 描述，屏幕阅读器只能听到一句总结，无法逐段读数值。ui-ux-pro-max 的 Funnel Chart 规则明确要求"linear list fallback with stage name + count + drop-off %"。

**补丁方案**：

- **漏斗图**：右侧或下方追加**可折叠**的 `<details class="chart-fallback">`，默认折叠以免视觉噪音；展开后显示阶段表（3 列：阶段 / 数值 / 转化率）
- **堆叠条**：legend 下方追加 `.visually-hidden` 的 `<dl>` 列表，屏幕阅读器直接读到，视觉侧不显示

**HTML 结构模板**（工程侧落地）：
```html
<!-- 漏斗 -->
<details class="chart-fallback">
  <summary>查看数据表</summary>
  <table>
    <thead><tr><th>阶段</th><th class="num">数值</th><th class="num">转化率</th></tr></thead>
    <tbody>
      <tr><td>新线索</td><td class="num">120</td><td class="num">—</td></tr>
      <tr><td>已联系</td><td class="num">68</td><td class="num">↘ 57%</td></tr>
      ...
    </tbody>
  </table>
</details>

<!-- 堆叠条屏幕阅读器专用 -->
<dl class="visually-hidden">
  <dt>已提交</dt><dd>23 条</dd>
  <dt>审核中</dt><dd>12 条</dd>
  ...
</dl>
```

**CSS**（已加入 `admin.css`）：`.chart-fallback`（折叠表）+ `.visually-hidden`（标准 SR-only 技巧）。

### Gap 4 · Banner vs Toast 场景切分（P1）

**问题**：5 处表单/页面复制了同一个硬编码 `style={{ background: "var(--success-50)"... }}` 成功提示块（FaqForm:38 / GroupForm:28 / SensitiveWordForm:39 / sensitive-words/page.tsx:96 / BulkImportForm:42）。后续想改色、加图标、换 a11y role 都要改 5 处。

**补丁方案**：抽两类复用组件，场景切分如下：

| 场景 | 用哪个 | 原因 |
|---|---|---|
| 表单保存成功（同页） | `.admin-banner--success` | 信息量中（可能带"60 秒后生效"等说明），需要用户看到 |
| 表单校验失败 | `.admin-banner--danger` | 信息量大（列出具体错误字段），必须留在流中 |
| 批量导入结果（N/M/K 数字 + 失败行表） | `.admin-banner--success/warning` | 信息量大，表格内嵌 |
| toggle 异步切换成功/失败 | `.admin-toast` | 瞬时反馈，不阻塞，3 秒自消 |
| 列表页"导入完成"跳转后 | `.admin-banner--success`（URL 携带 `?imported=...`） | 可刷新保留；比 toast 更可靠 |

**CSS**（已加入 `admin.css`）：`.admin-banner` + 4 个变体（success/warning/danger/info）+ `.admin-banner__body/__title/__meta/__actions` + `.admin-banner table` 嵌套表；`.admin-toast` + 3 个变体 + `@keyframes admin-toast-in` + `prefers-reduced-motion` 分支。

**工程侧使用**：
```tsx
// 表单成功（替代 5 处内联 style）
<div className="admin-banner admin-banner--success" role="status">
  <div className="admin-banner__body">
    <div className="admin-banner__title">已保存</div>
    <div className="admin-banner__meta">运行中扫描会在 60 秒内加载新词</div>
  </div>
</div>

// toggle toast（客户端组件里 setState 控制 mount/unmount）
<div className="admin-toast admin-toast--success" role="status" aria-live="polite">
  已启用分区「难治性高血压」
</div>
```

### Gap 5 · 破坏性操作 confirm 文案规范（P1）

**问题**：当前 `window.confirm` 文案各异：FAQ `"确定删除 FAQ「{q.slice(0,30)}」？此操作不可撤销。"`；分区 `"确定删除分区「{name}」？此操作不可撤销。"`；敏感词、帖子驳回等其他场景无统一标准。

**补丁方案**：V1 **不引 modal 库**，沿用 `window.confirm`，但锁死文案模板：

| 风险级别 | 场景 | 文案模板 |
|---|---|---|
| 低风险（仅后台影响） | 删除 FAQ / 分区 / 敏感词 | `确定删除{类型}「{名称}」？此操作不可撤销。` |
| 中风险（前台可见） | 隐藏帖子 / 下架 FAQ | `确定{动作}{类型}「{名称}」？{动作}后前台将不再显示。` |
| 高风险（影响用户） | 驳回报名审核 / 驳回帖子 | `确定驳回这条{类型}？驳回后用户会收到通知：{通知文案预览}。此操作不可撤销。` |
| 不可逆批量 | 批量删除 / 批量驳回 | `确定{动作} {N} 条{类型}？此操作不可撤销，请确认已复核。` |

**原则**：
1. 必须出现**动作动词 + 类型 + 名称**
2. 必须出现**后果说明**（"不可撤销" / "前台不再显示" / "用户会收到通知"）
3. 高风险场景必须展示**用户侧的通知文案预览**（让运营知道自己即将让用户看到什么）
4. 文案以 `。` 结尾，不用感叹号（后台专业语气）

### Gap 6 · 空态文案三模板（P2）

**问题**：当前 4 模块空态文案句式不完全统一——KPI 看板"暂无试验数据"（句号结尾、无 CTA）；FAQ/分区"还没有 FAQ，点击上方「+ 新建 FAQ」开始"（有 CTA 指引）；敏感词"没有匹配的敏感词，点击上方「批量导入」从 data/sensitive-words.txt 同步一批"（有 CTA 但文案冗长）。

**补丁方案**：三模板：

| 类型 | 模板 | 示例 |
|---|---|---|
| **列表空**（数据库真的没数据） | `还没有{对象}，点击上方「{动作}」开始` | `还没有 FAQ，点击上方「+ 新建 FAQ」开始` |
| **筛选空**（有数据但不匹配） | `没有匹配的{对象}，可{清空/调整}筛选条件` | `没有匹配的敏感词，可清空筛选条件` |
| **数字 0**（统计值为零） | `暂无` 或 `近 N 天无新增` | `近 7 天无新增` |
| **全部完成态**（待办清零） | `✓ 全部完成` | `✓ 暂无待办` |

**视觉**：

- 列表空 & 筛选空：`<td colSpan={n}>` 内居中，padding 48px 0，字色 `--gray-500`，附带 CTA 用 inline-link 样式或 `.btn-admin btn-admin--sm`（就近）
- 数字 0：`kpi-card .value` 用 `--ink-900`（不 muted），hint 用 `--gray-500`
- 待办清零态：整区显示一个 `.admin-banner--success` 单行 `✓ 暂无待办`，不渲染 3 条 0 值 item

### Gap 7 · 批量导入「预览-确认」两步流程视觉（新增，P1，采纳 PM A6 意见）

**问题**：当前 `BulkImportForm.tsx` 是"解析即导入"一步完成，敏感词导入失败时已经写入部分，需要人工回滚。PM 要求改为两步：先预览 → 用户确认 → 再写入。

**补丁方案**：两态复用同一页面，通过组件内 state 切换。

**步骤 1 · 解析完（待确认）**：
```
[admin-topbar]  h1 批量导入敏感词  [返回列表]
[admin-form fieldset legend="粘贴词库内容"]
  [cream-100 示例格式块]
  [field textarea - 用户粘贴]
  [form-actions]
    [按钮：解析并预览]  ← 主按钮 ink 底
```

用户点击「解析并预览」后，client 调 server action 只做解析（不写库），返回 `{valid: [...], invalid: [...]}`。页面进入步骤 2：

**步骤 2 · 预览态**：
```
[admin-banner--info]
  标题：待确认：新增 N / 更新 M / 失败 K
  meta：请核对下方明细后点击「确认导入」
  ↓ 如 failed > 0，表内嵌失败明细
  <table>
    <thead><tr><th>行号</th><th>关键词</th><th>原因</th></tr></thead>
    <tbody>...</tbody>
  </table>
  [admin-banner__actions]
    [确认导入] ← btn-admin--primary
    [取消，重新编辑] ← btn-admin--ghost
```

**步骤 3 · 确认写入后**：跳转回 `/admin/community/sensitive-words?imported=N+M+K`，列表页顶部显示 `.admin-banner--success`：
```
[admin-banner--success role="status"]
  标题：已导入 {N+M} 条
  meta：新增 N / 更新 M / 失败 K 条
```

**视觉色规则**：
- 步骤 2 **无论成败**一律用 `--info-50`（中性）——因为还没写库，不要误导运营以为已完成
- 失败行表在 info banner **内部**嵌套，用 `--cream-0` 白底，让表格在 info 底色上"浮"出来
- 步骤 3 成功用 `--success-50`；如果 `failed > 0`，改用 `--warning-50`，文案 `已导入 {N+M} 条，{K} 条失败未写入`

**归属提醒**：步骤切换的 state 管理、server action 拆分为 `parse` + `commit` 两个、URL 参数透传，这些归 admin-engineer 在下一轮迭代落地；本规范只锁死视觉形态。

---

### 本次补丁汇总

**文件变更**：
- `app/src/app/admin/admin.css` 末尾追加 ~150 行（无改动现有规则，零污染）
- `app/docs/m6-phase2-design-guidelines.md` 追加本章节

**新增 class 清单**（全部加在 `admin.css`，零新增 CSS var）：

| Class | 用途 |
|---|---|
| `.admin-shell :focus-visible`（选择器） | 覆盖全局 focus shadow 为 lime outline |
| `.kpi-card .value--muted` / `.value--error` / `.hint--error` | KPI 三态字色 |
| `.visually-hidden` | SR-only 通用工具类 |
| `.chart-fallback` + `summary` + `table` | 图表 a11y 折叠数据表 |
| `.admin-banner` + `__body/__title/__meta/__actions` + `--success/warning/danger/info` | inline banner 组件（含内嵌表） |
| `.admin-toast` + `--success/warning/danger` | 非阻塞 toast 组件 |
| `@keyframes admin-toast-in` | toast 入场动画（含 reduced-motion fallback） |

**没新增的**：零新 CSS var、零新字体、零新色、零第三方库；所有色值都源于 admin.css / design-system.css 既有 token。

### 下一轮 M6 视觉验收的测试用例建议

1. **Gap 1**：Chrome devtools 切换 Tab 键走完 `/admin` 首页所有交互元素，截图每一个焦点环是 lime 色、2px 实线
2. **Gap 2**：mock 后端返回 `{ value: 0 }` / `{ value: null, error: false }` / `{ value: null, error: true }` 三种数据，截图 6 张 KPI 卡在每种状态下的字色
3. **Gap 3**：用 NVDA / VoiceOver 听漏斗与堆叠条，确认每个阶段数值+转化率被读出；视觉侧 `details` 默认折叠
4. **Gap 4**：三处表单保存后截图 banner；toggle 分区启停后截图 toast（2 秒内消失）
5. **Gap 5**：删除 FAQ / 分区 / 敏感词 / 驳回帖子 四个场景逐个截图 confirm 文案
6. **Gap 6**：清空所有表数据，截图 4 个列表页 + 待办清单的空态；应用筛选至无匹配，截图筛选空态
7. **Gap 7**：批量导入 10 条合法 + 3 条非法，截图步骤 1 / 2 / 3 三态；步骤 2 上的「取消，重新编辑」应返回步骤 1 且保留 textarea 内容

*Patch 签发人：UI-Designer · 2026-04-20 · 基于 tech-lead 拍板的 6 gaps + PM A6 追加项*
