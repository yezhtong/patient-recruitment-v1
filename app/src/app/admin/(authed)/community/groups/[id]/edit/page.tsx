import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/admin-session";
import { updateCommunityGroup } from "@/lib/actions/community-groups";
import GroupForm from "../../GroupForm";
import DeleteGroupButton from "./DeleteGroupButton";

export default async function AdminCommunityGroupEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAdminRole();
  } catch {
    return (
      <div className="admin-card">
        <h2>需要管理员权限</h2>
        <p>仅 admin 账号可编辑分区。</p>
        <Link href="/admin/community/groups" className="btn-admin">返回</Link>
      </div>
    );
  }

  const { id } = await params;
  const group = await prisma.communityGroup.findUnique({
    where: { id },
    include: { _count: { select: { posts: true } } },
  });
  if (!group) notFound();

  const [diseases, diseaseTrialCount] = await Promise.all([
    prisma.clinicalTrial.findMany({ select: { disease: true }, distinct: ["disease"] }),
    group.diseaseTag
      ? prisma.clinicalTrial.count({ where: { disease: group.diseaseTag } })
      : Promise.resolve(0),
  ]);

  const bound = updateCommunityGroup.bind(null, id);

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            编辑分区 <em>/ {group.slug}</em>
          </h1>
          <p className="sub">
            帖子 {group._count.posts} 条 · 更新 {group.updatedAt.toISOString().slice(0, 10)}
          </p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/community/groups" className="btn-admin btn-admin--ghost">返回列表</Link>
          <DeleteGroupButton id={group.id} name={group.name} postCount={group._count.posts} />
        </div>
      </div>
      <GroupForm
        action={bound}
        submitLabel="保存"
        diseaseOptions={diseases.map((d) => d.disease)}
        initialDiseaseTrialCount={diseaseTrialCount}
        initial={{
          slug: group.slug,
          name: group.name,
          diseaseTag: group.diseaseTag,
          introduction: group.introduction,
          isEnabled: group.isEnabled,
          sortOrder: group.sortOrder,
        }}
      />
    </>
  );
}
