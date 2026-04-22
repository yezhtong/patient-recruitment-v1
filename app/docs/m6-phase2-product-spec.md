# 九泰临研 V1 · M6 第二阶段产品验收标准

> 版本：V1 · 2026-04-20 · 由 tech-lead 兜底起草（PM 未在 SLA 内交付）
>
> 范围：KPI 看板、Leads/Applications CSV 导出、FAQ 后台、社区分区配置、敏感词词库后台化
>
> 说明：本文档作为工程实现与 QA/产品验收的单一事实来源。每个小目标按 **业务目的 → 验收 checklist → 权限 → 审计 → 异常兜底** 五块给出。

---

## T1 · KPI 看板（/admin 工作台首页升级）

### 业务目的
运营每天打开 `/admin` 第一眼看到的是「当前业务健康度」而非粗粒度总量。支撑日常运营决策：今天要联系谁、哪个试验线索最旺、社区有多少帖待审、转化漏斗在哪儿掉。

### 当前状态
`/admin/(authed)/page.tsx` 显示 5 张总量卡（新线索/跟进中/最近 7 日/累计线索/招募中试验）+ 2 个快捷入口。总量对决策帮助有限。

### 验收 checklist

**主指标卡区（4–6 张，时间范围切换 7d / 30d）**
- [ ] 近 7 日 / 30 日新增线索数（支持时间切换，默认 7d）
- [ ] 近 7 日 / 30 日新增报名数（Application 维度）
- [ ] 当前「待跟进新线索」数（status = new）
- [ ] 当前「社区待审核」帖子数（reviewStatus = pending）
- [ ] 招募中试验数（不随时间切换）
- [ ] 累计入组数（Application stage = enrolled）

**线索漏斗（1 个）**
- [ ] 展示 Lead 四态数量：new → contacted → qualified → disqualified
- [ ] 同时给出转化率：contacted/new、qualified/contacted（百分比 + 分数值）
- [ ] 纯 SVG 绘制（无图表库），配色走 admin.css 的 chip 色体系

**报名阶段分布（1 个）**
- [ ] 展示 Application 六态数量（submitted / in_review / contacted / enrolled / withdrawn / closed）
- [ ] 水平堆叠条样式，mono 小字注 N

**Top 5 热门试验表（1 个）**
- [ ] 按「近 30 日新增线索数」降序取 Top 5
- [ ] 列：试验标题、病种、城市、近 30 日线索数、累计线索数、状态 chip
- [ ] 行点击跳 `/admin/trials/[id]/edit`

**待办区（1 个）**
- [ ] 「待跟进新线索 N 条」+ 跳转 `/admin/leads?status=new`
- [ ] 「社区待审核 N 条」+ 跳转 `/admin/community/posts?status=pending`
- [ ] 「报名待审核 N 条」（Application stage = submitted）+ 跳转 `/admin/applications?stage=submitted`

**布局要求**
- [ ] 视觉沿用 admin.css 的 `.kpi-grid` / `.kpi-card` / `.admin-table` / `.admin-card`；禁止引新字体、新色
- [ ] 时间切换用 URL searchParams `?range=7d|30d`，服务端重渲染（不引 client state）

### 权限
`requireAdmin()` 即可（operator 可看）；无需 admin 专属。

### 审计
只读，**不**写审计。

### 异常兜底
- 无数据（全新环境）：每个指标卡显示 `0`，底部灰色 hint「暂无数据」
- 时间切换：若 `?range` 非法，默认回落 7d，不报错
- 数据库查询失败：该指标卡显示「—」+ hint「加载失败」，不阻塞整页

---

## T2 · Leads / Applications 导出 CSV

### 业务目的
运营把当前筛选条件下的线索 / 报名导给外部（电话跟进团队、试验中心、上级汇报）。需要能带着 UI 上已选的筛选一键下载。

### 验收 checklist

