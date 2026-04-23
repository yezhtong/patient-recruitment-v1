# M8.2 T8 · UI 债修复规范（2026-04-23）

**作者**：tech-lead V3（兜底）
**配对文件**：`m8-ui-debt-inventory-2026-04-23.md`（盘点）
**使用方**：frontend-engineer（#1-#8）、admin-engineer（#9-#12）
**验收方**：tech-lead（对照本规范逐条打钩）

---

## 0. 硬规则（所有修复者必读）

1. **只改 CSS**。两处例外：
   - #10 leads 表需在 JSX 外包 `<div class="admin-table-wrap">`（admin-engineer）
   - #12 敏感词导入建议把 inline style 抽为 admin.css class（admin-engineer）
2. **CSS 文件白名单**：
   - 全局 token：`app/src/app/design-system.css`
   - 患者端页面：`app/src/app/<route>/styles.css`
   - 后台：`app/src/app/admin/admin.css`
   - 社区：`app/src/app/community/community.css`
3. **禁止引入新组件库**、禁止改业务 logic、禁止动 JSX（例外见上）
4. **dev server 复用**：已有 PID 48856 在 localhost:3001，不要 `npm run dev` 重起（Next 16.2 会自动提示"Another next dev server is already running"自退）
5. **验证命令**：修完必须 `cd app && npx tsc --noEmit` 零错；**不跑 build**（CSS 改动不影响 build）
6. **自证**：汇报时附 `file → bytes → tsc status` 三列

---

## 1. 断点基线（全局统一）

| 名称 | 宽度范围 | 代表设备 | 本轮修复中的用途 |
|---|---|---|---|
| mobile-xs | ≤ 400px | iPhone SE / 小 Android | #1 Hero / #6 me stage-flow 窄档 |
| mobile | 401-640px | iPhone 12/13/15 | #6 me stage-flow 基础档 |
| tablet-portrait | 641-960px | iPad Mini 竖 | #2 trials 筛选器改 static |
| tablet-landscape | 961-1100px | iPad 横 / Air | #3 trial/[slug] 断点提升到 1100 |
| small-desktop | 1101-1366px | 14 寸笔记本 | #9 KPI / #11 审核按钮组 |
| desktop | ≥ 1367px | 15+ 寸 | 基线布局不动 |

**媒体查询写法**（统一用 max-width 降级，避免 min-width / max-width 混用）：

```css
@media (max-width: 400px)  { /* mobile-xs */ }
@media (max-width: 640px)  { /* mobile */ }
@media (max-width: 960px)  { /* tablet-portrait */ }
@media (max-width: 1100px) { /* tablet-landscape */ }
@media (max-width: 1366px) { /* small-desktop */ }
```

---

## 2. Token 使用规则（本轮需用到）

| 场景 | 必须用的 token | 禁用 |
|---|---|---|
| 间距（4px 递增） | `--sp-1`=4, `--sp-2`=8, `--sp-3`=12, `--sp-4`=16, `--sp-5`=20, `--sp-6`=24, `--sp-8`=32 | 直接写 `6px` `14px` `18px` |
| 圆角 | `--r-sm`=4, `--r-md`=8, `--r-lg`=14, `--r-xl`=20, `--r-2xl`=28, `--r-pill`=999 | 直接写 `12px` |
| 字号 | `--fs-xs`=12, `--fs-sm`=14, `--fs-base`=16, `--fs-md`=17, `--fs-lg`=19, `--fs-xl`=22, `--fs-2xl`=28 | 直接写 `13px` `15px`（#12 例外放行 13px，后续统一） |
| 颜色-正文 | `--ink-900` 主文本 / `--gray-700` 次要 / `--gray-600` 辅助 / `--gray-500` 弱提示 | `--gray-400` 作为正文色（对比度 < 4.5:1） |
| 颜色-强调 | `--accent`=#ff5a1f（主 CTA）、`--lime`=#c8ff4a（数据） | 随意加新 hex |
| 阴影 | `--shadow-xs/sm/md/lg/focus` | box-shadow 直写 rgba |
| 缓动 | `--ease-out` | `ease-in-out` 默认 |

