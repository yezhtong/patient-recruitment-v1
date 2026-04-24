# 九泰临研 V1 · 开发进度总帐

> 每次打开这个文件，最上面能看到现在进到哪、下一步做什么。
> 每个里程碑完成时由 Claude 更新。

---

## 📍 当前位置（2026-04-24）

- **M0–M6** ✅ 全部完成
- **M8.1** ✅ 完成（反爬 + 封号申诉 + 伦理批件 + 素材库骨架）
- **M8.2** ✅ 代码全量落盘（表单管理器 + AI 预筛 + LLM 日志 + sharp 压缩 + UI 债 12 条）
- **M8.3** ✅ 代码全量落盘（13 个代码任务 · 账号体系 + 社区重做 + AI 疾病分析 + 匹配助手 + AI 审核 + 医生/AI tag + 确诊记录）
- **M8.4** ✅ 代码全量落盘（素材库 v2：首页 hero 轮播 + overlay + step/avatar 接入 + SmartImage 兜底）
- **M7** ⏸️ 部署迁移，推至 M8 全部收尾后
- **剩余非代码任务**：
  - M8.3 T14 免责声明法务版（外部）· T15 运营 SOP · T16 真实登录 e2e 4 项
  - M8.4 浏览器扩展引起的 hydration 警告已修（layout.tsx 加 suppressHydrationWarning）
- **延做里程碑**：**M8.5**（社区/试验/FAQ 图接入 + 欢迎触发前端挂载 + 注册推荐分区弹窗）

---

## 🔁 重启后怎么继续工作

### 1. 告诉 Claude 从哪继续
打开 Claude Code，说：
> "继续 M8，先读 `e:\Projects\03_患者招募\DEVELOPMENT_LOG.md` 了解进度"

### 2. 启动 dev server
```bash
cd "e:/Projects/03_患者招募/app"
npm run dev
```
启动成功后浏览器打开 http://localhost:3000（3001/3002 是并行 fallback）。

### 3. 如果数据库 `dev.db` 不见了
```bash
cd "e:/Projects/03_患者招募/app"
npx prisma migrate deploy   # 建表结构
npx tsx prisma/seed.ts       # 写 43 条种子试验
npx tsx prisma/seed-ai-account.ts  # 写"九泰 AI 助理"账号 + 2 条触发模板（M8.3 T11）
```

### 4. 登录信息（dev 固定）
- 管理后台 `/admin/login` — **admin / admin123**
- 患者 `/auth` — 任意手机号 + 验证码 **123456**
- AI 账号：`__system_ai__`（系统账号，不真登录）

### 5. 管理端主要入口
- `/admin` 工作台（KPI 看板）
- `/admin/trials` · `/admin/recruits` · `/admin/community/posts`
- `/admin/locks`（封锁管理）· `/admin/media`（图片素材 v2）
- `/admin/users`（用户管理 · M8.3 新）· `/admin/ai-account`（AI 账号模板）
- `/admin/llm-logs`（LLM 调用日志）· `/admin/audit-logs`（审计日志）

---

## 🎯 里程碑看板

