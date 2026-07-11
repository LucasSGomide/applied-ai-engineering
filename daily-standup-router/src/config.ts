export type Tier = "simple" | "moderate" | "complex";

export type TierConfig = {
  models: string[];
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
};

export type AppConfig = {
  apiKey: string;
  httpReferer: string;
  xTitle: string;
  port: number;
  classifierModel: string;
  tiers: Record<Tier, TierConfig>;
  isDemoMock: boolean;
};

export const config: AppConfig = {
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  httpReferer: "http://localhost",
  xTitle: "DailyStandupRouter",
  port: Number(process.env.PORT ?? 3000),

  // Cheap, fast model used for the meta-classification call.
  // The classifier reads the standup and decides the tier — it doesn't need to be smart,
  // just fast and cheap. A nano model is the right tool here.
  classifierModel: "nvidia/nemotron-3-nano-30b-a3b:free",
  isDemoMock: process.env.MOCK !== "0",
  tiers: {
    simple: {
      // Leaf tasks, no blockers, no cross-team context — format only.
      models: ["nvidia/nemotron-3-nano-30b-a3b:free"],
      temperature: 0.1,
      maxTokens: 200,
      systemPrompt: `You are a standup formatter. The engineer has a simple daily update.
Clean up and format their bullet points into a concise professional standup.
Do not add sections or analysis — just make it readable.`,
    },
    moderate: {
      // Some context or implicit dependencies — group and structure.
      models: ["nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"],
      temperature: 0.2,
      maxTokens: 400,
      systemPrompt: `You are a standup summarizer. The engineer has a moderate daily update.
Group related tasks, surface any implicit dependencies, and structure the output
into Yesterday / Today / Blockers sections. Be concise.`,
    },
    complex: {
      // Cross-team dependencies, multiple blockers, risk signals — full analysis.
      // Falls back to nano if the primary model is unavailable.
      models: ["nvidia/nemotron-3-ultra-550b-a55b:free"],
      temperature: 0.3,
      maxTokens: 600,
      systemPrompt: `You are a senior engineering lead helping your team communicate status.
The engineer has a complex daily update with cross-team dependencies or blockers.
Structure it into Yesterday / Today / Blockers sections, flag risks explicitly,
suggest who owns each blocker, and highlight anything that needs management attention.`,
    },
  },
};
