"use client";

import { useSearchParams } from "next/navigation";

export function ApplicationsExportCsvButton() {
  const searchParams = useSearchParams();
  const qs = new URLSearchParams();
  const stage = searchParams.get("stage") ?? "";
  const trial = searchParams.get("trial") ?? "";
  const q = searchParams.get("q") ?? "";
  if (stage) qs.set("stage", stage);
  if (trial) qs.set("trial", trial);
  if (q) qs.set("q", q);
  const href = `/api/admin/export/applications${qs.toString() ? `?${qs}` : ""}`;

  return (
    <a
      className="btn-admin"
      href={href}
      aria-label="按当前筛选条件导出 CSV"
      rel="nofollow"
    >
      ⬇ 导出 CSV
    </a>
  );
}