**Leads 导出**
- [ ] `/admin/leads` 顶部新增「导出 CSV」按钮（`.btn-admin` 样式）
- [ ] 导出走 GET `/admin/api/leads/export.csv`，查询参数完全复用列表页（`status` / `trial` / `q`）
- [ ] 文件名：`leads-YYYYMMDD-HHmm.csv`（按请求时本机时间）
- [ ] 编码 **UTF-8 with BOM**（Excel 中文不乱码）
- [ ] 导出字段（顺序）：提交时间、姓名、手机号（**不脱敏**）、性别、年龄、城市、既往病症、试验标题、试验 slug、病种、试验所在城市、状态、备注、来源页、是否同意复用、创建时间
- [ ] 按创建时间倒序，无上限（但生产量预计 < 5 万，不分页）
- [ ] 导出时显示按钮 loading 态（禁用 + 文案变「导出中…」）
- [ ] 若导出结果为 0 行：仍下载带表头的空 CSV，不阻塞

**Applications 导出**
- [ ] `/admin/applications` 同样加「导出 CSV」按钮
- [ ] 查询参数复用（`stage` / `trial` / `q`）
- [ ] 导出字段：创建时间、患者姓名、手机号（**不脱敏**）、试验标题、试验 slug、阶段、阶段变更时间、下一步动作、备注、关联 leadId、leadCreatedAt

### 权限
**仅 admin 可导出**（含手机号明文、属敏感）。operator 访问 API 路由返回 403。

### 审计
- [ ] 每次导出触发 `writeAuditLog({ action: "export", entityType: "lead" | "application", summary: "导出 N 条，筛选：..." })`
- [ ] summary 中记录筛选参数与行数，便于事后追溯

### 异常兜底
- 查询报错：返回 500 + JSON `{error}`，按钮恢复可点，前台显示错误提示
- 极端大数据量（> 5 万行）：先不做分批；MVP 阶段一次性下载
- 手机号字段空值：导出为空字符串，不写 null

---

## T3 · FAQ 后台增删改（/admin/faq）

### 业务目的
当前 FAQ 20 条是 seed 硬编码，运营要新增一条得改 DB。M6 让运营能自主管理。

### 验收 checklist

**列表页 `/admin/faq`**
- [ ] 表格展示：排序、分类、问题（截断 60 字）、状态（已发布/草稿）、更新时间、操作
- [ ] 筛选：分类（general/trial-process/safety/privacy/costs/withdraw/all）、状态（all/published/draft）、关键词搜索
- [ ] 按 `order ASC, updatedAt DESC` 排序
- [ ] 顶部「新建 FAQ」按钮

**新建页 `/admin/faq/new`**
- [ ] 字段：slug（唯一，系统建议自动由 question 生成拼音）、question（必填）、answer（必填，textarea）、category（下拉 7 选 1）、tags（逗号分隔文本）、order（int，默认 100）、isPublished（开关，默认 true）
- [ ] slug 冲突校验、必填校验，Zod 全量

**编辑页 `/admin/faq/[id]/edit`**
- [ ] 同新建字段
- [ ] 右下「保存」、左下「删除」（二次确认 modal）
- [ ] 顶部显示 createdAt / updatedAt

**发布开关**
- [ ] 列表页每行「发布/下架」按钮（Server Action）
- [ ] 下架的 FAQ **不出现在患者端 `/faq`**；已有详情 URL 若有缓存，下次 revalidate 后消失

**revalidate 触发**
- [ ] 任何 FAQ 写操作后 `revalidatePath("/faq")` 和 `revalidatePath("/sitemap.xml")`

### 权限
- 列表、查看：`requireAdmin()`（operator 可看）
- 新建 / 编辑 / 删除 / 发布切换：`requireAdminRole()`（仅 admin）

### 审计
- [ ] 新建：`action: "create"`, entityType: "faq"
- [ ] 更新：`action: "update"`, summary 记录变更字段名
- [ ] 删除：`action: "delete"`
- [ ] 发布切换：`action: "publish" | "unpublish"`

### 异常兜底
- slug 冲突：表单级错误「slug 已存在」
- 删除正在被引用的 FAQ：V1 直接物理删（未做引用关系），无拦截
- 空态：列表为空显示「还没有 FAQ，点击上方「新建 FAQ」开始」

---

## T4 · 社区分区配置（/admin/community/groups）

