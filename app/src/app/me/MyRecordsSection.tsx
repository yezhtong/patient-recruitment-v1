"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { deleteMedicalRecord } from "@/lib/actions/medical-records";

type RecordItem = {
  id: string;
  originalName: string;
  sizeBytes: number;
  createdAt: Date;
};

function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MyRecordsSection({ initialRecords }: { initialRecords: RecordItem[] }) {
  const [records, setRecords] = useState<RecordItem[]>(initialRecords);
  const [deleteTransition, startDelete] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  return (
    <div className="my-records-section">
      <div className="my-records-header">
        <h2>我的确诊记录</h2>
        {records.length > 0 && (
          <Link href="/auth/register/records" className="my-records-cta-small">
            继续上传
          </Link>
        )}
      </div>

      {records.length === 0 ? (
        <div className="my-records-empty">
          <p>暂无上传记录。上传确诊文件可加快入组评估流程。</p>
          <Link href="/auth/register/records" className="btn btn--ghost btn--sm">
            上传文件
          </Link>
        </div>
      ) : (
        <div className="my-records-mini-list">
          {records.map((r) => {
            const isDeleting = deletingId === r.id && deleteTransition;
            return (
              <div key={r.id} className="my-records-mini-item">
                <span className="my-records-mini-item__name">{r.originalName}</span>
                <span className="my-records-mini-item__size">{fmtSize(r.sizeBytes)}</span>
                <div className="my-records-mini-item__actions">
                  <a
                    href={`/api/user/records/${r.id}/download`}
                    className="my-records-mini-item__download"
                    download
                  >
                    下载
                  </a>
                  <button
                    type="button"
                    className="my-records-mini-item__delete"
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
    </div>
  );
}
