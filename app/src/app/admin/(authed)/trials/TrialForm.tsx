"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { MediaPicker } from "@/components/admin/MediaPicker";
import type { TrialFormState } from "@/lib/actions/trials";

export type TrialFormDefaults = {
  slug?: string;
  title?: string;
  disease?: string;
  city?: string;
  phase?: string | null;
  status?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  summary?: string;
  description?: string | null;
  inclusionBrief?: string | null;
  exclusionBrief?: string | null;
  sponsor?: string | null;
  intervention?: string | null;
  studyDesign?: string | null;
  targetEnrollment?: number | null;
  siteName?: string | null;
  siteAddress?: string | null;
  contactPerson?: string | null;
  contactPhone?: string | null;
  benefits?: string | null;
  followUpPlan?: string | null;
  adVersion?: string | null;
  adVersionDate?: Date | null;
  ethicsApproval?: string | null;
  qrcodeUrl?: string | null;
  coverMediaId?: string | null;
};

const initialState: TrialFormState = {};

export function TrialForm({
  action,
  defaults = {},
  submitLabel = "保存",
  extraActions,
}: {
  action: (prev: TrialFormState, fd: FormData) => Promise<TrialFormState>;
  defaults?: TrialFormDefaults;
  submitLabel?: string;
  extraActions?: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [coverMediaId, setCoverMediaId] = useState<string | null>(
    defaults.coverMediaId ?? null,
  );

  const dateValue = defaults.adVersionDate
    ? new Date(defaults.adVersionDate).toISOString().slice(0, 10)
    : "";

  return (
    <form action={formAction} className="admin-form">
      <fieldset>
        <legend>基础信息</legend>
        <div className="row2">
          <div className="field">
            <label htmlFor="slug">slug · URL 短码</label>
            <input
              id="slug"
              name="slug"
              type="text"
              required
              defaultValue={defaults.slug ?? ""}
              placeholder="如：linac-oncology-wuwei-2025"
            />
          </div>
          <div className="field">
            <label htmlFor="status">招募状态</label>
            <select id="status" name="status" defaultValue={defaults.status ?? "recruiting"}>
              <option value="recruiting">招募中</option>
              <option value="paused">已暂停</option>
              <option value="closed">已结束</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="title">试验标题（患者友好）</label>
          <input id="title" name="title" type="text" required defaultValue={defaults.title ?? ""} />
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="disease">病种 / 适应症</label>
            <input id="disease" name="disease" type="text" required defaultValue={defaults.disease ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="city">主要城市</label>
            <input id="city" name="city" type="text" required defaultValue={defaults.city ?? ""} />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="phase">试验分期（I / II / III / IV，可留空）</label>
            <input id="phase" name="phase" type="text" defaultValue={defaults.phase ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="targetEnrollment">目标入组人数（可留空）</label>
            <input
              id="targetEnrollment"
              name="targetEnrollment"
              type="number"
              min={0}
              defaultValue={defaults.targetEnrollment ?? ""}
            />
          </div>
        </div>
        <div className="checkrow">
          <label>
            <input
              type="checkbox"
              name="isPublic"
              defaultChecked={defaults.isPublic ?? true}
            />
            公开显示
          </label>
          <label>
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={defaults.isFeatured ?? false}
            />
            首页推荐
          </label>
        </div>

        <div className="field">
          <label>试验顶图（可选）</label>
          {/* 隐藏 input 把 coverMediaId 写入 FormData */}
          <input type="hidden" name="coverMediaId" value={coverMediaId ?? ""} />
          <MediaPicker
            category="trial"
            value={coverMediaId}
            onChange={setCoverMediaId}
          />
          <p
            style={{
              marginTop: 6,
              fontSize: 12,
              color: "var(--gray-500)",
              fontFamily: "var(--font-sans)",
              lineHeight: 1.5,
            }}
          >
            仅可从素材库选图，如需上传新图请前往{" "}
            <a
              href="/admin/media?category=trial"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--ink-700)" }}
            >
              素材库管理
            </a>
          </p>
        </div>
      </fieldset>

      <fieldset>
        <legend>患者端文案</legend>
        <div className="field">
          <label htmlFor="summary">一句话摘要（首页卡片用）</label>
          <textarea id="summary" name="summary" required defaultValue={defaults.summary ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="description">详细说明（可多段）</label>
          <textarea id="description" name="description" defaultValue={defaults.description ?? ""} />
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="inclusionBrief">入选要点（每行一条）</label>
            <textarea
              id="inclusionBrief"
              name="inclusionBrief"
              defaultValue={defaults.inclusionBrief ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="exclusionBrief">排除要点（每行一条）</label>
            <textarea
              id="exclusionBrief"
              name="exclusionBrief"
              defaultValue={defaults.exclusionBrief ?? ""}
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>项目信息 / 研究中心</legend>
        <div className="row2">
          <div className="field">
            <label htmlFor="sponsor">申办方</label>
            <input id="sponsor" name="sponsor" type="text" defaultValue={defaults.sponsor ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="intervention">干预措施（药品 / 器械名称）</label>
            <input id="intervention" name="intervention" type="text" defaultValue={defaults.intervention ?? ""} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="studyDesign">研究设计</label>
          <input id="studyDesign" name="studyDesign" type="text" defaultValue={defaults.studyDesign ?? ""} />
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="siteName">研究中心名称</label>
            <input id="siteName" name="siteName" type="text" defaultValue={defaults.siteName ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="siteAddress">详细地址</label>
            <input id="siteAddress" name="siteAddress" type="text" defaultValue={defaults.siteAddress ?? ""} />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="contactPerson">联系人</label>
            <input
              id="contactPerson"
              name="contactPerson"
              type="text"
              defaultValue={defaults.contactPerson ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="contactPhone">联系电话</label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              defaultValue={defaults.contactPhone ?? ""}
            />
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>受试者权益与合规</legend>
        <div className="field">
          <label htmlFor="benefits">受试者获益（每行一条）</label>
          <textarea id="benefits" name="benefits" defaultValue={defaults.benefits ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="followUpPlan">随访安排（每行一条）</label>
          <textarea id="followUpPlan" name="followUpPlan" defaultValue={defaults.followUpPlan ?? ""} />
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="adVersion">广告版本号</label>
            <input id="adVersion" name="adVersion" type="text" defaultValue={defaults.adVersion ?? ""} />
          </div>
          <div className="field">
            <label htmlFor="adVersionDate">广告版本日期</label>
            <input id="adVersionDate" name="adVersionDate" type="date" defaultValue={dateValue} />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="ethicsApproval">伦理审批状态</label>
            <input
              id="ethicsApproval"
              name="ethicsApproval"
              type="text"
              defaultValue={defaults.ethicsApproval ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="qrcodeUrl">报名二维码 URL（可留空）</label>
            <input
              id="qrcodeUrl"
              name="qrcodeUrl"
              type="url"
              defaultValue={defaults.qrcodeUrl ?? ""}
            />
          </div>
        </div>
      </fieldset>

      {state.error ? <div className="error">{state.error}</div> : null}
      {state.ok ? (
        <div
          style={{
            background: "var(--success-50)",
            color: "var(--success-700)",
            border: "1px solid var(--success-500)",
            padding: "10px 14px",
            borderRadius: 8,
          }}
        >
          保存成功
        </div>
      ) : null}

      <div className="form-actions">
        <Link href="/admin/trials" className="btn-admin btn-admin--ghost">
          取消
        </Link>
        {extraActions}
        <button
          type="submit"
          className="btn-admin btn-admin--primary"
          disabled={pending}
        >
          {pending ? "保存中…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
