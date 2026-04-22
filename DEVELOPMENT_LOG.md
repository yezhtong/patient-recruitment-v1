# 九泰临研 V1 · 开发进度总帐

> 每次打开这个文件，最上面能看到现在进到哪、下一步做什么。
> 每个里程碑完成时由 Claude 更新。

---

## 📍 当前位置

- **最近完成里程碑**：**M6 · 运营完善（全部完成）**（2026-04-20 完成）
- **下一步**：M7 · 部署迁移（Docker + SQLite→MySQL/Postgres 切换）
- **代码状态**：M2–M6 全量落盘，本机仅有一份，**⚠️⚠️⚠️ 未远程备份 —— 里程碑完成节点，强烈建议立即备份 `app/dev.db` + 整个 `app/` 目录到移动硬盘！** 先备份再考虑开始 M7
- **dev server**：继续工作前需重启（见下方命令）
- **管理后台**：`/admin/login`，默认账号 **admin / admin123**（dev 固定）
- **患者登录**：`/auth`，任意手机号 + 验证码 **123456**（dev 固定）
- **社区 admin 入口**：登录后 `/admin/community/posts` 审核，`/admin/community/sensitive-hits` 看风险命中
- **新增后台页**：`/admin/audit-logs`（仅 admin 可见）、`/admin/faq`（FAQ 管理）、`/admin/community/groups`（社区分区配置）、`/admin/community/sensitive-words`（敏感词词库 + 批量导入）、`/api/admin/export/leads` 与 `/api/admin/export/applications`（按筛选导出 CSV）
- **`/admin` 工作台首页升级**：真实运营指标看板（6 张 KPI 卡 + 7d/30d 切换 + SVG 漏斗 + 堆叠条 + Top 5 热门试验 + 待办清单）

---

## 🔁 重启后怎么继续工作

### 步骤 1：告诉 Claude 从哪继续
打开 Claude Code，说一句：
> "继续 M2，先读 `e:\Projects\03_患者招募\DEVELOPMENT_LOG.md` 了解进度"

Claude 会读这个文件 + `.claude/memory/` 下的记忆，自动接上。

### 步骤 2：启动 dev server（如果想自己点开看现有成果）
在 Windows 终端（Git Bash 或 PowerShell）里：
```bash
cd "e:/Projects/03_患者招募/app"
npm run dev
```
启动成功后浏览器打开 http://localhost:3000

### 步骤 3：如果数据库 `dev.db` 不见了
SQLite 文件被 `.gitignore` 忽略，机器换了或手滑删了都会没。**重建方法**：
```bash
cd "e:/Projects/03_患者招募/app"
npx prisma migrate deploy   # 建表结构
npx tsx prisma/seed.ts      # 写 3 条种子试验
```

---

## 🎯 里程碑看板

| #  | 里程碑                       | 状态       | 起      | 完      | 产出                                             |
|----|------------------------------|------------|---------|---------|--------------------------------------------------|
| M0 | 环境与骨架                   | ✅ 完成    | 04-18   | 04-18   | Next.js + Prisma + SQLite 三条腿跑通              |
| M1 | 9 个患者端页面迁移           | ✅ 完成    | 04-19   | 04-19   | 9 路由全部 200，TS 零错误                        |
| M1.5 | 样式校准（page-scoped CSS） | ✅ 完成    | 04-19   | 04-19   | 9 个 styles.css 搬入，视觉贴近原型                |
| M2 | 主链路闭环 + 运营后台 CRUD   | ✅ 完成    | 04-19   | 04-19   | 预筛真入库、Lead 池、试验 CRUD、admin 登录与守卫 |
| M3 | 账号真接入 + 我的报名真数据  | ✅ 完成    | 04-19   | 04-19   | 手机验证码登录、User/SmsCode/Application 模型、/me 真数据 |
| M4 | 信任层深化 + SEO             | ✅ 完成    | 04-19   | 04-19   | FAQ 20 条入库、/faq、og/twitter、MedicalStudy + FAQPage JSON-LD、sitemap + robots |
| M5 | 社区模块                     | ✅ 完成    | 04-19   | 04-19   | 6 个分区 + 发帖/评论 + 敏感词 + 匿名 + 后台审核 |
| M6 | 运营完善                     | ✅ 完成    | 04-20   | 04-20   | 权限审计底座 + KPI 看板 + CSV 导出 + FAQ/分区/敏感词后台 |
| M7 | 部署迁移公司 Linux 服务器    | ⏳ 待开始  | —       | —       | Docker 化、SQLite → MySQL/Postgres 切换           |

---

## 📋 已完成里程碑详情

### M6 · 运营完善（第二阶段：KPI 看板、导出、后台配置，2026-04-20）

**本轮特殊情况**：agent 团队多名成员（product-manager / ui-designer / backend-engineer）响应停摆，tech-lead **切兜底模式亲自完成**。产品 & 设计文档为 tech-lead 起草，工程代码为 tech-lead 独自写。

