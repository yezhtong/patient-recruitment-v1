/**
 * M8.2 T3 · AI 预筛表单生成 · E2E 抽检
 *
 * 运行：
 *   cd app && DATABASE_URL="file:./dev.db" npx tsx scripts/test-m8-2-generate-form.ts
 *
 * 做的事：
 * 1. 对 3 条真实试验原文，各调 DeepSeek 抽字段
 * 2. 解析 JSON，统计字段数 + 必含字段命中率（年龄/性别/城市）
 * 3. 打印每份返回的字段清单，方便人工抽检 ≥ 80% 准确率
 * 4. 不动 DB（只走 callWithLogging，不 upsert form）
 */

import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
import path from "node:path";
import fs from "node:fs";
const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) {
  dotenvConfig({ path: envLocal, override: true });
}

import { callWithLogging } from "../src/lib/llm-log";
import { prisma } from "../src/lib/prisma";

const SYSTEM_PROMPT = `你是临床试验预筛表单抽取专家。我会给你一条试验的招募广告原文。请抽取出筛选患者所需要的预筛问题，输出**严格**的 JSON 数组（不要包 markdown 代码块，不要前后加任何解释）。

每项必须包含：
- fieldKey：英文 snake_case，如 "age" / "gender" / "diagnosis_confirmed"
- label：中文问题（如"你的年龄"）
- fieldType：single / multi / text / textarea / number / date / agree 之一
- options：如果是 single 或 multi，必须给出 [{value, label}] 数组
- isRequired：布尔，默认 true
- helpText：可选的辅助说明

规则：
1. 只抽取与入排标准直接相关的问题（年龄、性别、诊断、病程、既往治疗、并发症、过敏史、所在城市等）
2. 忽略联系方式（姓名、手机）和知情同意
3. 字段顺序：年龄 → 性别 → 诊断/病情 → 既往治疗 → 排除项 → 所在城市
4. 最多 10 个字段

输出示例（原样返回 JSON 数组）：
[{"fieldKey":"age","label":"你的年龄","fieldType":"number","isRequired":true}]`;

const CASES = [
  {
    title: "注射用丝素蛋白凝胶纠正额头纹招募",
    adText: `
一、项目名称：注射用丝素蛋白凝胶用于纠正额部动力性皱纹（额头纹）的有效性和安全性前瞻性、多中心、随机、平行对照、评估者设盲、非劣效性临床试验

二、申办方：维纳丝医疗科技（苏州）有限公司

三、招募对象入选标准：
1. 年龄 ≥ 18 周岁，性别不限
2. 经研究者现场评估额头纹 WSRS 严重程度评分为中度或重度（3 级或 4 级）
3. 自愿参加并签署书面知情同意书

四、排除标准：
1. 6 个月内做过肉毒素注射
2. 妊娠或哺乳期女性
3. 对试验产品成分过敏

五、站点：广州市番禺区（具体医院待定）
`,
    requiredKeywords: ["年龄", "性别"],
  },
  {
    title: "医用电子直线加速器 HK-X601A 肿瘤放疗临床试验",
    adText: `
试验名：评价医用电子直线加速器（HK-X601A）用于肿瘤放射治疗的安全性和有效性临床试验

入选标准：
1. 细胞/组织病理学确诊或影像学证据临床诊断为颅内、头颈、胸、腹、脊柱、盆腔、四肢恶性实体肿瘤
2. 至少 1 个 RECIST1.1 定义的可测量病灶
3. 年龄 ≥ 18 且 ≤ 80 周岁，性别不限
4. 预期生存时间 ≥ 6 个月
5. 入组前 30 天内，靶病灶未接受介入或消融治疗
6. 入组前未接受化疗/靶向/免疫治疗，或相关治疗间隔 ≥ 30 天
7. ECOG 全身状况评分 ≤ 2 分
8. 术后入组需与手术间隔 ≥ 2 周
9. 自愿签署知情同意书

站点：甘肃省武威肿瘤医院肿瘤科
`,
    requiredKeywords: ["年龄", "肿瘤"],
  },
  {
    title: "射频消融治疗难治性高血压合并慢性肾病招募",
    adText: `
一、项目：北京安贞医院难治性高血压合并慢性肾病肾动脉交感神经射频消融术（RDN）临床试验

二、招募条件：
1. 年龄 18-75 岁，性别不限
2. 诊室收缩压 ≥ 140 mmHg（服用 3 种及以上不同类降压药，其中包括一种利尿剂，剂量充足、规律服用 ≥ 4 周仍控制不佳）
3. 已排除继发性高血压
4. 肾小球滤过率（eGFR）≥ 45 mL/min/1.73m²
5. 自愿签署知情同意书
6. 计划招募 30 名受试者

三、排除：
1. 妊娠或哺乳期
2. 1 年内发生过急性心肌梗死、脑卒中
3. 严重心衰（NYHA III-IV 级）
4. 肾动脉解剖不符合手术条件

四、联系：王老师 / 周医生 · 010-64456000
`,
    requiredKeywords: ["年龄", "血压"],
  },
];

