import { OpenRouter } from "@openrouter/sdk";
import { type ChatGenerationParams } from "@openrouter/sdk/models";
import { config } from "./config.ts";

export type LLMResponse = {
  model: string;
  content: string;
};

export type GenerateOptions = {
  models: string[];
  systemPrompt: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: ChatGenerationParams["responseFormat"];
};

export class OpenRouterService {
  private client: OpenRouter;

  constructor() {
    this.client = new OpenRouter({
      apiKey: config.apiKey,
      httpReferer: config.httpReferer,
      xTitle: config.xTitle,
    });
  }

  async generate(
    userPrompt: string,
    options: GenerateOptions,
  ): Promise<LLMResponse> {
    let response: any;

    try {
      response = await this.client.chat.send({
        models: options.models,
        messages: [
          { role: "system", content: options.systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        temperature: options.temperature ?? 0.2,
        maxTokens: options.maxTokens ?? 400,
        responseFormat: options.responseFormat ?? { type: "text" },
        provider: {
          sort: { by: "throughput", partition: "none" },
        } as ChatGenerationParams["provider"],
      });
    } catch (error) {
      console.error("Error during OpenRouter API call:", error);
      return { model: options.models[0] ?? "", content: "" };
    }

    const content = String(response.choices.at(0)?.message.content ?? "");
    return { model: response.model, content };
  }
}