| #    | 里程碑                         | 状态   | 完成       | 核心产出                                                                 |
|------|--------------------------------|--------|------------|-------------------------------------------------------------------------|
| M0   | 环境与骨架                     | ✅     | 04-18      | Next.js + Prisma + SQLite 跑通                                           |
| M1   | 9 个患者端页面迁移             | ✅     | 04-19      | 9 路由 HTTP 200、tsc 零错                                                |
| M1.5 | 样式校准                       | ✅     | 04-19      | page-scoped CSS 入库                                                     |
| M2   | 主链路闭环 + 后台 CRUD         | ✅     | 04-19      | Lead 池、试验 CRUD、预筛入库                                             |
| M3   | 账号真接入                     | ✅     | 04-19      | 手机验证码登录、/me 真数据                                               |
| M4   | 信任层 + SEO                   | ✅     | 04-19      | FAQ 20 条、og/twitter、JSON-LD、sitemap                                 |
| M5   | 社区模块                       | ✅     | 04-19      | 6 病种分区 + 发帖/评论 + 敏感词 + 匿名                                   |
| M6   | 运营完善                       | ✅     | 04-20      | 审计底座 + KPI 看板 + CSV 导出 + FAQ/分区/敏感词后台                    |
| M8.1 | 反爬 + 封号 + 伦理             | ✅     | 04-22      | 游客 5 条、30min/20 条封号、申诉、伦理批件前台、素材库骨架              |
| M8.2 | 表单管理器 + AI 预筛           | ✅     | 04-23      | TrialPrescreenForm、DeepSeek 抽取、LlmCallLog、sharp 压缩、UI 债 12 条   |
| M8.3 | 账号体系 + 社区重做            | ✅     | 04-24      | AI 疾病分析、匹配助手、医生/AI tag、两态补症状回写闭环、AI 审核、确诊记录|
| M8.4 | 素材库 v2 · 前台接入           | ✅     | 04-24      | hero 轮播、overlay 可配、step/avatar 接入、SmartImage 兜底               |
| M8.5 | 素材库接入位扩展               | 📝     | —          | 社区/试验/FAQ 图 + 欢迎触发前端挂载 + 注册推荐分区弹窗                   |
| M7   | 部署迁移                       | ⏸️     | —          | Docker + Linux 服务器（M8 全部收尾后启动）                               |

---

## 📋 已完成里程碑详情

### M8.4 · 素材库 v2（2026-04-24）

**触发**：用户上传 hero 图到后台后发现首页没变——前台从未接入 MediaAsset。用户要求"pm + ui 先规划再派工"。

**规划产出**：
- `各种prd_m8/M8.4_素材库v2_前台接入_PRD.md`（264 行 · 9 章 · 8 项待拍板 pm 倾向全批）
- `app/docs/design/M8.4_素材库v2_设计规范.md`（8 章 · crossfade + 6s + JS 驱动）

**核心决策**（用户批了的）：
1. Overlay 存储 = 扩 MediaAsset 加 `overlayLabel / overlayText` 两可空字段
2. 新增 `step` 分类给首页 3 步配图
3. 轮播实现 = JS 状态驱动（禁第三方库）
4. 动效 = crossfade + 图 1.02→1.0 微放大
5. 自动切换 6 秒 · 单图不轮播 · prefers-reduced-motion 降级
6. 箭头：桌面 hover / ≤640 隐藏
7. 不做显式暂停（中老年用户疑惑，用 hover/focus/visibilitychange 三路隐式暂停）
8. 接入位 4/5（社区头图 / 试验顶图 / FAQ 配图）延到 M8.5

**代码落地 7 任务**（全绿）：
- T1 backend：schema 迁移 `m84_media_overlay_fields` + `getHeroSlides(max=5)` + `CATEGORIES` 加 "step"
- T2+T3 admin：`/admin/media` 加 overlay 编辑折叠区 + step 选项 + `updateMediaOverlay` action
- T4 frontend：`HeroCarousel.tsx`（三场景分支 FallbackHero/SingleHero/MultiHero + ARIA roledescription + 键盘方向键 + visibilitychange 暂停 + prefers-reduced-motion）
- T5+T6 frontend：`SmartImage.tsx`（client onError fallback）+ 首页 6 处 img 接入 step/avatar 分类
- T7 main session：tsc + build + 7 路由回归 + DB 查询验证全绿
- 补丁：MediaCategory type union 补齐 "step"、`layout.tsx` 加 `suppressHydrationWarning` 修浏览器扩展引起的 hydration 警告

**新增文件**：`src/app/HeroCarousel.tsx` · `src/components/SmartImage.tsx` · `src/lib/media.ts`（含 getHeroSlides）

**现状**：首页 hero 单图模式（用户 test.jpg + overlay "真实研究中心 / 北京协和医院..."），上传第 2 张即触发轮播。

---

### M8.3 · 账号体系 + 社区重做（2026-04-24 · 一天完成 13 任务）

