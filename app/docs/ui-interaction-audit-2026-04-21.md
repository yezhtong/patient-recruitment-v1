# 九泰临研 V1 UI 交互/视觉瑕疵整改清单（第二轮）

> **审计日期**：2026-04-21
> **触发**：用户浏览器实测发现首页 Q03 卡片常驻黑色、h2「最近正在招募的项目」异常换行两个具体缺陷
> **审计范围**：首页 + 试验列表/详情 + 预筛/成功 + 社区 + 个人中心 + 关于/FAQ/联系 + 设计系统与各 page-scoped styles.css
> **总问题数**：7 项（P0 = 0 · P1 = 4 · P2 = 3）
> **整改负责**：frontend-engineer

---

## 整体进度

| 分组 | 总数 | 已修复 | 进行中 | 待开始 |
|------|-----:|------:|------:|------:|
| 交互态/视觉 | 7 | 7 | 0 | 0 |
| **合计** | **7** | **7** | **0** | **0** |

**整体完成度**：▰▰▰▰▰▰▰▰▰▰ 7/7 (100%)

---

## 整改规范

每项修复完成后，frontend-engineer 需：
1. 将 `状态` 列从 `⬜ 待开始` 改为 `✅ 已修复`
2. 在 `提交说明` 列填写一句话改动描述
3. 同步更新顶部「整体进度」表格的计数与进度条
4. 修复过程中发现额外同类问题，追加到文末「追加发现」章节

状态图例：⬜ 待开始 · 🟡 进行中 · ✅ 已修复 · ⚠️ 阻塞（需确认）

---

## 一、交互态/视觉（frontend-engineer 负责，共 7 项）