**本轮产出**（新增 13 个路由，build 后 38 路由全编译）：

**T1 · KPI 看板**（`/admin` 工作台首页升级）：
- 新建数据聚合层 `app/src/lib/queries/admin-dashboard.ts`：`getKpiCards / getLeadFunnel / getApplicationStageDist / getTopTrials / getTodoCounts`，全部 `Promise.all` 并发
- `/admin` 首页重构：6 张主指标卡（新增线索、新增报名、待跟进、社区待审、招募中试验、累计入组）+ 趋势 ▲▼ + 7d/30d 切换
- 原生 SVG 线索漏斗（4 态 + 两段转化率）
- 报名阶段堆叠条（6 态 + 图例）
- Top 5 热门试验表（按近 30 日线索数）
- 待办清单（待跟进新线索 / 社区待审 / 报名待审，3 个入口 + 大数字）
- 不引图表库，**全部用 admin.css 已有 design token**
- `admin.css` 新增组件样式：`range-switch / kpi-delta / dashboard-row / funnel / funnel-conv / stage-stack / todo-list / chip--published/draft/type/high/medium/low / admin-toggle`

**T2 · CSV 导出**（leads + applications）：
- `app/src/lib/csv.ts`：CSV 工具（UTF-8 BOM、CRLF、csvEscape）
- `app/src/app/api/admin/export/leads/route.ts`：按 `status / trial / q` 筛选导出，含 16 字段（**手机号明文 + 不脱敏**，供运营跟进；仅 admin 可导出）
- `app/src/app/api/admin/export/applications/route.ts`：按 `stage / trial / q` 筛选导出，含 17 字段（手机号明文 + 关联 lead）
- 两处列表页顶部加「⬇ 导出 CSV」按钮，URL 复用当前筛选，只对 `session.role === "admin"` 渲染
- 每次导出写审计 `writeAuditLog({ action: "export", entityType: "lead"|"application", summary, detail })`

**T3 · FAQ 后台** (`/admin/faq`)：
- `app/src/lib/actions/faq.ts`：`createFaq / updateFaq / deleteFaq / toggleFaqPublished`，全部 Zod 校验、全部写审计、revalidate `/faq` + `/sitemap.xml`
- `/admin/faq` 列表（分类 + 状态 + 搜索 + 排序）
- `/admin/faq/new` 新建、`/admin/faq/[id]/edit` 编辑 + 删除二次确认
- `FaqForm.tsx` 复用 admin-form 样式
- 权限：读 `requireAdmin()`，写 `requireAdminRole()`

**T4 · 社区分区配置** (`/admin/community/groups`)：
- backend `community-groups.ts` 此前已完成（5 个 action：create/update/delete/toggle）
- tech-lead 新增前端：列表页（含启停 toggle + 帖子数 + 本周新增）、new、edit + 删除
- 删除带帖子保护：`postCount > 0` 按钮禁用 + 错误兜底
- `GroupEnableToggle.tsx` client 组件承载 toggle 交互

**T5 · 敏感词后台** (`/admin/community/sensitive-words`)：
- schema `SensitiveWord` 与迁移 `20260420064420_m6_sensitive_word` 此前已存在
- `lib/sensitive-words.ts` 此前已改为读 DB + 60 秒缓存（`invalidateSensitiveWordsCache`）
- `lib/actions/sensitive-words.ts` 此前已完成 5 个 action（含 `bulkImportSensitiveWords` 按 `level|type|keyword` 格式解析）
- tech-lead 新增前端：列表（关键词 + 类型 chip + 级别 chip + 命中数 + 最近命中）、new、edit + 删除、批量导入独立页
- `/admin/community/sensitive-words/import` 带格式示例 + 成功/失败汇总
- 命中统计：从 `CommunitySensitiveHit` groupBy keyword 聚合

**Nav 整合**：
- `app/src/app/admin/(authed)/layout.tsx` 左侧侧边栏新增 3 项（**社区分区 / 敏感词库 / FAQ 管理**），每项带实时计数徽章
- 顺手修复「审计日志」nav 之前的乱码（`瀹¤鏃ュ織` → `审计日志`）

**硬验收**（全绿）：
- `npx tsc --noEmit` 零错误
- `npm run build` 成功，38 路由全部编译
- curl 抽检：`/admin` 307（未登录 redirect）、`/admin/faq` 307、`/admin/community/groups` 307、`/admin/community/sensitive-words` 307、`/admin/login` 200、`/` 200、`/community` 200、`/api/admin/export/leads` 401（未登录 API 拒绝）—— **权限守卫全部生效**