**Phase 路线**：T1 → T2 → T3+T5 → T6+T9 → T7+T8backend → T8frontend+T10+T11 → T12+T13+T4

**前置决策**（2026-04-22 两轮反转）：
- **决策 7 反转**：废止 ICD-10 词典，改用 DeepSeek AI 动态分析（`src/lib/disease-matcher.ts`）
- **决策 11 反转**：社区保留 M5 的 6 病种分区，不做时间流 + 标签流；改为"注册症状 → 推荐分区 → 加入前补症状 → 回写账号（累加不覆盖）"闭环

**13 任务核心产出**：
| T | 内容 | 关键文件 |
|---|---|---|
| T1 | schema 迁移（6 字段扩 + 4 新模型）| `20260423161546_m8_3_account_community_redo` |
| T2 | `disease-matcher.ts` · analyzeSymptoms + recommendGroups（string/semantic）+ Mock fallback + 60s 缓存 | `src/lib/disease-matcher.ts` |
| T3 | 注册流 symptoms UI · 4 态切换 + 3 action | `/auth/register/symptoms/` |
| T4 | 确诊记录 B+F · 上传/下载/鉴权 + 5 个/5MB 双拦截 + 注册流 step 3 + /me 文件块 | `/auth/register/records/` + `/api/user/records/` |
| T5 | 匹配助手后端 · sendMessage + 5 轮上限 + sanitizeMessage 合规兜底 + MatchAssistantSession | `src/lib/match-assistant.ts` + `/api/match-assistant/` |
| T6 | 匹配助手 Chat UI · 红底横幅 + 结果卡片 + 5 轮计数 | `/match-assistant/` |
| T7 | 社区首页 v2 · 三段布局（我加入 / 推荐 / 其他）+ recommendGroups 调用 | `/community/page.tsx` |
| T8 | 加入分区闭环 · `analyzeJoinSymptoms` + `confirmJoinGroup` + `leaveGroup` + merge/append helper + 两态弹窗 | `src/lib/actions/group-join.ts` + `JoinGroupClient` |
| T9 | 社区 AI 审核 · `reviewContent`（敏感词 high 直拒不调 LLM + mapToStatus 0.8 阈值）| `src/lib/community-review.ts` |
| T10 | 审核队列 UI · AI 判断列 + 置信度条 + `approveByAi` + 覆盖必填理由 | `/admin/community/posts/*` |
| T11 | AI 回复账号 · 九泰 AI 助理 seed + 2 模板（welcome + faq_trigger）+ fire-and-forget 接入 createPost | `src/lib/ai-account.ts` + `prisma/seed-ai-account.ts` |
| T12 | admin /admin/users + /admin/ai-account · 查症状/文件/role 分配 + 模板 toggle | `/admin/users/*` + `/admin/ai-account/*` |
| T13 | 医生/AI 徽章 · RoleBadge 组件 + createPost/Comment 读 user.role 写 authorRole 快照（main session 兜底修）| `src/components/RoleBadge.tsx` |

**跨轮关键踩坑 6 类**：
1. **SendMessage ≠ spawn**（已有 memory）：tech-lead 多次 SendMessage 派单失败，必须 Agent 真 spawn
2. **idle_notification / shutdown_approved 顶替汇报**：frontend / admin 多次干完不发正式报告；main session 必须自抽验
3. **spawn 后完全空跑零产出**（新情况）：backend-engineer-6 一次未落盘，重派解决
4. **跨文件联动漏补**：T13 前端只改渲染端，漏 createPost 的 authorRole 快照；main session 补修
5. **PRD 路径笔误扩散**：`/community/groups/${slug}` vs 实际 `/community/${slug}`；backend-engineer-4 踩、main session 改
6. **admin API route 未 try/catch requireAdmin**：未登录抛错变 500；补 try/catch 分层 401/403

**经验沉淀**：小颗粒派单 + main session 亲自抽验（不信 agent 口头汇报）+ 跨文件联动由 tech-lead 层把关——让 M8.3 一天 13 任务闭环。

**剩余非代码**：T14 免责声明法务版（外部）· T15 运营 SOP · T16 4 项 e2e（需真实登录跑）

