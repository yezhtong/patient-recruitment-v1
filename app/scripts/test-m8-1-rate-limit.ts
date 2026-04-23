/**
 * M8.1 · 反爬 / 封锁逻辑 E2E 抽检脚本（自测）
 *
 * 运行：
 *   cd app && DATABASE_URL="file:./dev.db" npx tsx scripts/test-m8-1-rate-limit.ts
 *
 * 做的事：
 * 1. 造一个测试用户 phone=13800000001（已存在则复用）
 * 2. 清掉该用户现有的 AccountLock 和近 30 min 的 behavior log
 * 3. 拉出 DB 里前 25 条试验
 * 4. 逐条调用反爬检查 + 写 behavior log 模拟"30 min 内看 N 条"
 * 5. 验证第 20 条时触发封锁
 */

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";
import {
  shouldLockUserForTrialViews,
} from "../src/lib/rate-limit";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1) 造/取测试用户
  const user = await prisma.user.upsert({
    where: { phone: "13800000001" },
    create: {
      phone: "13800000001",
      displayName: "M8.1 测试用户",
    },
    update: {},
  });
  console.log(`[setup] testUser.id=${user.id} phone=${user.phone}`);

  // 2) 清理现有锁 + 近 30min log
  await prisma.accountLock.deleteMany({ where: { userId: user.id } });
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  const purged = await prisma.userBehaviorLog.deleteMany({
    where: { userId: user.id, createdAt: { gte: thirtyMinAgo } },
  });
  console.log(`[setup] purged ${purged.count} behavior logs (last 30 min)`);

  // 3) 取 25 条试验
  const trials = await prisma.clinicalTrial.findMany({
    where: { isPublic: true, status: "recruiting" },
    take: 25,
    orderBy: { createdAt: "asc" },
  });
  console.log(`[setup] found ${trials.length} trials`);
  if (trials.length < 22) {
    console.error(`[fail] 至少需要 22 条试验，当前只有 ${trials.length} 条，无法跑抽检`);
    process.exit(1);
  }

  // 4) 逐条写 log + 查 shouldLock
  let triggeredAt = -1;
  for (let i = 0; i < 22; i++) {
    const t = trials[i];
    await prisma.userBehaviorLog.create({
      data: {
        userId: user.id,
        action: "trial_detail_view",
        targetType: "ClinicalTrial",
        targetId: t.id,
      },
    });
    const { shouldLock, distinctCount } = await shouldLockUserForTrialViews(user.id);
    console.log(
      `  [${String(i + 1).padStart(2)}] view ${t.slug.slice(0, 30)} · distinct=${distinctCount} · shouldLock=${shouldLock}`,
    );
    if (shouldLock && triggeredAt < 0) {
      triggeredAt = i + 1;
      console.log(`  >>> 触发封锁：第 ${triggeredAt} 条`);
      break;
    }
  }

  // 5) 验证
  if (triggeredAt !== 20) {
    console.error(`[fail] 预期在第 20 条触发封锁，实际在第 ${triggeredAt} 条`);
    process.exit(2);
  }
  console.log("[ok] 反爬阈值 20 条/30min 验证通过");

  // 清理（防止影响人工测试）
  await prisma.userBehaviorLog.deleteMany({ where: { userId: user.id } });
  console.log("[cleanup] 已清理测试数据");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("[done] M8.1 反爬抽检通过");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(3);
  });
