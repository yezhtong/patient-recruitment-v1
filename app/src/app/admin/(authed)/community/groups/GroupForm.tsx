"use client";

import { useActionState, useState } from "react";
import type { GroupFormState } from "@/lib/actions/community-groups";

interface Props {
  action: (prev: GroupFormState, fd: FormData) => Promise<GroupFormState>;
  initial?: {
    slug?: string;
    name?: string;
    diseaseTag?: string | null;
    introduction?: string | null;
    isEnabled?: boolean;
    sortOrder?: number;
  };
  submitLabel: string;
  diseaseOptions?: string[];
  initialDiseaseTrialCount?: number;
}

export default function GroupForm({ action, initial, submitLabel, diseaseOptions = [], initialDiseaseTrialCount = 0 }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as GroupFormState);
  const initialDiseaseTag = initial?.diseaseTag ?? "";
  const [diseaseTag, setDiseaseTag] = useState(initialDiseaseTag);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (
      diseaseTag !== initialDiseaseTag &&
      initialDiseaseTag !== "" &&
      initialDiseaseTrialCount > 0
    ) {
      const ok = window.confirm(
        `修改病种标签后，目前 ${initialDiseaseTrialCount} 条按旧标签匹配的试验将不再显示「病友讨论」入口。确认修改？`
      );
      if (!ok) {
        e.preventDefault();
      }
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="admin-form">
      <fieldset>
        <legend>基本信息</legend>
        {state?.error && <div className="error">{state.error}</div>}
        {state?.ok && (
          <div style={{ background: "var(--success-50)", color: "var(--success-700)", padding: "10px 14px", borderRadius: 8, fontSize: 14 }}>
            已保存
          </div>
        )}
        <div className="row2">
          <div className="field">
            <label htmlFor="name">分区名称 *</label>
            <input id="name" name="name" required defaultValue={initial?.name ?? ""} maxLength={40} />
          </div>
          <div className="field">
            <label htmlFor="slug">slug *</label>
            <input id="slug" name="slug" required pattern="[a-z0-9-]+" defaultValue={initial?.slug ?? ""} placeholder="英文小写+连字符" />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="diseaseTag">病种标签</label>
            <input
              id="diseaseTag"
              name="diseaseTag"
              list="disease-options"
              value={diseaseTag}
              onChange={(e) => setDiseaseTag(e.target.value)}
              placeholder="用于关联招募中的试验"
            />
            <datalist id="disease-options">
              {diseaseOptions.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="sortOrder">排序</label>
            <input id="sortOrder" name="sortOrder" type="number" min={0} max={10000} defaultValue={initial?.sortOrder ?? 100} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="introduction">简介</label>
          <textarea id="introduction" name="introduction" defaultValue={initial?.introduction ?? ""} maxLength={500} />
        </div>
        <div className="checkrow">
          <label>
            <input type="checkbox" name="isEnabled" defaultChecked={initial?.isEnabled ?? true} />
            启用（关闭后不在患者端 /community 显示）
          </label>
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="btn-admin btn-admin--primary" disabled={pending}>
          {pending ? "保存中…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
