"use client";

import { useActionState, useState, useTransition } from "react";
import {
  analyzeSymptomsAction,
  saveSymptomsAction,
  skipSymptomsAction,
} from "@/lib/actions/symptoms";
import type { DiseaseTag } from "@/lib/disease-matcher";

type Phase = "input" | "loading" | "result" | "empty";

export function SymptomsForm() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [tags, setTags] = useState<DiseaseTag[]>([]);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [saveState, saveAction, isSaving] = useActionState(saveSymptomsAction, {});

  const charLen = text.length;
  const charCountClass =
    charLen > 480
      ? "sym-char-count sym-char-count--error"
      : charLen > 400
        ? "sym-char-count sym-char-count--warn"
        : "sym-char-count";

  function handleAnalyze() {
    if (charLen < 10) {
      setAnalyzeError("至少描述 10 个字");
      return;
    }
    setAnalyzeError(null);
    setPhase("loading");
    startTransition(async () => {
      const res = await analyzeSymptomsAction(text);
      if (!res.ok) {
        setAnalyzeError(res.error);
        setPhase("input");
        return;
      }
      setTags(res.tags);
      setPhase(res.tags.length === 0 ? "empty" : "result");
    });
  }

  function handleRetry() {
    setPhase("input");
    setTags([]);
    setAnalyzeError(null);
  }

  function handleDeleteTag(keyword: string) {
    setTags((prev) => prev.filter((t) => t.keyword !== keyword));
  }

  function chipClass(conf: number) {
    if (conf >= 0.8) return "sym-chip sym-chip--high";
    if (conf >= 0.5) return "sym-chip sym-chip--mid";
    return "sym-chip sym-chip--low";
  }

  if (phase === "loading") {
    return (
      <div>
        <div className="form-field">
          <label className="form-field__label" htmlFor="sym-text">
            症状描述 <span className="required">*</span>
          </label>
          <textarea
            className="textarea"
            id="sym-text"
            rows={6}
            disabled
            value={text}
            readOnly
            aria-busy="true"
          />
        </div>
        <p className="sym-loading-text">AI 正在分析你的症状…</p>
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div>
        <div className="sym-readonly-text">{text}</div>
        <div className="sym-empty">
          <p>没识别出明显的疾病标签</p>
          <p>你可以继续用自己的话描述症状，我们会记住</p>
        </div>
        <div className="sym-result-cta" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn--ghost" onClick={handleRetry}>
            再试一次
          </button>
          <form action={skipSymptomsAction}>
            <button type="submit" className="btn">
              先跳过
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    return (
      <div>
        <div className="sym-readonly-text">{text}</div>
        <p className="sym-result-label">AI 分析结果</p>
        {tags.length === 0 ? (
          <p className="sym-result-hint">所有标签已删除</p>
        ) : (
          <div className="sym-chips" role="list" aria-label="疾病标签">
            {tags.map((tag) => (
              <span key={tag.keyword} className={chipClass(tag.confidence)} role="listitem">
                {tag.label}
                <span className="sym-chip__conf">
                  {tag.confidence.toFixed(2)}
                </span>
                <button
                  type="button"
                  className="sym-chip__del"
                  aria-label={`删除标签 ${tag.label}`}
                  onClick={() => handleDeleteTag(tag.keyword)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="sym-result-hint">如有不准的点 × 删除；也可以重新分析。</p>
        {saveState.error && (
          <div className="sym-error" role="alert">{saveState.error}</div>
        )}
        <div className="sym-result-cta">
          <button type="button" className="btn btn--ghost" onClick={handleRetry}>
            重新分析
          </button>
          <form action={saveAction} style={{ flex: 1 }}>
            <input type="hidden" name="symptomsText" value={text} />
            <input
              type="hidden"
              name="aiDiseaseTags"
              value={JSON.stringify(tags)}
            />
            <button
              type="submit"
              className="btn btn--primary"
              style={{ width: "100%" }}
              disabled={isSaving}
            >
              {isSaving ? "保存中…" : "下一步"} <span className="arrow">→</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // input phase
  return (
    <div>
      {analyzeError && (
        <div className="sym-error" role="alert">{analyzeError}</div>
      )}
      <div className="form-field">
        <label className="form-field__label" htmlFor="sym-text">
          症状描述 <span className="required">*</span>
        </label>
        <textarea
          className="textarea"
          id="sym-text"
          name="symptomsText"
          rows={6}
          minLength={10}
          maxLength={500}
          placeholder="比如：最近半年血压偏高，经常头晕，早上手麻。"
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-describedby="sym-hint"
        />
        <p className={charCountClass} aria-live="polite">
          {charLen} / 500
        </p>
      </div>
      <div className="sym-cta-group">
        <button
          type="button"
          className="btn btn--primary btn--lg"
          style={{ width: "100%" }}
          onClick={handleAnalyze}
          disabled={isPending || charLen < 10}
        >
          AI 分析 <span className="arrow">→</span>
        </button>
        <form action={skipSymptomsAction} style={{ textAlign: "center" }}>
          <button type="submit" className="sym-skip">
            跳过（将影响试验匹配准确度）
          </button>
        </form>
      </div>
    </div>
  );
}
