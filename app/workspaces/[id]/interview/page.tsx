import { notFound, redirect } from "next/navigation";
import { WorkspaceDefinitionView } from "@/components/workspace-definition-view";
import { workspaceService } from "@/lib/application/workspaces";

export const dynamic = "force-dynamic";

export default async function WorkspaceInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (process.env.WAYFOUND_SINGLE_USER_MODE !== "true") redirect(`/workspaces/${id}`);
  const workspace = await (await workspaceService()).open(id);
  if (!workspace) notFound();
  return <WorkspaceDefinitionView workspace={workspace} view="interview" />;
}
