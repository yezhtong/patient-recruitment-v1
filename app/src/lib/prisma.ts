import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DATABASE_URL is required in production. Set it in your environment.");
    }
    return "file:./dev.db";
  }
  return url;
}

function isSqliteUrl(url: string): boolean {
  return url.startsWith("file:") || url.startsWith("./") || !url.includes("://");
}

function createPrismaClient(): PrismaClient {
  const url = getDatabaseUrl();

  if (isSqliteUrl(url)) {
    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({ adapter });
  }

  // PostgreSQL 或 MySQL：需要安装对应 Prisma Driver Adapter 后在此处传入。
  // PG:    npm install @prisma/adapter-pg pg
  // MySQL: npm install @prisma/adapter-mysql2 mysql2
  // 参见 app/docs/db-migration.md。当前 M7 阶段依赖未安装，fail fast 提示运维。
  throw new Error(
    `Non-SQLite DATABASE_URL detected (${url.split("://")[0]}://...). ` +
    "Install the corresponding Prisma Driver Adapter. See app/docs/db-migration.md."
  );
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
