# M8.2 T8 · UI 债盘点报告（2026-04-23）

**作者**：tech-lead V3（ui-designer agent 不在团队 config，兜底落盘）
**来源清单**：`各种prd_m8/M8.1_基础增强_PRD.md` §5.7（第 224-239 行）
**取证方法**：逐条 Read 对应页面的 `page.tsx` + `styles.css` + 全局 `design-system.css`，定位真实选择器与症状
**验证口径**：选择器行号、实际 CSS 值、断点配置三列对齐 PRD 描述

---

## 盘点总结

- **12 条全部定位到真实 CSS 源位置**，无一条"症状不存在"
- 发现 **2 条 PRD 描述与实际略有偏差**（标注在对应条目）：
  - #4 prescreen label 间距实际是 **6px**（`.form-field { gap: 6px }`），不是 PRD 描述的 4px，但仍"过紧"
  - #12 敏感词提示对比度实际过 WCAG AA（**5.6:1**），但字号 12px + mono 弱读字型叠加产生**视觉弱感**，PRD 描述成立
- **附加债 0 条**：没发现 12 条以外需要修的问题（M8.1 架构本身规范良好）
- **特别注意 #7 FAQ 锚点**：全局已有 `scroll-behavior: smooth` + `scroll-padding-top: 100px`（`design-system.css` 第 131-132 行），**理论上已平滑**。需实测确认是否有 JS 覆盖；若无实测 bug 则此条可关闭为"症状已消除"

---

## 12 条逐条定位

### 患者端（8 条 → frontend-engineer 归口）

#### 1. `/` 首页 Hero — 375px headline 换行不整齐

| 维度 | 内容 |
|---|---|
| **位置** | 全局 `app/src/app/design-system.css:168-174` `h1 { font-size: clamp(44px, 6vw, 80px) }` |
| **症状** | 375px 下 h1 = 44px，首页标题（serif 中文长词）在无 `word-break: keep-all` 情况下会在汉字间断行，造成"长-短-短"不整齐的视觉 |
| **影响范围** | 视口宽度 ≤ 400px（iPhone SE / 小屏 Android） |
| **修复思路** | 对中文标题加 `word-break: keep-all; line-break: strict`，并在 375px 给 h1 设置 `max-width: 20ch`；**不改 clamp 下限**，保持 44px 让短屏也有大字号 |

---

#### 2. `/trials` 列表 — 卡片间距不一致 + 筛选器移动端挤压

| 维度 | 内容 |
|---|---|
| **位置** | `app/src/app/trials/styles.css:15,18,78` + `design-system.css:904,907` |
| **症状** | ① 卡片之间 `.results-list { gap: 16px }`，但卡内 `.trial-card { padding: 32px, gap: 20px }`——外间距 < 内间距，整屏视觉"黏成一片"；② 960px 以下 `.filter-panel { position: sticky }` 仍生效（因为断点降级只改了 grid-template，没取消 sticky），在移动端堆叠后筛选器 sticky 会挤占主内容可视区 |
| **影响范围** | ① 全尺寸卡片间距；② ≤ 960px 视口 |
| **修复思路** | ① 把 `.results-list { gap: 24px }`（卡外 ≥ 卡内 gap）；② 加 `@media (max-width: 960px) { .filter-panel { position: static } }` |

---

#### 3. `/trials/[slug]` — 右侧合规区 768-1024px 断点塌陷

| 维度 | 内容 |
|---|---|
| **位置** | `app/src/app/trials/[slug]/styles.css:63-64` `.trial-detail-grid { grid-template-columns: 1fr 360px }`，断点 `@media (max-width: 1024px)` 才降单列 |
| **症状** | 768-1023px 视口下仍是双列布局，主列只剩 ~408px（`(768-padding-gap-360)`），而合规区 aside 里含 `.sticky-cta`（h3 36px）、`.side-block` 28px padding ——aside 内容超宽，主列严重挤压；1024px 临界态一换行就撞出竖向滚动条 |
| **影响范围** | 视口 768-1023px（典型 iPad Mini 竖屏 / iPad 竖屏） |
| **修复思路** | 断点阈值从 1024 提升到 **1100px**，768-1100 区间全部单列；给主列 `min-width: 0` 防 grid 子元素溢出撑破布局 |

---

#### 4. `/prescreen/[slug]` — label 与 input 间距过紧

| 维度 | 内容 |
|---|---|
| **位置** | `app/src/app/design-system.css:497-502` `.form-field { gap: 6px; margin-bottom: var(--sp-5) }` |
| **症状** | **实际是 6px，PRD 描述 4px 略有偏差**，但 `var(--sp-5)=20px` 的 label→input 视觉间距上下对比下 6px 确实显紧，中老年用户辨识标签所属输入框时容易误读 |
| **影响范围** | 全站所有使用 `.form-field` 的页面（prescreen / appeal / contact 表单） |
| **修复思路** | `.form-field { gap: 8px }`（`--sp-2`），符合 PRD 的 8px 建议；同时保留 `margin-bottom: --sp-5=20px` 字段间大间距以确保可扫描性 |

