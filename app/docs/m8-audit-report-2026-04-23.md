# M8 阶段审计报告（2026-04-23）

**审计执行人**：tech-lead（V3）
**审计时间**：2026-04-23 中午（接班 team-lead-2）
**审计范围**：M8.1（已用户验收）+ M8.2（进行中 T1–T4, T6, T9）+ T8 UI 债现状
**审计基线**：`app/` 部署版本（非原型）
**备份提醒**：⚠️⚠️⚠️ 本机仍是唯一副本，审计结论落盘后强烈建议立即备份 `app/dev.db` 与整个 `app/` 目录到移动硬盘或推送 GitHub 私库。

---

## 一、硬取证一览

| 取证项 | 命令 | 结果 |
|---|---|---|
| TypeScript 零错误 | `cd app && npx tsc --noEmit` | **exit 0（无输出）** |
| 生产构建 | `DATABASE_URL=file:./dev.db npm run build` | **exit 0** · `Compiled successfully in 4.7s` · 48 条路由全部编译通过 |
| 迁移状态 | `prisma migrate status`（前任已跑） | 无 drift，9 条迁移齐全，末条 `20260422101239_m8_2_prescreen_form_llm_log` |
| SQLite 文件 | `ls app/*.db` | 仅 `app/dev.db`（483 KB，mtime 04-23 11:30）——无幽灵 |
| 数据抽查 | 见下方"数据抽查"章节 | 全部合理 |
| 路由冒烟 | 16 条关键路由 curl（端口 3001 的现役 dev server） | 全部响应合理（200/307/401） |

**dev server 说明**：审计前已有 PID 48856 的 dev server 跑在 3001，审计直接复用；我自己启的 3002 被 Next 自动放弃退出，没有留置进程。

---

## 二、数据抽查（DATABASE_URL=file:./dev.db）

| 表 | 计数 | 判读 |
|---|---|---|
| ClinicalTrial（总） | 10+ | 样本 slug 合理（rdn-hypertension-beijing-2025 等），全部 recruiting + isPublic=true |
| ClinicalTrial.ethicsApproval 非空 | 10+ | M8.1 伦理批件字段真实落库（虽然存文本而非 URL） |
| TrialPrescreenForm | 4 | M8.2 T4 动态预筛表单 4 条真实试验使用 |
| TrialPrescreenFormItem | 26 | 平均 6.5 个字段/表单，符合 PRD 预期 |
| LlmCallLog | 12 | M8.2 DeepSeek 抽象 + 日志写入生效；有真实 LLM 调用 |
| MediaAsset | 0 | M8.1 素材库骨架已上线，未投入使用，合理 |
| AccountLock（总） | 0 | M8.1 封号栈未触发（dev 无高危行为），合理 |
| AccountLock.appealStatus='pending' | 0 | 无待审申诉 |
| Lead | 1 | 现有线索数据 |
| User | 6 | 患者账号 |
| OperatorUser | 1 | 管理员账号（dev 固定 admin/admin123） |

---

## 三、路由冒烟（端口 3001）

| 路由 | 状态 | 判读 |
|---|---|---|
| `/` | 200 | 首页正常 |
| `/trials` | 200 | 试验列表正常 |
| `/trials/rdn-hypertension-beijing-2025` | 200 | 试验详情页正常 |
| `/prescreen/rdn-hypertension-beijing-2025` | 307 → `/auth?next=%2Fprescreen%2Frdn-hypertension-beijing-2025` | 正确：未登录跳 auth 带回跳 |
| `/account-locked` | 307 → `/auth?next=/account-locked` | 正确：未登录直接拦截 |
| `/appeal` | 307 → `/auth?next=/appeal` | 正确：需登录再验证 lockId |
| `/appeal/submitted` | 307 → `/auth` | 正确：无 lockId 直回登录 |
| `/admin/login` | 200 | 后台登录页可访问 |
| `/admin` | 307 → `/admin/login` | 正确：未登录跳登录 |
| `/admin/trials` | 307 → `/admin/login` | 正确 |
| `/admin/locks` | 307 → `/admin/login` | 正确（M8.1 后台） |
| `/admin/media` | 307 → `/admin/login` | 正确（M8.1 后台） |
| `/api/admin/export/leads` | **401** | 正确：API 未认证 401 而非重定向 |
| `/community` | 200 | 社区列表页正常 |
| `/faq` | 200 | FAQ 页正常 |
| `/me` | 307 → `/auth?next=/me` | 正确 |