**新增 token 提议（本轮**不**引入，留给后续规范化）**：
- `--max-ch-title: 20ch` / `--max-ch-body: 64ch` 统一最大文字宽度

---

## 3. 组件状态基线

### 3.1 表单字段（修复 #4 后）
- `.form-field { gap: var(--sp-2) }`（8px，原 6px）
- `.form-field__label` 与 `.input/.textarea/.select` 间距视觉为 8px
- 字段之间仍由 `margin-bottom: var(--sp-5)=20px` 分隔

### 3.2 表格（影响 #10）
- 外层统一 `.admin-table-wrap { overflow-x: auto; border: 1px solid var(--ink-100); border-radius: var(--r-lg) }`
- 表本体 `min-width: 900px`（保最低列宽）
- 移除表本体自己的 border（搬到 wrap）

### 3.3 卡片（影响 #2、#5）
- 列表型卡片之间外间距 ≥ 卡内主间距：`.results-list { gap: var(--sp-6) }`（24px，> 卡内 20px）
- 所有列表卡片的"标题/摘要"必须 line-clamp（title 2 行 / summary 2 行）

### 3.4 Sticky 降级规则（影响 #2）
- 所有 `position: sticky` 的侧边栏/筛选器，在 ≤ 960px 必须 `position: static`
- 受影响选择器：`.filter-panel`（trials）、`.toc`（about，已处理）、`.me-side`（me，已处理）、`.form-summary`（prescreen，已处理）

---

## 4. 逐条修复规范（12 条）

### #1 `/` 首页 Hero — 375px headline

**改 `app/src/app/styles.css`（追加到末尾）**：

```css
/* #1 UI debt fix: 375px headline 换行规整 */
@media (max-width: 400px) {
  .hero h1 {
    word-break: keep-all;
    line-break: strict;
    max-width: 20ch;
  }
}
```

**验收**：Chrome DevTools 设 375×667，首页 h1 每行至少 6 字，不再出现"长-短-短"。

---

### #2 `/trials` 列表 — 间距 + sticky

**改 `app/src/app/trials/styles.css`**：

```css
/* #2 UI debt fix */
.results-list { gap: var(--sp-6); }    /* 从 16px 提到 24px */
@media (max-width: 960px) {
  .filter-panel { position: static; top: auto; }
}
```

**验收**：
- 桌面卡片间距肉眼 > 卡内 padding 感知；
- iPad 竖屏（768）筛选器不 sticky，随页面滚走。

---

### #3 `/trials/[slug]` — 合规区断点

**改 `app/src/app/trials/[slug]/styles.css` 第 63-64 行**：

```css
.trial-detail-grid { display: grid; grid-template-columns: 1fr 360px; gap: 64px; align-items: start; }
.trial-detail-grid > * { min-width: 0; }           /* 新增：防子元素撑破 */
@media (max-width: 1100px) {                        /* 阈值 1024 → 1100 */
  .trial-detail-grid { grid-template-columns: 1fr; }
}
```

**验收**：iPad Pro 竖屏（1024）和 iPad 横屏（1180）下主列不塌陷，aside 整块下移到主内容下方。

---

### #4 `/prescreen` — label 间距

**改 `app/src/app/design-system.css:497-502`**：

```css
.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);          /* 8px，原 6px */
  margin-bottom: var(--sp-5);
}
```

**验收**：`/prescreen/<slug>` + `/appeal` + `/contact` + `/auth` + `/admin/*` 的所有 `.form-field` label→input 间距统一为 8px；无 layout 塌方。

---

### #5 `/community` — title 字号 + 省略

**改 `app/src/app/community/community.css:180-190`**：

```css
.cm-post-card__title {
  font-family: var(--font-serif);
  font-size: clamp(18px, 2.4vw, 22px);     /* 原 24px */
  font-weight: 400;
  line-height: 1.2;
  margin-bottom: 8px;
  letter-spacing: -0.01em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cm-post-card--featured .cm-post-card__title {
  font-size: clamp(20px, 2.6vw, 24px);     /* 原 26px */
}
```