### 业务目的
目前 6 个病种分区 seed 硬编码。运营想加「儿科」「罕见病」分区、或暂时下架某分区，必须能改 DB 才能做。

### 验收 checklist

**列表页 `/admin/community/groups`**
- [ ] 表格：sortOrder、名称、slug、diseaseTag、简介（截断 40 字）、帖子数（reviewStatus != hidden）、本周新增、启用开关、操作
- [ ] 按 `sortOrder ASC` 排序
- [ ] 顶部「新建分区」按钮

**新建页 `/admin/community/groups/new`**
- [ ] 字段：slug（唯一，英文小写+连字符）、name（必填）、diseaseTag（可选，用于关联试验）、introduction（textarea）、isEnabled（默认 true）、sortOrder（int，默认 100）
- [ ] Zod：slug 必须 `^[a-z0-9-]+$`

**编辑页 `/admin/community/groups/[id]/edit`**
- [ ] 同新建字段
- [ ] 右下「保存」、左下「删除」（**若已有帖子则禁用删除**，给出提示「该分区已有 N 条帖子，请先迁移或隐藏后再删除」）

**启用开关**
- [ ] 列表页每行切换按钮，立即生效
- [ ] 禁用的分区不出现在患者端 `/community`、`/community/[slug]` 返回 404

**revalidate 触发**
- [ ] 任何分区写操作后 `revalidatePath("/community")` + `revalidatePath("/sitemap.xml")`

### 权限
- 列表、查看：`requireAdmin()`
- 新建 / 编辑 / 删除 / 启停：`requireAdminRole()`

### 审计
- [ ] 新建 / 更新 / 删除 / 启停 全部写审计，entityType: "community-group"

### 异常兜底
- slug 冲突：表单级错误
- 尝试删除有帖子的分区：Server Action 返回错误，UI 显示提示
- 若 diseaseTag 改动，患者端关联试验可能失效，不做强一致（eventual consistency）

---

## T5 · 敏感词词库后台化（/admin/community/sensitive-words）

### 业务目的
当前敏感词硬编码在 `app/data/sensitive-words.txt`，改一条要重新部署。运营需要能即时增删、分级（high/medium/low）、分类型（contact / drug-sale / enroll-promise / quackery / ad）。

### 数据模型新增（backend-engineer 处理）
```prisma
model SensitiveWord {
  id         String   @id @default(cuid())
  keyword    String   @unique
  riskType   String   // contact / drug-sale / enroll-promise / quackery / ad
  riskLevel  String   // high / medium / low
  isEnabled  Boolean  @default(true)
  note       String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([isEnabled, riskLevel])
}
```

seed：把现有 `data/sensitive-words.txt` 35 条 upsert 进 DB（seed 脚本 `prisma/seed-sensitive-words.ts`）。

### 运行时改造
- `src/lib/sensitive-words.ts` 改为首次调用时从 DB 加载所有 `isEnabled = true` 的记录，内存缓存 60s（或在写操作后主动失效）
- 保留手机号正则、邮箱正则等启发式规则不动

### 验收 checklist

**列表页 `/admin/community/sensitive-words`**
- [ ] 表格：关键词、riskType（chip 显示中文）、riskLevel（chip 颜色区分 high=danger / medium=warning / low=info）、启用开关、命中次数（从 CommunitySensitiveHit count）、最近命中时间、操作
- [ ] 筛选：riskType（all/5 类）、riskLevel（all/3 档）、仅看启用
- [ ] 顶部「新建词」+「批量导入」按钮

**新建 / 编辑**
- [ ] 字段：keyword（必填，唯一）、riskType（必选，5 类）、riskLevel（必选，3 档）、isEnabled（默认 true）、note（可选备注，解释为何收录）
- [ ] Zod + 唯一性校验

**批量导入**
- [ ] modal 或独立页 `/admin/community/sensitive-words/import`
- [ ] 大 textarea，每行一条，格式 `level|type|keyword`（与 `data/sensitive-words.txt` 同）
- [ ] 解析失败的行单独报错，不中断其他合法行
- [ ] upsert 模式：已存在的 keyword 更新 level/type，不存在则新建
- [ ] 导入后显示「新增 N / 更新 M / 失败 K 条（含错误行号）」

