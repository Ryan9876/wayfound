import { Check, Circle, LockKeyhole } from "lucide-react";
import { stages, type JourneyStage } from "@/lib/demo-data";

const groups: JourneyStage["group"][] = ["Discovery & experience", "Definition & delivery", "Release & operation"];

export function JourneyView() {
  return (
    <section className="standard-page">
      <div className="page-title-row">
        <div><span className="eyebrow">Journey</span><h1>See the whole route. Work the next step.</h1><p>Wayfound keeps all 15 stages visible without forcing every stage into a rigid sequence.</p></div>
        <span className="stage-pill"><i />Stage 2 active</span>
      </div>
      <div className="journey-groups">
        {groups.map(group => (
          <section className="journey-group" key={group}>
            <div className="group-title"><h2>{group}</h2><span>{stages.filter(s => s.group === group).length} stages</span></div>
            <div className="stage-grid">
              {stages.filter(s => s.group === group).map(stage => (
                <article className={`stage-card ${stage.state}`} key={stage.number}>
                  <div className="stage-number">
                    {stage.state === "complete" ? <Check size={15} /> : stage.state === "upcoming" ? <span>{String(stage.number).padStart(2, "0")}</span> : <Circle size={12} fill="currentColor" />}
                  </div>
                  <div><span className="stage-kicker">Stage {stage.number}</span><h3>{stage.name}</h3><p>{stage.purpose}</p></div>
                  <div className="stage-state">{stage.state === "complete" ? "Completed" : stage.state === "active" ? "Current stage" : <><LockKeyhole size={13} /> Not started</>}</div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
