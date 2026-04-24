"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface RecommendedTrial {
  id: string;
  slug: string;
  title: string;
  city: string;
  phase: string;
}

interface ApiResponse {
  sessionId: string;
  assistantMessage: string;
  readyToRecommend: boolean;
  symptomDirection?: string;
  suggestedDepartment?: string;
  followUpQuestions?: string[];
  recommendedTrials?: RecommendedTrial[];
  disclaimer: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  readyToRecommend?: boolean;
  symptomDirection?: string;
  suggestedDepartment?: string;
  recommendedTrials?: RecommendedTrial[];
  disclaimer?: string;
}

const OPENING_MESSAGE: Message = {
  role: "assistant",
  content: "你好，告诉我你最近的主要不适，我帮你看看可以参加哪些试验。（不是诊断）",
};

export function ChatClient() {
  const [transcript, setTranscript] = useState<Message[]>([OPENING_MESSAGE]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  const userTurns = transcript.filter((m) => m.role === "user").length;
  const atLimit = userTurns >= 5;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  function handleReset() {
    setTranscript([OPENING_MESSAGE]);
    setSessionId(undefined);
    setInput("");
    textareaRef.current?.focus();
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || atLimit) return;

    const userMsg: Message = { role: "user", content: text };
    setTranscript((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/match-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, userMessage: text }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: ApiResponse = await res.json() as ApiResponse;
      setSessionId(data.sessionId);

      const assistantMsg: Message = {
        role: "assistant",
        content: data.assistantMessage,
        readyToRecommend: data.readyToRecommend,
        symptomDirection: data.symptomDirection,
        suggestedDepartment: data.suggestedDepartment,
        recommendedTrials: data.recommendedTrials,
        disclaimer: data.disclaimer,
      };

      setTranscript((prev) => [...prev, assistantMsg]);

      if (liveRef.current) {
        liveRef.current.textContent = data.assistantMessage;
      }
    } catch {
      const errMsg: Message = {
        role: "assistant",
        content: "__error__",
      };
      setTranscript((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <>
      {/* aria-live 区域给屏幕阅读器播报新消息 */}
      <div
        ref={liveRef}
        aria-live="polite"
        aria-atomic="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", overflow: "hidden" }}
      />

      <div className="ma-transcript" role="log" aria-label="对话记录">
        {transcript.map((msg, idx) => {
          if (msg.role === "user") {
            return (
              <div key={idx} className="ma-bubble-row ma-bubble-row--user">
                <div className="ma-avatar ma-avatar--user" aria-hidden="true">我</div>
                <div className="ma-bubble ma-bubble--user">{msg.content}</div>
              </div>
            );
          }

          if (msg.content === "__error__") {
            return (
              <div key={idx} className="ma-bubble-row">
                <div className="ma-avatar ma-avatar--assistant" aria-hidden="true">AI</div>
                <div className="ma-bubble ma-bubble--assistant">
                  AI 暂时不可用，你也可以直接浏览{" "}
                  <Link href="/trials" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                    试验列表
                  </Link>
                </div>
              </div>
            );
          }

          if (msg.readyToRecommend) {
            const trials = msg.recommendedTrials ?? [];
            return (
              <div key={idx} className="ma-bubble-row">
                <div className="ma-avatar ma-avatar--assistant" aria-hidden="true">AI</div>
                <div className="ma-result-card">
                  {msg.symptomDirection ? (
                    <div className="ma-result-card__section">
                      <div className="ma-result-card__label">1. 症状可能关注方向</div>
                      <div className="ma-result-card__value">{msg.symptomDirection}</div>
                    </div>
                  ) : null}

                  {msg.suggestedDepartment ? (
                    <div className="ma-result-card__section">
                      <div className="ma-result-card__label">2. 建议就医科室</div>
                      <div className="ma-result-card__value">
                        {msg.suggestedDepartment}
                        <span style={{ fontSize: "var(--fs-xs)", color: "var(--gray-500)", marginLeft: 6 }}>
                          （本平台不代替医生面诊）
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div className="ma-result-card__section">
                    <div className="ma-result-card__label">
                      3. 目前可以参加的临床试验（{trials.length} 条）
                    </div>
                    {trials.length > 0 ? (
                      <ul className="ma-result-card__trials" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                        {trials.map((t) => (
                          <li key={t.id}>
                            <Link href={`/trials/${t.slug}`} className="ma-result-card__trial-link">
                              {t.title}
                            </Link>
                            <span className="ma-result-card__trial-meta">
                              {" "}· {t.city}
                              {t.phase ? ` · ${t.phase}` : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontSize: "var(--fs-sm)", color: "var(--gray-500)" }}>
                        暂无匹配的在招试验。
                      </p>
                    )}
                  </div>

                  <div className="ma-result-card__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={handleReset}
                    >
                      继续聊
                    </button>
                    <Link href="/trials" className="btn btn--primary btn--sm">
                      回到试验列表
                    </Link>
                  </div>

                  <p className="ma-result-card__footer-note">
                    ⚠️ 以上为 AI 根据你描述生成的信息整理，不是医生意见，不构成诊断或治疗建议。如遇紧急情况请拨打 120。
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="ma-bubble-row">
              <div className="ma-avatar ma-avatar--assistant" aria-hidden="true">AI</div>
              <div className="ma-bubble ma-bubble--assistant">
                {msg.content}
                {idx !== 0 ? (
                  <p className="ma-bubble__disclaimer">
                    以上为 AI 根据你描述生成的信息整理，<strong>不是医生意见</strong>。
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}

        {loading ? (
          <div className="ma-bubble-row">
            <div className="ma-avatar ma-avatar--assistant" aria-hidden="true">AI</div>
            <div className="ma-bubble ma-bubble--assistant" aria-label="AI 正在回复">
              <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ animation: "ma-spin 1s linear infinite", display: "inline-block", width: 14, height: 14, border: "2px solid var(--gray-300)", borderTopColor: "var(--ink-900)", borderRadius: "50%" }} />
                <span style={{ color: "var(--gray-400)", fontSize: "var(--fs-xs)" }}>AI 正在思考…</span>
              </span>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} className="ma-scroll-spacer" />
      </div>

      {atLimit && !loading ? (
        <div className="ma-turn-limit" role="status">
          已达 5 轮上限，如需继续请{" "}
          <button
            type="button"
            onClick={handleReset}
            style={{ color: "var(--warning-700)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", font: "inherit", padding: 0 }}
          >
            重新开始
          </button>
          ，或去{" "}
          <Link href="/trials" style={{ color: "var(--warning-700)", textDecoration: "underline" }}>
            浏览试验列表
          </Link>
          。
        </div>
      ) : null}

      <div className="ma-input-area">
        <div className="ma-input-row">
          <textarea
            ref={textareaRef}
            className="ma-textarea"
            placeholder={atLimit ? "已达 5 轮上限" : "描述你的主要不适…（Enter 发送，Shift+Enter 换行）"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || atLimit}
            maxLength={2000}
            aria-label="输入症状描述"
            rows={2}
          />
          <button
            type="button"
            className="ma-send-btn"
            onClick={() => void handleSend()}
            disabled={loading || atLimit || !input.trim()}
            aria-label="发送"
          >
            {loading ? <span className="ma-spinner" aria-hidden="true" /> : "发送"}
          </button>
        </div>
      </div>
    </>
  );
}