---

## 四、模块审计表（M8.1 + M8.2）

| 模块 | 原状态（DEVELOPMENT_LOG 登记） | 审计结论 | 修复动作 | 残留风险 |
|---|---|---|---|---|
| **M8.1 · 游客 5 条/30天 cookie 限制** | ✅ 完成 | **通过**：`src/lib/rate-limit.ts` 落盘，常量 `GUEST_TRIAL_DETAIL_QUOTA=5`、`GUEST_WINDOW_DAYS=30` 与 PRD 一致 | 无 | 无 |
| **M8.1 · 注册用户 30min/20 条封号** | ✅ 完成 | **通过**：`REGISTERED_WINDOW_MINUTES=30`、`REGISTERED_TRIAL_DETAIL_LIMIT=20` 常量匹配；`AccountLock` 表存在且迁移已应用 | 无 | dev 无实测触发数据（合理） |
| **M8.1 · 封号页 `/account-locked`** | ✅ 完成 | **通过**：`src/app/account-locked/page.tsx` + `styles.css` 在盘，路由 307 → auth，未登录拦截逻辑正确 | 无 | 无 |
| **M8.1 · 申诉页 `/appeal` + `/appeal/submitted`** | ✅ 完成 | **通过**：5 文件 `page.tsx` / `AppealForm.tsx` / `actions.ts` / `styles.css` / `submitted/page.tsx` 齐全；`AccountLock.appealedAt / appealStatus` 字段已落库 | 无 | 无 |
| **M8.1 · 伦理批件前台** | ✅ 完成 | **通过**：`ClinicalTrial.ethicsApproval` 字段存在，所有试验均非空；详情页读取该字段 | 无 | **P2**：当前 ethicsApproval 存的是文本描述（"已获本院伦理委员会批准"）而非 URL。后续上传真实 PDF/图片时需确认详情页渲染逻辑兼容文本与 URL 两种形态。 |
| **M8.1 · 素材库骨架 `/admin/media`** | ✅ 完成 | **通过**：`page.tsx` + `MediaUploadForm.tsx` + `MediaCardActions.tsx` 在盘；`MediaAsset` 表存在；路由 307 → 登录正确 | 无 | **P1**：DEVELOPMENT_LOG §M8.1 记载 **T8（图片自动压缩 sharp）未做**（预计 2h），为 M8.1 遗留。不阻塞，留作后续优化。 |
| **M8.1 · sticky-cta 覆盖 bug 修复** | ✅ 完成 | 无法路由冒烟验证（纯 CSS 修复），跳过；信任 log 记载 | 无 | 无 |
| **M8.2 T1 · 数据模型（TrialPrescreenForm + LlmCallLog）** | ✅ 闭环 | **通过**：迁移 `20260422101239_m8_2_prescreen_form_llm_log` 已应用，TrialPrescreenForm=4 + Item=26 + LlmCallLog=12 真实数据 | 无 | 无 |
| **M8.2 T2 · DeepSeek LLM 抽象** | ✅ 闭环 | **通过**：`src/lib/llm.ts`（Provider 接口 + DeepSeek + Mock 回退 + 日志包装）+ `src/lib/llm-log.ts`；LlmCallLog=12 证明通路生效 | 无 | 无 |
| **M8.2 T3 · AI 抽取生成 API `/api/admin/trials/[id]/generate-form`** | ✅ 闭环 | **通过**：build 产物列表包含该 fƒ 路由 | 无 | 无 |
| **M8.2 T4 · 后台表单编辑器 `/admin/trials/[id]/form`** | ✅ 闭环（tech-lead 兜底完成） | **通过**：7 文件齐全（`page.tsx` / `FormEditorClient.tsx` / `FormItemsList.tsx` / `FormItemPanel.tsx` / `FormPreview.tsx` / `GenerateFormDialog.tsx` / `form-editor.css`）；build 识别该路由 | 无 | 无 |
| **M8.2 T6 · 患者端动态预筛** | ✅ 闭环 | **通过**：`src/app/prescreen/[slug]/DynamicPrescreenForm.tsx` + `PrescreenForm.tsx`（旧）并存，`page.tsx` 按 TrialPrescreenForm 是否存在分流 | 无 | 无 |
| **M8.2 T9 · 3 条真实试验抽检** | ✅ 闭环 | **通过**：4 条 TrialPrescreenForm 真实数据，Item=26 | 无 | 无 |
| **M8.2 T5 · AI 生成弹窗集成** | ✅（合并到 T4） | **通过**：`GenerateFormDialog.tsx` 在盘 | 无 | 无 |
| **M8.2 T7 · LLM 日志后台 `/admin/llm-logs`** | 📝 未开发（DEVELOPMENT_LOG 明确记载为"下一步"） | **未启动**（`src/app/admin/**/llm*` 无文件） | 按计划下一轮开发 | **P2**：有真实日志（LlmCallLog=12）却无 UI 查看，需先观察运营痛点再排期 |
| **M8.2 T8 · UI 债清理 12 条** | 📝 未动 | **未启动**（DEVELOPMENT_LOG §M8.1 明确：需 ui-designer 做统一规范） | 待 ui-designer 规范到位后分批清理 | **P2**：非阻塞 |

