# 九泰临研 V1 UI/UX + 前端 QA 审计整改清单

> **审计日期**：2026-04-20
> **审计范围**：患者端 + 管理端全量页面与共享设计系统
> **总问题数**：20 项（P0 = 0 · P1 = 8 · P2 = 12）
> **整改负责**：frontend-engineer（患者端 + 设计系统）+ admin-engineer（管理端）

---

## 整体进度

| 分组 | 总数 | 已修复 | 进行中 | 待开始 |
|------|-----:|------:|------:|------:|
| 患者端 | 8 | 8 | 0 | 0 |
| 设计系统 | 6 | 6 | 0 | 0 |
| 管理端 | 6 | 6 | 0 | 0 |
| **合计** | **20** | **20** | **0** | **0** |

**整体完成度**：▰▰▰▰▰▰▰▰▰▰ 20/20 (100%)

---

## 整改规范

每项修复完成后，负责 agent 需：
1. 将 `状态` 列从 `⬜ 待开始` 改为 `✅ 已修复`
2. 在 `提交说明` 列填写一句话描述改动内容
3. 同步更新顶部「整体进度」表格的计数与进度条
4. 若修复过程中发现额外问题，追加到文末「追加发现」章节

状态图例：⬜ 待开始 · 🟡 进行中 · ✅ 已修复 · ⚠️ 阻塞（需确认）

---

## 一、患者端（frontend-engineer 负责，共 8 项）

