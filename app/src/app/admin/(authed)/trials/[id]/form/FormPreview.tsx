"use client";

import { useMemo, useState, useCallback } from "react";

interface Item {
  id: string;
  fieldKey: string;
  label: string;
  helpText?: string;
  fieldType: string;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  isRequired: boolean;
  showWhen?: { fieldKey: string; op: string; value: unknown };
}

/**
 * 评估条件显示规则
 */
function evalShowWhen(
  rule: Item["showWhen"] | undefined,
  answers: Record<string, unknown>,
): boolean {
  if (!rule) return true;

  const current = answers[rule.fieldKey];
  switch (rule.op) {
    case "eq":
      return current === rule.value;
    case "neq":
      return current !== rule.value;
    case "in":
      return Array.isArray(rule.value) && rule.value.includes(current);
    case "notIn":
      return Array.isArray(rule.value) && !rule.value.includes(current);
    default:
      return true;
  }
}

export function FormPreview({ items, onClose }: { items: Item[]; onClose: () => void }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  // 根据条件显示规则过滤可见字段
  const visibleItems = useMemo(() => {
    return items.filter((item) => evalShowWhen(item.showWhen, answers));
  }, [items, answers]);

  const handleSetAnswer = useCallback(
    (key: string, value: unknown) => {
      setAnswers((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleToggleMulti = useCallback(
    (key: string, value: string) => {
      setAnswers((prev) => {
        const current = (prev[key] as string[]) ?? [];
        if (current.includes(value)) {
          return { ...prev, [key]: current.filter((v) => v !== value) };
        } else {
          return { ...prev, [key]: [...current, value] };
        }
      });
    },
    [],
  );

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <h2>患者端预览</h2>
          <button className="preview-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="preview-content">
          <div className="form-preview">
            {items.length === 0 ? (
              <p className="muted" style={{ textAlign: "center", padding: "20px" }}>
                暂无字段，无法预览
              </p>
            ) : (
              <>
                <div style={{ marginBottom: "20px", padding: "12px", background: "#f5f5f5", borderRadius: "6px" }}>
                  <p style={{ margin: 0, fontSize: "12px", color: "#666" }}>
                    ℹ️ 这是患者端的预览效果，跳题规则已启用
                  </p>
                </div>

                {visibleItems.map((item) => (
                  <div
                    key={item.id}
                    className="form-field-preview"
                    style={{ marginBottom: "16px" }}
                  >
                    <label style={{ display: "block", marginBottom: "6px" }}>
                      <strong>{item.label}</strong>
                      {item.isRequired && (
                        <span style={{ color: "red", marginLeft: "4px" }}>*</span>
                      )}
                    </label>

                    {item.helpText && (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#999",
                          margin: "4px 0 8px 0",
                        }}
                      >
                        {item.helpText}
                      </p>
                    )}

                    {/* 单选 */}
                    {item.fieldType === "single" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {(item.options ?? []).map((opt) => (
                          <label
                            key={opt.value}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name={item.fieldKey}
                              value={opt.value}
                              checked={answers[item.fieldKey] === opt.value}
                              onChange={(e) => handleSetAnswer(item.fieldKey, e.target.value)}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* 多选 */}
                    {item.fieldType === "multi" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {(item.options ?? []).map((opt) => (
                          <label
                            key={opt.value}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={((answers[item.fieldKey] as string[]) ?? []).includes(
                                opt.value,
                              )}
                              onChange={() => handleToggleMulti(item.fieldKey, opt.value)}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* 文本 */}
                    {item.fieldType === "text" && (
                      <input
                        type="text"
                        value={(answers[item.fieldKey] as string) ?? ""}
                        onChange={(e) => handleSetAnswer(item.fieldKey, e.target.value)}
                        placeholder={item.placeholder || "请输入"}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px",
                        }}
                      />
                    )}

                    {/* 长文本 */}
                    {item.fieldType === "textarea" && (
                      <textarea
                        value={(answers[item.fieldKey] as string) ?? ""}
                        onChange={(e) => handleSetAnswer(item.fieldKey, e.target.value)}
                        placeholder={item.placeholder || "请输入"}
                        rows={3}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px",
                        }}
                      />
                    )}

                    {/* 数字 */}
                    {item.fieldType === "number" && (
                      <input
                        type="number"
                        value={(answers[item.fieldKey] as number) ?? ""}
                        onChange={(e) => handleSetAnswer(item.fieldKey, e.target.value)}
                        placeholder={item.placeholder || "请输入数字"}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px",
                        }}
                      />
                    )}

                    {/* 日期 */}
                    {item.fieldType === "date" && (
                      <input
                        type="date"
                        value={(answers[item.fieldKey] as string) ?? ""}
                        onChange={(e) => handleSetAnswer(item.fieldKey, e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "14px",
                        }}
                      />
                    )}

                    {/* 勾选（同意） */}
                    {item.fieldType === "agree" && (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={(answers[item.fieldKey] as boolean) ?? false}
                          onChange={(e) => handleSetAnswer(item.fieldKey, e.target.checked)}
                        />
                        <span>{item.label}</span>
                      </label>
                    )}
                  </div>
                ))}

                {/* 隐藏字段提示 */}
                {items.length > visibleItems.length && (
                  <div
                    style={{
                      padding: "12px",
                      background: "#fff3cd",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: "#856404",
                      marginTop: "16px",
                    }}
                  >
                    ℹ️ 根据跳题规则，共隐藏 {items.length - visibleItems.length} 个字段
                  </div>
                )}

                {/* 提交按钮（禁用，仅预览） */}
                <button
                  style={{
                    width: "100%",
                    marginTop: "24px",
                    padding: "12px",
                    backgroundColor: "#ccc",
                    color: "#666",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "not-allowed",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                  disabled
                >
                  提交预筛（预览不可提交）
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
