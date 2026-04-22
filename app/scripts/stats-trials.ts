import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  const all = await prisma.clinicalTrial.findMany({
    where: { isPublic: true },
    select: { disease: true, city: true, status: true, phase: true },
  });

  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  const disease = new Map<string, number>();
  const city = new Map<string, number>();
  const status = new Map<string, number>();
  const phase = new Map<string, number>();

  for (const t of all) {
    bump(disease, t.disease);
    bump(city, t.city);
    bump(status, t.status);
    bump(phase, t.phase ?? "(无)");
  }

  const print = (label: string, m: Map<string, number>) => {
    console.log(`\n### ${label}（${m.size} 种，共 ${all.length} 条）`);
    [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([k, v]) => console.log(`  ${v.toString().padStart(3)}  ${k}`));
  };

  print("disease", disease);
  print("city", city);
  print("status", status);
  print("phase", phase);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