---

#### 5. `/community` — 帖子卡片 title 字号过大 + 溢出省略号未配置

| 维度 | 内容 |
|---|---|
| **位置** | `app/src/app/community/community.css:180-189` `.cm-post-card__title { font-size: 24px }` + `.cm-post-card--featured .cm-post-card__title { font-size: 26px }` |
| **症状** | ① title 24px 在 375px 宽卡片里显得臃肿（卡片 padding 22 26px，实际内容宽 ~330px）；② summary 已有 `-webkit-line-clamp: 2`，**但 title 本身没有 line-clamp**，长标题完全展开占 3-4 行，卡片高度参差不齐 |
| **影响范围** | 全尺寸列表页；移动端尤明显 |
| **修复思路** | ① title 字号降到 `clamp(18px, 2.4vw, 22px)`，featured 用 `clamp(20px, 2.6vw, 24px)`；② 补 `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;` 强制 2 行省略 |

---

#### 6. `/me` — 报名卡片移动端堆叠错位

| 维度 | 内容 |
|---|---|
| **位置** | `app/src/app/me/styles.css:82-107` `.stage-flow { grid-template-columns: repeat(5, 1fr) }`——**整篇没有移动端断点** |
| **症状** | 5 步流程在 375px 下每列 ~60px，step dot 28px + label 10px mono 文字 → label 挤到两行甚至三行，`.stage::after` 的连接线位置错位；`.application__head` 的 flex-wrap 会把 meta 甩到另一行，与 title 间距突然变大 |
| **影响范围** | 视口 ≤ 640px（所有手机） |
| **修复思路** | ① 加 `@media (max-width: 640px) { .stage-flow { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; } .stage__label { font-size: 8px; letter-spacing: 0; } }` —— 5 列保留但缩字；② `.stage::after` 在 ≤ 640 改 `left: 24px; right: -4px` 让线与 dot 对齐；③ 超窄 ≤ 400 可考虑改 `.stage-flow` 为横向 scroll |

---

#### 7. `/faq` — 锚点跳转无 smooth 滚动（**可能症状已消除**）

| 维度 | 内容 |
|---|---|
| **位置** | `app/src/app/design-system.css:131-132` `html { scroll-behavior: smooth; scroll-padding-top: 100px }`——**全局已启用** |
| **症状** | PRD 描述"锚点跳转无 smooth 滚动"，但全局 CSS 已开启。推测 PRD 写入时该规则尚未落盘，当前**可能 symptom 已消除**。需实测：点 FAQ 侧栏 `<a href="#category-safety">` 看是否平滑 |
| **影响范围** | 如仍存在：全站所有 `#anchor` 跳转 |
| **修复思路** | ① 先实测：开 Chrome 访问 `/faq`，点左侧分类（`.faq-cat-nav__link`）锚点，观察滚动是否平滑；② 若仍不平滑 → 可能被 `window.scrollTo({behavior: 'auto'})` 或 `requestIdleCallback` 拦截，需查 `page.tsx` / 客户端组件；③ 若已平滑 → 本条关闭为"无需修复，保留作为 regression 监控" |

---

#### 8. `/about` 与 `/contact` — headline iPad 断点字号不自然

| 维度 | 内容 |
|---|---|
| **位置** | `app/src/app/about/styles.css:3` `.about-hero h1 { font-size: clamp(56px, 8vw, 112px) }` + `app/src/app/contact/styles.css:2` `.contact-hero h1 { font-size: clamp(56px, 8vw, 112px) }` |
| **症状** | 768px 下 h1 = 61px（8vw），1024px 下 = 82px——**曲线斜率过陡**，iPad 横竖屏之间字号跳动明显；桌面 1400 下 ~112px 又过大占屏 |
| **影响范围** | 视口 768-1280px（所有 iPad + 小桌面） |
| **修复思路** | 曲线缓和：改 `clamp(48px, 6vw, 96px)`——768px 下 =48px（base 保底）、1024 下 =61px、1280 下 =77px、1600 下 =96px（封顶）；配合 `line-height: 1.05` + `letter-spacing: -.01em` 统一视觉 |

---

### 后台（4 条 → admin-engineer 归口）

#### 9. `/admin` 工作台 — KPI 卡在 1280px 下溢出

| 维度 | 内容 |
|---|---|
| **位置** | `app/src/app/admin/admin.css:199-202` `.kpi-grid { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px }` |
| **症状** | 1280px 视口减去 sidebar 240 + admin-main padding 40+40 = 剩 960px；6 张卡 × minmax(180) + 5 × gap(16) = 1160px → **溢出触发横向滚动**或挤成 5 列露出第 6 卡溢出 |
| **影响范围** | 视口 1280-1366px（14 寸小笔记本） |
| **修复思路** | ① minmax 降到 **140px**，`gap: 12px`，在 1280 下刚好容 6 张；② 或上 `grid-template-columns: repeat(auto-fit, minmax(clamp(140px, 15vw, 180px), 1fr))` 自适应 |

