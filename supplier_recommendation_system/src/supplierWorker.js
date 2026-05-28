import { parentPort } from "worker_threads";
import * as tf from "@tensorflow/tfjs-node";
import { insertSupplierVector, queryNearestSuppliers } from "./db.js";
import { Normalizer } from "./utils.js";

const STATE_TO_REGION = {
  AC: "Norte",
  AL: "Nordeste",
  AM: "Norte",
  AP: "Norte",
  BA: "Nordeste",
  CE: "Nordeste",
  DF: "Centro-Oeste",
  ES: "Sudeste",
  GO: "Centro-Oeste",
  MA: "Nordeste",
  MG: "Sudeste",
  MS: "Centro-Oeste",
  MT: "Centro-Oeste",
  PA: "Norte",
  PB: "Nordeste",
  PE: "Nordeste",
  PI: "Nordeste",
  PR: "Sul",
  RJ: "Sudeste",
  RN: "Nordeste",
  RO: "Norte",
  RR: "Norte",
  RS: "Sul",
  SC: "Sul",
  SE: "Nordeste",
  SP: "Sudeste",
  TO: "Norte",
};
const REGIONS = ["Sudeste", "Sul", "Norte", "Nordeste", "Centro-Oeste"];
const CATEGORIES = [
  "construction",
  "tools",
  "agriculture",
  "electronics",
  "food",
];
const PRICE_TIERS = ["low", "medium", "high"];
const WEIGHTS = {
  deliveryDays: 0.5,
  reliability: 0.4,
  regionMatch: 0.1,
};

let trainedModel = null;
let trainedContext = null;
let allSuppliers = null;

// ─── Message handler — do not modify ─────────────────────────────────────────
parentPort.on("message", async ({ type, suppliers, orders, order }) => {
  if (type === "train") {
    try {
      parentPort.postMessage({ type: "status", message: "Training started…" });
      const result = await trainModel(suppliers, orders);
      parentPort.postMessage({ type: "trained", ...result });
    } catch (err) {
      console.error(err);
      parentPort.postMessage({ type: "error", message: err.message });
    }
  }

  if (type === "recommend") {
    try {
      const recommendations = await recommend(order);
      parentPort.postMessage({ type: "recommendations", recommendations });
    } catch (err) {
      parentPort.postMessage({ type: "error", message: err.message });
    }
  }
});

function makeContext(suppliers, orders) {
  const avgDeliveryDays = suppliers.map((s) => s.avgDeliveryDays);
  const maxDeliveryDays = Math.max(...avgDeliveryDays);
  const minDeliveryDays = Math.min(...avgDeliveryDays);
  return {
    maxDeliveryDays,
    minDeliveryDays,
    regions: REGIONS,
    categories: CATEGORIES,
    priceTiers: PRICE_TIERS,
  };
}

function encodeSupplier(supplier, context) {
  const { regions, categories, minDeliveryDays, maxDeliveryDays, priceTiers } =
    context;
  const regionsVector = regions.map((region) => {
    const isSupplierRegion = region === supplier.region;
    return Number(Boolean(isSupplierRegion)) * WEIGHTS.regionMatch;
  });

  const categoriesVector = categories.map((category) => {
    const hasCategory = supplier.suppliedCategories.includes(category);
    return Number(Boolean(hasCategory));
  });

  const normalizedDeliveryDays = Normalizer.numbers(
    minDeliveryDays,
    maxDeliveryDays,
    supplier.avgDeliveryDays,
  );

  const priceTiersVector = priceTiers.map((priceTier) => {
    const hasCategory = supplier.priceTier === priceTier;
    return Number(Boolean(hasCategory));
  });

  const encodedSupplier = [
    ...regionsVector,
    ...categoriesVector,
    normalizedDeliveryDays * WEIGHTS.deliveryDays,
    ...priceTiersVector,
    supplier.reliabilityScore * WEIGHTS.reliability, // Is already a value between 0 and 1 so there is no need to normalize
  ];

  console.assert(encodedSupplier.length === 15, "encodeSupplier: wrong length");
  return encodedSupplier;
}

