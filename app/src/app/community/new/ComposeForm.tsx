"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPost } from "@/lib/actions/community";

type GroupOption = { slug: string; name: string };

export function ComposeForm({
  groups,
  defaultGroupSlug,
}: {
  groups: GroupOption[];
  defaultGroupSlug: string;
}) {
  const router = useRouter();
  const [groupSlug, setGroupSlug] = useState(defaultGroupSlug);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"question" | "experience">("question");
  const [anonymous, setAnonymous] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [hits, setHits] = useState<
    Array<{ keyword: string; riskType: string; riskLevel: string }> | null
  >(null);
  const [info, setInfo] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setHits(null);
    setInfo(null);

    if (title.trim().length < 4) {
      setError("标题至少 4 个字");
      return;
    }
    if (content.trim().length < 20) {
      setError("正文至少 20 个字");
      return;
    }

    start(async () => {
      const res = await createPost({
        groupSlug,
        title: title.trim(),
        content: content.trim(),
        postType,
        isAnonymous: anonymous,
      });
      if (!res.ok) {
        setError(res.error);
        setHits(res.hits ?? null);
        return;
      }
      if (res.status === "pending") {
        setInfo(res.message);
        return;
      }
      router.push(`/community/posts/${res.postId}`);
    });
  }

  return (
    <form className="cm-compose-form" onSubmit={submit}>
      <div>
        <label>类型 *</label>
        <div className="radio-row">
          <label>
            <input
              type="radio"
              name="postType"
              value="question"
              checked={postType === "question"}
              onChange={() => setPostType("question")}
            />
            提问
          </label>
          <label>
            <input
              type="radio"
              name="postType"
              value="experience"
              checked={postType === "experience"}
              onChange={() => setPostType("experience")}
            />
            经验分享
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="groupSlug">病种分区 *</label>
        <select
          id="groupSlug"
          value={groupSlug}
          onChange={(e) => setGroupSlug(e.target.value)}
          required
        >
          <option value="" disabled>
            选择一个分区
          </option>
          {groups.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="title">标题 *</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
          placeholder="一句话概括你的问题或经验"
          required
        />
        <div className="count-indicator">{title.length} / 60</div>
      </div>

      <div>
        <label htmlFor="content">正文 *</label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          placeholder="详细描述你的情况、想法或问题。至少 20 字。"
          required
        />
        <div className="count-indicator">{content.length} / 2000</div>
      </div>

      <div className="cm-anon-toggle">
        <div className="cm-anon-toggle__top">
          <input
            id="anonymous"
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
          />
          <label htmlFor="anonymous" style={{ margin: 0 }}>
            <span>匿名发布</span>
          </label>
        </div>
        <p>
          开启后，其他用户会看到类似「匿名患者 #A3F2」。运营后台仍可追溯到你的账号（仅用于违规处理与数据备份）。
        </p>
      </div>

      {error ? (
        <div className="cm-compose-error" role="alert">
          <strong>⛔ {error}</strong>
          {hits && hits.length > 0 ? (
            <ul>
              {hits.map((h, i) => (
                <li key={i}>
                  {h.riskType === "contact"
                    ? "疑似暴露联系方式"
                    : h.riskType === "drug-sale"
                      ? "疑似售药 / 代购"
                      : h.riskType === "enroll-promise"
                        ? "疑似违规入组承诺"
                        : h.riskType === "quackery"
                          ? "疑似偏方 / 夸大疗效"
                          : "疑似引流广告"}
                  ：<code>{h.keyword}</code>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {info ? <div className="cm-compose-info">{info}</div> : null}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <button
          type="submit"
          className="btn btn--ink btn--lg"
          disabled={pending}
        >
          {pending ? "发布中…" : "发布"}
          <span className="arrow"> →</span>
        </button>
      </div>
    </form>
  );
}