function extractJsonArray(text: string): unknown[] | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)```/);
  const candidate = fenced ? fenced[1] : text;
  const firstBracket = candidate.indexOf("[");
  const lastBracket = candidate.lastIndexOf("]");
  if (firstBracket < 0 || lastBracket <= firstBracket) return null;
  try {
    const parsed = JSON.parse(candidate.slice(firstBracket, lastBracket + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

interface ItemLike {
  fieldKey?: string;
  label?: string;
  fieldType?: string;
}

async function main() {
  console.log("=== M8.2 T3 · AI 预筛字段抽取 · 3 条真实试验 ===\n");

  let totalPass = 0;
  for (const c of CASES) {
    console.log(`\n>>> ${c.title}`);
    console.log(`    广告长度 ${c.adText.trim().length} 字`);

    let result;
    try {
      result = await callWithLogging({
        scenario: "prescreen_generate_e2e",
        input: {
          system: SYSTEM_PROMPT,
          user: `试验名：${c.title}\n\n招募广告原文：\n${c.adText}`,
          maxTokens: 2048,
          temperature: 0.2,
        },
      });
    } catch (err) {
      console.error("    [fail] LLM 调用异常:", err instanceof Error ? err.message : err);
      continue;
    }

    const rawArray = extractJsonArray(result.output.text);
    if (!rawArray) {
      console.error("    [fail] JSON 解析失败");
      console.log("    原文前 300 字:", result.output.text.slice(0, 300));
      continue;
    }

    const items = rawArray as ItemLike[];
    console.log(`    ✓ 返回 ${items.length} 个字段 · ${result.durationMs}ms · ¥${result.costCny}`);

    // 输出字段清单
    items.forEach((it, i) => {
      console.log(
        `      [${String(i + 1).padStart(2)}] ${it.fieldKey ?? "?"} (${it.fieldType ?? "?"}) · ${it.label ?? "?"}`,
      );
    });

    // 关键词命中率（简单粗暴抽检：必含关键词是否出现在任一 label 中）
    const labels = items.map((it) => it.label ?? "").join("|");
    const hits = c.requiredKeywords.filter((kw) => labels.includes(kw));
    const recall = `${hits.length}/${c.requiredKeywords.length}`;
    const ok = hits.length === c.requiredKeywords.length;
    console.log(`    关键词召回: ${recall} (${ok ? "✓" : "⚠"} ${hits.join(",")})`);

    if (ok && items.length >= 3) totalPass++;
  }

  console.log(`\n=== 总结 ===`);
  console.log(`通过 ${totalPass}/${CASES.length} 条试验（PRD 目标 ≥ 80% = 3/3）`);
  if (totalPass >= Math.ceil(CASES.length * 0.8)) {
    console.log("[ok] M8.2 T3 AI 预筛抽检 PASS");
  } else {
    console.log("[warn] 抽检未达 80%，可能需调 prompt 或换 reasoner 模型");
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