**启用开关**
- [ ] 立即生效（失效内存缓存）

### 权限
- 列表、查看：`requireAdmin()`
- 新建 / 编辑 / 删除 / 导入 / 启停：`requireAdminRole()`

### 审计
- [ ] 所有写操作都写审计；批量导入按「新增」「更新」两类分别记一条 summary

### 异常兜底
- 同 keyword 新建：Zod 报「关键词已存在」
- 批量导入文件过大（> 500 行）：不拦截，但 UI 显示「建议一次导入 ≤ 500 条」
- 缓存失效：任何写操作后主动清缓存（进程内），下一次发帖扫描时重读 DB

---

## 通用约束（所有 Tx 共同遵守）

1. **Server Action 必过 Zod**（参考现有 `src/lib/actions/trials.ts` 模式）
2. **二次确认**：删除按钮一律 `confirm()` 或 modal（复用 `DeleteTrialButton` 的模式）
3. **revalidatePath**：任何写操作涉及的前台路径都要触发
4. **文案中文**、字段名英文
5. **dev server**：完成后 `curl` 自测 200、tsc 零错误、build 通过
6. **备份提醒**：M6 整个完成时必须在 DEVELOPMENT_LOG 加粗提醒用户备份 dev.db

---

## 补充说明（pm 补）2026-04-20

> 作者：product-manager
> 说明：tech-lead 兜底规范整体框架直接可用（业务目的 → checklist → 权限 → 审计 → 异常兜底），本段在原规范基础上做**产品视角追加**，不改原文。

### 一、初版追加（M6 第二阶段开工前）

这 17 条是我第一次 review 规范时追加的产品必要项，部分已在首轮落地、部分延后。落地情况见下方「二、补丁轮 checklist」。

#### T1 · KPI 看板
1. **百分比必须带分母**：转化率一律显示为 `35%（14/40）`。理由：老板看单独百分比会追问「多少人」，运营也习惯看绝对数
2. **Top 5 试验表加「线索→报名」转化率列**：近 30 日 Application 数 / Lead 数。老板 ROI 视角核心
3. **「推广来源维度」Top 5 卡**：按 Lead.sourcePage groupBy。这是老板「推广钱值不值」的直接答案
4. **时间切换补「今日」档**：运营日常要看「今天到现在」

#### T2 · CSV 导出
1. **文件名用 UTC+8 本地时间**：格式 `leads-20260420-1430.csv`，避免部署后服务器时区混乱
2. **「既往病症」改叫「病史」**：「既往」是行话，电话跟进团队看着难受
3. **Application 导出加「项目答案摘要」列**：把 projectAnswers JSON 拼成 `问题1：答案1 / 问题2：答案2` 字符串
4. **加 `take: 50000` 硬上限**：虽然预期 < 5 万，但数据量失控时防服务器打挂

#### T3 · FAQ 后台
1. **slug 留空时后端生成 `faq-<6位随机>`**：不用拼音（拼音长且乱），用户填了就用用户的
2. **category 下拉 UI 显示中文标签**：存库仍用英文 key
3. **排序 order 用数字输入 + tooltip**：V1 保留，V2 改拖拽

#### T4 · 社区分区配置
1. **删除改软删**：即使无帖子也不物理删，用 `isEnabled=false`（或加 `deletedAt`）。物理删会让审计日志 entityId 变成悬垂引用
2. **diseaseTag 改动弹 confirm**：提示「当前有 N 条试验按旧标签匹配本分区，修改后将不再显示」

#### T5 · 敏感词词库
1. **命中数 / 最近命中时间列必做**
2. **批量导入改「预览-确认」两步**：先显示「将新增 N / 更新 M / 失败 K」预览，用户点确认才真写
3. **keyword Zod 改 `.min(2)`**：防运营输入单字（"药""治"）拦死整个社区讨论
4. **第一版种子词库 35 条上线前由 team-lead 人工审定**：PM 专属护栏

---

