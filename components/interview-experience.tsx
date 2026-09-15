"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RefreshCw, Sparkles } from "lucide-react";
import {
  getInterviewRecommendation,
  interviewQuestions,
  synthesizeProductBrief,
  type InterviewAnswers,
} from "@/lib/interview-engine";

const MIN_IDEA_LENGTH = 20;
const MAX_IDEA_LENGTH = 3000;

export function InterviewExperience({
  initialIdea = "",
  contextLabel = "Product definition draft",
}: {
  initialIdea?: string;
  contextLabel?: string;
}) {
  const [ideaDraft, setIdeaDraft] = useState(initialIdea);
  const [idea, setIdea] = useState("");
  const [answers, setAnswers] = useState<InterviewAnswers>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const question = interviewQuestions[currentIndex];
  const brief = useMemo(() => synthesizeProductBrief(idea || ideaDraft, answers), [idea, ideaDraft, answers]);
  const recommendation = started && !complete && question
    ? getInterviewRecommendation(question.id, { idea, answers })
    : null;
  const selected = question ? answers[question.id] : undefined;
  const answeredCount = Object.values(answers).filter(Boolean).length;
  const progressStep = started ? Math.min(currentIndex + 2, interviewQuestions.length + 1) : 1;
  const progressPercent = (progressStep / (interviewQuestions.length + 1)) * 100;

  function begin(event: FormEvent) {
    event.preventDefault();
    const nextIdea = ideaDraft.trim();
    if (nextIdea.length < MIN_IDEA_LENGTH) {
      setError(`Add a little more context so Wayfound has enough information to guide the interview (${MIN_IDEA_LENGTH} characters minimum).`);
      return;
    }
    if (nextIdea.length > MAX_IDEA_LENGTH) {
      setError(`Keep the starting description under ${MAX_IDEA_LENGTH.toLocaleString()} characters.`);
      return;
    }
    if (idea && nextIdea !== idea) {
      setAnswers({});
      setCurrentIndex(0);
      setNotice("The starting idea changed, so later interview answers were cleared to avoid contradictory guidance.");
    } else {
      setNotice("");
    }
    setIdea(nextIdea);
    setStarted(true);
    setComplete(false);
    setError("");
  }

  function selectChoice(choiceId: string) {
    if (!question) return;
    const previous = answers[question.id];
    const changed = previous && previous !== choiceId;
    setAnswers((current) => {
      const next = { ...current, [question.id]: choiceId };
      if (changed) {
        for (let index = currentIndex + 1; index < interviewQuestions.length; index += 1) {
          delete next[interviewQuestions[index].id];
        }
      }
      return next;
    });
    setError("");
    setNotice(changed ? "This decision changed. Later answers were cleared so recommendations and the brief can be reconsidered." : "");
  }

  function continueInterview() {
    if (!question || !selected) {
      setError("Choose one option before continuing. Wayfound will not silently skip a required decision.");
      return;
    }
    setError("");
    setNotice("");
    if (currentIndex === interviewQuestions.length - 1) {
      setComplete(true);
      return;
    }
    setCurrentIndex((value) => value + 1);
  }

  function back() {
    setError("");
    setNotice("");
    if (complete) {
      setComplete(false);
      setCurrentIndex(interviewQuestions.length - 1);
      return;
    }
    if (currentIndex === 0) {
      setStarted(false);
      setIdeaDraft(idea);
      return;
    }
    setCurrentIndex((value) => value - 1);
  }

  function restart() {
    setIdea("");
    setIdeaDraft("");
    setAnswers({});
    setCurrentIndex(0);
    setStarted(false);
    setComplete(false);
    setError("");
    setNotice("Interview restarted. No product direction was approved or changed outside this draft.");
  }

  return (
    <section className="wf-interview" aria-labelledby="interview-title">
      <div className="wf-interview-heading">
        <div>
          <span className="wf-kicker">Interview</span>
          <h1 id="interview-title">Turn an incomplete idea into a coherent product brief.</h1>
          <p>Wayfound recommends a direction when the current evidence supports one. You make every consequential choice.</p>
        </div>
        <button className="wf-text-action" type="button" onClick={restart}>
          <RefreshCw size={15} aria-hidden="true" /> Restart interview
        </button>
      </div>

      <div className="wf-interview-layout">
        <div className="wf-interview-main">
          <div className="wf-progress" aria-label={`Interview progress: step ${progressStep} of ${interviewQuestions.length + 1}`}>
            <div><span>Product definition</span><strong>Step {progressStep} of {interviewQuestions.length + 1}</strong></div>
            <div className="wf-progress-track" aria-hidden="true"><span style={{ width: `${progressPercent}%` }} /></div>
          </div>

          {!started ? (
            <form className="wf-question-card wf-idea-card" onSubmit={begin} noValidate>
              <span className="wf-kicker">Start with the situation</span>
              <h2>What idea or problem are you trying to solve?</h2>
              <p>Describe it naturally. It can be a product idea, workflow problem, manual process, service issue, opportunity, or improvement.</p>
              <label htmlFor="interview-idea">Idea or problem</label>
              <textarea
                id="interview-idea"
                value={ideaDraft}
                onChange={(event) => setIdeaDraft(event.target.value)}
                rows={8}
                maxLength={MAX_IDEA_LENGTH}
                aria-describedby="idea-help idea-count"
                aria-invalid={Boolean(error)}
                placeholder="Example: Our team tracks requests through email and several spreadsheets, so nobody has a reliable view of status or ownership."
              />
              <div className="wf-field-meta"><span id="idea-help">Give enough context to explain what is happening today and why it matters.</span><span id="idea-count">{ideaDraft.length}/{MAX_IDEA_LENGTH}</span></div>
              {error ? <p className="wf-form-error" role="alert">{error}</p> : null}
              <div className="wf-question-actions wf-question-actions-end">
                <button className="wf-primary-button" type="submit">Start interview <ArrowRight size={16} aria-hidden="true" /></button>
              </div>
            </form>
          ) : complete ? (
            <article className="wf-question-card wf-completion-card">
              <span className="wf-ready-mark"><Check size={18} aria-hidden="true" /></span>
              <span className="wf-kicker">Draft complete</span>
              <h2>Brief ready for review</h2>
              <p>The interview contains enough information to review the product definition as a draft. It has not been approved, validated, or released.</p>
              <div className="wf-completion-status"><span>Draft</span><strong>{answeredCount} of {interviewQuestions.length} decisions answered</strong></div>
              <div className="wf-question-actions">
                <button className="wf-secondary-button" type="button" onClick={back}><ArrowLeft size={16} aria-hidden="true" /> Review last answer</button>
                <button className="wf-primary-button" type="button" onClick={() => setComplete(false)}>Refine brief <ArrowRight size={16} aria-hidden="true" /></button>
              </div>
            </article>
          ) : (
            <article className="wf-question-card" key={question.id}>
              <span className="wf-kicker">{question.eyebrow}</span>
              <h2>{question.prompt}</h2>
              <p>{question.context}</p>

              {recommendation ? (
                <div className="wf-recommendation" role="note" aria-label="Wayfound recommendation">
                  <span><Sparkles size={15} aria-hidden="true" /> Recommended</span>
                  <strong>{question.choices.find((choice) => choice.id === recommendation.choiceId)?.title}</strong>
                  <p>{recommendation.rationale}</p>
                </div>
              ) : (
                <div className="wf-neutral-guidance" role="note"><strong>No recommendation yet.</strong> The current answers do not support one option strongly enough. Choose the option that best matches what you know.</div>
              )}

              <div className="wf-choice-list" role="radiogroup" aria-label={question.prompt}>
                {question.choices.map((choice) => {
                  const checked = selected === choice.id;
                  const recommended = recommendation?.choiceId === choice.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      data-recommended={recommended ? "true" : undefined}
                      className={`wf-choice-card${checked ? " selected" : ""}${recommended ? " recommended" : ""}`}
                      onClick={() => selectChoice(choice.id)}
                    >
                      <span className="wf-radio" aria-hidden="true">{checked ? <Check size={13} /> : null}</span>
                      <span className="wf-choice-copy">
                        <span className="wf-choice-title-row"><strong>{choice.title}</strong>{recommended ? <span className="wf-recommended-badge">Recommended</span> : null}</span>
                        <span className="wf-choice-explanation">{choice.explanation}</span>
                        <span className="wf-choice-detail"><b>Benefit</b>{choice.benefit}</span>
                        {choice.tradeoff ? <span className="wf-choice-detail tradeoff"><b>Tradeoff</b>{choice.tradeoff}</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>

              {notice ? <p className="wf-state-notice" role="status">{notice}</p> : null}
              {error ? <p className="wf-form-error" role="alert">{error}</p> : null}
              <div className="wf-question-actions">
                <button className="wf-secondary-button" type="button" onClick={back}><ArrowLeft size={16} aria-hidden="true" /> Back</button>
                <button className="wf-primary-button" type="button" onClick={continueInterview} disabled={!selected}>Continue <ArrowRight size={16} aria-hidden="true" /></button>
              </div>
            </article>
          )}
        </div>

        <aside className="wf-brief-panel" aria-labelledby="brief-title">
          <div className="wf-brief-heading">
            <span className="wf-brief-state"><i aria-hidden="true" /> {contextLabel}</span>
            <span>{brief.complete ? "Ready for review" : "Building"}</span>
          </div>
          <h2 id="brief-title">Product Brief</h2>
          <p className="wf-brief-narrative">{brief.narrative || "Your product brief will take shape here as the interview turns the starting idea into connected decisions."}</p>
          <dl className="wf-brief-fields">
            {brief.fields.map((field) => <div key={field.label}><dt>{field.label}</dt><dd>{field.value}</dd></div>)}
          </dl>
          <div className="wf-brief-footer">
            <strong>{brief.complete ? "Brief ready for review" : `${answeredCount} of ${interviewQuestions.length} decisions captured`}</strong>
            <p>Draft guidance only. Interview completion does not approve product direction or verify an outcome.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
