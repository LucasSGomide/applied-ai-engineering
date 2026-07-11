import { z } from "zod";
import { config, type Tier } from "./config.ts";
import type { OpenRouterService } from "./openrouterService.ts";
import { fixtures } from "./mock/fixtures.ts";

export type ClassificationResult = {
  tier: Tier;
  reason: string;
};

const ClassificationSchema = z.object({
  tier: z.enum(["simple", "moderate", "complex"]),
  reason: z.string(),
});

const SYSTEM_PROMPT = `You are a complexity classifier for engineering standups.
Given a list of standup bullet points, classify the overall complexity.

### Categories:
- "simple": short list of leaf tasks, no blockers, no cross-team dependencies.
- "moderate": context/grouping needed, minor dependencies, up to one blocker.
- "complex": cross-team dependencies, multiple blockers, risk signals, or strategic decisions.

### Output Format:
Do not think out loud. Do not write a preamble. Output ONLY the JSON object.
{
  "tier": "simple", 
  "reason": "One sentence explaining the classification decision."
}`;

const FALLBACK_CLASSIFICATION: ClassificationResult = {
  tier: "moderate",
  reason: "Failed to parse classification response",
};

export async function classify(
  items: string[],
  service: OpenRouterService,
): Promise<ClassificationResult> {
  if (config.isDemoMock) {
    // MOCK MODE — returns canned classification so the server runs without an API key.
    return fixtures.classification;
  }

  const classifiedItems = items.reduce((acc, item) => {
    return acc + `- ${item}\n`;
  }, "");

  try {
    const response = await service.generate(classifiedItems, {
      models: [config.classifierModel],
      systemPrompt: SYSTEM_PROMPT,
      temperature: 0.0,
      maxTokens: 512,
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          name: "classification",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              tier: { type: "string", enum: ["simple", "moderate", "complex"] },
              reason: { type: "string" },
            },
            required: ["tier", "reason"],
          },
        },
      },
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return FALLBACK_CLASSIFICATION;
    }

    const parsed = ClassificationSchema.safeParse(JSON.parse(jsonMatch[0]));
    if (parsed.success) {
      return { tier: parsed.data.tier, reason: parsed.data.reason };
    }

    return FALLBACK_CLASSIFICATION;
  } catch (error) {
    console.error("Error during classification:", error);
    return FALLBACK_CLASSIFICATION;
  }
}
