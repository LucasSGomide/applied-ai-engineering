import Fastify from "fastify";
import { classify } from "./classifier.ts";
import { summarize } from "./summarizer.ts";
import { OpenRouterService } from "./openrouterService.ts";

export const createServer = (service: OpenRouterService) => {
  const app = Fastify({ logger: false });

  app.post(
    "/standup",
    {
      schema: {
        body: {
          type: "object",
          required: ["items"],
          properties: {
            items: {
              type: "array",
              items: { type: "string", minLength: 3 },
              minItems: 1,
              maxItems: 20,
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { items } = request.body as { items: string[] };

        const classification = await classify(items, service);
        const result = await summarize(items, classification.tier, service);
        console.log("Classification:", classification);
        return reply.send({
          tier: classification.tier,
          tierReason: classification.reason,
          model: result.model,
          summary: result.summary,
        });
      } catch (error) {
        console.error("Error handling /standup request:", error);
        return reply.code(500).send({ error: "Failed to process standup" });
      }
    },
  );

  return app;
};
