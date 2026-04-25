"use client";

import { useEffect, useRef, useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { dismissRecommendAction } from "@/lib/actions/recommend-dismiss";
import { quickJoinGroupAction } from "@/lib/actions/quick-join-group";

export interface RecommendedGroup {
  id: string;
  slug: string;
  name: string;
  introduction: string | null;
}

interface Props {
  recommendedGroups: RecommendedGroup[];
  isOpen: boolean;
  onClose: () => void;
}

function getTitle(count: number): string {
  if (count === 1) return "为你推荐这个分区";
  if (count === 2) return "这 2 个分区适合你";
  return "这 3 个分区适合你";
}

export function RecommendModal({ recommendedGroups, isOpen, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  // 每个分区的已加入状态
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  // 加入中的分区 id
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // 受控：随 isOpen 驱动 showModal / close
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (isOpen) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [isOpen]);

  // 二次确保 ESC 被阻断（双保险）
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handleCancel = (e: Event) => e.preventDefault();
    el.addEventListener("cancel", handleCancel);
    return () => el.removeEventListener("cancel", handleCancel);
  }, []);

  // 移除 ?recommend 查询参数，不 push 历史
  const removeQuery = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("recommend");
    router.replace(url.pathname + (url.searchParams.size > 0 ? `?${url.searchParams}` : ""), {
      scroll: false,
    });
  }, [router]);

  // 关闭弹窗并写 dismiss
  const closeAndDismiss = useCallback(() => {
    startTransition(async () => {
      await dismissRecommendAction();
      onClose();
      removeQuery();
    });
  }, [onClose, removeQuery]);

  // 单个加入
  const handleJoin = useCallback(
    async (groupId: string) => {
      if (joinedIds.has(groupId) || joiningId) return;
      setJoiningId(groupId);
      const result = await quickJoinGroupAction(groupId);
      if (result.ok) {
        setJoinedIds((prev) => new Set(prev).add(groupId));
      }
      setJoiningId(null);
    },
    [joinedIds, joiningId],
  );

  // 全部加入并跳转
  const handleJoinAll = useCallback(() => {
    startTransition(async () => {
      await dismissRecommendAction();
      for (const g of recommendedGroups) {
        await quickJoinGroupAction(g.id);
      }
      onClose();
      router.push("/community");
    });
  }, [recommendedGroups, onClose, router]);

  const count = recommendedGroups.length;
  const allJoined = count > 0 && joinedIds.size >= count;

  return (
    <dialog
      ref={dialogRef}
      className="recommend-modal"
      aria-labelledby="rec-modal-title"
      aria-describedby="rec-modal-desc"
      onCancel={(e) => e.preventDefault()}
      onClick={(e) => {
        // 禁止点击遮罩关闭弹窗（中老年用户常误触遮罩）
        if (e.target === dialogRef.current) {
          e.preventDefault();
        }
      }}
    >
      <div className="recommend-modal__card">
        {/* 关闭按钮 */}
        <button
          type="button"
          className="recommend-modal__close"
          aria-label="关闭推荐弹窗"
          onClick={closeAndDismiss}
        >
          ×
        </button>

        {/* 头部 */}
        <span className="recommend-modal__eyebrow">★ 注册成功</span>
        <h2 id="rec-modal-title" className="recommend-modal__title">
          根据你的症状，{getTitle(count)}
        </h2>
        <p id="rec-modal-desc" className="visually-hidden">
          共 {count} 个推荐分区，可以选择全部加入、单独加入或稍后再说。
        </p>

        {/* 推荐项 */}
        <ul className="recommend-modal__list" role="list">
          {recommendedGroups.map((group) => {
            const joined = joinedIds.has(group.id);
            const joining = joiningId === group.id;
            return (
              <li
                key={group.id}
                className={`recommend-modal__item${joined ? " recommend-modal__item--joined" : ""}`}
              >
                <div className="recommend-modal__item-body">
                  <div className="recommend-modal__item-name">{group.name}</div>
                  {group.introduction ? (
                    <div className="recommend-modal__item-meta">
                      {group.introduction.slice(0, 40)}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="btn btn--sm"
                  disabled={joined || joining}
                  aria-pressed={joined}
                  onClick={() => handleJoin(group.id)}
                >
                  {joined ? "✓ 已加入" : joining ? "加入中…" : "加入"}
                </button>
              </li>
            );
          })}
        </ul>

        {/* 底部按钮组 */}
        <div className="recommend-modal__actions">
          {count >= 2 ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleJoinAll}
              disabled={allJoined}
            >
              {allJoined ? "✓ 全部已加入，去看看" : "全部加入并去看看"}
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={closeAndDismiss}>
            稍后再说
          </button>
        </div>
      </div>
    </dialog>
  );
}
