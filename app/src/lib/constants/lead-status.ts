export const LEAD_STATUS_LABEL: Record<string, string> = {
  submitted: "已提交",
  in_review: "预筛审核",
  contacted: "已联系",
  enrolled: "已入组",
  disqualified: "不符合",
  closed: "已关闭",
};

export const LEAD_STATUS_OPTIONS = [
  { value: "", label: "全部" },
  { value: "submitted", label: "已提交" },
  { value: "in_review", label: "预筛审核" },
  { value: "contacted", label: "已联系" },
  { value: "enrolled", label: "已入组" },
  { value: "disqualified", label: "不符合" },
  { value: "closed", label: "已关闭" },
];