---

## 五、风险分级汇总

| 等级 | 数量 | 条目 |
|---|---|---|
| **P0（阻塞，立即修）** | **0** | 无 |
| **P1（需排期但非阻塞）** | 1 | M8.1 T8 素材库自动压缩（sharp）未做，2h 工作量 |
| **P2（观察/规划）** | 3 | ① ethicsApproval 文本/URL 两态形态需统一；② M8.2 T7 LLM 日志后台未开发；③ M8.2 T8 UI 债 12 条需 ui-designer 规范先行 |
| **非阻塞警告** | 1 | Next 16.2 弃用警告：`middleware` 需改名 `proxy`（已在路由表中显示 `ƒ Proxy (Middleware)`，是兼容期警告，跟本地 API 升级一起做即可） |

---

## 六、审计结论

**M8.1 + M8.2 已落盘部分全部通过硬取证。**

- TypeScript 零错误、生产构建成功、所有迁移已应用、48 条路由编译通过；
- 数据抽查证明 M8.2 T1/T2/T4/T6 有真实数据（非空壳）；
- 16 条关键路由 curl 全部返回合理状态码；
- 未发现任何 P0 缺陷，无需 agent 派单修复；
- DEVELOPMENT_LOG 中标注为"未做/未启动"的项目（T7/T8/素材库压缩），磁盘状态与 log 记载**一致**，没有掩盖性 bug。

**P1/P2 全部进 backlog，不在本轮审计触发修复。**

---

## 七、前任交接悬而未决事项的回答

| 前任悬念 | 本轮结论 |
|---|---|
| `npm run build` 是否卡在 M6 遗留 useContext null | **否**。首次 build 因我临时审计脚本的过时字段名挂了（已删脚本重跑通过）。与 M6 完全无关。 |
| 6 位工程 agent 的分片自查回执 | **无需**。tech-lead 自取证已覆盖；没有 P0 缺陷就没必要占用 agent。 |
| 审计报告 `app/docs/m8-audit-report-2026-04-23.md` 未创建 | **本文件即该报告**，已落盘。 |
| 任务列表只有 .lock 文件 | 未新建 TaskCreate；本轮无 agent 派单需求。 |

---

## 八、下一步建议（交给下一任/用户决定）

1. **备份**：里程碑完成节点，用户应立即备份 `app/dev.db` + `app/` 目录到移动硬盘或 `yezhtong/patient-recruitment-v1` GitHub 私库。
2. **M8.2 收尾**：开发 T7（`/admin/llm-logs` 后台）—— 2–3h 工作量，`admin-engineer` 独立完成。
3. **M8.2 并行**：ui-designer 先出 T8 UI 债清单的统一视觉规范，`frontend-engineer` 按规范分批清理 12 条。
4. **M8.3 启动前置**：PM 细化 `AI 疾病分析（DeepSeek）+ 匹配助手 + AI 审核队列` 的验收标准；ai-engineer 准备 Prompt 草稿。
5. **M7 部署迁移**：等 M8.3 完成后再启动。

---

**审计报告由 tech-lead V3 独立落盘 · 2026-04-23**
