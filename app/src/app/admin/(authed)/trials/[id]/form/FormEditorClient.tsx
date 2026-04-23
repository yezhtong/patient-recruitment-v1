"use client";

import { useState, useCallback } from "react";
import { useTransition } from "react";
import {
  createFormItem,
  updateFormItem,
  deleteFormItem,
  reorderFormItems,
  publishForm,
  unpublishForm,
} from "@/lib/actions/prescreen-forms";
import type { FormItemInput } from "@/lib/actions/prescreen-forms";
import { FormItemsList } from "./FormItemsList";
import { FormItemPanel } from "./FormItemPanel";
import { GenerateFormDialog } from "./GenerateFormDialog";
import { FormPreview } from "./FormPreview";
import "./form-editor.css";

interface Item {
  id: string;
  formId: string;
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
  sortOrder: number;
}

interface Form {
  id: string;
  trialId: string;
  version: number;
  isPublished: boolean;
  title?: string;
  description?: string;
  successMessage?: string;
  generatedBy?: string;
  generatedAt?: string;
  items: Item[];
}

interface Trial {
  id: string;
  title: string;
  slug: string;
}

export function FormEditorClient({ trial, form: initialForm }: { trial: Trial; form: Form }) {
  const [form, setForm] = useState<Form>(initialForm);
  const [items, setItems] = useState<Item[]>(initialForm.items);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // ===== 字段操作回调 =====

  const handleCreateItem = useCallback(() => {
    startTransition(async () => {
      const result = await createFormItem(form.id, {
        fieldKey: `field_${Date.now()}`,
        label: "新字段",
        fieldType: "text",
        isRequired: false,
      } as FormItemInput);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("字段已创建");
        // 重新加载表单（通过 revalidatePath）
        setTimeout(() => window.location.reload(), 500);
      }
    });
  }, [form.id]);

  const handleUpdateItem = useCallback(
    (itemId: string, data: FormItemInput) => {
      startTransition(async () => {
        const result = await updateFormItem(itemId, data);

        if (result.error) {
          setError(result.error);
        } else if (result.fieldKeyError) {
          setError(result.fieldKeyError);
        } else {
          setSuccess("字段已保存");
          setTimeout(() => window.location.reload(), 500);
        }
      });
    },
    [],
  );

  const handleDeleteItem = useCallback(
    (itemId: string) => {
      if (!window.confirm("确定删除此字段？此操作不可撤销。")) return;

      startTransition(async () => {
        const result = await deleteFormItem(form.id, itemId);

        if (result.error) {
          setError(result.error);
        } else {
          setSuccess("字段已删除");
          setSelectedItemId(null);
          setTimeout(() => window.location.reload(), 500);
        }
      });
    },
    [form.id],
  );

  const handleReorder = useCallback(
    (updates: Array<{ id: string; sortOrder: number }>) => {
      startTransition(async () => {
        const result = await reorderFormItems(form.id, updates);

        if (result.error) {
          setError(result.error);
        } else {
          setSuccess("排序已更新");
          setTimeout(() => window.location.reload(), 500);
        }
      });
    },
    [form.id],
  );

  const handleGenerateItems = useCallback(() => {
    setSuccess("表单已生成，请审核后发布");
    setTimeout(() => window.location.reload(), 800);
  }, []);

  const handlePublish = useCallback(() => {
    if (items.length === 0) {
      setError("无法发布空表单，请至少添加 1 个字段");
      return;
    }

    startTransition(async () => {
      const result = await publishForm(form.id);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("表单已发布");
        setTimeout(() => window.location.reload(), 500);
      }
    });
  }, [form.id, items.length]);

  const handleUnpublish = useCallback(() => {
    if (!window.confirm("确定撤回发布？患者将看到通用预筛表单。")) return;

    startTransition(async () => {
      const result = await unpublishForm(form.id);

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("表单已撤回");
        setTimeout(() => window.location.reload(), 500);
      }
    });
  }, [form.id]);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  return (
    <div className="form-editor-layout">
      {/* 左侧：字段列表 */}
      <div className="form-editor-left">
        <FormItemsList
          items={items}
          selectedItemId={selectedItemId}
          onSelectItem={setSelectedItemId}
          onCreateItem={handleCreateItem}
          onReorderItems={handleReorder}
          loading={pending}
        />
      </div>

      {/* 中间：字段编辑面板 */}
      <div className="form-editor-middle">
        {selectedItem ? (
          <FormItemPanel
            key={selectedItem.id}
            item={selectedItem}
            allFields={items}
            onUpdate={handleUpdateItem}
            onDelete={handleDeleteItem}
            loading={pending}
          />
        ) : (
          <div className="form-editor-empty">
            <p>选择左侧字段进行编辑，或点击「新增字段」添加新字段</p>
          </div>
        )}
      </div>

      {/* 右侧：工具栏 */}
      <div className="form-editor-right">
        <div className="form-editor-toolbar">
          <h3>表单发布</h3>

          <div className="toolbar-group">
            <p className="form-status">
              <span className="label">状态：</span>
              <span className={`badge ${form.isPublished ? "published" : "draft"}`}>
                {form.isPublished ? "已发布" : "草稿"}
              </span>
            </p>
            <p className="form-version">
              <span className="label">版本：</span>
              <span>{form.version}</span>
            </p>
            <p className="form-items">
              <span className="label">字段数：</span>
              <span>{items.length}</span>
            </p>
          </div>

          <div className="toolbar-actions">
            <GenerateFormDialog
              trialId={trial.id}
              formId={form.id}
              onGenerated={handleGenerateItems}
            />

            <button
              className="btn-admin btn-admin--primary"
              onClick={handlePublish}
              disabled={pending || items.length === 0 || form.isPublished}
              title={form.isPublished ? "表单已发布" : ""}
            >
              {pending ? "处理中…" : "发布表单"}
            </button>

            {form.isPublished && (
              <button
                className="btn-admin btn-admin--ghost"
                onClick={handleUnpublish}
                disabled={pending}
              >
                撤回发布
              </button>
            )}

            <button
              className="btn-admin"
              onClick={() => setPreviewOpen(true)}
              disabled={items.length === 0}
            >
              👁️ 预览
            </button>
          </div>

          {/* 提示信息 */}
          <div className="toolbar-notice">
            <p>
              ℹ️
              AI 生成的字段仅供参考，请务必根据实际招募方案人工复核后再发布。医疗问诊相关字段的准确性由运营方负责。
            </p>
          </div>
        </div>
      </div>

      {/* Toast 通知 */}
      {error && (
        <div className="toast toast-error" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {success && (
        <div className="toast toast-success" role="alert">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}>×</button>
        </div>
      )}

      {/* 预览抽屉 */}
      {previewOpen && (
        <FormPreview items={items} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
