# Supplier Recommendation Platform
## ML Pipeline with TensorFlow.js + pgvector

> **Prerequisite:** You already understand feature normalization, one-hot encoding,
> and binary classification from the reference implementation.
> Estimated time: ~6 hours.

---

## Learning Goals

By the end you will be able to:
- Encode heterogeneous business data (enums, arrays, numbers) into ML vectors
- Build and train a binary classifier in TensorFlow.js inside a Node.js Worker Thread
- Store embeddings in PostgreSQL with the pgvector extension
- Implement a two-stage recommendation pipeline: ANN search → neural re-ranking

---

## Vector Shape Reference (verify before building the network)

```
encodeSupplier → length 15
  [0–4]   region             one-hot(5)   REGIONS order
  [5–9]   suppliedCategories multi-hot(5) CATEGORIES order
  [10]    avgDeliveryDays    normalized   / maxDeliveryDays
  [11–13] priceTier          one-hot(3)   PRICE_TIERS order
  [14]    reliabilityScore   as-is

encodeOrder → length 10
  [0–4]   buyer region       one-hot(5)   (STATE_TO_REGION first!)
  [5–9]   productCategory    one-hot(5)

Combined input per sample = 15 + 10 = 25
```

---

## Setup

```bash
# 1. Install dependencies (from the modulo_2 root)
npm install

# 2. Start the vector database
docker compose up -d

# 3. Wait ~5 seconds for Postgres to initialise
```

### CLI (headless)
```bash
node supplier_recommendation_system/src/main.js
```

### Web Interface
```bash
node supplier_recommendation_system/src/server.js
# → Open http://localhost:3000
```

The web interface lets you:
- Click **Train Model** to run the full training pipeline and watch accuracy/loss update live in the sidebar charts
- Collapse or expand the charts sidebar with the **◀ / ▶** toggle
- Submit an order (state, category, product name) and see the top-5 ranked supplier recommendations with confidence scores

---

## File Overview

```
src/
  data/
    suppliers.json     — 30 suppliers across 5 Brazilian regions
    orders.json        — 120 historical orders with fulfilment data
  docker-compose.yml   — PostgreSQL 16 + pgvector extension        (provided)
  init.sql             — Creates supplier_vectors table             (provided)
  db.js                — insertSupplierVector / queryNearestSuppliers (provided — do not touch)
  main.js              — CLI worker harness & demo query            (provided — do not touch)
  server.js            — Express server: SSE training stream + recommendation API
  public/
    index.html         — Single-page UI (Chart.js charts, order form, results)
  supplierWorker.js    — ← Core ML implementation (Worker Thread)
```

---

## Implementation Order

Work through the functions **in this order** — each one builds on the previous.

### Step 1 — `makeContext(suppliers, orders)`
Find `maxDeliveryDays`. Return the context object.
Run a quick sanity check:
```js
console.log(makeContext(suppliers, orders))
// → { maxDeliveryDays: 13, regions: [...], ... }
```

### Step 2 — `encodeSupplier(supplier, context)`
Implement and verify length = 15:
```js
const ctx = makeContext(suppliers, orders)
const vec = encodeSupplier(suppliers[0], ctx)
console.log(vec.length)   // must be 15
console.log(vec)
```

### Step 3 — `encodeOrder(order, context)`
Verify length = 10:
```js
const vec = encodeOrder(orders[0], ctx)
console.log(vec.length)   // must be 10
```

### Step 4 — `createTrainingData(suppliers, orders, context)`
Verify shapes:
```js
const { xs, ys } = createTrainingData(suppliers, orders, ctx)
console.log(xs.length)    // 240  (120 orders × 2 samples each)
console.log(xs[0].length) // 25
console.log(ys[0])        // [1]
console.log(ys[1])        // [0]
```

### Step 5 — `trainModel(suppliers, orders)` (without pgvector first)
Design your neural network. Suggested starting architecture:
```
Dense(16, relu)   inputShape: [25]
Dense(8,  relu)
Dense(1,  sigmoid)
```
Confirm that loss decreases over epochs. Target accuracy > 85%.

### Step 6 — `recommend(order)` (without pgvector first)
Test with a known order and verify the fulfilling supplier ranks highly:
- buyerState: 'MG', productCategory: 'tools'  → expect S02 (BuildBR MG) or S15 (Minero Tools MG) near top

### Step 7 — Add pgvector (uncomment the TODO blocks)
```bash
docker compose up -d   # must be running
node supplier_recommendation_system/src/main.js
```
Check that `insertSupplierVector` is called 30 times (one per supplier) and
`queryNearestSuppliers` narrows the candidate pool before predict.

---

## Expected Output

### CLI
```
[status] Training started…
...
✅ Training complete — accuracy: 94.2%  epochs: 150

🏆 Top supplier recommendations:
  1. BuildBR MG (S02) — score: 0.94
  2. Minero Tools MG (S15) — score: 0.89
  3. SC Tools & Construção (S05) — score: 0.71
  4. Centro Build DF (S12) — score: 0.58
  5. GO Build Center (S29) — score: 0.41
```

### Web Interface
After training completes, the sidebar shows accuracy and loss curves across 150 epochs.
The order form appears in the main panel. Submit an order to see ranked supplier cards
with a confidence percentage and a progress bar for each result.

---

## Stretch Goals (optional)

Label all stretch code with `// STRETCH` so it's easy to find.

**STRETCH A — Dropout regularisation**
Add a `tf.layers.dropout({ rate: 0.2 })` layer between two Dense layers.
Observe: does validation loss diverge from training loss without it? Does Dropout help?

**STRETCH B — Tune WEIGHTS**
Change `WEIGHTS.regionMatch` to `1.5` and `WEIGHTS.deliveryDays` to `0.5`.
Re-run. Do nearby suppliers rank higher? Do fast suppliers matter less?

**STRETCH C — Reliability filter**
After the pgvector ANN query in `recommend()`, add:
```js
candidates = candidates.filter(s => s.reliabilityScore >= 0.75)
```
How many suppliers are filtered out? Does the top recommendation change?

---

## Key Concept: Two-Stage Recommendation

```
All 30 suppliers
      │
      ▼
pgvector ANN search (cosine distance)
"which suppliers' feature vectors are most similar to this order?"
      │
      ▼
~8 candidates
      │
      ▼
Neural network predict() — runs on 8 inputs, not 30
"of these candidates, which is the best business match?"
      │
      ▼
Top 5 results
```

In production at scale (millions of suppliers), ANN search makes the neural
network step feasible — you can't run predict() on a million rows per request.
