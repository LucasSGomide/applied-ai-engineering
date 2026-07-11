import { config, type Tier } from "./config.ts";
import type { OpenRouterService } from "./openrouterService.ts";
import { fixtures } from "./mock/fixtures.ts";

export type SummaryResult = {
  summary: string;
  model: string;
};

export async function summarize(
  items: string[],
  tier: Tier,
  service: OpenRouterService,
): Promise<SummaryResult> {
  if (config.isDemoMock) {
    // MOCK MODE — returns canned summary so the server runs without an API key.
    return fixtures.summary;
  }

  const tierConfig = config.tiers[tier];
  const formattedItems = items.reduce((acc, item) => {
    return acc + `- ${item}\n`;
  }, "");

  const response = await service.generate(formattedItems, {
    models: tierConfig.models,
    systemPrompt: tierConfig.systemPrompt,
    temperature: tierConfig.temperature,
    maxTokens: tierConfig.maxTokens,
  });

  return { summary: response.content, model: response.model };
}
