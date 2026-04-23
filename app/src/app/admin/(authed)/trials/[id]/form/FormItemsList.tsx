"use client";

import { useState, useMemo } from "react";

interface Item {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  isRequired: boolean;
  sortOrder: number;
}

const FIELD_TYPE_ICONS: Record<string, string> = {
  single: "○",
  multi: "☑",
  text: "T",
  textarea: "¶",
  number: "#",
  date: "📅",
  agree: "✓",
};

export function FormItemsList({
  items,
  selectedItemId,
  onSelectItem,
  onCreateItem,
  onReorderItems,
  loading,
}: {
  items: Item[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onCreateItem: () => void;
  onReorderItems: (updates: Array<{ id: string; sortOrder: number }>) => void;
  loading: boolean;
}) {
  const [editingSortId, setEditingSortId] = useState<string | null>(null);
  const [sortValues, setSortValues] = useState<Record<string, number>>(
    items.reduce((acc, item) => ({ ...acc, [item.id]: item.sortOrder }), {}),
  );

  // 排序项目
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [items]);

  const handleSortChange = (itemId: string, value: number) => {
    setSortValues((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleSortSave = () => {
    const updates = Object.entries(sortValues).map(([id, sortOrder]) => ({
      id,
      sortOrder: Number(sortOrder),
    }));
    onReorderItems(updates);
    setEditingSortId(null);
  };

  return (
    <div className="form-items-list">
      <div className="list-header">
        <h3>字段列表</h3>
        <span className="item-count">{items.length}</span>
      </div>

      <div className="list-items">
        {sortedItems.length === 0 ? (
          <div className="empty-state">
            <p>暂无字段</p>
            <p className="muted">点击下方按钮创建第一个字段</p>
          </div>
        ) : (
          sortedItems.map((item) => (
            <div
              key={item.id}
              className={`list-item ${selectedItemId === item.id ? "active" : ""}`}
              onClick={() => onSelectItem(item.id)}
            >
              {/* 拖拽手柄（可视化） */}
              <span className="drag-handle" title="排序">
                ⋮⋮
              </span>

              {/* 题型图标 */}
              <span className="field-type-icon" title={item.fieldType}>
                {FIELD_TYPE_ICONS[item.fieldType] || "?"}
              </span>

              {/* 字段信息 */}
              <div className="item-info">
                <div className="item-label">{item.label}</div>
                <div className="item-key">{item.fieldKey}</div>
              </div>

              {/* 徽章 */}
              {item.isRequired && <span className="badge-required">必填</span>}

              {/* 排序值（可编辑） */}
              {editingSortId === item.id ? (
                <input
                  type="number"
                  className="sort-input"
                  value={sortValues[item.id]}
                  onChange={(e) => handleSortChange(item.id, Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                  onBlur={handleSortSave}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSortSave();
                    } else if (e.key === "Escape") {
                      setEditingSortId(null);
                    }
                  }}
                />
              ) : (
                <span
                  className="sort-order"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSortId(item.id);
                  }}
                  title="点击编辑排序"
                >
                  {item.sortOrder}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* 操作按钮 */}
      <div className="list-footer">
        <button
          className="btn-admin btn-admin--primary"
          onClick={onCreateItem}
          disabled={loading}
        >
          + 新增字段
        </button>
      </div>
    </div>
  );
}