### 二、补丁轮 checklist（M6 第二阶段代码落盘后的热修，2026-04-20）

> 情境：首轮代码已落盘（tsc / build / curl 全绿），qa 复验中。以下 10 条为「M6 真·完成」前必修；未列入的条目全部延后到 `m6-5-backlog.md` 或 V2。
> 修复窗口：qa 复验后 24 小时内合入。

#### 🅰 热修档（数据正确性 / 运营事故防护）

- **A1** — 导出接口 `take: 50000` 硬上限
  - **用户视角**：运营点导出时，若结果被截断，页面顶部显示 toast「本次导出前 5 万条，请缩小筛选范围后重新导出」
  - **验证**：Leads / Applications 两条导出路径都加；达到上限不报错、正常下载前 5 万条
  - **关联**：PM 补充点 T2·4

- **A2** — FAQ slug 留空自动生成
  - **用户视角**：运营在新建 FAQ 时 slug 字段可不填，提交后系统自动生成 `faq-<6位随机字符>`；若运营手填了 slug 且合法则用运营的
  - **验证**：`FaqForm.tsx` 的 slug input 的 `required` 属性移除；后端 action 校验"有值则走现有正则校验、无值则生成并保证唯一"
  - **关联**：PM 补充点 T3·1

- **A3** — FAQ category 下拉 UI 显示中文标签
  - **用户视角**：运营在表单看到「试验流程」「安全与风险」「隐私保护」等中文，不再看到 `trial-process` 这种英文 key
  - **验证**：列表页筛选下拉 + 新建/编辑表单下拉两处都显示中文；数据库字段值仍是英文 key
  - **关联**：PM 补充点 T3·2（列表页已做，表单页需确认）

- **A4** — 分区删除改软删
  - **用户视角**：运营点「删除分区」不再物理删除，改成标记 `isEnabled=false` 并从患者端消失；后台列表可选「显示已停用」查看历史分区
  - **验证**：`deleteCommunityGroup` 改为 update 操作；schema 不加 `deletedAt`（用现有 `isEnabled=false` 即可）；审计日志 entityId 仍有效可查
  - **关联**：PM 补充点 T4·1

- **A5** — 编辑分区改 diseaseTag 弹 confirm
  - **用户视角**：编辑分区时若修改了 `diseaseTag` 字段，保存前弹窗「当前有 N 条试验按原标签『xxx』关联本分区，修改后『病友讨论』入口将失效，确定保存吗？」；N=0 时不弹
  - **验证**：前端在 submit 前 fetch `count(clinicalTrial where disease=原tag)`；N>0 时 `confirm()` 拦截；取消则不提交
  - **关联**：PM 补充点 T4·2

- **A6** — 敏感词批量导入改「预览-确认」两步
  - **用户视角**：运营粘贴完词库点「预览」，页面显示「将新增 N / 更新 M / 失败 K（附错误行号列表）」预览表，**此时不写库**；运营确认后点「确认导入」才真写库；中途可点「重新编辑」回到粘贴框
  - **验证**：`bulkImportSensitiveWords` action 加 `dryRun` 参数或拆成两个 action；第一步返回统计 + errors 不写库；第二步凭 token/标记真写
  - **关联**：PM 补充点 T5·2

- **A7** — 敏感词 keyword 最小字符数保护
  - **用户视角**：运营在新建/批量导入时若输入单字（如"药""治"），表单报错「关键词至少 2 个字符，单字会拦截正常讨论」
  - **验证**：`wordSchema.keyword.min(1)` 改为 `.min(2, "关键词至少 2 个字符，单字会拦截正常讨论")`；批量导入时该行作为失败行单独报告不中断
  - **关联**：PM 补充点 T5·3

#### 🅱 运营体验档（代价小、体验提升明显）

- **B1** — 所有百分比显示带分母
  - **用户视角**：看板上任何百分比后跟括号分数。`35%（14/40）`、`60%（3/5）`
  - **验证**：`LeadFunnelSvg` 的 `convContactedFromNew` / `convQualifiedFromContacted` 两处显示位加上 `(n/d)` 后缀
  - **关联**：PM 补充点 T1·1

