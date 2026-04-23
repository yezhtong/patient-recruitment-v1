import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * M8.2 · seed 3 条真实试验的预筛表单
 *
 * 运行：
 *   cd app && DATABASE_URL="file:./dev.db" npx tsx prisma/seed-prescreen-forms.ts
 *
 * 数据来源：`真实招募项目/parsed-trials.md` 里的入排标准
 */

interface ItemSeed {
  fieldKey: string;
  label: string;
  helpText?: string;
  fieldType: "single" | "multi" | "text" | "textarea" | "number" | "date" | "agree";
  options?: { value: string; label: string }[];
  placeholder?: string;
  isRequired?: boolean;
  minValue?: number;
  maxValue?: number;
  showWhen?: { fieldKey: string; op: "eq" | "neq" | "in" | "notIn"; value: string | string[] };
}

interface FormSeed {
  trialSlug: string;
  title: string;
  description?: string;
  successMessage?: string;
  generatedBy: string;
  items: ItemSeed[];
}

const FORMS: FormSeed[] = [
  // 试验 1 · 注射用丝素蛋白凝胶（额头纹）
  {
    trialSlug: "silk-forehead-wrinkle-2025",
    title: "额头纹注射治疗预筛问卷",
    description: "请如实填写，运营会在 24 小时内电话联系你。",
    successMessage: "已收到，运营会尽快联系你。",
    generatedBy: "human",
    items: [
      {
        fieldKey: "age",
        label: "你的年龄",
        helpText: "请填写 18-80 之间的整数",
        fieldType: "number",
        isRequired: true,
        minValue: 18,
        maxValue: 80,
      },
      {
        fieldKey: "gender",
        label: "你的生理性别",
        fieldType: "single",
        isRequired: true,
        options: [
          { value: "female", label: "女" },
          { value: "male", label: "男" },
        ],
      },
      {
        fieldKey: "wsrs_grade",
        label: "额头纹严重程度（WSRS 评分）",
        helpText: '如果不清楚，可以填入"不确定"；运营会进一步评估',
        fieldType: "single",
        isRequired: true,
        options: [
          { value: "grade3", label: "3 级（中度）" },
          { value: "grade4", label: "4 级（重度）" },
          { value: "grade1_2", label: "1-2 级（轻度，不符合）" },
          { value: "unknown", label: "不确定" },
        ],
      },
      {
        fieldKey: "prior_botox",
        label: "6 个月内是否做过肉毒素注射",
        fieldType: "single",
        isRequired: true,
        options: [
          { value: "yes", label: "是" },
          { value: "no", label: "否" },
        ],
      },
      {
        fieldKey: "pregnant_or_lactating",
        label: "是否妊娠或哺乳期",
        fieldType: "single",
        isRequired: true,
        options: [
          { value: "yes", label: "是（不适合）" },
          { value: "no", label: "否" },
          { value: "na", label: "不适用（男性）" },
        ],
      },
      {
        fieldKey: "city",
        label: "你所在城市",
        fieldType: "text",
        isRequired: true,
        placeholder: "例如：广州市番禺区",
      },
    ],
  },

  // 试验 2 · 医用电子直线加速器（实体肿瘤放疗）
  {
    trialSlug: "linac-oncology-wuwei-2025",
    title: "实体肿瘤放疗临床研究预筛问卷",
    description: "本研究面向武威市及周边地区实体肿瘤患者。",
    successMessage: "已收到，运营会核对入排后尽快联系你。",
    generatedBy: "human",
    items: [
      {
        fieldKey: "age",
        label: "你的年龄",
        fieldType: "number",
        isRequired: true,
        minValue: 18,
        maxValue: 80,
      },
      {
        fieldKey: "diagnosis_confirmed",
        label: "是否已通过病理或影像学确诊恶性实体肿瘤",
        fieldType: "single",
        isRequired: true,
        options: [
          { value: "yes", label: "是" },
          { value: "no", label: "否" },
          { value: "unknown", label: "不确定" },
        ],
      },
      {
        fieldKey: "tumor_location",
        label: "肿瘤部位（可多选）",
        fieldType: "multi",
        isRequired: true,
        options: [
          { value: "brain", label: "颅内" },
          { value: "head_neck", label: "头颈" },
          { value: "chest", label: "胸部" },
          { value: "abdomen", label: "腹部" },
          { value: "spine", label: "脊柱" },
          { value: "pelvis", label: "盆腔" },
          { value: "limbs", label: "四肢" },
        ],
      },
      {
        fieldKey: "has_measurable_lesion",
        label: "是否至少有一个可测量病灶（RECIST1.1）",
        fieldType: "single",
        isRequired: true,
        options: [
          { value: "yes", label: "是" },
          { value: "no", label: "否" },
          { value: "unknown", label: "不清楚" },
        ],
      },
      {
        fieldKey: "ecog_score",
        label: "ECOG 全身状况评分",
        helpText: '请医生评估，如不清楚选"不确定"',
        fieldType: "single",
        isRequired: true,
        options: [
          { value: "0_2", label: "0-2 分（符合）" },
          { value: "3_plus", label: "3 分以上（不符合）" },
          { value: "unknown", label: "不确定" },
        ],
      },
      {
        fieldKey: "recent_treatment",
        label: "入组前 30 天内是否接受过化疗/靶向/免疫/介入/消融治疗",
        fieldType: "single",
        isRequired: true,
        options: [
          { value: "yes", label: "是（可能不符合）" },
          { value: "no", label: "否" },
        ],
      },
      {
        fieldKey: "city",
        label: "你所在城市",
        fieldType: "text",
        isRequired: true,
        placeholder: "例如：武威市凉州区",
      },
    ],
  },

  // 试验 3 · 北京安贞医院难治性高血压
  {
    trialSlug: "rdn-hypertension-beijing-2025",
    title: "难治性高血压介入治疗预筛问卷",
    description: "北京安贞医院招募 30 名难治性高血压受试者。",
    successMessage: "已收到，王老师 / 周医生会在 24 小时内联系你。",
    generatedBy: "human",
    items: [
      {
        fieldKey: "age",
        label: "你的年龄",
        fieldType: "number",
        isRequired: true,
        minValue: 18,
        maxValue: 75,
      },
      {
        fieldKey: "gender",
        label: "你的生理性别",
        fieldType: "single",
        isRequired: true,
        options: [
          { value: "female", label: "女" },
          { value: "male", label: "男" },
        ],
      },
      {
        fieldKey: "bp_level",
        label: "诊室收缩压（吃了 3 种以上降压药仍控制不佳）",
        helpText: '请如实填写最近一次测量值；不确定时填"不确定"',
        fieldType: "single",
        isRequired: true,
        options: [
          { value: "above_140", label: "≥ 140 mmHg" },
          { value: "below_140", label: "< 140 mmHg" },
          { value: "unknown", label: "不确定" },
        ],
      },
      {
        fieldKey: "meds_count",
        label: "目前正在服用几种降压药",
        fieldType: "single",
        isRequired: true,
        options: [
          { value: "3_plus", label: "3 种以上（符合）" },
          { value: "1_2", label: "1-2 种（不符合）" },
          { value: "0", label: "未服药" },
        ],
      },
      {
        fieldKey: "secondary_hypertension",
        label: "是否已排除继发性高血压",
        helpText: "继发性高血压指由其他明确疾病引起的高血压",
        fieldType: "single",
        isRequired: true,
        options: [
          { value: "excluded", label: "已排除" },
          { value: "not_excluded", label: "未排除 / 存在" },
          { value: "unknown", label: "不清楚" },
        ],
      },
      {
        fieldKey: "egfr",
        label: "肾小球滤过率（eGFR）",
        fieldType: "single",
        isRequired: true,
        options: [
          { value: "above_45", label: "≥ 45 mL/min/1.73m²（符合）" },
          { value: "below_45", label: "< 45（不符合）" },
          { value: "unknown", label: "不清楚" },
        ],
      },
      {
        fieldKey: "city",
        label: "你所在城市",
        fieldType: "text",
        isRequired: true,
        placeholder: "例如：北京市朝阳区",
      },
    ],
  },
];

