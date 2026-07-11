import { config } from "./config.ts";
import { OpenRouterService } from "./openrouterService.ts";
import { createServer } from "./server.ts";
import { fixtures } from "./mock/fixtures.ts";

if (config.isDemoMock) {
  console.log(
    "[MOCK MODE] No API key needed — classifier and summarizer return fixtures.",
  );
  console.log(
    "            Set MOCK=0 and OPENROUTER_API_KEY in .env to use live models.\n",
  );
}

const service = new OpenRouterService();
const app = createServer(service);

await app.listen({ port: config.port, host: "0.0.0.0" });
console.log(`Server running at http://localhost:${config.port}`);
// console.log(`POST /standup  body: { "items": ["..."] }\n`);

await app.inject({
  method: "POST",
  url: "/standup",
  body: {
    items: [
      "Opened PR xyz",
      "Reviwed PRs X, Y, Z",
      "Have to align a simple change with design team",
    //   "Have to align a change with design team",
    ],
  },
}).catch((err) => {
  console.error("Error during initial test request:", err);
});

if (config.isDemoMock) {
  // Smoke test: inject a request with the fixture items to prove the full path works.
  const response = await app.inject({
    method: "POST",
    url: "/standup",
    body: { items: fixtures.items },
  });

  const body = JSON.parse(response.body);
  console.log("── Demo run (mock) ──────────────────────────────────────");
  console.log(`Tier:   ${body.tier}`);
  console.log(`Reason: ${body.tierReason}`);
  console.log(`Model:  ${body.model}`);
  console.log("\nSummary:");
  console.log(body.summary);
  console.log("─────────────────────────────────────────────────────────");
}
