export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // 需转义情形：含有逗号、引号、换行、回车
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines: string[] = [];
  lines.push(headers.map(csvEscape).join(","));
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  // UTF-8 BOM 让 Excel 识别中文
  return "\ufeff" + lines.join("\r\n") + "\r\n";
}

export function csvTimestamp(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const t = new Date(d.getTime() + 8 * 3600 * 1000);
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}-${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}`;
}

export function csvDateTime(d: Date | null | undefined): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const t = new Date(d.getTime() + 8 * 3600 * 1000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())} ${pad(t.getUTCHours())}:${pad(t.getUTCMinutes())}:${pad(t.getUTCSeconds())}`;
}