async function main() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  const prisma = new PrismaClient({ adapter });

  for (const form of FORMS) {
    const trial = await prisma.clinicalTrial.findUnique({
      where: { slug: form.trialSlug },
      select: { id: true, title: true },
    });
    if (!trial) {
      console.warn(`[skip] trial not found: ${form.trialSlug}`);
      continue;
    }

    // Upsert Form（先删 items，再写）
    const existing = await prisma.trialPrescreenForm.findUnique({
      where: { trialId: trial.id },
      select: { id: true },
    });
    if (existing) {
      await prisma.trialPrescreenFormItem.deleteMany({
        where: { formId: existing.id },
      });
      await prisma.trialPrescreenForm.update({
        where: { id: existing.id },
        data: {
          title: form.title,
          description: form.description ?? null,
          successMessage: form.successMessage ?? null,
          isPublished: true,
          generatedBy: form.generatedBy,
          generatedAt: new Date(),
        },
      });
    } else {
      await prisma.trialPrescreenForm.create({
        data: {
          trialId: trial.id,
          title: form.title,
          description: form.description ?? null,
          successMessage: form.successMessage ?? null,
          isPublished: true,
          generatedBy: form.generatedBy,
          generatedAt: new Date(),
        },
      });
    }

    const formRec = await prisma.trialPrescreenForm.findUnique({
      where: { trialId: trial.id },
      select: { id: true },
    });
    if (!formRec) throw new Error("form upsert failed");

    // 批量建 items
    let order = 10;
    for (const it of form.items) {
      await prisma.trialPrescreenFormItem.create({
        data: {
          formId: formRec.id,
          fieldKey: it.fieldKey,
          label: it.label,
          helpText: it.helpText ?? null,
          fieldType: it.fieldType,
          options: it.options ? JSON.stringify(it.options) : null,
          placeholder: it.placeholder ?? null,
          isRequired: it.isRequired ?? false,
          minValue: it.minValue ?? null,
          maxValue: it.maxValue ?? null,
          showWhen: it.showWhen ? JSON.stringify(it.showWhen) : null,
          sortOrder: order,
        },
      });
      order += 10;
    }

    console.log(
      `[ok] seeded prescreen form for "${trial.title}" · ${form.items.length} items`,
    );
  }

  await prisma.$disconnect();
}

main()
  .then(() => {
    console.log("[done] M8.2 seed complete");
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
