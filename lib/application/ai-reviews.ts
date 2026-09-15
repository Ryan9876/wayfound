import "server-only";

import { redirect } from "next/navigation";
import { identityClient } from "@/lib/auth/server";
import { runLocalAiWorkReview } from "@/lib/ai/local-ai-review";
import {
  validateDispositionAiReview,
  validateRequestAiWorkReview,
  type DispositionAiReviewInput,
  type RequestAiWorkReviewInput,
} from "@/lib/domain/ai-review";
import { AiReviewStore } from "@/lib/persistence/ai-reviews";

export async function aiReviewService() {
  const client = await identityClient();
  const { data, error } = await client.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError" && (!error.status || error.status >= 500)) {
    throw new Error("IDENTITY_UNAVAILABLE");
  }
  if (!data.user || data.user.is_anonymous) redirect("/sign-in");

  const store = new AiReviewStore(client);
  return {
    request: async (input: RequestAiWorkReviewInput) => {
      const validated = validateRequestAiWorkReview(input);
      const context = await store.request(validated);
      if (context.status !== "Pending") return context.id;

      const result = await runLocalAiWorkReview(context.purpose, context.target_snapshot);
      if (result.ok) {
        await store.complete(validated.workspaceId, context.id, result);
      } else {
        await store.fail(validated.workspaceId, context.id, result);
      }
      return context.id;
    },
    disposition: (input: DispositionAiReviewInput) => store.disposition(validateDispositionAiReview(input)),
  };
}
