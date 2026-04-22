"use client";

import { useSearchParams } from "next/navigation";

export function LeadsExportCsvButton() {
  const searchParams = useSearchParams();
  const qs = new URLSearchParams();
  const status = searchParams.get("status") ?? "";
  const trial = searchParams.get("trial") ?? "";
  const q = searchParams.get("q") ?? "";
  if (status) qs.set("status", status);
  if (trial) qs.set("trial", trial);
  if (q) qs.set("q", q);
  const href = `/api/admin/export/leads${qs.toString() ? `?${qs}` : ""}`;

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
