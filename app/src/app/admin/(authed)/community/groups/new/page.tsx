import Link from "next/link";
import { requireAdminRole } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { createCommunityGroup } from "@/lib/actions/community-groups";
import GroupForm from "../GroupForm";

export default async function AdminCommunityGroupNewPage() {
  try {
    await requireAdminRole();
  } catch {
    return (
      <div className="admin-card">
        <h2>需要管理员权限</h2>
        <p>仅 admin 账号可新建分区。</p>
        <Link href="/admin/community/groups" className="btn-admin">返回</Link>
      </div>
    );
  }

  const diseases = await prisma.clinicalTrial.findMany({
    select: { disease: true },
    distinct: ["disease"],
  });

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            新建分区 <em>/ 新</em>
          </h1>
          <p className="sub">新增病种社区分区</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/community/groups" className="btn-admin btn-admin--ghost">返回列表</Link>
        </div>
      </div>
      <GroupForm
        action={createCommunityGroup}
        submitLabel="创建"
        diseaseOptions={diseases.map((d) => d.disease)}
      />
    </>
  );
}