- **B2** — 导出字段「既往病症」改「病史」
  - **用户视角**：运营下载的 CSV 里列名显示「病史」
  - **验证**：`/api/admin/export/leads/route.ts` 的 headers 数组「既往病症」改「病史」；字段数据源 `lead.condition` 不变
  - **关联**：PM 补充点 T2·2

- **B3** — 导出文件名用 UTC+8 本地时间 + PRD 格式
  - **用户视角**：下载文件名为 `leads-20260420-1430.csv`（而非 `leads-<timestamp>.csv` 或 `线索_xxx.csv`）
  - **验证**：`csvTimestamp()` 工具函数改为 UTC+8 格式化；前端按钮若走 `window.location.href` 方式则文件名由 `Content-Disposition` 头决定，只改后端即可；若前端仍用 `triggerDownload`，前端文件名也需同步
  - **关联**：PM 补充点 T2·1

#### 补丁轮产品验收门

补丁轮合入时，PM 会再次 Read 上面 10 条对应的代码确认落地；任一条未满足「用户视角」描述则打回。**不检查 V2 / M6.5 清单**（见 `m6-5-backlog.md`）。

---

### 三、T1 KPI 看板产品视觉与文案偏差（2026-04-20 补丁轮追加）

> 来源：PM 独立完成 T1 KPI 看板验收后识别的 6 条产品细节偏差。C1 为注释级留痕、C2-C6 纳入补丁轮。

- **C1** — 反向指标红绿色陷阱注释
  - **用户视角**：（开发视角留痕，无直接用户感知）。未来在 `pending-new-lead` / `pending-community` 两张卡上加 delta 时，必须同步支持反向红绿色，避免「待跟进线索数量上升」显示成绿色 ▲（数字越大运营越累，属于坏事）
  - **验证**：`src/lib/queries/admin-dashboard.ts` 文件顶部加注释：`// pending-* 卡不给 delta：数字升=坏事，等反向红绿色支持再加。`
  - **关联**：PM 单项验收偏差 #1 · 延期到 M6.5，由 backend-engineer 仅加注释
  - **档位**：M6.5 实现反向 delta 支持（作为 KPI 看板视觉升级子项）

- **C2** — KPI 卡零态 hint 场景化
  - **用户视角**：数据为 0 时，hint 不再显示 `vs 上 7 天 0 条` 这种看起来像 bug 的文案；按卡类型与时间维度区分场景
  - **验证**：
    - 场景 A（有时间对比 · 当前 0 && 上期 0）：`暂无数据，等首条进来后刷新`
    - 场景 B（有时间对比 · 当前 0 但上期 > 0）：`近期无新增，上 {period} 有 {prevValue} 条`
    - 场景 C（有时间对比 · 当前 > 0）：保持现状 `vs 上 {period} {prevValue} 条`
    - 场景 D（无时间对比 · value === 0）：每张卡独立文案（见 `m6-phase2-copywriting.md` T1 节）
    - 场景 E（无时间对比 · value > 0）：并入 C4 改造
  - **关联**：PM 单项验收偏差 #2

- **C3** — 线索漏斗零态替代渲染
  - **用户视角**：漏斗数据全零（`total === 0`）时不再显示 4 个数字为 0 的空框，改显示居中提示「暂无线索数据 / 等患者提交预筛后，这里会显示线索的流转漏斗」
  - **验证**：
    - `LeadFunnelSvg` 组件 `data.total === 0` 分支替代渲染
    - 直接复用 `StageStackBar` 已有的 `.stage-stack__empty` CSS class，不新建样式
    - `role="img"` 的 `aria-label` 改为「暂无线索数据」
    - 外层 `.funnel` 容器保留，防止卡片高度塌陷
  - **关联**：PM 单项验收偏差 #3