**踩过的坑**：
- 本轮 agent team 多岗位停摆，tech-lead 切兜底执行——后续无论是否恢复 agent，推荐都保留「兜底模式 + 单人完成 + 硬验收」作为应急方案
- `community-groups.ts` 和 `sensitive-words.ts` 后端已被 backend-engineer 在上一轮提前完成（schema + 迁移 + actions + sensitive-words.ts DB 化），我本轮**适配已有 API**（`GroupFormState / toggleCommunityGroup(id, isEnabled) / deleteCommunityGroup(id): Promise<GroupFormState>`），避免重复建模
- admin 侧边栏「审计日志」文字此前存 UTF-8 乱码，本轮重写 layout.tsx 整文件修复
- server component 里不能直接用 client 事件（onChange）；分区启停、敏感词启停都拆成独立 `*EnableToggle.tsx` client 组件

**留到 M7 的 TODO**：
- Docker 化 + docker-compose
- SQLite → MySQL/Postgres 切换（改 `provider` + 迁移 + adapter）
- 上线前把 `SESSION_PASSWORD` 环境变量从 dev 硬编码切换到真正的 secret
- 上线前用真实 SMS 服务替换 `DevConsoleSmsProvider`
- PRD 外部事项（客服电话、og 图片）

### M6 · 运营完善（第一阶段：权限与审计底座，2026-04-20）

**已完成内容**：
- 新增 `AuditLog` 模型与迁移 `20260420093000_m6_audit_log`，本地 `dev.db` 已执行 `prisma migrate deploy`
- 新增统一审计写入工具 `app/src/lib/audit.ts`
- 新增后台审计日志页 `/admin/audit-logs`，支持按 `entityType`、`action`、关键词筛选最近 200 条记录
- `admin-session.ts` 新增 `requireAdminRole()`，作为 admin 专属能力的统一守卫
- 试验管理写操作接入 admin 专属权限：`createTrial` / `updateTrial` / `deleteTrial`
- 线索状态变更、线索备注更新接入统一审计
- 报名阶段变更、报名备注更新接入统一审计
- 社区帖子审核动作在原有 `CommunityModerationLog` 外，再同步写入统一 `AuditLog`
- 试验新建页 `/admin/trials/new` 与试验编辑页 `/admin/trials/[id]/edit` 增加 server-side admin 权限拦截

**本轮验证**：
- `npx prisma generate` ✅
- `npx prisma migrate deploy` ✅
- `npx tsc --noEmit` ✅
- `npm run build` ✅
- 新增路由 `/admin/audit-logs` 已进入构建产物

**当前仍未完成的 M6 项**：
- 工作台首页 KPI 从“总量卡片”升级为真正的运营看板
- Leads / Applications 按筛选条件导出 CSV
- FAQ 后台增删改
- 社区分区配置页 `/admin/community/groups`
- 敏感词词库后台化管理
- operator/admin 权限分离仍是第一阶段：目前已落角色校验底座，但只对试验管理与审计日志页做了 admin 专属收口，其他后台模块后续继续细分

### M0 · 环境与骨架（2026-04-18）
- 搭建 Next.js 16.2（App Router + React 19 + Turbopack）
- 接入 Prisma 7 + SQLite（`@prisma/adapter-better-sqlite3`）
- 定义 `ClinicalTrial` 模型，首次 migrate，写 3 条种子试验
- 首页 Server Component 从数据库读并用原型 CSS 令牌渲染
- Git 仓库初始化，首次提交 `6a330f5`

**踩过的坑**：
- 本机 MySQL 只装了 Workbench，Server 本体不存在 → 改用 SQLite
- Prisma 7 破坏性变更：`url` 不能在 schema 里，必须写 `prisma.config.ts` 的 `datasource.url`
- Adapter 类名是 `PrismaBetterSqlite3`（小写 s），不是 `PrismaBetterSQLite3`

### M1 · 9 个患者端页面（2026-04-19）
**采用 4 组 Agent 并行**，12 分钟完成代码产出：

| 组    | 产出路由                                                                                 |
|-------|------------------------------------------------------------------------------------------|
| 主工  | `src/components/{SiteHeader,SiteFooter,SiteShell}.tsx`                                    |
| 首页组 | `/`、`/trials`                                                                           |
| 预筛组 | `/trials/[slug]`、`/prescreen/[slug]`（含 `PrescreenForm.tsx`）、`/prescreen/success`    |
| 账户组 | `/auth`、`/me`                                                                           |
| 信任组 | `/about`、`/contact`（含 `ContactForm.tsx`）                                             |

**验收**：TypeScript `tsc --noEmit` 零错误；9 路由 curl 全部 200；关键业务文案抽查全部渲染。

**留到后续里程碑的 TODO**（不是 bug）：
- 预筛表单只做 `router.push`，未真写库（M2）
- 登录页 "获取验证码" 按钮只打 `console.info('[dev] 验证码: 123456')`，未接 SMS（M3）
- `/me` 是 4 条硬编码 mock 报名，未接 `Application` 模型（M3）
- 联系我们留言只 `alert()`，未入库（M4/M5）
- 病种入口的 count 数字（8/12/15/5/6/9/4/3）是原型硬编码，DB 只有 3 条真实数据
- 首页 Hero 图用了 Unsplash 外链，上线前换授权素材
- 列表页的"排序"与"分页"是占位，未接真实逻辑

