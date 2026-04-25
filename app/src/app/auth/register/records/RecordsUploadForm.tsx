"use client";

import { useActionState, useTransition, useState } from "react";
import Link from "next/link";
import {
  uploadMedicalRecord,
  deleteMedicalRecord,
  type MedicalRecordUploadState,
} from "@/lib/actions/medical-records";

type RecordItem = {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  note: string | null;
  createdAt: Date;
};

function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(d: Date): string {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const initialState: MedicalRecordUploadState = { status: "idle" };

export function RecordsUploadForm({ initialRecords }: { initialRecords: RecordItem[] }) {
  const [records, setRecords] = useState<RecordItem[]>(initialRecords);
  const [state, formAction, isPending] = useActionState(uploadMedicalRecord, initialState);
  const [deleteTransition, startDelete] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // After successful upload, reload page to get fresh server data
  if (state.status === "ok") {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }

  function handleDelete(recordId: string) {
    setDeletingId(recordId);
    startDelete(async () => {
      const result = await deleteMedicalRecord(recordId);
      if (result.ok) {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
      }
      setDeletingId(null);
    });
  }

  const isFull = records.length >= 5;

  return (
    <div>
      {state.status === "error" && (
        <div className="rec-error" role="alert">
          {state.message}
        </div>
      )}

      {isFull ? (
        <div className="rec-limit-notice">
          已上传 5 个文件（已达上限）。如需继续上传，请先删除已有文件。
        </div>
      ) : (
        <form action={formAction} className="rec-upload-area">
          <label className="rec-upload-label" htmlFor="rec-file">
            选择文件（JPG / PNG / WebP / PDF，最大 5 MB）
          </label>
          <input
            id="rec-file"
            className="rec-file-input"
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required
          />
          <label className="rec-note-label" htmlFor="rec-note">
            备注（可选，最多 200 字）
          </label>
          <textarea
            id="rec-note"
            className="rec-note-input"
            name="note"
            maxLength={200}
            placeholder="例：2024 年 1 月确诊报告"
          />
          <button
            type="submit"
            className="btn btn--primary rec-upload-btn"
            disabled={isPending}
          >
            {isPending ? "上传中..." : "上传文件"}
          </button>
        </form>
      )}

      {records.length > 0 && (
        <div className="rec-list">
          {records.map((r) => {
            const isImg =
              r.mimeType === "image/jpeg" ||
              r.mimeType === "image/png" ||
              r.mimeType === "image/webp";
            const isDeleting = deletingId === r.id && deleteTransition;
            return (
              <div key={r.id} className="rec-card">
                <div className="rec-card__top">
                  {isImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/user/records/${r.id}/download`}
                      alt={r.originalName}
                      className="rec-card__thumb"
                      style={{ width: 80, height: 80, objectFit: "cover" }}
                    />
                  ) : (
                    <div className="rec-card__thumb-pdf">📄</div>
                  )}
                  <div className="rec-card__info">
                    <div className="rec-card__name">{r.originalName}</div>
                    <div className="rec-card__size">{fmtSize(r.sizeBytes)}</div>
                    {r.note && <div className="rec-card__note">{r.note}</div>}
                    <div className="rec-card__date">{fmtDate(r.createdAt)}</div>
                  </div>
                </div>
                <div className="rec-card__actions">
                  <a
                    href={`/api/user/records/${r.id}/download`}
                    className="rec-card__download"
                    download
                  >
                    下载
                  </a>
                  <button
                    type="button"
                    className="rec-card__delete"
                    disabled={isDeleting}
                    onClick={() => handleDelete(r.id)}
                  >
                    {isDeleting ? "删除中..." : "删除"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rec-cta-group">
        <Link href="/me?recommend=communities" className="btn btn--primary btn--lg">
          完成并进入我的主页 →
        </Link>
        <Link href="/me?recommend=communities" className="rec-skip">
          稍后再上传
        </Link>
      </div>
    </div>
  );
}
