"use client";

import { useState, useCallback, useMemo } from "react";
import type { FormItemInput } from "@/lib/actions/prescreen-forms";

interface Item {
  id: string;
  fieldKey: string;
  label: string;
  helpText?: string;
  fieldType: "single" | "multi" | "text" | "textarea" | "number" | "date" | "agree";
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  defaultValue?: unknown;
  isRequired: boolean;
  minValue?: number;
  maxValue?: number;
  regex?: string;
  errorMessage?: string;
  showWhen?: { fieldKey: string; op: string; value: unknown };
}

export function FormItemPanel({
  item,
  allFields,
  onUpdate,
  onDelete,
  loading,
}: {
  item: Item;
  allFields: Item[];
  onUpdate: (id: string, data: FormItemInput) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}) {
  const [fieldKey, setFieldKey] = useState(item.fieldKey);
  const [label, setLabel] = useState(item.label);
  const [helpText, setHelpText] = useState(item.helpText ?? "");
  const [fieldType, setFieldType] = useState(item.fieldType);
  const [isRequired, setIsRequired] = useState(item.isRequired);
  const [placeholder, setPlaceholder] = useState(item.placeholder ?? "");
  const [minValue, setMinValue] = useState(item.minValue?.toString() ?? "");
  const [maxValue, setMaxValue] = useState(item.maxValue?.toString() ?? "");
  const [regex, setRegex] = useState(item.regex ?? "");
  const [errorMessage, setErrorMessage] = useState(item.errorMessage ?? "");
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>(
    item.options ?? [],
  );
  const [showWhenFieldKey, setShowWhenFieldKey] = useState(item.showWhen?.fieldKey ?? "");
  const [showWhenOp, setShowWhenOp] = useState<"eq" | "neq" | "in" | "notIn">(
    (item.showWhen?.op as any) ?? "eq",
  );
  const [showWhenValue, setShowWhenValue] = useState(item.showWhen?.value ?? "");

  // 其他字段（用于跳题规则）
  const otherFields = useMemo(() => {
    return allFields.filter((f) => f.id !== item.id);
  }, [allFields, item.id]);

  // 是否显示特定字段
  const showOptions = ["single", "multi"].includes(fieldType);
  const showMinMax = ["number", "text", "textarea"].includes(fieldType);
  const showRegex = ["text", "textarea"].includes(fieldType);

  const handleAddOption = useCallback(() => {
    setOptions((prev) => [...prev, { value: "", label: "" }]);
  }, []);

  const handleRemoveOption = useCallback((idx: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleOptionChange = useCallback(
    (idx: number, key: "value" | "label", val: string) => {
      setOptions((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], [key]: val };
        return updated;
      });
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    const data: FormItemInput = {
      fieldKey,
      label,
      helpText: helpText || undefined,
      fieldType,
      isRequired,
      placeholder: placeholder || undefined,
      options: showOptions && options.length > 0 ? options : undefined,
      minValue: minValue ? Number(minValue) : undefined,
      maxValue: maxValue ? Number(maxValue) : undefined,
      regex: regex || undefined,
      errorMessage: errorMessage || undefined,
      showWhen:
        showWhenFieldKey && showWhenValue
          ? {
              fieldKey: showWhenFieldKey,
              op: showWhenOp,
              value: showWhenValue,
            }
          : undefined,
    };

    onUpdate(item.id, data);
  }, [
    fieldKey,
    label,
    helpText,
    fieldType,
    isRequired,
    placeholder,
    options,
    minValue,
    maxValue,
    regex,
    errorMessage,
    showWhenFieldKey,
    showWhenOp,
    showWhenValue,
    item.id,
    onUpdate,
    showOptions,
  ]);

  const handleDelete = useCallback(() => {
    onDelete(item.id);
  }, [item.id, onDelete]);

  return (
    <div className="form-item-panel">
      <h3>编辑字段</h3>

      {/* 基础信息 */}
      <fieldset>
        <legend>基础信息</legend>

        <label>
          <span>字段 Key（英文 snake_case）</span>
          <input
            type="text"
            value={fieldKey}
            onChange={(e) => setFieldKey(e.target.value)}
            placeholder="e.g. age, gender, diagnosis"
            disabled={loading}
          />
          <p className="hint">只能使用小写字母、数字和下划线</p>
        </label>

        <label>
          <span>中文标签 *</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="例：你的年龄"
            disabled={loading}
            required
          />
        </label>

        <label>
          <span>辅助说明</span>
          <input
            type="text"
            value={helpText}
            onChange={(e) => setHelpText(e.target.value)}
            placeholder="可选：补充说明"
            disabled={loading}
          />
        </label>
      </fieldset>

      {/* 题型和基本配置 */}
      <fieldset>
        <legend>题型配置</legend>

        <label>
          <span>题型 *</span>
          <select value={fieldType} onChange={(e) => setFieldType(e.target.value as any)} disabled={loading}>
            <option value="single">单选</option>
            <option value="multi">多选</option>
            <option value="text">短文本</option>
            <option value="textarea">长文本</option>
            <option value="number">数字</option>
            <option value="date">日期</option>
            <option value="agree">勾选（同意）</option>
          </select>
        </label>

        <label>
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            disabled={loading}
          />
          <span>必填</span>
        </label>

        {fieldType !== "agree" && (
          <label>
            <span>占位符</span>
            <input
              type="text"
              value={placeholder || ""}
              onChange={(e) => setPlaceholder(e.target.value)}
              placeholder="e.g. 请输入你的年龄"
              disabled={loading}
            />
          </label>
        )}
      </fieldset>

      {/* 选项配置（单选/多选） */}
      {showOptions && (
        <fieldset>
          <legend>选项配置</legend>

          <div className="options-list">
            {options.length === 0 ? (
              <p className="muted">暂无选项，点击下方按钮添加</p>
            ) : (
              options.map((opt, idx) => (
                <div key={idx} className="option-row">
                  <input
                    type="text"
                    value={opt.value}
                    onChange={(e) => handleOptionChange(idx, "value", e.target.value)}
                    placeholder="选项值"
                    disabled={loading}
                  />
                  <input
                    type="text"
                    value={opt.label}
                    onChange={(e) => handleOptionChange(idx, "label", e.target.value)}
                    placeholder="选项文本（中文）"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => handleRemoveOption(idx)}
                    disabled={loading}
                    title="删除选项"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            className="btn-admin btn-admin--sm"
            onClick={handleAddOption}
            disabled={loading}
          >
            + 添加选项
          </button>
        </fieldset>
      )}

      {/* 数值/文本验证 */}
      {showMinMax && (
        <fieldset>
          <legend>数值/长度限制</legend>

          <div className="row2">
            <label>
              <span>最小值</span>
              <input
                type="number"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                placeholder="0"
                disabled={loading}
              />
            </label>
            <label>
              <span>最大值</span>
              <input
                type="number"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                placeholder="100"
                disabled={loading}
              />
            </label>
          </div>
        </fieldset>
      )}

      {/* 正则和错误提示 */}
      {showRegex && (
        <fieldset>
          <legend>高级验证</legend>

          <label>
            <span>正则表达式（可选）</span>
            <input
              type="text"
              value={regex}
              onChange={(e) => setRegex(e.target.value)}
              placeholder="e.g. ^\d{11}$"
              disabled={loading}
            />
            <p className="hint">留空表示不验证</p>
          </label>

          <label>
            <span>验证失败提示</span>
            <input
              type="text"
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="例：请输入有效的手机号"
              disabled={loading}
            />
          </label>
        </fieldset>
      )}

      {/* 跳题规则 */}
      {otherFields.length > 0 && (
        <fieldset>
          <legend>条件显示（跳题规则）</legend>

          <label>
            <span>当字段</span>
            <select
              value={showWhenFieldKey}
              onChange={(e) => setShowWhenFieldKey(e.target.value)}
              disabled={loading}
            >
              <option value="">— 不设置 —</option>
              {otherFields.map((f) => (
                <option key={f.id} value={f.fieldKey}>
                  {f.label} ({f.fieldKey})
                </option>
              ))}
            </select>
          </label>

          {showWhenFieldKey && (
            <>
              <label>
                <span>条件</span>
                <select
                  value={showWhenOp}
                  onChange={(e) => setShowWhenOp(e.target.value as any)}
                  disabled={loading}
                >
                  <option value="eq">等于</option>
                  <option value="neq">不等于</option>
                  <option value="in">包含</option>
                  <option value="notIn">不包含</option>
                </select>
              </label>

              <label>
                <span>值</span>
                <input
                  type="text"
                  value={String(showWhenValue)}
                  onChange={(e) => setShowWhenValue(e.target.value)}
                  placeholder="例：无、yes、male"
                  disabled={loading}
                />
              </label>

              <p className="hint">此字段将在条件满足时显示</p>
            </>
          )}
        </fieldset>
      )}

      {/* 操作按钮 */}
      <div className="panel-actions">
        <button
          className="btn-admin btn-admin--primary"
          onClick={handleSubmit}
          disabled={loading || !label || !fieldKey}
        >
          {loading ? "保存中…" : "保存字段"}
        </button>

        <button
          className="btn-admin btn-admin--danger"
          onClick={handleDelete}
          disabled={loading}
        >
          删除字段
        </button>
      </div>
    </div>
  );
}
