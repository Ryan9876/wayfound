"use client";

import { useState } from "react";
import type { LocalAiStatus as LocalAiStatusRecord } from "@/lib/ai/local-ai";

type TestResult = {
  ok: boolean;
  providerLabel: string | null;
  model: string | null;
  response: string | null;
  responseTimeMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  tokensPerSecond: number | null;
  detail: string;
};

function metric(value: number | null, suffix = "") {
  return value === null ? "Not reported" : `${value}${suffix}`;
}

export function LocalAiStatus({ status }: { status: LocalAiStatusRecord }) {
  const provider = status.providerLabel ?? "Local AI";
  const stateLabel = status.state === "connected" ? "Connected" : status.state === "ready" ? "Ready" : "Offline";
  const modelLabel = status.model ? ` · ${status.model}` : "";
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canTest = Boolean(status.provider && status.model);

  async function testAi() {
    setTesting(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch("/api/local-ai/test", { method: "POST", cache: "no-store" });
      const body = await response.json().catch(() => null) as TestResult | { error?: string } | null;
      if (body && "ok" in body) {
        setResult(body);
      } else {
        setError(body && "error" in body && body.error ? body.error : "The local AI test did not return a usable result.");
      }
    } catch {
      setError("The local AI test could not reach Wayfound's local test endpoint.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="local-ai-control">
      <div className="local-ai-status-row">
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
        <button className="local-ai-test-button" type="button" onClick={testAi} disabled={!canTest || testing}>
          {testing ? "Testing…" : "Test AI"}
        </button>
      </div>

      {result ? (
        <div className={`local-ai-test-result ${result.ok ? "local-ai-test-pass" : "local-ai-test-fail"}`} role="status">
          <div className="local-ai-test-summary">
            <strong>{result.ok ? "Passed" : "Failed"}</strong>
            <span>{result.providerLabel ?? provider}{result.model ? ` · ${result.model}` : ""}</span>
          </div>
          <dl className="local-ai-test-metrics">
            <div><dt>Response time</dt><dd>{metric(result.responseTimeMs, " ms")}</dd></div>
            <div><dt>Input tokens</dt><dd>{metric(result.promptTokens)}</dd></div>
            <div><dt>Output tokens</dt><dd>{metric(result.completionTokens)}</dd></div>
            <div><dt>Total tokens</dt><dd>{metric(result.totalTokens)}</dd></div>
            {result.tokensPerSecond !== null ? <div><dt>Generation</dt><dd>{metric(result.tokensPerSecond, " tok/s")}</dd></div> : null}
          </dl>
          {result.response ? <p className="local-ai-test-response"><strong>Response:</strong> {result.response}</p> : null}
          <p className="local-ai-test-detail">{result.detail}</p>
        </div>
      ) : null}
      {error ? <div className="local-ai-test-result local-ai-test-fail" role="alert"><strong>Test failed</strong><p>{error}</p></div> : null}
    </div>
  );
}
