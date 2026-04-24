import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const aiUser = await prisma.user.upsert({
    where: { phone: "__system_ai__" },
    update: {
      displayName: "九泰 AI 助理",
      role: "ai",
      isSystemAi: true,
    },
    create: {
      phone: "__system_ai__",
      displayName: "九泰 AI 助理",
      role: "ai",
      isSystemAi: true,
    },
  });
  console.log("AI user:", aiUser.id, aiUser.displayName, aiUser.role, aiUser.isSystemAi);

  const welcome = await prisma.aiAccountTemplate.upsert({
    where: { scenario: "new_user_welcome" },
    update: {
      triggerRule: JSON.stringify({ when: "first_group_visit" }),
      contentTemplate:
        "欢迎 {{nickname}} 加入 {{groupName}}！在这里分享你的就医经历和疑问，大家都会提供参考。如有医疗相关决策，请务必咨询专业医师。",
      isEnabled: true,
    },
    create: {
      scenario: "new_user_welcome",
      triggerRule: JSON.stringify({ when: "first_group_visit" }),
      contentTemplate:
        "欢迎 {{nickname}} 加入 {{groupName}}！在这里分享你的就医经历和疑问，大家都会提供参考。如有医疗相关决策，请务必咨询专业医师。",
      isEnabled: true,
    },
  });
  console.log("Template upserted:", welcome.scenario);

  const faq = await prisma.aiAccountTemplate.upsert({
    where: { scenario: "faq_post_trigger" },
    update: {
      triggerRule: JSON.stringify({
        when: "post_keywords",
        keywords: ["怎么报名", "多久回复", "能参加吗"],
      }),
      contentTemplate:
        "你好！关于这个问题，可以查看 FAQ：https://九泰临研/faq。如需进一步帮助，请联系客服 400-xxx-xxxx。AI 回复不构成医疗建议。",
      isEnabled: true,
    },
    create: {
      scenario: "faq_post_trigger",
      triggerRule: JSON.stringify({
        when: "post_keywords",
        keywords: ["怎么报名", "多久回复", "能参加吗"],
      }),
      contentTemplate:
        "你好！关于这个问题，可以查看 FAQ：https://九泰临研/faq。如需进一步帮助，请联系客服 400-xxx-xxxx。AI 回复不构成医疗建议。",
      isEnabled: true,
    },
  });
  console.log("Template upserted:", faq.scenario);

  const all = await prisma.aiAccountTemplate.findMany({ select: { scenario: true } });
  console.log("All templates:", all.map((t) => t.scenario));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
