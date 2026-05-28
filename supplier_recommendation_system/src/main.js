import { Worker } from "worker_threads";
import { readFileSync } from "fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const currentFilePath = fileURLToPath(import.meta.url);
const __dirname = path.dirname(currentFilePath);
const suppliersPath = path.join(__dirname, "data", "suppliers.json");
const suppliers = JSON.parse(readFileSync(suppliersPath, "utf8"));

const ordersPath = path.join(__dirname, "data", "orders.json");
const orders = JSON.parse(readFileSync(ordersPath, "utf8"));

const worker = new Worker(`${__dirname}/supplierWorker.js`);

worker.on("message", (msg) => {
  if (msg.type === "status") {
    console.log("[status]", msg.message);
  }

  if (msg.type === "trained") {
    console.log(
      `\n✅ Training complete — accuracy: ${(msg.accuracy * 100).toFixed(1)}%  epochs: ${msg.epochs} loss: ${msg.loss.toFixed(2)}`,
    );

    worker.postMessage({
      type: "recommend",
      order: {
        buyerState: "MG",
        productName: "martelo",
        productCategory: "tools",
      },
    });
  }

  if (msg.type === "recommendations") {
    console.log("\n🏆 Top supplier recommendations:");
    msg.recommendations?.forEach((r, i) => {
      console.log(
        `  ${i + 1}. ${r.supplier.name} (${r.supplier.id}) — score: ${r.score.toFixed(2)}%`,
      );
    });
    worker.terminate();
  }

  if (msg.type === "error") {
    console.error("❌ Worker error:", msg.message);
    worker.terminate();
  }
});

worker.on("error", (err) => console.error("Worker crashed:", err));
worker.postMessage({ type: "train", suppliers, orders });
