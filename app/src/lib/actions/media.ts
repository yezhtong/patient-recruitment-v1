"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const COMPRESSIBLE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const MAX_BYTES = 2 * 1024 * 1024;
const COMPRESS_THRESHOLD = 500 * 1024;

const CATEGORIES = ["hero", "community", "trial", "faq", "avatar", "step"] as const;
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

async function compressToTarget(
  input: Buffer<ArrayBuffer>,
  mime: string,
): Promise<Buffer<ArrayBuffer>> {
  const qualities = [80, 60, 40];
  for (const quality of qualities) {
    let pipeline = sharp(input);
    if (mime === "image/jpeg") {
      pipeline = pipeline.jpeg({ quality });
    } else if (mime === "image/png") {
      pipeline = pipeline.png({ compressionLevel: 9, quality });
    } else {
      pipeline = pipeline.webp({ quality });
    }
    const out = await pipeline.toBuffer() as Buffer<ArrayBuffer>;
    if (out.byteLength <= COMPRESS_THRESHOLD) return out;
  }
  let pipeline = sharp(input);
  if (mime === "image/jpeg") {
    pipeline = pipeline.jpeg({ quality: 40 });
  } else if (mime === "image/png") {
    pipeline = pipeline.png({ compressionLevel: 9, quality: 40 });
  } else {
    pipeline = pipeline.webp({ quality: 40 });
  }
  return (await pipeline.toBuffer()) as Buffer<ArrayBuffer>;
}

async function toWebp(input: Buffer<ArrayBuffer>): Promise<Buffer<ArrayBuffer>> {
  return (await sharp(input).webp({ quality: 80 }).toBuffer()) as Buffer<ArrayBuffer>;
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
  const webpFilename = `${id}.webp`;

  const dirAbs = path.join(process.cwd(), "public", "media", category);
  try {
    await mkdir(dirAbs, { recursive: true });
  } catch (err) {
    console.error("[media.upload] mkdir failed", err);
    return { status: "error", message: "服务器目录创建失败" };
  }

  let rawBytes = Buffer.from(await file.arrayBuffer());
  let finalBytes = rawBytes;
  let webpBytes: Buffer | null = null;

  if (COMPRESSIBLE_MIME.has(file.type)) {
    try {
      if (rawBytes.byteLength > COMPRESS_THRESHOLD) {
        finalBytes = await compressToTarget(rawBytes, file.type);
      }
      webpBytes = await toWebp(rawBytes);
    } catch (err) {
      console.warn("[media.upload] sharp failed, falling back to raw", err);
      finalBytes = rawBytes;
      webpBytes = null;
    }
  }

  const fileAbs = path.join(dirAbs, filename);
  try {
    await writeFile(fileAbs, finalBytes);
  } catch (err) {
    console.error("[media.upload] writeFile failed", err);
    return { status: "error", message: "服务器写入失败" };
  }

  if (webpBytes) {
    const webpAbs = path.join(dirAbs, webpFilename);
    try {
      await writeFile(webpAbs, webpBytes);
    } catch (err) {
      console.warn("[media.upload] webp writeFile failed", err);
      webpBytes = null;
    }
  }

  // url 优先指向 webp；若 webp 生成失败则指向原格式
  const url = webpBytes
    ? `/media/${category}/${webpFilename}`
    : `/media/${category}/${filename}`;

  const storedSizeBytes = webpBytes ? webpBytes.byteLength : finalBytes.byteLength;

  const record = await prisma.mediaAsset.create({
    data: {
      filename: webpBytes ? webpFilename : filename,
      originalName: file.name || filename,
      url,
      category,
      sizeBytes: storedSizeBytes,
      mimeType: webpBytes ? "image/webp" : file.type,
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
    detail: {
      originalSizeBytes: rawBytes.byteLength,
      storedSizeBytes,
      mimeType: file.type,
      url,
      compressed: rawBytes.byteLength > COMPRESS_THRESHOLD,
      hasWebp: !!webpBytes,
    },
  });

  revalidateMedia();
  return { status: "ok", message: "上传成功", url };
}

const OverlaySchema = z.object({
  overlayLabel: z
    .string()
    .trim()
    .max(24, "标题上限 24 字")
    .optional()
    .nullable()
    .transform((v) => (v === "" || v == null ? null : v)),
  overlayText: z
    .string()
    .trim()
    .max(40, "副文本上限 40 字")
    .optional()
    .nullable()
    .transform((v) => (v === "" || v == null ? null : v)),
});

export async function updateMediaOverlay(
  id: string,
  overlayLabel: string | null,
  overlayText: string | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdmin();

  const parsed = OverlaySchema.safeParse({ overlayLabel, overlayText });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "参数不合法" };
  }

  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    select: { id: true, category: true, filename: true },
  });
  if (!asset) {
    return { ok: false, error: "素材不存在" };
  }
  if (asset.category !== "hero") {
    return { ok: false, error: "仅 hero 分类支持 overlay" };
  }

  await prisma.mediaAsset.update({
    where: { id },
    data: {
      overlayLabel: parsed.data.overlayLabel,
      overlayText: parsed.data.overlayText,
    },
  });

  await writeAuditLog({
    session,
    action: "media.overlay.update",
    entityType: "media_asset",
    entityId: id,
    summary: `更新 hero 素材 overlay：${asset.filename}`,
    detail: {
      overlayLabel: parsed.data.overlayLabel,
      overlayText: parsed.data.overlayText,
    },
  });

  revalidatePath("/admin/media");
  revalidatePath("/");

  return { ok: true };
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
