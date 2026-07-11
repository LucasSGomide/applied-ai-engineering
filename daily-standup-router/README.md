# Daily Standup Router

> Adapted from **Módulo 02 — Gateway HTTP com roteamento inteligente de modelos** — `Engenharia de Software em IA Aplicada` (UNIPDS).
> Source: `modulo02-integracao-apis-llms/01-smart-model-router-gateway`.

## 1. Brief

A Fastify HTTP gateway that accepts a list of daily standup bullet points and routes them to a different language model tier based on the complexity it detects. A cheap, fast classifier model reads the items first and returns a tier (`simple` / `moderate` / `complex`). The summarizer then calls the appropriate model — with a different system prompt and token budget for each tier — and returns a structured standup summary. The output tells you which tier was chosen, why, and which model answered.

This is a tool you can actually run before your standup.

## 2. Pattern origin

**Model Tiering / Model Router** from M02 `01-smart-model-router-gateway`. The architectural decision: decouple "which model answers" from business logic. In the course example the routing criteria (throughput / latency / price) is static config. Here it becomes a dynamic decision driven by a meta-LLM call — the classifier reads the input and decides the tier at request time.

The new dimension: not just *which provider* but *which capability level* — and the tier change affects both the model list AND the system prompt depth. That's the extension this exercise practices.

## 3. Acceptance criteria

- [X] `npm install && npm start` runs in mock mode with no `.env` file and prints a coherent demo summary.
- [X] The demo output shows tier, reason, model name, and a formatted summary.
- [X] After implementing build step 2, changing the input items changes the tier returned.
- [X] After implementing build step 3, the `model` field in the response reflects the tier selected.
- [ ] Simple items → nano model response (short, formatted). Complex items → frontier model response (structured with risk flags).
- [ ] On classifier parse failure, the gateway defaults to `moderate` tier and does not crash.

## 4. Build steps

**Step 0 — Green baseline (mock mode)**
```bash
cp .env.example .env
npm install
npm start
```
Read the demo trace. Understand the full path: items → classify → route → summarize → response.

**Step 1 — Add your OPENROUTER_API_KEY to `.env`**
Get a free key at openrouter.ai. Do not set `MOCK=0` yet.

**Step 2 — Implement the classifier** (`src/classifier.ts`)
This is TODO seam #1. The classifier is the pattern-critical decision:
1. Format `items` as a bullet list
2. Call `service.generate()` with `config.classifierModel` and the `SYSTEM_PROMPT` already defined in the file
3. `JSON.parse` the response and validate with `ClassificationSchema.safeParse()`
4. On parse failure → return `{ tier: 'moderate', reason: 'classification failed' }`

Test it: `MOCK=0 npm start` → send different payloads and verify the tier changes.

**Step 3 — Implement the summarizer** (`src/summarizer.ts`)
This is TODO seam #2:
1. Look up `config.tiers[tier]` — note that each tier has different `models`, `systemPrompt`, `temperature`, and `maxTokens`
2. Call `service.generate()` with those values
3. Return `{ summary: response.content, model: response.model }`

Test it: compare the responses for a 2-item simple standup vs a 5-item cross-team complex one. The output depth should differ noticeably.

**Step 4 — Observe the routing in action**
Try these three payloads and compare the `tier`, `model`, and `summary` fields:

```bash
# Simple
curl -X POST http://localhost:3000/standup \
  -H "Content-Type: application/json" \
  -d '{"items": ["Fixed a typo in the README", "Will review one PR today"]}'

# Moderate
curl -X POST http://localhost:3000/standup \
  -H "Content-Type: application/json" \
  -d '{"items": ["Finished auth refactor", "PR #234 open for review", "Today: address feedback and merge", "Waiting on CI to pass"]}'

# Complex
curl -X POST http://localhost:3000/standup \
  -H "Content-Type: application/json" \
  -d '{"items": ["Auth refactor done but blocked on design team token TTL decision", "Platform team needs schema changes before we can deploy", "Release train cuts Friday — this blocks two other teams", "Will escalate in PM sync if not resolved by noon"]}'
```

## 5. Stretch goals

- **Structured output on the summarizer**: instead of freeform markdown, define a Zod schema for `{ yesterday: string[], today: string[], blockers: Blocker[] }` and use it. See how the course uses structured output in `modulo02-integracao-apis-llms/03-medical-appointment-z`.
- **Confidence score on the tier**: have the classifier also return a `confidence: number` (0–1). If confidence < 0.6, bump one tier up. This introduces a secondary routing signal.
- **Streaming response**: switch `stream: false` to `true` in the summarizer call and stream the summary back to the client. The OpenRouter SDK supports it — the course base shows the shape.
- **Tier override**: add an optional `{ items, forceTier: 'simple' | 'moderate' | 'complex' }` field to the request body so you can bypass the classifier for testing.

## 6. What this demonstrates

- **Model tiering as a runtime decision** — routing is not static config but a function of the input, implemented as a meta-LLM call.
- **Two-call architecture with cost discipline** — cheap classifier first, expensive model only when warranted.
- **Decoupled service design** — `OpenRouterService` is agnostic to what tier it's serving; the routing logic lives in `classifier.ts` and `config.ts`, not the service.
- **Graceful degradation** — parse failures default to `moderate`, not a crash. The system degrades safely when the classifier returns garbage.
- **Prompt strategy as a function of complexity** — the tier changes both the model and the instruction depth, which is the real lesson beyond just cost routing.

## 7. Talking points

- Why does the classifier use a cheap model instead of the same model you'd use for the summary?
- What happens to the routing if the classifier returns `simple` for every input — and how would you detect that in production?
- The system prompt changes per tier. What's the risk of having three different prompts vs one prompt that adapts? When would you refactor to a single prompt?