### M2 · 主链路闭环 + 运营后台（2026-04-19）

由 tech-lead 顺序手写完成（本轮无并行 agent，受运行环境工具限制）。

**数据模型扩展**（`app/prisma/schema.prisma`）：
- `ClinicalTrial` 新增 13 个字段：sponsor、intervention、studyDesign、targetEnrollment、siteName、siteAddress、contactPerson、contactPhone、benefits、followUpPlan、adVersion、adVersionDate、ethicsApproval、qrcodeUrl
- 新增 `Lead` 模型（trialId 外键 + 基础资料 snapshot + projectAnswers JSON + 合规授权 + sourcePage + status 四态：new/contacted/qualified/disqualified）
- 新增 `OperatorUser` 模型（username / passwordHash / role / status），seed 出 `admin / admin123`（dev 固定）
- 迁移：`20260418191713_m2_trial_ext_lead_operator`
- seed 回填 3 条真实试验的新字段（北京安贞 RDN / 维纳丝额头纹 / 武威肿瘤 HK-X601A）

**Server Actions**（`app/src/lib/actions/`）：
- `prescreen.ts` · `submitLead(input)`：Zod 校验手机号、名字、同意隐私；写 Lead，返回 `{ ok, leadId }`
- `admin-auth.ts` · `adminLogin(prev, fd)` + `adminLogout()`：iron-session cookie 8 小时
- `trials.ts` · `createTrial` / `updateTrial` / `deleteTrial`：完整字段校验，自动 revalidatePath
- `leads.ts` · `updateLeadStatus(prev, fd)` + `setLeadStatus(id, status)`：状态流转记录 operatorId

**鉴权基础**（`app/src/lib/`）：
- `admin-session.ts`：iron-session 封装，`getAdminSession()`、`requireAdmin()`、`isAdminSession()`
- `password.ts`：Node 原生 scrypt 密码哈希与校验（不引第三方）
- 依赖新增：`zod`、`iron-session`

**患者端改造**：
- `prescreen/[slug]/PrescreenForm.tsx`：去除 mock，改调 `submitLead`，成功跳转 `?slug=xxx&leadId=xxx`；有 loading/error 态
- `trials/[slug]/page.tsx`：渲染 sponsor、intervention、studyDesign、benefits 列表、followUpPlan 时间线、联系人与一键拨号、伦理与广告版本合规区，去除了与真实数据无关的 mock
- `prescreen/success/page.tsx`：`?leadId` 直接查 DB 生成真实提交编号 `PS-YYYYMMDD-XXXXXX`（后 6 位取 leadId）

**运营后台**（`app/src/app/admin/`）：
- 独立 `admin.css` 样式（复用 design-system token，不污染患者端）
- `(authed)/layout.tsx`：session 守卫、左侧导航、右上角退出
- `login/` + `LoginForm.tsx`：用户名密码登录，dev 显示提示
- `(authed)/page.tsx`：工作台首页 5 张 KPI 卡 + 快捷入口
- `(authed)/trials/page.tsx`：列表 + 搜索 + 状态筛选 + 线索数
- `(authed)/trials/{new,[id]/edit}/page.tsx` + `TrialForm.tsx`：覆盖所有 27 个字段的完整表单
- `(authed)/trials/[id]/edit/DeleteTrialButton.tsx`：带二次确认的删除按钮
- `(authed)/leads/page.tsx`：线索池列表 + 搜索（姓名/手机号）+ 试验筛选 + 状态筛选 + 手机号脱敏
- `(authed)/leads/[id]/page.tsx` + `LeadStatusControls.tsx`：详情页三段（基础资料、项目答案、合规授权）+ 右侧状态切换按钮 + 备注编辑

**QA 验收**（全绿）：
- `npx tsc --noEmit` 零错误
- `npx next build` 成功，15 个路由全部编译过
- 9 个患者端路由 `/`、`/trials`、`/trials/[slug]`×3 真实试验、`/prescreen/[slug]`、`/prescreen/success`、`/auth`、`/me`、`/about`、`/contact` 全部 `200`
- Admin 守卫：未登录访问 `/admin`、`/admin/trials`、`/admin/leads` 返回 `307` → `/admin/login`；`/admin/login` 返回 `200`
- 详情页真实字段抽查：`13810468285`、`王老师`、`通州院区`、`安贞医院`、`免费试验器械`、`射频消融` 全部命中
- Lead 端到端脚本：创建 → 状态 new→contacted → 删除，操作正常

