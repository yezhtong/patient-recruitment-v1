"use client";

import { useState, useEffect, useCallback } from "react";

interface MediaItem {
  id: string;
  url: string;
  category: string;
  note: string | null;
  originalName: string;
  sizeBytes: number | null;
}

interface MediaPickerProps {
  category: string;
  value: string | null;
  onChange: (mediaId: string | null) => void;
}

export function MediaPicker({ category, value, onChange }: MediaPickerProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 根据当前选中的 id 显示预览图
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    // 从已加载的列表里找 url；列表未加载时不预取（打开弹窗再加载）
    const found = items.find((i) => i.id === value);
    if (found) setPreviewUrl(found.url);
  }, [value, items]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/media/list?category=${encodeURIComponent(category)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as { items?: MediaItem[] };
      const list = data.items ?? [];
      setItems(list);
      // 同步预览 url
      if (value) {
        const found = list.find((i) => i.id === value);
        if (found) setPreviewUrl(found.url);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [category, value]);

  const handleOpen = () => {
    setOpen(true);
    loadItems();
  };

  const handleSelect = (item: MediaItem) => {
    onChange(item.id);
    setPreviewUrl(item.url);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setPreviewUrl(null);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) setOpen(false);
  };

  return (
    <>
      {/* 当前选中预览区 */}
      <div
        style={{
          border: "1px solid var(--ink-200)",
          borderRadius: "var(--r-md, 10px)",
          overflow: "hidden",
          background: "var(--cream-0)",
          maxWidth: 320,
        }}
      >
        {previewUrl ? (
          <div
            style={{
              aspectRatio: "16 / 9",
              backgroundImage: `url(${previewUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundColor: "var(--ink-100)",
            }}
            role="img"
            aria-label="当前选中图片预览"
          />
        ) : (
          <div
            style={{
              aspectRatio: "16 / 9",
              background: "var(--ink-100)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--gray-500)",
              fontSize: 13,
              fontFamily: "var(--font-sans)",
            }}
          >
            未选择图片
          </div>
        )}
        <div
          style={{
            padding: "10px 12px",
            display: "flex",
            gap: 8,
            borderTop: previewUrl ? "1px solid var(--ink-100)" : "none",
          }}
        >
          <button
            type="button"
            className="btn-admin btn-admin--sm"
            onClick={handleOpen}
            style={{ flex: 1 }}
          >
            {previewUrl ? "更换" : "选择图片"}
          </button>
          {previewUrl && (
            <button
              type="button"
              className="btn-admin btn-admin--sm"
              onClick={handleClear}
              style={{ color: "var(--danger-700)", borderColor: "var(--danger-500)" }}
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* 弹窗 */}
      {open && (
        <div
          onClick={handleBackdropClick}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(10, 20, 17, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: "var(--cream-0)",
              borderRadius: "var(--r-md, 12px)",
              border: "1px solid var(--ink-200)",
              width: "100%",
              maxWidth: 760,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(10, 20, 17, 0.12)",
            }}
          >
            {/* 弹窗头部 */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--ink-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--gray-500)",
                  }}
                >
                  素材库 · {category}
                </span>
                <h3
                  style={{
                    margin: "4px 0 0",
                    fontFamily: "var(--font-serif)",
                    fontSize: 20,
                    fontWeight: 400,
                    color: "var(--ink-900)",
                  }}
                >
                  选择图片
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 20,
                  color: "var(--gray-500)",
                  lineHeight: 1,
                  padding: "4px 8px",
                  borderRadius: "var(--r-sm)",
                }}
              >
                ✕
              </button>
            </div>

            {/* 弹窗内容 */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 20,
              }}
            >
              {loading ? (
                <div
                  style={{
                    padding: 48,
                    textAlign: "center",
                    color: "var(--gray-500)",
                    fontSize: 14,
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  加载中…
                </div>
              ) : items.length === 0 ? (
                <div
                  style={{
                    padding: 48,
                    textAlign: "center",
                    color: "var(--gray-500)",
                    fontSize: 14,
                    fontFamily: "var(--font-sans)",
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 12 }}>◩</div>
                  该分类暂无素材，请到素材库上传
                  <br />
                  <a
                    href={`/admin/media?category=${category}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--ink-700)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      marginTop: 8,
                      display: "inline-block",
                    }}
                  >
                    前往素材库管理 ↗
                  </a>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                  }}
                >
                  {items.map((item) => {
                    const isSelected = item.id === value;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        title={item.originalName}
                        style={{
                          display: "block",
                          width: "100%",
                          background: "var(--cream-0)",
                          border: isSelected
                            ? "2px solid var(--ink-900)"
                            : "1px solid var(--ink-200)",
                          borderRadius: "var(--r-sm, 8px)",
                          cursor: "pointer",
                          padding: 0,
                          overflow: "hidden",
                          outline: isSelected
                            ? "3px solid var(--lime)"
                            : "none",
                          outlineOffset: 2,
                        }}
                      >
                        {/* 16:9 缩略图 */}
                        <div
                          style={{
                            aspectRatio: "16 / 9",
                            backgroundImage: `url(${item.url})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundColor: "var(--ink-100)",
                          }}
                          role="img"
                          aria-label={item.originalName}
                        />
                        <div
                          style={{
                            padding: "6px 8px",
                            textAlign: "left",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              fontFamily: "var(--font-sans)",
                              color: "var(--ink-900)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.originalName}
                          </div>
                          {item.note && (
                            <div
                              style={{
                                fontSize: 10,
                                fontFamily: "var(--font-mono)",
                                color: "var(--gray-500)",
                                marginTop: 2,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {item.note}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            <div
              style={{
                padding: "12px 20px",
                borderTop: "1px solid var(--ink-100)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexShrink: 0,
                background: "var(--cream-50)",
              }}
            >
              <a
                href={`/admin/media?category=${category}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  color: "var(--ink-700)",
                  textDecoration: "none",
                  letterSpacing: "0.02em",
                }}
              >
                前往素材库管理 ↗
              </a>
              <button
                type="button"
                className="btn-admin btn-admin--sm"
                onClick={() => setOpen(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
