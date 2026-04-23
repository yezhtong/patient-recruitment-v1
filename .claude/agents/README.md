# patient-recruitment-v1 团队启动手册

本目录定义了 **9 个团队 agent + 1 个通用评审 agent**，服务 `patient-recruitment-v1` 团队。
当前目标：推进 M8 产品优化轮（M8.1 ✅ / M8.2 🏗️ / M8.3 📝），收尾后接 M7 部署迁移。

## 团队结构

| Agent | 职责 | 主用里程碑 | 模型 |
|---|---|---|---|
| `tech-lead` | 拆任务、分派、验收、更新 DEVELOPMENT_LOG.md、必要时兜底 | 全程 | opus |
| `product-manager` | PRD 细化、需求澄清、产品验收、用户流程/文案 | 全程 | opus |
| `ui-designer` | 设计系统、页面视觉规范、组件规格、设计侧验收 | 全程 | opus |
| `ai-engineer` | DeepSeek/LLM provider、Prompt、LlmCallLog、AI 预筛/疾病匹配/审核 | **M8 起** | sonnet |
| `backend-engineer` | Prisma schema、Server Actions、鉴权、短信抽象、敏感词、LlmCallLog 写入 | 全程 | sonnet |
| `frontend-engineer` | 患者端页面、动态预筛、申诉、伦理批件前台、SEO | 全程 | sonnet |
| `admin-engineer` | /admin 所有页面（CRUD、审核、KPI、表单管理器、LLM 日志、AI 审核） | 全程 | sonnet |
| `qa-engineer` | tsc/build/curl/浏览器验收、冒烟清单 | 全程 | sonnet |
| `devops-engineer` | Docker、DB 切换、部署脚本 | 仅 M7 | sonnet |
| `code-reviewer` | 通用大步骤完成后评审（非团队成员，按需手动 spawn） | 按需 | inherit |

## 三层验收（顺序不可乱）
1. `qa-engineer`：技术硬门槛（tsc / build / curl / 字段抽查）
2. `ui-designer`：视觉与交互规范对齐
3. `product-manager`：产品验收（用户场景、PRD 逐条对照）

三关全过才允许 tech-lead 更新 DEVELOPMENT_LOG.md。**涉及 LLM 的任务**在 qa 前多一道 ai-engineer 自测样本（`app/docs/ai/<task>-samples.md`），由 product-manager 抽验语义质量。

## 一键启动

在 Claude Code 里对主 session 说：

> 激活 `patient-recruitment-v1` 团队开始干活。读 `DEVELOPMENT_LOG.md` 定位到当前里程碑（M8.2 进行中），拆任务后 spawn 队友，分派任务后进入协调模式。

主 session 会：
1. `Agent(team_name="patient-recruitment-v1", name="tech-lead", subagent_type="tech-lead", ...)` spawn 团队负责人
2. tech-lead 先 spawn `product-manager` + `ui-designer`（产品与设计先行），再 spawn `ai-engineer` + 其余 5 位工程/QA 角色
3. 所有 agent 通过 TaskList 协作，完成后自动 idle

## 人工介入点（仅这些需要用户决策）

- **M8.2**：DeepSeek API key 注入 `.env`、LLM 成本上限、Prompt 合规口径首轮确认
- **M8.3**：病种分区保留名单与"匹配助手"推荐文案口径、AI 审核拦截文案
- **M7 前**：
  - 选 PostgreSQL 还是 MySQL（推荐 PostgreSQL）
  - 提供公司服务器 IP、SSH 凭证、端口规划
- **任何里程碑完成**：用户浏览器 Ctrl+F5 验收视觉 + 手动备份 `dev.db` 与 `app/`

## 手动停止

想中途停：在主 session 里说"暂停团队"，tech-lead 会发 `{type: "shutdown_request"}` 给所有队友，然后自己停。

## 恢复

下次 `claude` 进来说"继续 patient-recruitment-v1 团队工作"，tech-lead 重新 spawn，读 TaskList 续跑。

## 配置文件位置

- 团队配置：`~/.claude/teams/patient-recruitment-v1/config.json`
- 任务列表：`~/.claude/tasks/patient-recruitment-v1/`
- Agent 定义：本目录（项目级，会优先于 `~/.claude/agents/`）
