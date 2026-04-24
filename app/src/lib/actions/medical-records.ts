"use server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { requireAdmin } from "@/lib/admin-session";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_FILES_PER_USER = 5;

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return "bin";
}

export type MedicalRecordUploadState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; recordId: string; message: string };

export async function uploadMedicalRecord(
  _prev: MedicalRecordUploadState,
  formData: FormData,
): Promise<MedicalRecordUploadState> {
  const session = await getUserSession();
  if (!isLoggedIn(session)) return { status: "error", message: "请先登录" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "请选择文件" };
  if (!ALLOWED_MIME.has(file.type)) return { status: "error", message: "仅支持 JPG/PNG/WebP/PDF" };
  if (file.size > MAX_BYTES) return { status: "error", message: "文件大小不能超过 5MB" };

  const note = formData.get("note");
  const noteStr = typeof note === "string" ? note.trim().slice(0, 200) : null;

  const existingCount = await prisma.userMedicalRecord.count({
    where: { userId: session.userId, deletedAt: null },
  });
  if (existingCount >= MAX_FILES_PER_USER) {
    return { status: "error", message: "最多保留 5 个文件，请先删除旧的" };
  }

  const dir = path.join(process.cwd(), "public", "uploads", "medical-records");
  await mkdir(dir, { recursive: true });
  const id = randomBytes(12).toString("hex");
  const ext = extFromMime(file.type);
  const filename = `${id}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), bytes);

  const record = await prisma.userMedicalRecord.create({
    data: {
      userId: session.userId,
      filename,
      originalName: file.name || filename,
      url: `/uploads/medical-records/${filename}`,
      mimeType: file.type,
      sizeBytes: bytes.byteLength,
      note: noteStr || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      operatorId: session.userId,
      operatorRole: "user",
      action: "user.medical_record.upload",
      entityType: "user_medical_record",
      entityId: record.id,
      summary: `用户上传确诊记录 ${file.name} (${bytes.byteLength} B)`,
    },
  });

  revalidatePath("/me");
  return { status: "ok", recordId: record.id, message: "上传成功" };
}

export async function deleteMedicalRecord(
  recordId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getUserSession();
  if (!isLoggedIn(session)) return { ok: false, error: "未登录" };

  const record = await prisma.userMedicalRecord.findUnique({ where: { id: recordId } });
  if (!record || record.userId !== session.userId) return { ok: false, error: "记录不存在" };
  if (record.deletedAt) return { ok: true };

  await prisma.userMedicalRecord.update({
    where: { id: recordId },
    data: { deletedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      operatorId: session.userId,
      operatorRole: "user",
      action: "user.medical_record.delete",
      entityType: "user_medical_record",
      entityId: recordId,
      summary: `用户软删除确诊记录 ${record.originalName}`,
    },
  });

  revalidatePath("/me");
  return { ok: true };
}

export async function markRecordReviewed(
  recordId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdmin();
  const record = await prisma.userMedicalRecord.findUnique({ where: { id: recordId } });
  if (!record) return { ok: false, error: "记录不存在" };

  await prisma.userMedicalRecord.update({
    where: { id: recordId },
    data: {
      isReviewed: true,
      reviewedAt: new Date(),
      reviewedBy: session.operatorId ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      operatorId: session.operatorId ?? null,
      operatorRole: session.role,
      action: "admin.medical_record.review",
      entityType: "user_medical_record",
      entityId: recordId,
      summary: `管理员复核确诊记录 ${record.originalName}`,
    },
  });

  return { ok: true };
}
