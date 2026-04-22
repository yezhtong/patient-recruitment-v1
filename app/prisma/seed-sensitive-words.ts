import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import * as fs from "fs";
import * as path from "path";

const dbUrl = process.env.DATABASE_URL ?? (process.env.NODE_ENV === "production"
  ? (() => { throw new Error("DATABASE_URL is required in production"); })()
  : "file:./dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const txtPath = path.join(__dirname, "../data/sensitive-words.txt");
  const lines = fs.readFileSync(txtPath, "utf-8").split("\n");

  let created = 0;
  let updated = 0;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split("|");
    if (parts.length !== 3) continue;
    const [riskLevel, riskType, keyword] = parts;
    if (!riskLevel || !riskType || !keyword) continue;

    const existing = await prisma.sensitiveWord.findUnique({ where: { keyword } });
    if (existing) {
      await prisma.sensitiveWord.update({
        where: { keyword },
        data: { riskLevel, riskType },
      });
      updated++;
    } else {
      await prisma.sensitiveWord.create({
        data: { keyword, riskLevel, riskType, isEnabled: true },
      });
      created++;
    }
  }

  console.info(`Sensitive words seeded: ${created} created, ${updated} updated`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
