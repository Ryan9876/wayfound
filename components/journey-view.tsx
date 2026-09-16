import { AlertTriangle, Check, Circle, RotateCcw } from "lucide-react";
import { stages, type JourneyStage } from "@/lib/demo-data";

const groups: JourneyStage["group"][] = ["Discovery & experience", "Definition & delivery", "Release & operation"];

function StageStatus({ stage }: { stage: JourneyStage }) {
  if (stage.state === "complete") return <><Check size={13} /> Completed</>;
  if (stage.state === "active") return <><Circle size={9} fill="currentColor" /> Current stage</>;
  if (stage.state === "reopened") return <><RotateCcw size={13} /> Reopened</>;
  if (stage.state === "blocked") return <><AlertTriangle size={13} /> Blocked</>;
  return <><Circle size={9} /> Upcoming</>;
}

export function JourneyView() {
  const completeCount = stages.filter(stage => stage.state === "complete").length;
  const activeCount = stages.filter(stage => stage.state === "active" || stage.state === "reopened").length;
  const upcomingCount = stages.filter(stage => stage.state === "upcoming").length;

  return (
    <section className="standard-page journey-page" aria-labelledby="journey-title">
      <div className="page-title-row journey-title-row">
        <div className="journey-title-copy">
          <span className="eyebrow">Journey</span>
          <h1 id="journey-title">See the whole route. Work the next step.</h1>
          <p>Wayfound keeps all 15 stages visible without forcing every stage into a rigid sequence.</p>
        </div>
        <div className="journey-header-status">
          <span className="stage-pill"><i />Stage 2 active</span>
          <div className="journey-status-summary" aria-label="Journey status summary">
            <span><strong>{completeCount}</strong><small>Complete</small></span>
            <span><strong>{activeCount}</strong><small>Active</small></span>
            <span><strong>{upcomingCount}</strong><small>Upcoming</small></span>
          </div>
        </div>
      </div>

      <div className="journey-map-note">
        <strong>Stages show progress, not permission.</strong>
        <span>Work can span stages when the evidence supports it.</span>
      </div>

      <div className="journey-groups">
        {groups.map(group => {
          const groupStages = stages.filter(stage => stage.group === group);
          return (
            <section className="journey-group" key={group} aria-labelledby={`group-${group.replaceAll(" ", "-").toLowerCase()}`}>
              <div className="group-title">
                <h2 id={`group-${group.replaceAll(" ", "-").toLowerCase()}`}>{group}</h2>
                <span>{groupStages.length} stages</span>
              </div>
              <div className="stage-grid">
                {groupStages.map(stage => (
                  <article
                    className={`stage-card ${stage.state}`}
                    key={stage.number}
                    aria-current={stage.state === "active" ? "step" : undefined}
                  >
                    <div className="stage-number" aria-hidden="true">
                      {stage.state === "complete" ? <Check size={15} /> : stage.state === "active" ? <Circle size={11} fill="currentColor" /> : stage.state === "reopened" ? <RotateCcw size={14} /> : String(stage.number).padStart(2, "0")}
                    </div>
                    <div className="stage-copy">
                      <span className="stage-kicker">Stage {stage.number}</span>
                      <h3>{stage.name}</h3>
                      <p>{stage.purpose}</p>
                    </div>
                    <div className="stage-state"><StageStatus stage={stage} /></div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
