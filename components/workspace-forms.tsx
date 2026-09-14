"use client";
import { useActionState } from "react";
import {
  signIn,
  createWorkspace,
  createDecision,
  createWorkItem,
  createRequirement,
  createEvidence,
  createArtifact,
  acceptArtifactVersion,
} from "@/app/workspaces/actions";
export function SignInForm() {
  const [state, action, pending] = useActionState(signIn, { error: "" });
  return (
    <form action={action} className="durable-form">
      <label htmlFor="email">
        Email
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
        />
      </label>
      <label htmlFor="password">
        Password
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={1024}
        />
      </label>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
export function CreateWorkspaceForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(createWorkspace, {
    error: "",
  });
  return (
    <form action={action} className="durable-form">
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor="name">
        Project name
        <input
          id="name"
          name="name"
          required
          maxLength={120}
          placeholder="Name your project"
        />
      </label>
      <label htmlFor="problem">
        What problem do you want to solve?
        <textarea
          id="problem"
          name="problem"
          rows={4}
          required
          maxLength={2000}
          placeholder="Describe the problem and who experiences it."
        />
      </label>
      <label htmlFor="release">
        Release name
        <input
          id="release"
          name="release"
          required
          maxLength={80}
          defaultValue="Release 1.0"
        />
      </label>
      <p className="form-help">
        Start by clarifying the problem. You can return to your project at any
        time.
      </p>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Saving project…" : "Create project"}
      </button>
    </form>
  );
}
export function CreateDecisionForm({
  workspaceId,
  requestId,
}: {
  workspaceId: string;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(createDecision, {
    error: "",
  });
  return (
    <form action={action} className="durable-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor="decision-title">
        Decision title
        <input
          id="decision-title"
          name="title"
          required
          maxLength={160}
          placeholder="Name the decision"
        />
      </label>
      <label htmlFor="decision-statement">
        What did you decide?
        <textarea
          id="decision-statement"
          name="decision"
          rows={4}
          required
          maxLength={4000}
          placeholder="State the approved product or business choice clearly."
        />
      </label>
      <label htmlFor="decision-rationale">
        Why?
        <textarea
          id="decision-rationale"
          name="rationale"
          rows={4}
          required
          maxLength={4000}
          placeholder="Record the reason, evidence, or tradeoff behind the choice."
        />
      </label>
      <label className="owner-confirm" htmlFor="decision-authority">
        <input
          id="decision-authority"
          name="confirmAuthority"
          type="checkbox"
          required
        />
        <span>This is my decision about the product or business scope.</span>
      </label>
      <p className="form-help">
        Saving accepts this decision. Technical choices that need outside review
        cannot be approved here.
      </p>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Recording decision…" : "Add decision"}
      </button>
    </form>
  );
}
export function CreateWorkItemForm({
  workspaceId,
  requestId,
}: {
  workspaceId: string;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(createWorkItem, {
    error: "",
  });
  return (
    <form action={action} className="durable-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor="work-title">
        Work title
        <input
          id="work-title"
          name="title"
          required
          maxLength={160}
          placeholder="Name the next piece of work"
        />
      </label>
      <label htmlFor="work-outcome">
        What should this produce?
        <textarea
          id="work-outcome"
          name="outcome"
          rows={4}
          required
          maxLength={4000}
          placeholder="Describe the result you want."
        />
      </label>
      <label htmlFor="work-complete">
        Done when
        <textarea
          id="work-complete"
          name="completionCondition"
          rows={3}
          required
          maxLength={4000}
          placeholder="Describe what must be true before you call this done."
        />
      </label>
      <label htmlFor="work-evidence">
        What will show it worked?
        <textarea
          id="work-evidence"
          name="evidenceExpectation"
          rows={3}
          required
          maxLength={4000}
          placeholder="Name the test, observation, or record you will use."
        />
      </label>
      <p className="form-help">
        Saving adds Proposed work. Approve it when you are ready, then record
        when you start.
      </p>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Saving work…" : "Add work"}
      </button>
    </form>
  );
}
export function CreateRequirementForm({
  workspaceId,
  requestId,
}: {
  workspaceId: string;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(createRequirement, {
    error: "",
  });
  return (
    <form action={action} className="durable-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor="requirement-title">
        Requirement title
        <input
          id="requirement-title"
          name="title"
          required
          maxLength={160}
          placeholder="Name the required product behavior"
        />
      </label>
      <label htmlFor="requirement-obligation">
        How firm is this need?
        <select
          id="requirement-obligation"
          name="obligation"
          aria-label="How firm is this need?"
          defaultValue="MUST"
          required
        >
          <option value="MUST">Required · MUST</option>
          <option value="SHOULD">Recommended · SHOULD</option>
          <option value="MAY">Optional · MAY</option>
        </select>
      </label>
      <label htmlFor="requirement-statement">
        What must the product do?
        <textarea
          id="requirement-statement"
          name="requirement"
          rows={4}
          required
          maxLength={4000}
          placeholder="Describe the behavior. For example: show equipment available to borrow."
        />
      </label>
      <label htmlFor="acceptance-criterion">
        How will we know it works?
        <textarea
          id="acceptance-criterion"
          name="acceptanceCriterion"
          rows={4}
          required
          maxLength={4000}
          placeholder="Describe one check and the result you expect."
        />
      </label>
      <label className="owner-confirm" htmlFor="requirement-authority">
        <input
          id="requirement-authority"
          name="confirmAuthority"
          type="checkbox"
          required
        />
        <span>
          I approve this product or business requirement. Technical choices that
          need outside review cannot be approved here.
        </span>
      </label>
      <p className="form-help">
        Saving approves this requirement and its check. Describing a check does
        not mean it has passed.
      </p>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Recording requirement…" : "Add requirement"}
      </button>
    </form>
  );
}
export function CreateEvidenceForm({
  workspaceId,
  acceptanceCriterionId,
  requestId,
}: {
  workspaceId: string;
  acceptanceCriterionId: string;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(createEvidence, {
    error: "",
  });
  const suffix = acceptanceCriterionId.slice(0, 8);
  return (
    <form action={action} className="durable-form evidence-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input
        type="hidden"
        name="acceptanceCriterionId"
        value={acceptanceCriterionId}
      />
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor={`evidence-title-${suffix}`}>
        Evidence title
        <input
          id={`evidence-title-${suffix}`}
          name="title"
          required
          maxLength={160}
          placeholder="Name the recorded result"
        />
      </label>
      <label htmlFor={`evidence-effect-${suffix}`}>
        What does the result show?
        <select
          id={`evidence-effect-${suffix}`}
          name="effect"
          aria-label="What does the result show?"
          defaultValue="Supports"
          required
        >
          <option value="Supports">
            Supports — the result supports the check
          </option>
          <option value="Challenges">
            Challenges — the result conflicts with the check
          </option>
          <option value="Inconclusive">
            Inconclusive — the result does not tell us yet
          </option>
        </select>
      </label>
      <label htmlFor={`evidence-result-${suffix}`}>
        Result
        <textarea
          id={`evidence-result-${suffix}`}
          name="result"
          rows={4}
          required
          maxLength={4000}
          placeholder="Record what was observed, measured, tested, or returned."
        />
      </label>
      <label htmlFor={`evidence-source-${suffix}`}>
        Where did this come from?
        <textarea
          id={`evidence-source-${suffix}`}
          name="sourceNote"
          rows={3}
          required
          maxLength={2000}
          placeholder="Name the source, date, and method. Identify any AI-generated analysis."
        />
      </label>
      <p className="form-help">
        Saving links this result to the check. It does not mark the check as
        passed or the work as Validated.
      </p>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <button className="button secondary" type="submit" disabled={pending}>
        {pending ? "Recording evidence…" : "Add evidence"}
      </button>
    </form>
  );
}
export function CreateArtifactForm({
  workspaceId,
  requestId,
}: {
  workspaceId: string;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(createArtifact, {
    error: "",
  });
  return (
    <form action={action} className="durable-form artifact-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor="artifact-title">
        Document title
        <input
          id="artifact-title"
          name="title"
          required
          maxLength={160}
          placeholder="Name the project output"
        />
      </label>
      <label htmlFor="artifact-kind">
        Document type
        <input
          id="artifact-kind"
          name="kind"
          required
          maxLength={80}
          placeholder="For example: problem brief, design, requirement set"
        />
      </label>
      <label htmlFor="artifact-summary">
        Summary
        <textarea
          id="artifact-summary"
          name="summary"
          rows={4}
          required
          maxLength={4000}
          placeholder="Describe what this document contains and why it matters."
        />
      </label>
      <label htmlFor="artifact-reference-label">
        Reference label
        <input
          id="artifact-reference-label"
          name="referenceLabel"
          required
          maxLength={160}
          placeholder="Name the external source"
        />
      </label>
      <label htmlFor="artifact-reference-url">
        Reference URL
        <input
          id="artifact-reference-url"
          name="referenceUrl"
          type="url"
          required
          maxLength={2048}
          placeholder="https://…"
        />
      </label>
      <p className="form-help">
        Saving adds a link as Proposed version 1. You can accept it after
        reviewing it. Wayfound does not read the linked content.
      </p>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <button className="button secondary" type="submit" disabled={pending}>
        {pending ? "Saving document…" : "Add document"}
      </button>
    </form>
  );
}
export function AcceptArtifactVersionForm({
  workspaceId,
  artifactId,
  versionId,
  versionNumber,
  requestId,
}: {
  workspaceId: string;
  artifactId: string;
  versionId: string;
  versionNumber: number;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(acceptArtifactVersion, {
    error: "",
  });
  const suffix = versionId.slice(0, 8);
  return (
    <form action={action} className="durable-form artifact-accept-form">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="artifactId" value={artifactId} />
      <input type="hidden" name="versionId" value={versionId} />
      <input type="hidden" name="requestId" value={requestId} />
      <label
        className="owner-confirm"
        htmlFor={`artifact-accept-authority-${suffix}`}
      >
        <input
          id={`artifact-accept-authority-${suffix}`}
          name="confirmAuthority"
          type="checkbox"
          required
        />
        <span>
          I choose this version as project direction. This does not approve
          technical choices that need outside review.
        </span>
      </label>
      <p className="form-help">
        Accepting changes this version from Proposed to Accepted. It does not
        prove the content works or is ready to release.
      </p>
      {state.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Accepting version…" : `Accept version ${versionNumber}`}
      </button>
    </form>
  );
}
