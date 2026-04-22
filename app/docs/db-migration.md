# 数据库迁移指南（SQLite → PostgreSQL / MySQL）

## 切换流程

### 1. 切换 schema

```bash
cd app
tsx scripts/switch-db.ts postgresql   # 或 mysql
```

脚本把对应的 `prisma/schema.<provider>.prisma` 复制到 `prisma/schema.prisma`，不执行任何数据库操作。

### 2. 重新生成 Prisma Client

```bash
npx prisma generate
```

### 3. 设置环境变量

在 `.env`（本地）或服务器环境中设置：

```
# PostgreSQL
DATABASE_URL=postgresql://user:password@host:5432/jt_recruit

# MySQL
DATABASE_URL=mysql://user:password@host:3306/jt_recruit
```

### 4. 首次建库（新数据库）

```bash
npx prisma migrate dev --name init
```

### 5. 生产环境部署（已有迁移历史）

```bash
npx prisma migrate deploy
```

### 6. 导入种子数据（可选）

```bash
npx tsx prisma/seed.ts
npx tsx prisma/seed-faq.ts
npx tsx prisma/seed-community.ts
npx tsx prisma/seed-sensitive-words.ts
```

---

## 从 SQLite 迁移现有数据

### 方案一：Prisma JSON 导出（推荐，适合数据量 < 10 万行）

1. 在旧 SQLite 环境写一次性导出脚本，用 `prisma.model.findMany()` 读所有表，`JSON.stringify` 写文件
2. 切换到目标 DB，写对应 import 脚本，用 `prisma.model.createMany()` 批量写入
3. 顺序：User → ClinicalTrial → Lead → Application → CommunityGroup → CommunityPost → CommunityComment → FaqArticle → SensitiveWord → AuditLog

### 方案二：运维级 DB 迁移

适合 DBA 操作或有现成工具（如 pgloader for MySQL→PG）。步骤：

1. 用 `sqlite3 dev.db .dump > dump.sql` 导出
2. 通过 ETL 工具或手写 SQL 转换写入目标库（注意 Boolean 0/1 → true/false，DateTime 格式差异）
3. 迁移完成后运行 `npx prisma migrate deploy` 确保迁移表 `_prisma_migrations` 同步

---

## 切回 SQLite（本地开发）

```bash
tsx scripts/switch-db.ts sqlite
npx prisma generate
# DATABASE_URL 不设或设为 file:./dev.db
```

---

## schema 差异说明

| 特性 | SQLite | PostgreSQL | MySQL |
|------|--------|-----------|-------|
| 长文本标注 | 无需（TEXT 默认） | `@db.Text` | `@db.Text` / `@db.LongText` |
| Boolean 存储 | INTEGER 0/1 | BOOLEAN | TINYINT(1) |
| cuid() | 字符串 | 字符串 | 字符串 |
| Cascade 删除 | 支持（需开 FK pragma） | 支持 | 支持（InnoDB） |

已加 `@db.Text` / `@db.LongText` 的字段（在 schema.postgresql.prisma / schema.mysql.prisma 中）：

- `ClinicalTrial`: description, inclusionBrief, exclusionBrief, studyDesign, benefits, followUpPlan, summary(mysql)
- `Lead`: projectAnswers, note
- `CommunityPost`: content
- `CommunityComment`: content
- `CommunitySensitiveHit`: snippet
- `CommunityModerationLog`: reason
- `AuditLog`: summary, detailJson
- `CommunityGroup`: introduction
- `SensitiveWord`: note
- `FaqArticle`: answer
- `Application`: note
