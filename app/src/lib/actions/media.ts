"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

/**
 * M8.1 · /admin/media 上传与删除
 *
 * 约束：
 * - MIME ∈ { image/jpeg, image/png, image/webp, image/gif }
 * - size ≤ 2MB
 * - 存储到 `app/public/media/{category}/{cuid}.{ext}`
 * - **不做** 自动压缩（M8.2 引入 sharp 再补）
 * - 删除：软删除（isEnabled=false），保留审计
 */

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 2 * 1024 * 1024;

const CATEGORIES = ["hero", "community", "trial", "faq", "avatar"] as const;
type Category = (typeof CATEGORIES)[number];

const UploadSchema = z.object({
  category: z.enum(CATEGORIES),
  note: z.string().trim().max(200).optional().nullable(),
});

export type MediaUploadState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; message: string; url: string };

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

function revalidateMedia() {
  revalidatePath("/admin/media");
}

export async function uploadMediaAsset(
  _prev: MediaUploadState,
  formData: FormData,
): Promise<MediaUploadState> {
  const session = await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "请选择一张图片" };
  }

  const parsed = UploadSchema.safeParse({
    category: formData.get("category"),
    note: formData.get("note") || null,
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "分类不合法",
    };
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return {
      status: "error",
      message: "只支持 JPG / PNG / WebP / GIF 格式",
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      status: "error",
      message: "图片大小不能超过 2MB，请压缩后再传",
    };
  }

  const category = parsed.data.category as Category;
  const ext = extFromMime(file.type);
  const id = randomBytes(12).toString("hex");
  const filename = `${id}.${ext}`;

  const dirAbs = path.join(process.cwd(), "public", "media", category);
  try {
    await mkdir(dirAbs, { recursive: true });
  } catch (err) {
    console.error("[media.upload] mkdir failed", err);
    return { status: "error", message: "服务器目录创建失败" };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileAbs = path.join(dirAbs, filename);

  try {
    await writeFile(fileAbs, bytes);
  } catch (err) {
    console.error("[media.upload] writeFile failed", err);
    return { status: "error", message: "服务器写入失败" };
  }

  const url = `/media/${category}/${filename}`;

  const record = await prisma.mediaAsset.create({
    data: {
      filename,
      originalName: file.name || filename,
      url,
      category,
      sizeBytes: bytes.byteLength,
      mimeType: file.type,
      note: parsed.data.note ?? null,
      uploadedBy: session.operatorId ?? null,
    },
  });

  await writeAuditLog({
    session,
    action: "media.upload",
    entityType: "media_asset",
    entityId: record.id,
    summary: `上传图片素材到 ${category}：${record.originalName}`,
    detail: { sizeBytes: record.sizeBytes, mimeType: record.mimeType, url },
  });

  revalidateMedia();
  return { status: "ok", message: "上传成功", url };
}

export async function toggleMediaEnabled(id: string): Promise<void> {
  const session = await requireAdmin();
  const cur = await prisma.mediaAsset.findUnique({
    where: { id },
    select: { id: true, isEnabled: true, filename: true, category: true },
  });
  if (!cur) return;
  const next = !cur.isEnabled;
  await prisma.mediaAsset.update({
    where: { id },
    data: { isEnabled: next },
  });
  await writeAuditLog({
    session,
    action: next ? "media.enable" : "media.disable",
    entityType: "media_asset",
    entityId: id,
    summary: `${next ? "启用" : "下架"} 素材：${cur.category}/${cur.filename}`,
  });
  revalidateMedia();
}
