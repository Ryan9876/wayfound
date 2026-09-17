const REQUIREMENT_ARTIFACT_TEMPLATES = {
  'game-loop': (value) => ({
    title: 'Core play experience',
    statement: `The first playable version should make “${value}” the main play activity.`,
    category: 'product'
  }),
  'learning-mode': (value) => ({
    title: 'Primary learning behavior',
    statement: `The first version should use this as its main learning job: ${value}.`,
    category: 'product'
  }),
  collaboration: (value) => ({
    title: 'Sharing model',
    statement: `The first version should use this sharing model: ${value}.`,
    category: 'product'
  }),
  control: (value) => ({
    title: 'Action control',
    statement: `The first version should use this action-control model: ${value}.`,
    category: 'safety'
  }),
  dependencies: (value) => ({
    title: 'Outside dependency handling',
    statement: `The first version should handle outside dependencies this way: ${value}.`,
    category: 'integration'
  }),
  privacy: (value) => ({
    title: 'Private information',
    statement: `The first version should use this privacy approach: ${value}.`,
    category: 'privacy'
  }),
  failure: (value) => ({
    title: 'Default failure behavior',
    statement: `When an important part fails, the first version should default to: ${value}.`,
    category: 'reliability'
  }),
  validation: (value) => ({
    title: 'Definition of done',
    statement: `Work should normally be treated as done using this rule: ${value}.`,
    category: 'quality'
  })
};

export function getDraftArtifacts(state, records) {
  const decisions = records.filter((record) => record.type === 'decision');
  const byQuestion = new Map(decisions.map((record) => [record.questionId, record]));

  const journey = decisions.map((record, index) => ({
    id: `JRN-${String(index + 1).padStart(2, '0')}-${record.questionId.toUpperCase()}`,
    type: 'journey-step',
    status: 'draft',
    title: record.title,
    statement: record.statement,
    sourceRecordIds: [record.id]
  }));

  const requirements = Object.entries(REQUIREMENT_ARTIFACT_TEMPLATES)
    .map(([questionId, template]) => {
      const source = byQuestion.get(questionId);
      if (!source) return null;
      const draft = template(source.statement);
      return {
        id: `DREQ-${questionId.toUpperCase()}`,
        type: 'draft-requirement',
        status: 'draft',
        title: draft.title,
        statement: draft.statement,
        category: draft.category,
        sourceRecordIds: [source.id]
      };
    })
    .filter(Boolean);

  const work = records
    .filter((record) => ['assumption', 'blocker', 'open-question'].includes(record.type))
    .map((record) => {
      const prefix = record.type === 'assumption' ? 'Verify' : record.type === 'blocker' ? 'Resolve' : 'Decide';
      return {
        id: `DWORK-${record.id}`,
        type: 'draft-work',
        status: 'draft',
        workType: record.type,
        title: `${prefix}: ${record.title}`,
        statement: record.statement,
        sourceRecordIds: [record.id]
      };
    });

  const briefSources = ['outcome', 'audience']
    .map((questionId) => byQuestion.get(questionId))
    .filter(Boolean);

  const brief = state.idea?.trim()
    ? {
        id: 'DBRIEF-001',
        type: 'draft-brief',
        status: 'draft',
        title: 'First build brief',
        statement: state.idea,
        outcome: byQuestion.get('outcome')?.statement ?? null,
        audience: byQuestion.get('audience')?.statement ?? null,
        sourceRecordIds: briefSources.map((record) => record.id)
      }
    : null;

  return { brief, journey, requirements, work };
}
