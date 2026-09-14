import type { LocalAiStatus as LocalAiStatusRecord } from "@/lib/ai/local-ai";

export function LocalAiStatus({ status }: { status: LocalAiStatusRecord }) {
  const provider = status.providerLabel ?? "Local AI";
  const stateLabel = status.state === "connected" ? "Connected" : status.state === "ready" ? "Ready" : "Offline";
  const modelLabel = status.model ? ` · ${status.model}` : "";

  return (
    <div
      className={`local-ai-status local-ai-status-${status.state}`}
      role="status"
      aria-label={`Local AI ${stateLabel.toLowerCase()}: ${status.detail}`}
      title={status.detail}
    >
      <span className="local-ai-status-dot" aria-hidden="true" />
      <span className="local-ai-status-copy">
        <strong>{stateLabel}</strong>
        <span>{provider}{modelLabel}</span>
      </span>
    </div>
  );
}
