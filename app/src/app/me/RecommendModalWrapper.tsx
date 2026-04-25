"use client";

import { useState } from "react";
import { RecommendModal } from "./RecommendModal";
import type { RecommendedGroup } from "./RecommendModal";

interface Props {
  recommendedGroups: RecommendedGroup[];
  dismissed: boolean;
}

export function RecommendModalWrapper({ recommendedGroups, dismissed }: Props) {
  const [isOpen, setIsOpen] = useState(
    !dismissed && recommendedGroups.length > 0,
  );

  if (recommendedGroups.length === 0) return null;

  return (
    <>
      {/* 常驻入口：dismissed 后显示，点击可重新打开弹窗 */}
      {dismissed && !isOpen ? (
        <div className="recommend-entry">
          <button
            type="button"
            className="recommend-entry__btn"
            onClick={() => setIsOpen(true)}
          >
            你有 {recommendedGroups.length} 个推荐分区还没看 · 重新查看
          </button>
        </div>
      ) : null}

      {/* 弹窗：受控，由 isOpen 驱动 */}
      <RecommendModal
        recommendedGroups={recommendedGroups}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