**踩过的坑**：
- 两份 `dev.db` 并存：`.env` 里 `DATABASE_URL="file:./dev.db"` 与代码里 fallback `"file:./prisma/dev.db"` 不一致，导致 ad-hoc 测试脚本写到空库。已把所有 fallback 统一为 `"file:./dev.db"`，和 `.env` 一致
- Prisma 7 `migrate dev` 不再支持 `--skip-seed`；schema 改动后必须先 `prisma generate` 再跑 seed，否则 Client 还是旧的会报 "Unknown argument"
- Server Action 不能把函数作为 prop 传给 Client Component 的事件处理器；删除按钮抽成独立 `"use client"` 组件直接 import server action 即可

**留到后续里程碑的 TODO**：
- `/auth` 仍是 mock（M3 接真短信验证码 + session + Application 模型）
- `/me` 仍是硬编码 mock 报名（M3 接 Application 查询）
- FAQ 还未建模（M4 新建 `/faq` + 入库 20 条）
- 每个路由的 `metadata`、`og`、Schema.org JSON-LD（M4）
- sitemap.ts + robots（M4）
- 所有 admin 写操作的审计日志（M6）

### M5 · 患者社区模块（2026-04-19）

**数据模型**（迁移 `20260418203314_m5_community`）：
- `CommunityGroup`：病种分区（slug/name/diseaseTag/introduction/isEnabled/sortOrder）
- `CommunityPost`：帖子（groupId + authorUserId + isAnonymous + title/content + postType + reviewStatus 五态 pending/approved/rejected/hidden/featured + isFeatured + relatedTrialId）
- `CommunityComment`：评论（postId + authorUserId + isAnonymous + reviewStatus）
- `CommunitySensitiveHit`：敏感词命中记录（关联 post 或 comment + keyword + riskType + riskLevel + snippet）
- `CommunityModerationLog`：审核日志（操作人、动作、原因、时间）
- `User` 与 `ClinicalTrial` 增加反向关联

**UI 设计指引** → `app/docs/community-ui-guidelines.md`
- 先出完整设计决策（墨绿 + 暖米基调，editorial × modern tech；3 级帖子卡片层级：普通/精选/官方；匿名编号 #A3F2 跨分区不可关联；免责声明必现 3 位置；1 页 1 主 CTA）
- 再写代码，避免返工

**敏感词库与过滤**：
- 词库文件 `app/data/sensitive-words.txt`（格式 `level|type|keyword`，35 条 dev 默认词），**标注"待运营审定"**
- `src/lib/sensitive-words.ts`：启发式扫描（关键词 + 手机号正则 + 邮箱正则），输出 hits 列表与 high/medium 汇总
- 高风险直接拦截发布；中风险允许提交但 reviewStatus 自动转 pending（运营审核后才可见）

**种子数据**（`prisma/seed-community.ts`）：
- 6 个病种分区：难治性高血压 / 额头纹医美 / 恶性实体肿瘤 / 2 型糖尿病 / 乳腺癌 / 综合讨论
- 1 条官方精选帖"写给第一次考虑 RDN 手术的你"（关联 RDN 试验 + featured）

**Server Actions**（`src/lib/actions/community.ts`）：
- `createPost(input)`：登录校验 + Zod + 敏感词扫 + 自动入 SensitiveHit + 状态分流
- `createComment(input)`：同上，更轻
- `moderatePost({postId, action, reason})`：admin 独占，5 个动作（approve/reject/hide/feature/unfeature），写 ModerationLog
- 工具 `src/lib/community-utils.ts` · `anonymousTag(userId, groupId)` + `relativeTime(d)`

**患者端路由**：
- `/community` 首页：分区网格 + 精选 / 官方区 + 最新 10 条 + FAQ 导流 + 免责声明
- `/community/[slug]` 病种社区：hero + 相关招募中试验（最多 3 条 **accent CTA**）+ 帖子列表
- `/community/posts/[id]` 详情：标题 + 作者 + 正文 + 免责声明 + 相关试验 CTA + 评论列表 + 评论输入框（未登录显示登录入口）；嵌入 `DiscussionForumPosting` JSON-LD
- `/community/new` 发帖页：规则前置 + 类型/分区/标题/正文/匿名开关；高风险拦截框显示命中类型，中风险提交后跳 pending 信息
- 全局 `SiteHeader` 新增"病友社区"Nav；`SiteFooter` 将原"关于我们"的外链改到社区；`/trials/[slug]` 详情页右侧侧栏增加"★ 病友讨论"入口（按 disease 自动匹配分区）

**运营后台**：
- `/admin/community/posts`：列表 + 状态/分区/仅看风险 筛选 + 风险命中计数列
- `/admin/community/posts/[id]`：左侧帖子全文 + 作者信息（不脱敏）+ 审核日志；右侧 5 个动作按钮（驳回/隐藏需原因）+ 命中明细
- `/admin/community/sensitive-hits`：按 keyword × riskType × riskLevel groupBy 命中统计
- admin 左侧 nav 新增两个入口 + pending 帖子数徽章

