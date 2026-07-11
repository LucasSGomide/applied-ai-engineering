import type { ClassificationResult } from '../classifier.ts'
import type { SummaryResult } from '../summarizer.ts'

export const fixtures = {
    items: [
        'Fixed the session timeout bug — root cause was stale token cache',
        'Opened PR #234 for the auth refactor, waiting on design team review',
        'Need to align with platform team on new token TTL before merging',
        'Today: address PR feedback, sync with platform team',
        'Blocker: design review for PR #234 is blocking the release train',
    ],

    classification: {
        tier: 'complex',
        reason: 'Cross-team dependency on design and platform teams, active blocker blocking a release.',
    } satisfies ClassificationResult,

    summary: {
        summary: `**Yesterday**
- Fixed session timeout bug (root cause: stale token cache)
- Opened PR #234 for auth refactor

**Today**
- Address PR #234 review feedback
- Sync with platform team on new token TTL

**Blockers**
- ⚠️ Design review for PR #234 is blocking the release train
  → Owner: design team — needs to be escalated if not resolved by EOD`,
        model: 'arcee-ai/trinity-large-preview:free (mock)',
    } satisfies SummaryResult,
}