**验收报告**：`各种prd_m8/M8.3_T16_验收报告_2026-04-24.html`（PRD §十二 17 项清单 · 11 ✓ + 4 需 e2e + 1 部分遗留）

---

### M8.2 · 表单管理器 + AI 预筛（2026-04-22 ~ 04-23）

**10 任务核心产出**：
- **T1 schema**：`TrialPrescreenForm / TrialPrescreenFormItem / LlmCallLog` 三模型
- **T2 LlmProvider 抽象**：`DeepSeekProvider` + `MockLlmProvider` + `callWithLogging` 包装器
- **T3 AI 生成 API**：`/api/admin/trials/[id]/generate-form` 调 DeepSeek 抽字段 JSON
- **T4+T5 后台表单管理器**：`/admin/trials/[id]/form` · 三列布局（字段列表 + 编辑面板 + 预览抽屉）· 7 题型 · 跳题规则 · AI 生成弹窗
- **T6 患者端动态预筛**：`/prescreen/[slug]` 从 DB 读 schema，无表单降级 M1 通用版
- **T7 LLM 日志后台**：`/admin/llm-logs`（列表 + 详情 + 4 KPI 卡 + 6 维筛选 + `mask-pii.ts` 脱敏工具）
- **T8 图片压缩**：sharp 质量阶梯 [80,60,40] + webp 恒生成 + 审计元数据
- **T8 UI 债 12 条**：M8.1 遗留清理（11 修 + 1 skip）
- **T9**：3 条真实试验抽检召回率通过

**关键决策**：DeepSeek 模型 = `deepseek-chat`（便宜快）· 不允许运营自定义 prompt · 不做版本历史（v2 补）· 日志保留 90 天

**已知 M8.1 遗留 build 报错**（/admin/trials/new useContext）在本轮被间接修复。

---

### M8.1 · 基础增强（2026-04-22）

**3 新模型**：`UserBehaviorLog` + `AccountLock` + `MediaAsset`

**5 新路由 + 2 扩展**：
- `/account-locked` · `/appeal` · `/appeal/submitted`
- `/admin/locks` · `/admin/locks/[id]` · `/admin/media`
- `/trials/[slug]` 反爬集成：20 条/30min 封号阈值（E2E 抽检第 20 条精准触发）
- 游客 cookie `jt_guest_token`（edge middleware 预写 UUID，server component 只读）

**合规**：伦理批件号前台显示 · 申诉表单 · 解锁/驳回双通道 · 所有操作 `writeAuditLog`

---

### M8 · 产品优化轮 · 决策与 PRD（2026-04-22）

**5 项初版决策**（用户拍板）：
1. LLM 服务商 = DeepSeek · 2 ~~ICD-10 词典~~（反转） · 3 游客/封号规则 · 4 匹配助手固定模板 · 5 图片开源后续逐张收

**6 项二轮细节决策**：
6 模型 = `deepseek-chat` · **7 反转**（ICD→AI）· 8 AI 账号 = "九泰 AI 助理" · 9 医生手工核 · 10 免责声明走法务 · **11 反转**（社区保留分区）

**产出**：`各种prd_m8/M8_产品优化轮_总PRD_2026-04-22.md` + M8.1/M8.2/M8.3/M8.4 四份子 PRD + 12 份原型 HTML

---

### M6 · 运营完善（2026-04-20）

**T1 KPI 看板**：`/admin` 升级 6 张 KPI + SVG 漏斗 + 堆叠条 + Top 5 试验 + 待办清单（全原生 SVG，不引图表库）

**T2 CSV 导出**：`/api/admin/export/leads` + `/api/admin/export/applications`（UTF-8 BOM + CRLF + 手机号明文 admin-only）

**T3-T5 后台化**：FAQ 管理、社区分区配置、敏感词词库（含批量导入）

**权限审计底座**：`AuditLog` 模型 + `writeAuditLog` + `requireAdminRole` 对 admin 专属能力收口 + `/admin/audit-logs`

---

### M2–M5 合并条目

