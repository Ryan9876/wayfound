import { notFound } from "next/navigation";
import LegacyWorkspace from "@/components/legacy-workspace";
import { GuidedWorkspace } from "@/components/guided-workspace";
import { WorkspaceDefinitionView } from "@/components/workspace-definition-view";
import { workspaceService } from "@/lib/application/workspaces";
import { decisionService } from "@/lib/application/decisions";
import { workItemService } from "@/lib/application/work-items";
import { requirementService } from "@/lib/application/requirements";
import { evidenceService } from "@/lib/application/evidence";
import { artifactService } from "@/lib/application/artifacts";
import { technicalDecisionService } from "@/lib/application/technical-decisions";
import { technicalRequirementService } from "@/lib/application/technical-requirements";
import { workspaceView } from "@/lib/workspace-guidance";

export const dynamic = "force-dynamic";

export default async function WorkspacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string | string[] }> }) {
  if (process.env.WAYFOUND_SINGLE_USER_MODE !== "true") return <LegacyWorkspace params={params} />;
  const { id } = await params;
  const workspace = await (await workspaceService()).open(id);
  if (!workspace) notFound();
  const view = workspaceView((await searchParams).view);
  if (view === "more") return <WorkspaceDefinitionView workspace={workspace} view="more" />;

  const [decisions, workItems, requirements, evidence, artifacts, technicalChoices, technicalRequirements] = await Promise.all([
    (await decisionService()).list(id),
    (await workItemService()).list(id),
    (await requirementService()).list(id),
    (await evidenceService()).list(id),
    (await artifactService()).list(id),
    (await technicalDecisionService()).listForOwner(id),
    (await technicalRequirementService()).listForOwner(id),
  ]);

  return (
    <GuidedWorkspace
      workspace={workspace}
      view={view}
      decisions={decisions}
      workItems={workItems}
      requirements={requirements}
      evidence={evidence}
      artifacts={artifacts}
      outsideReview={[...technicalChoices, ...technicalRequirements].map((item) => ({ id: item.id, title: item.title, status: item.status, revision: item.revision }))}
    />
  );
}
