import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

type FaqSeed = {
  slug: string;
  question: string;
  answer: string;
  category:
    | "general"
    | "trial-process"
    | "safety"
    | "privacy"
    | "costs"
    | "withdraw"
    | "enrollment";
  order: number;
};

const FAQS: FaqSeed[] = [
  {
    slug: "what-is-clinical-trial",
    question: "临床试验到底是什么？",
    answer:
      "临床试验是在正式上市前评估一种新药物、新器械或新治疗方法的「安全性」和「有效性」的科学研究。所有试验都必须先经过国家药监局批准、再经过各家医院伦理委员会审查，才能开始招募患者。研究方案里会详细写明：用什么药、怎么给药、访视几次、观察什么指标、出现不良反应时怎么处理。",
    category: "general",
    order: 10,
  },
  {
    slug: "not-a-guinea-pig",
    question: "参加试验是不是会「当小白鼠」？",
    answer:
      "不会。能到患者招募阶段的药物或器械，都已经在实验室、动物实验和小规模人体安全性研究（I 期）中通过了关键安全节点。II/III 期的主要目标是在更大样本里确认疗效与长期安全性。你参与的研究早已不是「从 0 开始」的冒险，而是整个研发流程里非常后期的环节。",
    category: "safety",
    order: 20,
  },
  {
    slug: "how-safety-is-monitored",
    question: "参加试验时的安全怎么监控？",
    answer:
      "研究中心会按方案定期做抽血、影像、心电等检查，任何不良反应都会被记录、评估、上报。研究方会提供专人 24 小时联系方式。重大不良事件必须在 24 小时内上报伦理委员会和药监局。你任何时候感到不适，都可以第一时间联系研究医生或本平台运营。",
    category: "safety",
    order: 21,
  },
  {
    slug: "is-it-free",
    question: "参加试验要自己花钱吗？",
    answer:
      "研究用药或器械、研究规定的检查检验、研究规定的随访通常都是免费的，由项目方承担。部分中心还提供交通补助或误工补贴。但与研究无关的其他疾病治疗（例如你原本的慢病用药）仍需要按常规渠道报销。具体费用说明会在知情同意书中写清楚。",
    category: "costs",
    order: 30,
  },
  {
    slug: "will-it-affect-medical-insurance",
    question: "参加试验会影响我以后的医保报销吗？",
    answer:
      "一般不会。临床试验期间与研究相关的费用由申办方承担，不走医保；研究结束后，你继续用医保看其他疾病的流程和原来一样。如果你正在享受特殊慢病补贴，建议在入组前咨询项目运营，确保没有冲突。",
    category: "costs",
    order: 31,
  },
  {
    slug: "how-my-privacy-is-protected",
    question: "我的个人信息会被怎么用？会不会泄露？",
    answer:
      "你的姓名、手机号、身份证号仅用于平台运营与研究中心之间的沟通与核对。提交到研究数据库的信息会经过「脱敏」处理（常见的做法是只保留首字母加上研究编号）。本平台的线索池对外不开放，仅平台运营账号可访问。签署知情同意书时，你可以主动询问数据收集范围与保存期限。",
    category: "privacy",
    order: 40,
  },
  {
    slug: "who-sees-my-data",
    question: "后台能看到我的手机号的有哪些人？",
    answer:
      "只有两类人能看到你的完整手机号：本平台的运营人员、你选择的研究中心对接医生。平台列表页做了脱敏显示（138****0000），详情页才显示完整号码，并且所有查看操作都会在后台留下审计日志。",
    category: "privacy",
    order: 41,
  },
  {
    slug: "can-i-withdraw",
    question: "入组了以后还可以退出吗？",
    answer:
      "完全可以。你在任何阶段都有权利申请退出，不需要给出理由，也不会影响你在该医院继续就诊。退出后研究方只保留已经收集的部分数据用于分析，不会再联系你。这也是受试者最核心的权利之一，会在知情同意书里单独写明。",
    category: "withdraw",
    order: 50,
  },
  {
    slug: "side-effects",
    question: "新药 / 新器械会有副作用吗？",
    answer:
      "所有干预措施都有可能产生不良反应，研究方会在知情同意书里把已知的常见副作用、发生比例、严重程度、应对处理全部列出。研究期间一旦出现副作用，医生会立即评估并给出处置方案；与研究相关的治疗费用由研究方承担。你可以在签同意书之前仔细读这一节，并且可以把纸质版带回家给家人看。",
    category: "safety",
    order: 22,
  },
  {
    slug: "trial-duration",
    question: "整个试验要持续多久？",
    answer:
      "不同试验差别很大，从 2 个月到 36 个月都有可能。预筛表单上一般会给出大致的观察期与随访节奏；详情页的「随访安排」模块（如果有）会列出具体时间点，例如「术后 1、3、6、12 个月各回院一次」。",
    category: "trial-process",
    order: 60,
  },
  {
    slug: "how-to-enroll",
    question: "从提交预筛到正式入组要经过哪些步骤？",
    answer:
      "主要分 4 步：① 在线提交预筛表单（大约 2 分钟）；② 运营在 24 小时内电话或微信联系你，核对基础信息；③ 预筛通过后你到指定研究中心面诊，由研究医生进行更详细的检查；④ 所有检查符合方案要求后签署知情同意书，正式入组。",
    category: "enrollment",
    order: 70,
  },
  {
    slug: "what-is-informed-consent",
    question: "知情同意书都要签些什么？",
    answer:
      "知情同意书是临床试验里最重要的法律和伦理文件。它会用通俗语言告诉你：试验的目的与方案、你要配合做什么、可能的获益与风险、你可以随时退出、你的数据如何被使用、出问题时的补偿方式。签署前你可以把文件带回家看，可以带家属一起看，可以问研究医生任何问题——这个过程不会被催促。",
    category: "trial-process",
    order: 61,
  },
  {
    slug: "what-if-i-dont-pass-prescreen",
    question: "预筛没通过怎么办？",
    answer:
      "不用气馁。预筛没通过只是说明你的情况不完全匹配这一项研究的入选标准，并不代表你的病情本身有问题。我们会在后台为你保留基本资料（前提是你勾选了「同意资料复用」），只要有其他合适的项目开始招募，运营会第一时间联系你。",
    category: "enrollment",
    order: 71,
  },
  {
    slug: "need-bring-what-to-hospital",
    question: "去研究中心面诊需要带什么？",
    answer:
      "通常需要：身份证、既往病历（近 1 年内的相关检查报告、出院小结），以及你正在服用的药物清单。建议提前空腹，很多初筛化验需要空腹血糖或肝肾功能结果。具体清单运营人员会在面诊前电话告知。",
    category: "enrollment",
    order: 72,
  },
  {
    slug: "can-family-accompany",
    question: "家属可以陪我一起吗？",
    answer:
      "非常鼓励家属陪同。尤其是第一次面诊与签署知情同意书时，建议有家人一起听医生讲解，帮你一起做决定。研究中心不会以「独自到场」为条件拒绝入组。",
    category: "enrollment",
    order: 73,
  },
  {
    slug: "what-is-phase-iii",
    question: "试验的「III 期」是什么意思？",
    answer:
      "临床试验一般分 4 期：I 期主要评估安全性和剂量，通常在健康志愿者或少量患者中做；II 期在小规模患者中评估初步疗效；III 期在较大规模患者中确认疗效并与现有治疗对照，这一期的规模与正式上市最接近；IV 期是药物上市之后的长期观察。",
    category: "trial-process",
    order: 62,
  },
  {
    slug: "can-i-choose-center",
    question: "我可以选择去哪个研究中心面诊吗？",
    answer:
      "大部分多中心研究允许你选择就近的合作医院。预筛表单里会让你勾选期望就诊的城市或中心，运营会根据你的选择优先分配。如果你的理想中心没出现在列表里，可以联系运营说明偏好。",
    category: "enrollment",
    order: 74,
  },
  {
    slug: "what-if-emergency-during-trial",
    question: "试验期间突发不适，打哪里？",
    answer:
      "在知情同意书的首页通常会有一个「24 小时研究联系电话」，是你在试验期间任何时候都可以拨打的；如果属于急诊（例如胸痛、意识障碍），请先拨 120 到最近医院，并告诉接诊医生你正在参加某项临床试验、在用研究用药或器械。",
    category: "safety",
    order: 23,
  },
  {
    slug: "who-runs-this-platform",
    question: "九泰临研是谁运营的？",
    answer:
      "九泰临研是九泰药械（一家医疗器械 CRO 企业）旗下的患者招募平台。平台只承担受试者与研究中心之间的沟通与资料对接，不直接进行任何医疗处置。所有招募项目都来自已通过国家药监局批准并获得伦理审批的正式研究。",
    category: "general",
    order: 11,
  },
  {
    slug: "how-to-contact-us",
    question: "还有别的问题怎么找你们？",
    answer:
      "可以在平台上点击右上角「联系我们」填留言表单，或直接打客服专线 400-888-1688（工作日 9:00 到 18:00，周末值班）。你在任何一个试验详情页也能看到该项目直接对接的运营联系人电话。",
    category: "general",
    order: 12,
  },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("DATABASE_URL is required in production"); })()
    : "file:./dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  for (const f of FAQS) {
    await prisma.faqArticle.upsert({
      where: { slug: f.slug },
      update: {
        question: f.question,
        answer: f.answer,
        category: f.category,
        order: f.order,
        isPublished: true,
      },
      create: {
        slug: f.slug,
        question: f.question,
        answer: f.answer,
        category: f.category,
        order: f.order,
        isPublished: true,
      },
    });
  }

  const count = await prisma.faqArticle.count();
  console.log(`[seed-faq] FAQ total: ${count}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
