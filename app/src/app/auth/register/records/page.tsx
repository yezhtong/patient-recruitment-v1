import { redirect } from "next/navigation";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { prisma } from "@/lib/prisma";
import { RecordsUploadForm } from "./RecordsUploadForm";
import "./styles.css";

export const metadata = {
  title: "上传确诊记录 · 九泰临研",
  description: "（可选）上传个人确诊记录，帮助研究团队更好地评估你的入组资格。",
};

export default async function RegisterRecordsPage() {
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    redirect("/auth?next=/auth/register/records");
  }

  const records = await prisma.userMedicalRecord.findMany({
    where: { userId: session.userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      note: true,
      createdAt: true,
    },
  });

  return (
    <div className="rec-page">
      <header className="rec-topbar">
        <div className="rec-topbar__inner">
          <a href="/" className="rec-logo">
            九泰<em>临研</em>
          </a>
          <nav className="rec-stepper" aria-label="注册进度">
            <span
              className="rec-stepper__dot rec-stepper__dot--done"
              aria-label="步骤1已完成"
            >
              ✓
            </span>
            <span className="rec-stepper__line rec-stepper__line--done" />
            <span
              className="rec-stepper__dot rec-stepper__dot--done"
              aria-label="步骤2已完成"
            >
              ✓
            </span>
            <span className="rec-stepper__line rec-stepper__line--done" />
            <span
              className="rec-stepper__dot rec-stepper__dot--current"
              aria-label="步骤3当前"
            >
              3
            </span>
          </nav>
        </div>
      </header>

      <main className="rec-main" id="main-content">
        <div className="rec-wrap">
          <div className="rec-head">
            <p className="rec-head__eyebrow">注册 · 第 3 步（可选）</p>
            <h1>上传确诊记录</h1>
            <p className="rec-head__sub">
              上传后研究团队可提前评估你的资格，加快入组流程。此步骤完全可选。
            </p>
          </div>

          <div className="rec-notice">
            你的医疗文件仅用于临床试验入组资格评估，严格保密，不对外分享，不构成医疗诊断建议。
            支持格式：JPG、PNG、WebP、PDF；单文件最大 5 MB；最多保留 5 个文件。
          </div>

          <RecordsUploadForm initialRecords={records} />
        </div>
      </main>
    </div>
  );
}
