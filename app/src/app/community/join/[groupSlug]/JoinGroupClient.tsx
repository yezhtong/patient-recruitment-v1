"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  analyzeJoinSymptoms,
  confirmJoinGroup,
} from "@/lib/actions/group-join";
import type { DiseaseTag } from "@/lib/disease-matcher";

type Stage =
  | { stage: "input" }
  | { stage: "analyzing" }
  | { stage: "confirm"; tags: DiseaseTag[]; symptoms: string }
  | { stage: "submitting" };

function chipColorClass(confidence: number): string {
  if (confidence >= 0.8) return "cm-join-chip--high";
  if (confidence >= 0.5) return "cm-join-chip--mid";
  return "cm-join-chip--low";
}

export function JoinGroupClient({
  groupSlug,
  groupName,
  userRemainingSlots,
}: {
  groupSlug: string;
  groupName: string;
  userRemainingSlots: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<Stage>({ stage: "input" });
  const [symptoms, setSymptoms] = useState("");
  const [agreeDisclaimer, setAgreeDisclaimer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedTags, setConfirmedTags] = useState<DiseaseTag[]>([]);
  const [, startTransition] = useTransition();

  if (userRemainingSlots === 0) {
    return (
      <div>
        <div className="cm-breadcrumb">
          <Link href="/community">← 返回社区</Link>
        </div>
        <div className="cm-join-card">
          <h1 className="cm-join-title">无法加入【{groupName}】</h1>
          <div className="cm-join-error-banner" role="alert">
            最多加入 3 个分区，请先退出一个再加入新分区。
          </div>
          <Link href="/community" className="btn btn--outline">
            返回社区
          </Link>
        </div>
      </div>
    );
  }

  function handleAnalyze() {
    setError(null);
    if (symptoms.trim().length < 10) {
      setError("症状描述至少 10 个字");
      return;
    }
    if (!agreeDisclaimer) {
      setError("请先勾选免责声明");
      return;
    }
    setState({ stage: "analyzing" });

    startTransition(async () => {
      const res = await analyzeJoinSymptoms({
        groupSlug,
        joinSymptoms: symptoms.trim(),
      });
      if (!res.ok) {
        if (res.error === "未登录") {
          setError("登录状态已过期，3 秒后跳转到登录页…");
          setTimeout(() => {
            window.location.href = `/auth?next=/community/join/${groupSlug}`;
          }, 3000);
          setState({ stage: "input" });
          return;
        }
        setError(res.error);
        setState({ stage: "input" });
        return;
      }
      setConfirmedTags(res.tags);
      setState({ stage: "confirm", tags: res.tags, symptoms: symptoms.trim() });
    });
  }

  function handleConfirm(tags: DiseaseTag[], skipAnalysis = false) {
    setError(null);
    setState({ stage: "submitting" });

    startTransition(async () => {
      const res = await confirmJoinGroup({
        groupSlug,
        joinSymptoms: symptoms.trim(),
        confirmedTags: skipAnalysis ? [] : tags,
        agreeDisclaimer: true,
      });
      if (!res.ok) {
        if (res.error === "未登录") {
          setError("登录状态已过期，3 秒后跳转到登录页…");
          setTimeout(() => {
            window.location.href = `/auth?next=/community/join/${groupSlug}`;
          }, 3000);
          setState({ stage: "confirm", tags, symptoms: symptoms.trim() });
          return;
        }
        if (res.error.includes("最多加入")) {
          setError(res.error);
          setState({ stage: "input" });
          return;
        }
        setError(res.error);
        setState({ stage: "confirm", tags, symptoms: symptoms.trim() });
        return;
      }
      router.push(res.redirectTo);
    });
  }

  function removeTag(keyword: string) {
    if (state.stage !== "confirm") return;
    const next = state.tags.filter((t) => t.keyword !== keyword);
    setConfirmedTags(next);
    setState({ stage: "confirm", tags: next, symptoms: state.symptoms });
  }

  function resetToInput() {
    setState({ stage: "input" });
    setConfirmedTags([]);
    setError(null);
  }

  const isAnalyzing = state.stage === "analyzing";
  const isSubmitting = state.stage === "submitting";
  const isConfirm = state.stage === "confirm";

  return (
    <div>
      <div className="cm-breadcrumb">
        <Link href="/community">← 返回社区</Link>
      </div>

      <div className="cm-join-card">
        <h1 className="cm-join-title">
          加入【{groupName}】前，请补充您的疾病信息
        </h1>

        {error && (
          <div className="cm-join-error-banner" role="alert">
            {error}
          </div>
        )}

        <div className="cm-join-disclaimer">
          <p className="cm-join-disclaimer__text">
            为了让分区内病友讨论更聚焦，每次加入新分区时请用一两句话说清楚"你和这个疾病的关系"（如确诊时间、现在的状况、吃什么药）。
          </p>
          <p className="cm-join-disclaimer__text">
            这些信息只用于分区内病友互评的参考和你自己的账号资料沉淀，不构成任何医疗诊断或治疗建议。九泰临研严格保密，不对外分享，不出现在你的公开主页。
          </p>
        </div>

        {isConfirm ? (
          <div className="cm-join-symptoms-readonly">
            <div className="cm-join-symptoms-label">您的描述（只读）</div>
            <p className="cm-join-symptoms-text">{state.symptoms}</p>
          </div>
        ) : (
          <div className="cm-join-field">
            <label htmlFor="join-symptoms" className="cm-join-label">
              您和这个疾病的关系 *
            </label>
            <textarea
              id="join-symptoms"
              className="cm-join-textarea"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              maxLength={200}
              minLength={10}
              placeholder="例如：2024 年确诊高血压，目前吃络活喜控制"
              disabled={isAnalyzing || isSubmitting}
            />
            <div className="cm-join-count">
              {symptoms.length} / 200
            </div>
          </div>
        )}

        {isConfirm && (
          <div className="cm-join-tags-section">
            <div className="cm-join-tags-label">AI 分析结果</div>
            {state.tags.length === 0 ? (
              <p className="cm-join-tags-empty">
                AI 没识别出标签，你可以直接确认加入（将仅保存文本描述）
              </p>
            ) : (
              <div className="cm-join-chip-row">
                {state.tags.map((tag) => (
                  <span
                    key={tag.keyword}
                    className={`cm-join-chip ${chipColorClass(tag.confidence)}`}
                  >
                    {tag.label}
                    <button
                      type="button"
                      className="cm-join-chip-remove"
                      onClick={() => removeTag(tag.keyword)}
                      aria-label={`移除 ${tag.label}`}
                      disabled={isSubmitting}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="cm-join-agree">
          <input
            id="agree-disclaimer"
            type="checkbox"
            checked={agreeDisclaimer}
            onChange={(e) => setAgreeDisclaimer(e.target.checked)}
            disabled={isAnalyzing || isSubmitting || isConfirm}
            className="cm-join-checkbox"
          />
          <label htmlFor="agree-disclaimer" className="cm-join-agree-label">
            我知晓本分区讨论内容不构成医疗建议
          </label>
        </div>

        <div className="cm-join-actions">
          {!isConfirm ? (
            <>
              <button
                type="button"
                className="btn btn--ink"
                onClick={handleAnalyze}
                disabled={isAnalyzing || isSubmitting}
              >
                {isAnalyzing ? (
                  <span className="cm-join-spinner">
                    <span className="cm-join-spinner-dot" />
                    AI 分析中…
                  </span>
                ) : (
                  "提交并让 AI 分析"
                )}
              </button>
              <Link href="/community" className="btn btn--ghost cm-join-back">
                返回分区列表
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn--ink"
                onClick={() => handleConfirm(state.tags)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "正在加入…" : "确认加入"}
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => handleConfirm([], true)}
                disabled={isSubmitting}
              >
                跳过 AI 分析直接加入
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={resetToInput}
                disabled={isSubmitting}
              >
                重新分析
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
