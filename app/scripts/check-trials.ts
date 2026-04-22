import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  const all = await prisma.clinicalTrial.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      slug: true,
      title: true,
      disease: true,
      city: true,
      phase: true,
      isFeatured: true,
    },
  });

  console.log("试验总数:", all.length);
  console.log("精选数  :", all.filter((t) => t.isFeatured).length);
  console.log();
  for (const t of all) {
    console.log(
      `- [${t.isFeatured ? "★" : " "}] ${t.city}/${t.phase ?? "-"}/${t.disease} — ${t.title}  (${t.slug})`,
    );
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