**验收**：帖子卡片 title 最多 2 行；375px 宽卡片里 title 不超过卡宽；各卡片视觉高度大致一致。

---

### #6 `/me` — 报名卡片移动端

**改 `app/src/app/me/styles.css`（追加）**：

```css
/* #6 UI debt fix: 报名卡片移动端适配 */
@media (max-width: 640px) {
  .stage-flow { gap: 4px; }
  .stage { padding-right: 6px; }
  .stage__dot { width: 24px; height: 24px; font-size: 9px; }
  .stage__label { font-size: 8px; letter-spacing: 0; line-height: 1.2; }
  .stage::after { top: 12px; left: 26px; right: -4px; }
  .application { padding: 20px 20px; }
  .application__head { gap: 10px; }
  .application__title { font-size: 22px; }
}
```

**验收**：375px 下 5 步流程一排不换行，连接线与 dot 中心对齐；application 卡片整体紧凑无溢出。

---

### #7 `/faq` — 锚点平滑（**先实测**）

**第一步：实测**
1. 打开 Chrome：`http://localhost:3001/faq`
2. 点左侧分类导航（`.faq-cat-nav__link`）锚点，观察是否平滑滚动
3. 若已平滑 → 本条直接关闭为"症状已被 M6 全局 smooth 修复，无残留"
4. 若仍硬跳 → grep `scrollTo` / `scrollIntoView` 在 faq 相关 tsx 里是否存在覆盖

**第二步（兜底）：若仍不平滑，改 `app/src/app/faq/styles.css`（追加）**：

```css
.faq-cat-nav__link { scroll-behavior: smooth; }
```

（注：`scroll-behavior` 本应设在滚动容器上，此处作最后兜底；若 JS 代码硬 `scrollTo({behavior:'auto'})`——本轮不修，开 P1 ticket）

**验收**：FAQ 左栏点分类，平滑滚动到锚点；顶部 100px scroll-padding 生效（标题不被 header 遮）。

---

### #8 `/about` 与 `/contact` — iPad headline

**改 `app/src/app/about/styles.css:3`**：

```css
.about-hero h1 { font-size: clamp(48px, 6vw, 96px); margin-bottom: 24px; }
```

**改 `app/src/app/contact/styles.css:2`**：

```css
.contact-hero h1 { font-size: clamp(48px, 6vw, 96px); margin-bottom: 24px; }
```

**验收**：768 / 1024 / 1280 / 1600 视口下 about 与 contact 标题字号分别约 48 / 61 / 77 / 96px，断点间变化平滑，不再出现 iPad 下过小或桌面下过大的断层感。

---

### #9 `/admin` 工作台 — KPI 卡溢出

**改 `app/src/app/admin/admin.css:199-203`**：

```css
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));    /* 180 → 140 */
  gap: 12px;                                                        /* 16 → 12 */
  margin-bottom: 28px;
}
.kpi-card .value { font-size: clamp(32px, 3.5vw, 48px); }          /* 48 固定 → 降级 */
```

**验收**：1280 / 1366 / 1440 / 1600px 视口下 6 张 KPI 卡单行显示无横向滚动条；卡片 value 字号按视口平滑缩放。

---

### #10 `/admin/leads` — 表格横向滚动

**改 `app/src/app/admin/admin.css`（追加）**：

```css
/* #10 UI debt fix: 表格外层滚动容器 */
.admin-table-wrap {
  overflow-x: auto;
  background: var(--cream-0);
  border: 1px solid var(--ink-100);
  border-radius: 12px;
}
.admin-table-wrap .admin-table {
  border: none;                     /* 边框搬到 wrap */
  min-width: 900px;                 /* 锁最小列宽 */
  border-radius: 0;                 /* wrap 代管 */
}
```

