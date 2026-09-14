"use client";

import { useState } from "react";
import type { LocalAiStatus as LocalAiStatusRecord } from "@/lib/ai/local-ai";

type DiagnosticAttempt = {
  name: string;
  endpoint: string;
  httpStatus: number | null;
  elapsedMs: number | null;
  contentType: string | null;
  requestSummary: string;
  providerMessage: string | null;
  responsePreview: string | null;
  markerReturned: boolean | null;
};

type TestResult = {
  ok: boolean;
  providerLabel: string | null;
  model: string | null;
  response: string | null;
  responseTimeMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  reasoningTokens: number | null;
  totalTokens: number | null;
  tokensPerSecond: number | null;
  timeToFirstTokenMs: number | null;
  detail: string;
  diagnostics: {
    testedAt: string;
    selectedState: string;
    detectedProviders: string[];
    attempts: DiagnosticAttempt[];
  };
};

function metric(value: number | null, suffix = "") {
  return value === null ? "Not reported" : `${value}${suffix}`;
}

function statusLabel(status: number | null) {
  return status === null ? "No HTTP response" : `HTTP ${status}`;
}

export function LocalAiStatus({ status }: { status: LocalAiStatusRecord }) {
  const provider = status.providerLabel ?? "Local AI";
  const stateLabel = status.state === "connected" ? "Connected" : status.state === "ready" ? "Ready" : "Offline";
  const modelLabel = status.model ? ` · ${status.model}` : "";
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const canTest = Boolean(status.provider && status.model);

  async function testAi() {
    setTesting(true);
    setResult(null);
    setError(null);
    setCopied(false);
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

  async function copyDiagnostics() {
    if (!result) return;
    const payload = {
      provider: result.providerLabel,
      model: result.model,
      passed: result.ok,
      detail: result.detail,
      responseTimeMs: result.responseTimeMs,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      reasoningTokens: result.reasoningTokens,
      totalTokens: result.totalTokens,
      tokensPerSecond: result.tokensPerSecond,
      timeToFirstTokenMs: result.timeToFirstTokenMs,
      diagnostics: result.diagnostics,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
    } catch {
      setCopied(false);
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
            {result.reasoningTokens !== null ? <div><dt>Reasoning tokens</dt><dd>{metric(result.reasoningTokens)}</dd></div> : null}
            {result.tokensPerSecond !== null ? <div><dt>Generation</dt><dd>{metric(result.tokensPerSecond, " tok/s")}</dd></div> : null}
            {result.timeToFirstTokenMs !== null ? <div><dt>First token</dt><dd>{metric(result.timeToFirstTokenMs, " ms")}</dd></div> : null}
          </dl>
          {result.response ? <p className="local-ai-test-response"><strong>Response:</strong> {result.response}</p> : null}
          <p className="local-ai-test-detail">{result.detail}</p>

          <details className="local-ai-diagnostics">
            <summary>Diagnostics ({result.diagnostics.attempts.length} attempt{result.diagnostics.attempts.length === 1 ? "" : "s"})</summary>
            <div className="local-ai-diagnostics-head">
              <span><strong>Tested:</strong> {result.diagnostics.testedAt}</span>
              <span><strong>Detected:</strong> {result.diagnostics.detectedProviders.join(", ") || "none"}</span>
              <span><strong>Selected state:</strong> {result.diagnostics.selectedState}</span>
            </div>
            <div className="local-ai-diagnostic-attempts">
              {result.diagnostics.attempts.map((attempt, index) => (
                <section className="local-ai-diagnostic-attempt" key={`${attempt.name}-${index}`}>
                  <div className="local-ai-diagnostic-title">
                    <strong>{index + 1}. {attempt.name}</strong>
                    <span>{statusLabel(attempt.httpStatus)} · {metric(attempt.elapsedMs, " ms")}</span>
                  </div>
                  <dl>
                    <div><dt>Endpoint</dt><dd>{attempt.endpoint}</dd></div>
                    <div><dt>Request</dt><dd>{attempt.requestSummary}</dd></div>
                    <div><dt>Content type</dt><dd>{attempt.contentType ?? "Not reported"}</dd></div>
                    <div><dt>Marker</dt><dd>{attempt.markerReturned === null ? "Not evaluated" : attempt.markerReturned ? "Returned" : "Missing"}</dd></div>
                  </dl>
                  {attempt.providerMessage ? <p><strong>Provider message:</strong> {attempt.providerMessage}</p> : null}
                  {attempt.responsePreview ? (
                    <details className="local-ai-response-preview">
                      <summary>Raw response preview</summary>
                      <pre>{attempt.responsePreview}</pre>
                    </details>
                  ) : null}
                </section>
              ))}
            </div>
            <button className="local-ai-copy-diagnostics" type="button" onClick={copyDiagnostics}>
              {copied ? "Copied" : "Copy diagnostics"}
            </button>
          </details>
        </div>
      ) : null}
      {error ? <div className="local-ai-test-result local-ai-test-fail" role="alert"><strong>Test failed</strong><p>{error}</p></div> : null}
    </div>
  );
}
