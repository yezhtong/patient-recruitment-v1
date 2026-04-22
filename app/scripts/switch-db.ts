import * as fs from "fs";
import * as path from "path";

const PROVIDERS = ["sqlite", "postgresql", "mysql"] as const;
type Provider = (typeof PROVIDERS)[number];

const arg = process.argv[2] as Provider | undefined;

if (!arg || !PROVIDERS.includes(arg)) {
  console.error(`用法: tsx scripts/switch-db.ts <${PROVIDERS.join("|")}>`);
  process.exit(1);
}

const root = path.resolve(__dirname, "..");
const dest = path.join(root, "prisma", "schema.prisma");

const sourceMap: Record<Provider, string> = {
  sqlite: path.join(root, "prisma", "schema.sqlite.prisma"),
  postgresql: path.join(root, "prisma", "schema.postgresql.prisma"),
  mysql: path.join(root, "prisma", "schema.mysql.prisma"),
};

const src = sourceMap[arg];

if (!fs.existsSync(src)) {
  // sqlite 没有单独的 schema.sqlite.prisma，直接跳过（schema.prisma 本身就是 sqlite 版）
  if (arg === "sqlite") {
    console.log("SQLite 是默认 schema，schema.prisma 已是 SQLite 版，无需替换。");
    console.log("\n下一步:");
    console.log("  npx prisma generate");
    console.log("  DATABASE_URL=file:./dev.db  （dev 环境默认）");
    process.exit(0);
  }
  console.error(`找不到源文件: ${src}`);
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log(`已切换到 ${arg}，schema.prisma 已更新。`);
console.log("\n下一步:");
console.log("  1. npx prisma generate");
console.log(`  2. 确认 DATABASE_URL 已设置为 ${arg} 连接串`);
console.log("  3. npx prisma migrate deploy  （生产）");
console.log("     或 npx prisma migrate dev --name init  （首次建库）");
console.log("\n注意：切换不会自动执行 migrate，请手动确认后执行，避免误操作数据库。");