**Sitemap 扩展**：
- 新增 `/community` + 每个分区 + 每条可见帖子（上限 500）
- robots 仍禁 `/admin/ /me /prescreen/`（社区是公开可索引的）

**QA 验收**（全绿）：
- `npx tsc --noEmit` 零错误
- `npx next build` 成功 **25 路由**（比 M4 多 `/community`、`/community/[slug]`、`/community/new`、`/community/posts/[id]`、`/admin/community/posts`、`/admin/community/posts/[id]`、`/admin/community/sensitive-hits`）
- 公开路由抽检：`/community` 200 / 分区页 200 / 详情页 200 / `/community/new` 未登录 307 → `/auth`
- Admin 路由未登录 307；登录后可访问
- E2E 脚本验证：高风险（"加我微信" + 手机号）命中、中风险（"祖传秘方"）命中、干净内容不命中、用户发帖 / admin 设精选 / 评论 全部通过

**踩过的坑**：
- `"use server"` 文件里**所有导出必须是 async function**。原来把 `anonymousTag` 同步辅助函数和 action 放一起导致 build 报错，已拆到 `src/lib/community-utils.ts`
- `server-only` 是 Next 的虚拟包，在 `tsx` 运行时环境不存在，会让 E2E 脚本崩溃。统一去掉 `import "server-only"`（tsc + Next 仍能正确识别"Server Component only"，通过 `cookies()`、server actions 调用边界保证）
- Prisma `groupBy` 的 `_count: { _all: true }` 语法在 Prisma 7 里类型不支持，改用 `_count: true`，消费时 `typeof g._count === "number"`
- 中文字符串里不要混合 ASCII 双引号嵌套（tsx 无法 parse），一律用 `「」` 全角引号（seed-community 的"记一笔"吃过亏）

**留到后续里程碑的 TODO**：
- 运营以官方账号在前台回复帖子（PRD 说"若未实现可先用官方患者账号在前台承接"，M6 再做 UI）
- 社区分区配置 UI（目前只能直接改 DB）；M6 加 `/admin/community/groups`
- 敏感词库需运营审定后再切换到正式版，并后台化管理（M6）
- 帖子精选后的推荐位挂载相关试验功能（目前通过 relatedTrialId 字段已可挂载，但 UI 编辑入口在 M6）

### M4 · 信任层 + SEO（2026-04-19）

**数据模型**（迁移 `20260418201544_m4_faq`）：
- 新增 `FaqArticle`（slug/question/answer/category/tags/order/isPublished）
- seed 20 条覆盖：基础问题、安全与风险、费用与医保、隐私保护、试验流程、报名与入组、退出与权利
- seed 脚本 `prisma/seed-faq.ts`（后续新增 FAQ 时直接 upsert）

**页面**：
- `/faq` 新建，左侧分类导航 + 右侧按 category 分组折叠；嵌入 `FAQPage` JSON-LD
- 各页面 metadata：RootLayout 集中定义 metadataBase、title template、og、twitter、robots
- `/trials/[slug]` 新增 `generateMetadata` + Schema.org `MedicalStudy` JSON-LD（含 sponsor、healthCondition、phase、contactPoint）
- 首页新增 `MedicalOrganization` JSON-LD
- `/trials` 列表、`/prescreen/[slug]` 独立 metadata（prescreen 设 `robots.index:false`）

**SEO 基础设施**：
- `src/app/sitemap.ts`：5 个静态路由 + 所有公开 trial 的动态路由
- `src/app/robots.ts`：`Disallow: /admin/ /me /prescreen/`，指向 sitemap
- `NEXT_PUBLIC_SITE_URL` 环境变量（缺省 localhost:3000，上线时改）

**QA 验收**（全绿）：
- `npx tsc --noEmit` 零错误
- `npx next build` 成功，**19 路由**（比 M3 多 /faq、/robots.txt、/sitemap.xml 这 3 个）
- `/trials/[slug]` view-source 抓取：命中 `application/ld+json`、`MedicalStudy`、`@context`
- `/faq` view-source：命中 `FAQPage` 与多个 `@type`
- `/robots.txt`：正确输出 allow/disallow + sitemap URL
- `/sitemap.xml`：正确输出 xml（首页 + trials + faq + about + contact + 3 条真实 trial）
- 首页 og/twitter meta：`og:title`、`og:description`、`og:url`、`og:site_name`、`og:locale`、`og:type`、`twitter:card`、`twitter:title` 全部渲染

**踩过的坑**：
- tsx 解析 seed 文件时，中文字符串里嵌 ASCII 双引号（`"安全性"`）会被当作字符串终止符，必须改全角引号（「安全性」）。seed-faq.ts 里所有引用词统一用 `「...」`

**留到后续里程碑的 TODO**：
- og 图片（`public/og/home.jpg`）还是占位文本；上线前换授权素材
- 客服联系方式 400-888-1688 仍是占位，需用户向运营要正式值
- FAQ 后台增删改（M6 运营完善时再加）
- 社区模块 JSON-LD（M5 社区完成后统一加上）