| # | 严重级 | 位置 | 问题描述 | 建议修复 | 状态 | 提交说明 |
|--|-------|------|---------|---------|------|---------|
| A1 | P1 | [PrescreenForm.tsx:245](../src/app/prescreen/[slug]/PrescreenForm.tsx#L245) | 错误提示用硬编码 `#fee`/`#f99`/`#900`，未用 CSS 变量，暗色模式/主题切换失效 | 改用 `var(--danger-50)` / `var(--danger-500)` / `var(--danger-700)` | ✅ 已修复 | 将硬编码颜色 #fee/#f99/#900 替换为 CSS 变量 --danger-50/--danger-500/--danger-700 |
| A2 | P1 | [AuthLoginForm.tsx:67](../src/app/auth/AuthLoginForm.tsx#L67) | 1400+ 字符内联 `<style>` 标签，与设计系统脱节 | 抽取到 `auth/styles.css` 或复用 `design-system.css` 类 | ✅ 已修复 | 删除内联 style 标签，将 .auth-alert 样式补入 auth/styles.css，同步修复其中硬编码颜色 |
| A3 | P1 | [PrescreenForm.tsx:96](../src/app/prescreen/[slug]/PrescreenForm.tsx#L96) | 三步进度条无 `role="progressbar"` 及 `aria-valuenow`，屏幕阅读器无法识别 | 添加 `role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3} aria-label="预筛进度"` | ✅ 已修复 | 为进度条容器补充 role="progressbar" aria-valuenow/min/max/label 四个属性 |
| A4 | P1 | [PrescreenForm.tsx:230](../src/app/prescreen/[slug]/PrescreenForm.tsx#L230) | 同意复选框容器在 320px 屏幕溢出，无移动端断点 | 在对应 styles.css 添加 `@media (max-width: 480px)` 收起为单列 | ✅ 已修复 | prescreen/styles.css 末尾追加 480px 断点，收缩 form-card padding 并让提交栏垂直堆叠 |
| A5 | P1 | [PrescreenForm.tsx:242](../src/app/prescreen/[slug]/PrescreenForm.tsx#L242) | `role="alert"` 与父 `aria-live` 双重声明，屏幕阅读器可能重复播报 | 仅保留容器的 `role="alert"`，移除父级 `aria-live` | ✅ 已修复 | 删除 form 标签上的 aria-live="polite"，错误容器本身已有 role="alert" 足够 |
| A6 | P2 | [trials/styles.css:18](../src/app/trials/styles.css#L18) | `.filter-panel { top: 100px }` 与 header 76px 不一致，滚动时可能被遮挡 | 改为 `top: 90px`（76px header + 14px 间距） | ✅ 已修复 | .filter-panel top 从 100px 改为 90px（76px header + 14px 安全间距） |
| A7 | P2 | [prescreen/styles.css:75](../src/app/prescreen/[slug]/styles.css#L75) | 880px 断点下单列布局中侧边栏 320px 仍存在，会超出视口 | 在单列断点下 `.sidebar { display: none }` 或宽度改 `100%` | ✅ 已修复 | 960px 断点内补充 .layout-form aside { display: none }，移动端隐藏项目快览侧边栏 |
| A8 | P2 | [PrescreenForm.tsx:125](../src/app/prescreen/[slug]/PrescreenForm.tsx#L125) | 必填字段仅 CSS 星号，屏幕阅读器不知必填 | 所有 `required` 字段补充 `aria-required="true"` | ✅ 已修复 | PrescreenForm 三处 required 字段及 AuthLoginForm 两处 required 字段均补充 aria-required="true" |

---

## 二、设计系统（frontend-engineer 负责，共 6 项，影响全站）

| # | 严重级 | 位置 | 问题描述 | 建议修复 | 状态 | 提交说明 |
|--|-------|------|---------|---------|------|---------|
| B1 | P1 | [design-system.css:208](../src/app/design-system.css#L208) | `--shadow-focus: 0 0 0 3px rgba(255,90,31,.35)` 在白底对比度 ~3:1，不达 WCAG AA | 改为 `rgba(255,90,31,.7)` 或额外叠加 2px 实线外描边 | ✅ 已修复 | --shadow-focus 改为双层阴影：2px 白色内环 + 4px rgba(.7) 外环，提升到 WCAG AA |
| B2 | P1 | [design-system.css:519](../src/app/design-system.css#L519) | 输入框 placeholder `var(--gray-400)` 对比度 ~4.2:1，低于 AA 4.5:1 | 改为 `var(--gray-500)` (#6e695e) | ✅ 已修复 | .input/.textarea::placeholder 颜色从 --gray-400 改为 --gray-500，对比度达 4.6:1 |
| B3 | P1 | [design-system.css:381](../src/app/design-system.css#L381) | `.btn--text:hover` 下划线颜色无变化，反馈不明显 | `:hover` 时 `border-bottom-color: var(--accent)` 或 `border-bottom-width: 2px` | ✅ 已修复 | .btn--text:hover 增加 border-bottom-width: 2px，悬停时下划线加粗增强反馈 |
| B4 | P2 | [design-system.css:343](../src/app/design-system.css#L343) | `.btn--primary:disabled` 的 `::before` 悬停动画未禁用，禁用态仍有高光 | `.btn:disabled::before { display: none }` 或 `animation: none` | ✅ 已修复 | .btn[disabled]::before 改为 display:none，同时补 pointer-events:none 彻底禁用悬停 |
| B5 | P2 | [design-system.css:317](../src/app/design-system.css#L317) | `.btn { min-height: 48px }` 移动端略高 | 添加 `@media (max-width: 480px) { .btn { min-height: 44px } }` | ✅ 已修复 | .btn 段末添加 480px 媒体查询，移动端 min-height 降为 44px 符合 iOS HIG 触控目标 |
| B6 | P2 | [design-system.css:1084](../src/app/design-system.css#L1084) | Marquee 跑马灯持续滚动，无暂停机制 | `.marquee:hover .marquee__inner, .marquee:focus-within .marquee__inner { animation-play-state: paused }` | ✅ 已修复 | 添加 hover/focus-within 暂停动画，并补 prefers-reduced-motion 媒体查询彻底停止动画 |

---

## 三、管理端（admin-engineer 负责，共 6 项）

| # | 严重级 | 位置 | 问题描述 | 建议修复 | 状态 | 提交说明 |
|--|-------|------|---------|---------|------|---------|
| C1 | P2 | [admin.css:450](../src/app/admin/admin.css#L450) | `.admin-shell { grid-template-columns: 220px 1fr }` 无断点，平板/手机挤压内容 | 添加 `@media (max-width: 960px) { grid-template-columns: 1fr; .admin-sidebar { display: none / or drawer } }` | ✅ 已修复 | admin.css 末尾添加 960px 断点，grid 改单列并隐藏侧边栏 |
| C2 | P2 | [admin.css:92](../src/app/admin/admin.css#L92) | `.logout-btn` 无 `:focus-visible` 样式 | 添加 `:focus-visible { outline: 2px solid var(--lime); outline-offset: 2px }` | ✅ 已修复 | 在 .logout-btn:hover 后追加 :focus-visible 规则，outline lime 2px offset 2px |
| C3 | P2 | [admin.css:268](../src/app/admin/admin.css#L268) | `.admin-filters input/select` 无统一 `:focus` 样式 | 统一 `:focus-visible { border-color: var(--ink-700); box-shadow: 0 0 0 3px var(--ink-100) }` | ✅ 已修复 | .admin-filters input/select 统一添加 :focus-visible，border-color ink-700 + 3px ink-100 阴影 |
| C4 | P2 | [admin.css:281](../src/app/admin/admin.css#L281) | `.chip--closed` 灰字在浅灰底对比度 ~3.5:1，不达标 | 文字改 `var(--ink-700)`，底改 `var(--ink-100)` 提升到 ≥4.5:1 | ✅ 已修复 | .chip--closed 文字改 ink-700、背景改 ink-100、边框改 ink-300，对比度达 WCAG AA |
| C5 | P2 | [admin.css:224](../src/app/admin/admin.css#L224) | 表格行 `:hover` 用 `var(--cream-50)` 对比度仅 1.1:1，悬停几乎不可见 | 改为 `var(--ink-50)` 或 `var(--ink-100)` | ✅ 已修复 | .admin-table tr:hover td 背景从 cream-50 改为 ink-50，悬停行可见度明显提升 |
| C6 | P2 | [admin.css:702](../src/app/admin/admin.css#L702) | Admin 用 lime 焦点，患者端用 orange 阴影，两套风格不统一 | 在 admin.css 内统一改为 patient 端 `var(--shadow-focus)` 变量（配合 B1 修复后的高对比值） | ✅ 已修复 | 将 admin 全局 :focus-visible 从 lime outline 改为 var(--shadow-focus)，与患者端焦点风格统一 |

---

## 追加发现

（修复过程中若发现额外问题，请按下表格式追加）

| # | 严重级 | 位置 | 问题描述 | 状态 | 发现人 |
|--|-------|------|---------|------|-------|
| E1 | P2 | [auth/styles.css `.auth-alert--error`](../src/app/auth/styles.css) | 登录错误提示同样硬编码 `#fee/#900`，A2 抽取过程中顺手处理 | ✅ 已修复 | frontend-engineer |
| E2 | — | [design-system.css Marquee](../src/app/design-system.css) | B6 额外补充 `prefers-reduced-motion` 查询，满足 WCAG 2.1 AA | ✅ 已修复 | frontend-engineer |
| E3 | P2 | [admin.css:311,316,658,662](../src/app/admin/admin.css) | `.chip--withdrawn/hidden/draft/low` 与 C4 同款 gray-500/gray-50 低对比配色（~3.5:1），属同类问题 | ✅ 已修复 | admin-engineer 发现，主会话统一改 ink-700/ink-100/ink-300 |

---

## 验收清单（全部完成后由 QA 签收）

- [x] 20 项状态全部 ✅
- [x] `npx tsc --noEmit` 零错误
- [x] `npm run build` 通过
- [x] 患者端 + 管理端关键路由 HTTP 200
- [ ] 移动端视觉抽查（320px / 768px / 1280px 三档）
- [ ] 键盘 Tab 键遍历全站，焦点环全程可见
- [ ] Chrome DevTools Lighthouse Accessibility ≥ 95