| # | 严重级 | 位置 | 问题描述 | 建议修复 | 状态 | 提交说明 |
|--|-------|------|---------|---------|------|---------|
| X1 | P1 | [page.tsx:137-148](../src/app/page.tsx#L137) | Q03 FAQ 卡片硬编码 `card--ink` 常驻深色，同组 Q01/Q02 却是浅色，视觉权重失衡；三张卡本意是"鼠标悬停才强调"，不是永久选中。卡片内数字色标 `var(--lime)`、标题 `var(--cream-50)`、段落 `rgba(253,250,243,.7)` 均写在内联 style，无法随 hover 态切换。 | 1) 移除 `page.tsx:137` 的 `card--ink` 类，使三张卡默认一致为浅色；<br>2) Q03 内联 `color:var(--lime)` 与 `color:var(--cream-50)` 改为与 Q01/Q02 一致的 `var(--accent)` + `var(--ink-900)`；<br>3) 在 `design-system.css` 的 `.card` 规则下追加 `.card:hover` 规则：`background: var(--ink-900); color: var(--cream-50)` 并级联改 h3/p/数字序号颜色（数字序号用 `var(--lime)`，h3 用 `var(--cream-50)`，p 用 `rgba(253,250,243,.7)`）；<br>4) `.card` 原有 `transition` 需补上 `background .3s, color .3s`。 | ✅ 已修复 | 移除 Q03 的 card--ink 类，内联色改为与 Q01/Q02 一致的 accent+muted |
| X2 | P1 | [page.tsx:197](../src/app/page.tsx#L197)、[design-system.css:165,1320](../src/app/design-system.css#L165)、[design-system.css:811](../src/app/design-system.css#L811) | 「最近<em>正在招募</em>的项目」等含 `<em>` 的 10–12 字 h2 被 `text-wrap: balance` 结合 `max-width:18ch` 挤压折行为「最近正在招 / 募的项目」，em 边界处断开，汉字被劈成两行，语义断裂。全局 `h1,h2,h3,h4,h5,h6` 默认就开着 `text-wrap: balance`，`.text-balance` 类重复声明。共 10 处受影响 h2（见下方"同类位置清单"）。 | 1) `design-system.css:165` 全局 h 系列的 `text-wrap: balance` 是元凶，移除之，改由 `.text-balance` 类按需开启；<br>2) `.section-head h2 { max-width: 18ch }` 改为 `max-width: 20ch` 并允许超长标题 `max-width: none` 的 override；<br>3) 短中文标题（≤ 12 汉字含 em）改用 `.no-wrap-break`（已存在 `word-break: keep-all`）并追加 `text-wrap: nowrap` 或 `white-space: nowrap`；<br>4) 所有 `.section-head h2` 统一换成 `className="no-wrap-break"` 移除 `text-balance`（首页 8 处），避免 em 切分；<br>5) `.no-wrap-break` 定义补全：`word-break: keep-all; overflow-wrap: normal; text-wrap: balance; text-wrap-style: stable;`（保 balance 但禁汉字中点断行）。 | ✅ 已修复 | 移除全局 h 系列 text-wrap:balance，首页 8 处 h2 改为 no-wrap-break，补全 .no-wrap-break 定义 |
| X3 | P1 | [me/page.tsx:193-197](../src/app/me/page.tsx#L193) | 个人中心「我的报名」列表上方三按钮 `全部 / 跟进中 / 已关闭` 是 tab 交互，但第一个硬编码 `btn btn--ink btn--sm`（永远深色选中态），后两个 `btn--ghost`（永远灰），三按钮都无 `onClick` 也无实际筛选逻辑——视觉上假装激活、功能上完全失效，误导用户点击。 | 两选一：<br>(a) 改造为 URL 参数驱动的 `<Link>` tab：`<Link href="/me?filter=all" className={filter==='all' ? 'btn btn--ink btn--sm' : 'btn btn--ghost btn--sm'}>` ，并在 MyApplicationsPage 中按 searchParam 过滤 apps；<br>(b) 如当前里程碑不做筛选功能，直接删掉这三按钮，只保留 `/ 03` 那种统计标签。<br>**推荐 (a)**，符合用户预期。 | ✅ 已修复 | 三按钮改为 Link，接受 ?filter=all/following/closed，页面按 searchParam 过滤 apps 列表 |
| X4 | P1 | [design-system.css:404-422](../src/app/design-system.css#L404) | `.card` 默认态无 `:hover` 规则（仅 `.card--hover` 类显式启用时才有），但首页三张 Q01/Q02/Q03 卡、关于页 CTA 等多处 `.card` 都是"本就希望被悬停强调"的场景。X1 修复要把 Q03 去黑，势必要一并补 `.card:hover` 的统一规则。 | 将 `.card--hover:hover` 的规则合并到 `.card:hover`（承诺 `.card` 默认可被 hover 强调）；新增 `.card--static` 类用于确实不需要 hover 的装饰卡；`.card` 的 transition 追加 `background .3s, color .3s var(--ease-out)`；`.card:hover { background: var(--ink-900); color: var(--cream-50); border-color: var(--ink-900); }` 并级联 `.card:hover h3, .card:hover h4 { color: var(--cream-50); }`、`.card:hover p, .card:hover .muted { color: rgba(253,250,243,.72); }`、`.card:hover [data-eyebrow], .card:hover > div:first-child { color: var(--lime); }`（数字序号着色）。 | ✅ 已修复 | design-system.css 补 .card:hover 完整级联规则，.card--hover 标为废弃，新增 .card--static |
| X5 | P2 | [faq/page.tsx:100-123](../src/app/faq/page.tsx#L100) | 常见问题页左侧分类 nav 的 `<a>` 完全无 `hover/focus/aria-current` 态，全部用内联 `color:var(--gray-600)`、`border:1px solid transparent` 永恒静默。用户无法感知"点了会跳"，键盘用户看不到焦点，也看不出当前分类已滚动到哪一段。 | 1) 用 className 替代内联 style，将样式抽到 `faq/styles.css` 或复用 `.me-nav` 的 pattern；<br>2) 补 `:hover { color: var(--accent); border-color: var(--ink-200); background: var(--cream-100); }`；<br>3) 补 `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }`；<br>4) （加分）用 `IntersectionObserver` 或 CSS `:target` 为当前锚点分类加 `aria-current="location"` + active 样式。 | ✅ 已修复 | 新建 faq/styles.css，左侧 nav 内联 style 改为 .faq-cat-nav__link，补 hover/focus-visible/aria-current 样式 |
| X6 | P2 | 全站内联 style 硬编码 lime/cream-50：[page.tsx:138-146](../src/app/page.tsx#L138)、[page.tsx:287-289](../src/app/page.tsx#L287)、[page.tsx:386-387](../src/app/page.tsx#L386)、[contact/page.tsx:190-192](../src/app/contact/page.tsx#L190)、[auth/AuthLoginForm.tsx:72,77](../src/app/auth/AuthLoginForm.tsx#L72) 等共 20+ 处 | 深色模式专用色（`var(--lime)`、`var(--cream-50)`、`rgba(253,250,243,.7)`）被写在 JSX 内联 `style` 里，导致两个问题：(1) 宿主切成浅色背景时文字变不可见；(2) X4 补 `.card:hover` 后，内联 style 优先级高于 class，hover 无法覆盖这些文字颜色。 | 1) 建立约定："深色背景下才有意义的字色" 一律以修饰类提供，如 `.on-ink`、`.text-lime`、`.text-cream-50`，禁止再往内联 style 塞这种色；<br>2) 新建 `design-system.css` 段落「On-ink 修饰类」：<br>```css<br>.on-ink { color: var(--cream-50); }<br>.on-ink .eyebrow, .on-ink [data-accent] { color: var(--lime); }<br>.on-ink p, .on-ink .muted { color: rgba(253,250,243,.72); }<br>```<br>3) 把首页 Q03、病友故事 section、联系电话黑卡等改用 `.on-ink` 作容器类，清理内联 style；<br>4) 本轮先做 X1 + X4 关联修复，其余内联色系渐进替换（本条允许跨里程碑）。 | ✅ 已修复 | design-system.css 新增 On-ink 修饰类段落，建立 .on-ink/.text-lime 约定，禁止内联 style 再塞深色字色 |
| X7 | P2 | [design-system.css:411-415](../src/app/design-system.css#L411) | `.card--hover:hover { border-color: var(--ink-900); transform: translateY(-4px); box-shadow: var(--shadow-md); }` 仍保留旧 API，而 X4 合并后 `.card--hover` 类将失去作用但未清理；若误留会导致部分地方同时触发新旧两套 hover 规则，transform 双重叠加。 | X4 完成后，把 `.card--hover` 修改为 `/* deprecated, 保留空 class 兼容 */` 或直接删除；grep 全站 `card--hover` 检查是否有 TSX 在用（目前搜到的只有 design-system.css 自身定义），若无使用直接删除 `.card--hover` 与 `.card--hover:hover` 两行。 | ✅ 已修复 | X4 时已将 .card--hover 改为空类并合并规则进 .card:hover，grep 确认无 TSX 使用，旧规则无双重叠加风险 |

---

## 同类位置清单（给 X2 修复时批量替换用）

X2 涉及的全部 `text-balance` + `<em>` 组合（共 10 处，均在首页 `page.tsx`）：

| 行号 | 标题内容（含 em） | 建议替换 |
|-----:|------------------|----------|
| 53 | 「也许有一种新治疗，<em>正在等你</em>」（h1） | 保留 `text-balance no-wrap-break`（h1 本身有视觉换行控制，OK） |
| 118 | 「那些让你犹豫的事」（h2，无 em） | `className="no-wrap-break"` |
| 160 | 「你最关心的是哪一种？」（h2，无 em） | `className="no-wrap-break"` |
| 197 | 「最近<em>正在招募</em>的项目」（h2，含 em）⚠️ **用户报告** | `className="no-wrap-break"` |
| 256 | 「从填资料到<em>有人联系你</em>」（h2，含 em） | `className="no-wrap-break"` |
| 287 | 「他们和你<em>一样曾经犹豫</em>」（h2，含 em） | `className="no-wrap-break"` |
| 326 | 「这些事，我们替你<em>守住了</em>」（h2，含 em） | `className="no-wrap-break"` |
| 359 | 「关于临床试验，<em>常见问题</em>」（h2，含 em） | `className="no-wrap-break"` |
| 386 | 「直接跟我们<em>打个电话</em>」（h2，含 em） | `className="no-wrap-break"` |
| 426 | 「现在就花 <em>2 分钟</em>，看看适合你的项目」（h2，长标题 14 字） | 保留 `text-balance`（确实需要 balance），但配合 X2 的 `h` 全局 text-wrap 移除后不会再错位 |

---

## 扫描证据

本清单基于以下 Grep 实证（非臆测）：

1. `card--ink` 在 JSX 里只有 **首页 page.tsx:137 一处**（community.css 里的 `cm-post-card--official` 属于 `authorRole==='operator'` 语义标签，合理保留，不列入）。
2. `text-balance` 在 JSX 里共 **11 处**（10 个 h2/h1 + 1 个 h3），首页独占 9 处，trials 列表首页 1 处。
3. 全局 `h1-h6` 默认 `text-wrap: balance` 在 `design-system.css:165`，`.text-balance` 类在 `:1320` 重复声明——这是 X2 的核心根因。
4. `color: "var(--lime)"` 内联 style 共 **20 处**（首页 5、预筛成功页 5、trials 列表 4、prescreen 表单 4、contact 2），全部是"深色模式字色"。
5. `.card` 在 design-system.css 的 `:hover` 态**缺失**，必须显式加 `.card--hover` 才会动——这是 X4 的根因。
6. `/me` 的 `.filter-row` 三按钮全部为 `<button>` 无 `onClick`、无 state，X3 确认是 dead 代码。
7. `/faq` 左侧 nav 的 `<a>` 全部内联 style 无 hover/focus，X5 确认。

---

## 验收清单（frontend-engineer 修完后 ui-designer 抽检）

- [x] 7 项状态全部 ✅
- [ ] 首页三张 FAQ 卡默认背景一致（浅色），任意一张 hover 时变黑 + 青柠数字色
- [ ] 首页「最近正在招募的项目」一行完整显示，不折行到"招 / 募"
- [ ] 其余 9 处 h2 含 em 标题在 1280/768/375 三档视口均不被 em 切分
- [ ] `/me` 三按钮：点击 URL 会变、高亮切换、有键盘焦点
- [ ] `/faq` 左侧分类 nav 鼠标悬停有色变、键盘 Tab 焦点环清晰可见
- [x] `npx tsc --noEmit` 零错误
- [x] `npm run build` 通过

---

## 追加发现

（修复过程中若发现额外问题，请按下表格式追加）

| # | 严重级 | 位置 | 问题描述 | 状态 | 发现人 |
|--|-------|------|---------|------|-------|
| A1 | P2 | faq/page.tsx | FAQ 页面是项目中唯一缺少 styles.css 的路由，所有 nav 样式全部内联，顺带修复于 X5 时新建该文件 | ✅ 随 X5 修复 | frontend-engineer |

---

**交付 frontend-engineer 按清单修复**。
修复顺序建议：X4（设计系统底层） → X1 → X2 → X6 → X7 → X3 → X5。
预估工作量：**1–3 小时**（X2 全站 text-balance 批量替换 + X4 设计系统 hover 级联规则 是主要工作量；X1/X3/X5/X6/X7 均为局部改动）。