- **C4** — KPI 卡裸 DB 术语替换
  - **用户视角**：运营看不到 `status = new` / `reviewStatus = pending` / `stage = enrolled` / `status = recruiting` 这种英文 key，改为中文业务描述
  - **验证**：`src/lib/queries/admin-dashboard.ts` 的 `getKpiCards()` 改 4 张卡 hint：
    - `pending-new-lead`：`status = new` → `尚未联系的线索`
    - `pending-community`：`reviewStatus = pending` → `等待审核的帖子`
    - `recruiting-trials`：`status = recruiting` → `正在招募的项目`
    - `enrolled-count`：`stage = enrolled` → `已入组患者`
    - `recent-leads` / `recent-apps` 的 hint（`vs 上 7 天 N 条`）**不改**，属口径说明不是 DB 术语
  - **关联**：PM 单项验收偏差 #4

- **C5** — 工作台 title 去占位符
  - **用户视角**：工作台标题从 `工作台 / 01` 改为 `工作台`，不再显示章节编号占位符
  - **验证**：`src/app/admin/(authed)/page.tsx` 的 `<h1>` 元素删除 `<em>/ 01</em>` 子元素
  - **关联**：PM 单项验收偏差 #5 · tech-lead 拍板不做动态周数

- **C6** — 主 CTA 改「刷新数据」
  - **用户视角**：看板右上角主按钮从 `+ 新建试验`（写场景）改为 `刷新数据`（读场景）。运营要新建试验从左侧 nav 进入
  - **验证**：
    - 按钮文案 `+ 新建试验` → `刷新数据`
    - 样式从 `btn-admin--primary` 改为普通 `btn-admin`
    - 实现方式：`<Link href="/admin?range={current}">` 纯跳转触发 SSR 重取（首选方案，无需 server action）
    - 可选前缀图标 ⟳ 或 ↻
  - **关联**：PM 单项验收偏差 #6

#### C1-C6 产品验收门

C2-C6 与 A1-A7 + B1-B3 合并为补丁轮（16 条）；C1 为注释级不计入验收 checklist（由 backend-engineer 改后 tech-lead 口头确认即可）。补丁轮合入后 PM 再次 Read 全部 15 条代码逐条验，通过则 M6 标记"真·完成"。

#### 已确认的 PASS 项（不再复验）

- **T1 权限守卫 ✅**：`app/src/app/admin/(authed)/layout.tsx:13-16` 用 `getAdminSession()` + `isAdminSession(session)`，admin 与 operator 均可访问看板，符合 PRD T1「权限」章节要求「`requireAdmin()` 即可（operator 可看）；无需 admin 专属」。2026-04-20 由 tech-lead-3 Read 确认后 PM 签收留痕。

### 补丁轮任务汇总（16 条，owner 分派建议）

| # | 类型 | 摘要 | 建议 owner |
|---|---|---|---|
| A1 | 数据防护 | 导出 `take: 50000` 上限 + 超限 toast | backend |
| A2 | 实际阻塞 | FAQ slug 留空自动生成 `faq-<6位>` | backend |
| A3 | 文案 | FAQ category 下拉 UI 中文（表单页） | admin |
| A4 | 数据完整 | 分区删除改软删 `isEnabled=false` | backend |
| A5 | 交互 | diseaseTag 改动 confirm 提示 | admin |
| A6 | 交互 | 敏感词批量导入「预览-确认」两步 | backend |
| A7 | 事故防护 | 敏感词 keyword `.min(2)` | backend |
| B1 | 文案 | 百分比带分母 `35%（14/40）` | admin |
| B2 | 文案 | 导出列「既往病症」→「病史」 | backend |
| B3 | 格式 | 导出文件名 `leads-YYYYMMDD-HHmm.csv` UTC+8 | backend |
| C2 | 文案 | KPI 卡零态 hint 场景化（5 场景） | admin |
| C3 | 视觉 | 线索漏斗零态替代渲染 | admin |
| C4 | 文案 | 裸 DB 术语替换（4 张卡 hint） | admin |
| C5 | 文案 | 工作台 title 去 `/ 01` | admin |
| C6 | 交互 | 主 CTA 改「刷新数据」 | admin |
| C1 | 留痕 | 反向指标文件头注释（不计 checklist） | backend |

---

*本文档由 tech-lead 兜底起草于 2026-04-20；PM 于同日三次追加补充段（初版 17 条 → 补丁轮 10 条 → T1 偏差 6 条）。*