### M3 · 账号真接入（2026-04-19）

**数据模型**（迁移 `20260418200021_m3_user_sms_application`）：
- 新增 `User`（phone 唯一 + 基础资料快照 + agreeReuse + lastLoginAt）
- 新增 `SmsCode`（phone/code/expiresAt/consumedAt/attempts，10 分钟有效、5 次错误上限）
- 新增 `Application`（userId × trialId + leadId 可空 + stage 六态 submitted/in_review/contacted/enrolled/withdrawn/closed + nextAction/note）
- `Lead` 增加 `userId`（可空），同一用户多次提交可关联同一账号

**SMS 抽象**（`src/lib/sms.ts`）：
- `SmsProvider` 接口 + `DevConsoleSmsProvider` 实现（console.info，固定码 123456）
- 生产接入时只需实现 `SmsProvider.sendCode(phone, code)` 即可替换
- 导出常量 `DEV_FIXED_SMS_CODE = "123456"`

**Session**（`src/lib/user-session.ts`）：
- 与 admin 分离：cookie `jt_user_session`，30 天有效
- `getUserSession()` / `isLoggedIn()` 辅助

**Server Actions**（`src/lib/actions/user-auth.ts` + `applications.ts`）：
- `sendSmsCode(phone)`：Zod 校验 + 60 秒节流 + 存 DB + 调 smsProvider
- `verifySmsCode(phone, code)`：校验 → 消费验证码 → 查/建 User → 写 session，返回 `{ok, isNew}`
- `userLogout()`：destroy session + revalidate
- `setApplicationStage(id, stage, nextAction)` / `saveApplicationNote(prev, fd)`

**患者端改造**：
- `/auth` · `AuthLoginForm`：sendSms + verify + 倒计时 + 错误 + 登录后 redirect `?next=`
- `/me`：守卫未登录 307 → `/auth`；从 Application 拉真数据，阶段按钮动态推进，支持 `userLogout`
- `/prescreen/[slug]` 提交：已登录时写 User profile 快照 + 创建 Application 关联 leadId
- `SiteHeader`：async server component，根据 user session 动态显示手机号脱敏 + 名字

**运营后台**（`/admin/applications`）：
- 列表 + 手机号/阶段/试验筛选 + 手机号脱敏
- 详情页三段（患者账户、试验与预筛答案、侧栏阶段流转 + 备注编辑）
- 左侧 nav 新增"报名管理"入口

**QA 验收**（全绿）：
- `npx tsc --noEmit` 零错误
- `npx next build` 成功，**17 路由**全部通过
- 9 个患者端路由 200；`/me` 未登录 307 → `/auth`；admin 路由未登录 307；`/admin/login` 200
- E2E 脚本：发码 → 创建 User → 预筛创建 Lead + Application → 查询 `/me` 可见 → admin 流转 stage `submitted → contacted`，全部通过

**踩过的坑**：
- `"server-only"` 误判：Client Component 意外嵌套 SiteShell（server）→ SiteShell 读 user-session → 整条链打进 client bundle。修法：client 组件不嵌套 server 的 shell，shell 放外层 page
- Lead vs Application：Lead 是匿名线索 snapshot，Application 是已登录账号级报名

**留到后续里程碑的 TODO**：
- 短信服务商 2026-04-25 前询价（上线前必须真接）
- FAQ 入库 + SEO（M4）
- 用户资料编辑页（M4 之后）

### M1.6 · 真实招募数据接入（2026-04-19）

解析 [真实招募项目/](真实招募项目/) 下 3 份真实招募广告（.doc/.docx），替换原 mock 种子：
- `rdn-hypertension-beijing-2025` 北京安贞医院 · 射频消融治疗难治性高血压合并 CKD（30 名）
- `silk-forehead-wrinkle-2025` 维纳丝 · 注射用丝素蛋白凝胶额头纹（广州番禺）
- `linac-oncology-wuwei-2025` 甘肃武威肿瘤医院 · 医用电子直线加速器 HK-X601A

完整解析稿 + 规范化字段：[真实招募项目/parsed-trials.md](真实招募项目/parsed-trials.md)。已跑 `npx tsx prisma/seed.ts`，DB 共 3 条真实试验。

**M2 必做 schema 扩展**（当前模型缺 13 个字段，真实广告都有）：sponsor、leadInvestigator、intervention、studyDesign、targetEnrollment、siteName、siteAddress、contactPerson、contactPhone、benefits、adVersion、adVersionDate、ethicsApproval、qrcodeUrl。临时信息先塞进 description 文本，M2 由 backend-engineer 建模。

### M1.5 · 样式校准（2026-04-19）
**4 组 Agent 再并行约 2 分钟完成**。