function encodeOrder(order, context) {
  const { regions, categories } = context;

  const buyerRegion = STATE_TO_REGION[order.buyerState];
  const buyerRegionVector = regions.map((region) => {
    const isRegion = region === buyerRegion;
    return Number(isRegion);
  });

  const orderCategoryVector = categories.map((category) => {
    const isCategory = category === order.productCategory;
    return Number(isCategory);
  });

  const encodedOrder = [...buyerRegionVector, ...orderCategoryVector];

  console.assert(encodedOrder.length === 10, "encodedOrder: wrong length");
  return encodedOrder;
}

function createTrainingData(suppliers, orders, context) {
  const xs = [];
  const ys = [];

  for (const order of orders) {
    const supplier = suppliers.find((s) => s.id === order.supplierId);
    const orderVector = encodeOrder(order, context);
    const supplierVector = encodeSupplier(supplier, context);
    xs.push([...supplierVector, ...orderVector]);
    ys.push([1]);

    const otherSuppliers = suppliers.filter(
      (supplier) => supplier.id !== order.supplierId,
    );
    const randomSupplier =
      otherSuppliers[Math.floor(Math.random() * otherSuppliers.length)];
    const randomSupplierVector = encodeSupplier(randomSupplier, context);
    xs.push([...randomSupplierVector, ...orderVector]);
    ys.push([0]);
  }

  return { xs, ys };
}

async function trainModel(suppliers, orders) {
  const context = makeContext(suppliers, orders);
  const { xs, ys } = createTrainingData(suppliers, orders, context);

  const xsTensor = tf.tensor2d(xs); // shape [N, 25]
  const ysTensor = tf.tensor2d(ys); // shape [N, 1]

  const model = tf.sequential();

  model.add(
    tf.layers.dense({ inputShape: [25], units: 128, activation: "relu" }),
  );
  // model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  // model.add(tf.layers.dense({ units: 32, activation: "relu" }));
  model.add(tf.layers.dense({ units: 16, activation: "relu" }));
  model.add(tf.layers.dense({ units: 8, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));

  model.compile({
    loss: "binaryCrossentropy",
    optimizer: "adam",
    metrics: ["accuracy"],
  });

  const { history, params } = await model.fit(xsTensor, ysTensor, {
    epochs: 150,
    verbose: 0,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, log) => {
        parentPort.postMessage({
          type: "epoch",
          epoch,
          loss: log.loss,
          accuracy: log.acc ?? log.accuracy,
        });
      },
    },
  });

  const accuracyData = history.acc;
  const finalAccuracy = accuracyData[accuracyData.length - 1];
  const lossData = history.loss;
  const finalLoss = lossData[lossData.length - 1];

  for (const supplier of suppliers) {
    const vec = encodeSupplier(supplier, context);
    await insertSupplierVector(supplier.id, vec.slice(0, 10));
  }

  trainedModel = model;
  trainedContext = context;
  allSuppliers = suppliers;

  return { accuracy: finalAccuracy, epochs: params.epochs, loss: finalLoss };
}

async function recommend(order) {
  if (!trainedModel || !trainedContext) {
    throw new Error("Model not trained yet");
  }
  const orderVector = encodeOrder(order, trainedContext);
  const candidateIds = await queryNearestSuppliers(orderVector, 30);
  const candidates = allSuppliers.filter((supplier) =>
    candidateIds.includes(supplier.id),
  );
  const inputMatrix = candidates.map((supplier) => [
    ...encodeSupplier(supplier, trainedContext),
    ...orderVector,
  ]);
  const inputTensor = tf.tensor2d(inputMatrix);
  const scoresTensor = trainedModel.predict(inputTensor);
  const scores = await scoresTensor.data(); // Float32Array
  const results = candidates.map((s, i) => ({
    supplier: { id: s.id, name: s.name },
    score: scores[i],
  }));
  return results.sort((a, b) => b.score - a.score).slice(0, 5);
}
