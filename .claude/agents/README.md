# patient-recruitment-v1 团队启动手册

本目录定义了 8 个自定义 agent，服务 `patient-recruitment-v1` 团队，目标是**无人工辅助完成 M2–M7**。

## 团队结构

| Agent | 职责 | 主用里程碑 | 模型 |
|---|---|---|---|
| `tech-lead` | 拆任务、分派、验收、更新 DEVELOPMENT_LOG.md | 全程 | opus |
| `product-manager` | PRD 细化、需求澄清、产品验收、用户流程/文案 | 全程 | opus |
| `ui-designer` | 设计系统、页面视觉规范、组件规格、设计侧验收 | 全程 | opus |
| `backend-engineer` | Prisma schema、Server Actions、鉴权、短信抽象 | M2/M3/M5/M6 | sonnet |
| `frontend-engineer` | 患者端 9 页 + SEO + FAQ | M2/M3/M4 | sonnet |
| `admin-engineer` | /admin 后台全部 CRUD、审核、KPI | M2/M5/M6 | sonnet |
| `qa-engineer` | tsc/build/curl/浏览器验收、冒烟清单 | 全程 | sonnet |
| `devops-engineer` | Docker、DB 切换、部署脚本 | 仅 M7 | sonnet |

## 三层验收（顺序不可乱）
1. `qa-engineer`：技术硬门槛（tsc/build/curl/字段）
2. `ui-designer`：视觉与交互规范对齐
3. `product-manager`：产品验收（用户场景、PRD 逐条对照）
三关全过才允许 tech-lead 更新 DEVELOPMENT_LOG.md。

## 一键启动

在 Claude Code 里对主 session 说：

> 激活 `patient-recruitment-v1` 团队开始干活。读 `DEVELOPMENT_LOG.md` 定位到下一个里程碑，拆任务后 spawn 7 名队友（product-manager、ui-designer、backend-engineer、frontend-engineer、admin-engineer、qa-engineer、devops-engineer），分派任务后进入协调模式。

主 session 会：
1. `Agent(team_name="patient-recruitment-v1", name="tech-lead", subagent_type="tech-lead", ...)` spawn 团队负责人
2. tech-lead 先 spawn `product-manager` 与 `ui-designer`（产品与设计先行），再 spawn 其余 5 位工程/QA 角色；每位用 `name` = 角色名，`subagent_type` = 角色名
3. 所有 agent 通过 TaskList 协作，完成后自动 idle

## 人工介入点（仅这些需要用户决策）

- **M3 前**：确认短信开发阶段继续用固定码 123456（已在 memory 记录）
- **M5 前**：提供敏感词库与社区规约（tech-lead 会主动 SendMessage 问你）
- **M7 前**：
  - 选 PostgreSQL 还是 MySQL（推荐 PostgreSQL）
  - 提供公司服务器 IP、SSH 凭证、端口规划
- **任何里程碑完成**：用户浏览器 Ctrl+F5 验收视觉

## 手动停止

想中途停：在主 session 里说"暂停团队"，tech-lead 会发 `{type: "shutdown_request"}` 给所有队友，然后自己停。

## 恢复

下次 `claude` 进来说"继续 patient-recruitment-v1 团队工作"，tech-lead 重新 spawn，读 TaskList 续跑。

## 配置文件位置

- 团队配置：`~/.claude/teams/patient-recruitment-v1/config.json`
- 任务列表：`~/.claude/tasks/patient-recruitment-v1/`
- Agent 定义：本目录（项目级，会优先于 `~/.claude/agents/`）