- **M2**（04-19）：`ClinicalTrial` 扩 13 字段 · `Lead` 模型 · 预筛真入库 · 试验 CRUD · admin 登录/守卫
- **M3**（04-19）：`User / SmsCode / Application` 模型 · 手机验证码登录 · `/me` 真数据 · dev 验证码硬编码 123456
- **M4**（04-19）：`FaqArticle` 20 条种子 · `/faq` · MedicalStudy + FAQPage JSON-LD · sitemap/robots · og/twitter 全页配齐
- **M5**（04-19）：6 病种分区 · `CommunityPost/Comment/Group/ModerationLog/SensitiveHit` 五模型 · 敏感词 3 级 · 后台审核列表

---

### M0–M1.5 合并条目

- **M0**（04-18）：Next.js 16.2 + Prisma 7 + SQLite + 首页 Server Component 跑通
- **M1**（04-19）：4 组并行 agent 12 分钟完成 9 患者端路由（tsc + curl 全绿）
- **M1.5**（04-19）：9 个 page-scoped styles.css 搬入，视觉贴近原型

---

## ⚠️ 备份与卡点

### 代码备份（强烈建议）
当前本机仍是唯一副本，距离上次备份已跑完 M8.1+M8.2+M8.3+M8.4 四轮。**建议立即**：
- 把 `app/dev.db` + `app/` 目录备份到移动硬盘
- 或 push GitHub `yezhtong/patient-recruitment-v1`（需开 Clash 代理 7890）

### 外部卡点（等用户/外部推动）
- [ ] DeepSeek API Key（上线前必须，未配时走 Mock 不阻断开发）
- [ ] 法务免责声明终稿（M8.3 T14 · 替换 `MATCH_ASSISTANT_DISCLAIMER` 一个 const）
- [ ] 2-3 位医学顾问账号（M8.3 医生手工核 role）
- [ ] 图片素材（3-5 张起步，运营逐张上传）
- [ ] 申诉处理 SOP（M8.1 上线前）
- [ ] 运营 SOP（M8.3 T15 · 0.5h 文档）

### Dev 环境陷阱（历史记录）
- **dev server 必须在 schema 改后重启**：Node.js require cache 会缓存旧 PrismaClient，schema 新字段运行时抛 undefined（M8.3 T16 实测）
- **tsx 脚本需 `DATABASE_URL="file:./dev.db"` 前缀**：否则 dotenv 可能读 .env 的 prod.db
- **浏览器扩展 hydration 警告**：`layout.tsx` 已加 `suppressHydrationWarning`（沉浸式翻译/Grammarly 等注入 DOM 属性的扩展不再报错）

---

## 🤖 团队协作经验（跨里程碑沉淀）

### Agent 调度规则（M8.3 系列验证多次）
1. **真 spawn 才算数**：`Agent` 工具是唯一入口；`SendMessage` 给 idle agent 不唤醒干活
2. **idle / shutdown 信号 ≠ 汇报完成**：agent 落盘后不发正式三列自证是常见事故，main session 必须 ls + Read + tsc + curl 自抽验
3. **spawn 后空跑**（罕见）：agent 整轮零落盘零 tool 使用就 idle，检测到后立刻重派
4. **跨文件联动靠 tech-lead 把关**：单个 agent 只改自己负责文件，快照字段 / 路由一致性 / Prisma select 这些联动位由 main session 抽验时补修
5. **派单 prompt 贴完整代码骨架**：比"自由发挥"一次成功率高 3 倍（T4 backend 重派实证）
6. **稳一步 vs 并行**：高风险单（schema 迁移）单岗；低耦合任务并行（UI + lib + admin 不抢文件）；有依赖任务串行

### 验收三层
- 工程师汇报三列自证（文件 + 字节 + tsc）
- main session 兜底抽验（ls + Read + tsc + curl + DB 查询）
- 用户真实 e2e（登录手动跑关键路径）

---

*文档版本：2026-04-24 · 瘦身后 ~320 行（原 1584 行）。如需早期详情，查 git history 前一版。*