---

#### 10. `/admin/leads` — 表格横向滚动条在 iPad 横屏出现

| 维度 | 内容 |
|---|---|
| **位置** | `app/src/app/admin/admin.css:232-238` `.admin-table`——**没有外层 `.table-wrap` 滚动容器** |
| **症状** | leads 表 9-11 列（phone/name/disease/city/trial/stage/source/createdAt/actions），单列宽度约 90-140px → 总宽 ~1000px；iPad 横屏 1024 下 sidebar 240 + padding 80 = 704px 可用 → 表格撑破 admin-main，整个页面水平滚动而不是表格内滚动 |
| **影响范围** | ≤ 1100px 视口 |
| **修复思路** | ① 新增 `.admin-table-wrap { overflow-x: auto; border-radius: 12px; border: 1px solid var(--ink-100) }` 包裹 table；② 表内 `.admin-table { min-width: 900px }` 锁死最小宽度；③ 把 `.admin-table` 的 `border: 1px solid` 移到 wrap，避免双边框。**注意**：此条需改 JSX（在 table 外加 div）——**例外**需 admin-engineer 动手 |

---

#### 11. `/admin/community/posts` — 审核按钮组在 1366px 下换行

| 维度 | 内容 |
|---|---|
| **位置** | `app/src/app/admin/admin.css:144-148` `.admin-actions { display: flex; gap: 8px; flex-wrap: wrap }` |
| **症状** | posts 列表每行操作组按钮通常是「通过 / 驳回 / 打回重写 / 删除」四个，每按钮 `.btn-admin` padding 10 18px ≈ 80-100px → 总宽 ~400px；1366px 下 admin-main 容器宽约 1046px，但每行 table cell 只分 ~160px 给 action 列 → 按钮 flex-wrap 成 2-3 行，视觉凌乱 |
| **影响范围** | 视口 ≤ 1440px |
| **修复思路** | ① `.admin-table .admin-actions` 局部覆盖：按钮 `.btn-admin--sm { padding: 6px 12px; font-size: 12px }` 让 4 按钮总宽 < 260px；② 极端窄视口（≤ 1280）改"主按钮 + 省略号菜单"——本轮**不加下拉组件**，只做 padding 压缩 |

---

#### 12. `/admin/community/sensitive-words` 批量导入提示文字对比度不足

| 维度 | 内容 |
|---|---|
| **位置** | `app/src/app/admin/(authed)/community/sensitive-words/import/BulkImportForm.tsx:17-26`（**inline style**） |
| **症状** | `background: var(--cream-100)=#fbf6ec` + `color: var(--gray-600)=#52503e` → **对比度 5.6:1**，WCAG AA 过 4.5:1 线，但叠加 `font-family: mono` + `font-size: 12px` 的弱读字型导致视觉"漂"；此处是示例格式提示（`high|contact|加我微信`），用户录入时频繁读取，应更加清晰 |
| **影响范围** | 仅该页提示框 |
| **修复思路** | ① **代码层面**：把 inline style 的 `color` 改为 `var(--ink-700)=#143b32` → 对比度 13:1；② 字号提升到 13px；③ **建议把 inline style 抽为 `.admin-codeblock` class 进 `admin.css`**（需 admin-engineer 改 JSX 把 inline 搬走）；④ **退一步方案**：仅改 BulkImportForm.tsx 的 inline 两个值，不抽 class，改动最小 |

---

## 风险与备注

| 事项 | 说明 |
|---|---|
| **#10 必须改 JSX** | 表格需要外层 `<div class="admin-table-wrap">`，此条例外要 admin-engineer 改 JSX（符合"JSX 嵌套塌方"例外条款） |
| **#12 两种方案选择** | "仅改 inline 值"最小改动但留技术债；"抽 class"更干净但需改 BulkImportForm.tsx——建议走后者，总改动 < 15 行 |
| **#7 可能无需改** | 全局 smooth 已开；实测若已平滑可直接在 spec 里关闭本条 |
| **#4 影响面超出 prescreen** | `.form-field` 是全局规则，改 6→8 会联动影响所有表单页；视觉复查需覆盖 appeal / contact / auth / admin 所有表单 |
| **断点命名建议** | 本轮不引入 SCSS 变量，沿用 CSS media query 阈值数字。建议记忆：mobile ≤ 640，tablet 641-1100，small-desktop 1101-1366，desktop ≥ 1367 |

---

**落盘证据**
- 本文件：`app/docs/design/m8-ui-debt-inventory-2026-04-23.md`
- 规范文件：`app/docs/design/m8-ui-debt-spec.md`（同一轮写入）