**根因**：M1 快速迁移时，原型每个 HTML 的 `<head><style>` 块（page-scoped CSS，如 `hero-photo`、`flow-steps`、`otp-input` 等）没有搬进项目，只复制了类名。所以这些类在 Next.js 版里是"裸类名无样式"。

**产出**：新建 9 个 `styles.css`，和对应 `page.tsx` 同目录：

```
src/app/styles.css                        ← 首页
src/app/trials/styles.css                 ← 列表
src/app/trials/[slug]/styles.css          ← 详情
src/app/prescreen/[slug]/styles.css       ← 预筛
src/app/prescreen/success/styles.css      ← 成功
src/app/auth/styles.css                   ← 登录
src/app/me/styles.css                     ← 我的报名
src/app/about/styles.css                  ← 了解更多
src/app/contact/styles.css                ← 联系我们
```

每个对应 `page.tsx` 顶部加了 `import "./styles.css";`。

**验收**：TS 零错误、9 路由 200、视觉应显著贴近原型，请浏览器 Ctrl+F5 硬刷新重新加载样式。

**补丁（同日晚）**：用户反馈 `/trials` 和 `/me` 视觉仍与原型有差距。根因是 M1 迁移时 JSX 结构与原型 HTML 不完全对齐（类名嵌套层级、input 结构等），导致 M1.5 搬入的 CSS 选择器匹配不上。派 2 组 agent 精修 JSX：
- `/trials`：filter-options 还原为 `<label><input/> 文字 <span class="count">N</span></label>` 结构；applied-tag 还原为 `<span class="applied-tag">` + 内嵌 × 按钮；trial-card 恢复 meta 三列 + SVG 图标
- `/me`：类名统一为原型的 `application/stage/stage__dot`；左侧用户信息 + 6 项导航 + 右侧 hero + 筛选 tab + 4 条 mock 报名（跟进中/预筛通过/已入组/已退出）完整还原

---

## 🔑 关键决策（不常改，新决策写到上面）

| 决策项           | 选择                          | 理由 / 风险                                                    |
|------------------|-------------------------------|----------------------------------------------------------------|
| 数据库（开发）   | SQLite via Prisma adapter     | 本机 MySQL 服务残留、装 Postgres 又增负担；SQLite 零配置        |
| 数据库（生产）   | 待定（MySQL 或 PostgreSQL）   | M7 部署时切，改 1 行 `provider`                                 |
| 短信服务         | 开发用固定码 `123456`         | M6 完成前必须真接商用短信（2026-04-25 前启动询价）              |
| 社区模块         | V1 就做                       | 工期 +3 周，需要审核人力和敏感词库                              |
| 服务器系统       | Linux                         | M7 用 Docker 一键部署，具体发行版待问 IT                        |
| 代码备份         | 暂不远程                      | ⚠️ 本机故障=全丢。建议定期拷贝到移动硬盘                        |
| 技术栈           | Next.js 16 + Prisma 7         | PRD 指定 Next.js；Prisma 原因是能在 ORM 层抹平 SQLite/MySQL 差异 |

---

## 🧭 待你推动的外部事项（Claude 做不了的）

- [x] 向业务方要 **3-5 条真实招募中试验数据**（M2 结束前）—— 2026-04-19 已接入 3 条真实试验
- [ ] 跟老板确认 **社区 V1 就做**会多花 3 周
- [ ] 问 IT：**服务器具体发行版、内网 IP、出网限制、端口、反向代理**（M7 前 2 周）
- [ ] **2026-04-25 前**启动短信服务商询价
- [ ] 准备 **FAQ 内容**（20 条起，给 M4）
- [ ] 客服联系方式（电话/微信/邮箱）**正式值**（目前是占位，M4 前替换）
- [ ] 社区上线前：**敏感词库、社区规约、违规处理 SOP、审核人力排班**（M5 前）

---

## 📚 相关文档位置

- 总 PRD：[临床试验患者招募网站V1_总PRD_2026-04-18.md](临床试验患者招募网站V1_总PRD_2026-04-18.md)
- 子 PRD：[患者社区模块PRD_V1_2026-04-18.md](患者社区模块PRD_V1_2026-04-18.md)、[项目级预筛表单PRD_V1_2026-04-18.md](项目级预筛表单PRD_V1_2026-04-18.md)、[运营后台PRD_V1_2026-04-18.md](运营后台PRD_V1_2026-04-18.md)
- 原型导览：[原型_V1/index.html](原型_V1/index.html)
- 应用代码：[app/](app/)
- Claude 私有规划（更详细版本）：`C:\Users\user\.claude\plans\v1-prd-2026-04-18-md-v1-index-html-sequential-umbrella.md`

---

*本文件由 Claude 在每个里程碑完成时自动更新。最后更新：2026-04-20（M6 全部完成：KPI 看板 + 导出 + FAQ/分区/敏感词后台；**⚠️ 本机唯一副本，里程碑节点务必立即备份到移动硬盘**）*
