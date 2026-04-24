type Role = "patient" | "doctor" | "ai" | string | null | undefined;

export function RoleBadge({
  role,
  size = "sm",
}: {
  role?: Role;
  size?: "sm" | "md";
}) {
  if (role === "doctor") {
    return (
      <span
        className={`role-badge role-badge--doctor role-badge--${size}`}
        title="此用户经九泰临研核实为执业医师。医生在社区的发言代表个人观点，不构成正式医疗建议。"
      >
        ✓ 医生
      </span>
    );
  }
  if (role === "ai") {
    return (
      <span
        className={`role-badge role-badge--ai role-badge--${size}`}
        title="这是九泰 AI 助理自动生成的内容，用于引导和常见问题答复。如需人工帮助请联系客服 400-888-1688。AI 回复不构成医疗建议。"
      >
        🤖 九泰 AI 助理
      </span>
    );
  }
  return null;
}
