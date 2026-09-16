# Wayfound Communication Standard

**Status:** Approved baseline

## Purpose

Wayfound communication must make technical work easy to understand and hard to misinterpret.

Use the **Minto Pyramid Principle** to organize ideas. Use **ASD-STE100 Simplified Technical English principles** to make individual sentences precise and readable.

This standard applies to specifications, design notes, status updates, issues, pull requests, release notes, incident records, operational instructions, and technical explanations.

## 1. Organize with the Minto Pyramid Principle

### 1.1 Lead with the answer

Start with the conclusion, recommendation, decision, or current state. Do not make the reader reconstruct the answer from background information.

### 1.2 Support the answer with grouped reasoning

Each lower-level point must support the point above it. Group sibling ideas by one logical rule.

Good grouping methods include:

- priority
- sequence
- cause and effect
- alternatives
- components of one whole
- risks by category

Do not use a miscellaneous list when the items can be synthesized into a smaller number of meaningful groups.

### 1.3 Use SCQA when it adds value

For complex problems, use:

- **Situation** — the relevant stable context
- **Complication** — the change, conflict, failure, or constraint
- **Question** — the decision or problem to resolve
- **Answer** — the recommendation or result

The final communication should still lead with the answer unless the context requires a narrative sequence.

## 2. Write with ASD-STE100 principles

Wayfound uses ASD-STE100 as a practical technical-writing model. Formal ASD-STE100 compliance requires validation against the applicable standard and controlled dictionary. Unless that validation occurs, call Wayfound writing **STE-informed**.

### 2.1 Vocabulary

- Use one preferred term for each Wayfound concept.
- Do not use multiple synonyms for the same component or state.
- Prefer common words with one clear meaning.
- Define necessary technical terms.
- Avoid idioms, slang, humor that affects meaning, and decorative metaphors.
- Define acronyms on first use unless the acronym is an established project term.

### 2.2 Sentences

- Put one main idea in a sentence.
- Prefer active voice when the actor matters.
- Name the actor when responsibility could be unclear.
- Keep conditions close to the instruction they control.
- Avoid ambiguous pronouns such as `it`, `this`, or `they` when more than one referent is possible.
- Avoid long noun strings. Rewrite them as shorter phrases.
- Use direct verbs instead of abstract phrases when possible.

### 2.3 Procedures

Write procedural steps as commands.

Each step should normally contain one primary action. Put prerequisites before the action. Put expected results after the action when verification matters.

Example:

1. Stop the Wayfound worker.
2. Back up the configuration file.
3. Replace the configuration file.
4. Start the worker.
5. Confirm that the health check returns `200`.

### 2.4 Requirements

Write requirements so that a reviewer can determine whether the system satisfies them.

Preferred pattern:

> When **[condition]**, **[actor/system] MUST [behavior]** so that **[observable result]**.

Add failure behavior and constraints when they are material.

## 3. Default response structures

### Decision

1. Decision
2. Rationale
3. Tradeoffs or risks
4. Next action

### Status

1. Current state
2. What changed
3. Validation evidence
4. Remaining risk or blocker
5. Next action

### Problem

1. Most likely cause or current conclusion
2. Evidence
3. Alternative causes
4. Test or corrective action
5. Reconsideration trigger

### Design proposal

1. Recommendation
2. Objective and constraints
3. Proposed design
4. Alternatives considered
5. Risks and failure modes
6. Validation plan
7. Decision needed

### Incident

1. Service impact
2. Current state
3. Confirmed cause or current hypothesis
4. Mitigation
5. Recovery validation
6. Follow-up action

## 4. Required distinctions

Do not blur these categories:

| Category | Meaning |
| --- | --- |
| Fact | Verified from an authoritative source or direct observation |
| Assumption | Used for planning but not yet verified |
| Interpretation | A conclusion derived from facts |
| Decision | An approved choice |
| Risk | An uncertain event or condition with potential impact |
| Issue | A current condition that already requires action |
| Open question | Missing information that can materially affect the outcome |

## 5. Precision rules

- Use exact file paths, component names, versions, identifiers, ports, units, and dates when they matter.
- Use absolute dates when relative dates can cause confusion.
- Quantify impact when reliable data exists.
- Do not invent precision. State `unknown`, `not measured`, or `TBD` when necessary.
- Distinguish correlation from confirmed cause.
- Distinguish implementation from validation and release.
- State ownership when an action has an owner.

## 6. Editing test

Before sending or committing important project communication, verify:

1. Is the answer or state visible immediately?
2. Does each section support the point above it?
3. Are related ideas grouped together?
4. Does each technical term have one consistent meaning?
5. Can any sentence be interpreted in more than one reasonable way?
6. Are facts, assumptions, decisions, and risks clearly separated?
7. Does the reader know the required next action?

If any answer is no, revise the communication.
## 7. Primary interface language

Lead with the current state or next action. Use calm, conversational language for a capable domain expert who may not know software-development terms. Prefer “Add a decision,” “What did you decide?”, “Done when,” and “What will show it worked?” over internal record and governance language.

Keep canonical terminology for traceability in secondary labels, metadata, help, or Details. Do not remove a required confirmation or change a status meaning to simplify wording. Keep fact, assumption, decision, risk, issue, and open question distinct. Keep Implemented, Validated, and Released distinct.

See `INCREMENT_2_WORKSPACE_UX.md` for the active workspace contract and label mappings.