**改 JSX（admin-engineer 动手，`/admin/leads/page.tsx`）**：
把 `<table className="admin-table">...</table>` 包到 `<div className="admin-table-wrap">...</div>` 里。

**验收**：iPad 横屏（1024 / 1180）下 leads 表内部可横向滚动，admin-main 整体不溢出；桌面 ≥ 1400 下表格正常，无横滚条出现。

---

### #11 `/admin/community/posts` — 审核按钮组换行

**改 `app/src/app/admin/admin.css`（追加）**：

```css
/* #11 UI debt fix: 表格内按钮压缩，防 1366 换行 */
.admin-table .admin-actions .btn-admin {
  padding: 6px 12px;
  font-size: 12px;
  min-height: 32px;
}
.admin-table .admin-actions { gap: 6px; flex-wrap: nowrap; }
@media (max-width: 1280px) {
  .admin-table .admin-actions { flex-wrap: wrap; }     /* 极窄才允许换行 */
}
```

**验收**：1366px 下 posts 列表每行 4 按钮单行排列不换行；1280px 及以下允许换行但按钮仍紧凑。

---

### #12 `/admin/community/sensitive-words/import` — 提示对比度

**方案 B（推荐）：抽 class**

**改 `app/src/app/admin/admin.css`（追加）**：

```css
/* #12 UI debt fix: 示例代码块 */
.admin-codeblock {
  background: var(--cream-100);
  color: var(--ink-700);                 /* gray-600 → ink-700，对比 13:1 */
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--ink-100);
  font-family: var(--font-mono);
  font-size: 13px;                       /* 12 → 13 */
  line-height: 1.6;
  white-space: pre-wrap;
  margin-bottom: 12px;
}
```

**改 `app/src/app/admin/(authed)/community/sensitive-words/import/BulkImportForm.tsx:17-27`**：

把 inline style div 改为：

```tsx
<div className="admin-codeblock">
  {"# 示例：\nhigh|contact|加我微信\nmedium|quackery|祖传秘方\nlow|ad|免费体验"}
</div>
```

**方案 A（最小改动，若不想动 JSX）**：
BulkImportForm.tsx 第 23 行 inline `color: "var(--gray-600)"` 改为 `color: "var(--ink-700)"`；`fontSize: 12` 改为 `fontSize: 13`。其他保留。

**建议走方案 B**（inline style 搬走更干净，总改动 < 10 行）。

**验收**：导入页提示框文字清晰可读，对比度目测远高于此前；响应式无破坏。

---

## 5. 验收清单（Definition of Done）

每条修复完成后，修复者自检：

- [ ] `npx tsc --noEmit` exit=0
- [ ] Chrome DevTools 设成"修复思路"里点到的断点，目测规范描述的效果
- [ ] dev server 对应路由刷新后无样式塌陷（不止本条，邻近页面也看一眼）
- [ ] 附自证三列：修改的 CSS 文件 / 行号范围 / tsc status

tech-lead 收到后：
- Read 被改 CSS 文件确认改动符合本规范
- 复查目测（无 ui-designer 无法跑第二关，由 tech-lead 代行视觉验收）
- 全部 12 条完成后，一次性 Edit DEVELOPMENT_LOG.md 标注 T8 ✅

---

## 6. 执行顺序建议

**批次 1（frontend-engineer，患者端易修 4 条 · 预计 30min）**：
#1, #4, #5, #7（#7 若实测已消除则直接 skip）

**批次 2（frontend-engineer，患者端中难度 4 条 · 预计 45min）**：
#2, #3, #6, #8

**批次 3（admin-engineer，后台 4 条 · 预计 45min）**：
#9, #10（含 JSX 改）, #11, #12（方案 B）

**总预计**：2h（含三次验收间隔）

若 frontend/admin 也不在团队，由 tech-lead 继续兜底（CSS 改动风险低，单人可控）。

---

**落盘证据**
- 本文件：`app/docs/design/m8-ui-debt-spec.md`
- 配对盘点：`app/docs/design/m8-ui-debt-inventory-2026-04-23.md`
