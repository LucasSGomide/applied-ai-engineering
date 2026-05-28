/**
 * db.js — pgvector helper (provided — do not modify)
 *
 * Two functions you will call from supplierWorker.js:
 *   insertSupplierVector(id, vector)      — stores a supplier's encoded vector
 *   queryNearestSuppliers(vector, k)      — returns the k nearest supplier IDs
 *
 * Uses cosine distance (<->) which works well for normalised feature vectors.
 *
 * Requires: npm install pg
 * Start the DB first: docker compose up -d
 */

import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "supplier_user",
  password: "supplier_pass",
  host: "localhost",
  port: 5432,
  database: "supplier_db",
});

/**
 * insertSupplierVector(id, vector)
 *
 * Upserts a supplier's embedding into the supplier_vectors table.
 *
 * @param {string}   id     — supplier id, e.g. "S01"
 * @param {number[]} vector — encoded supplier vector (length 15)
 */
export async function insertSupplierVector(id, vector) {
  const formatted = `[${vector.join(",")}]`;
  await pool.query(
    `INSERT INTO supplier_vectors (id, embedding)
     VALUES ($1, $2)
     ON CONFLICT (id) DO UPDATE SET embedding = EXCLUDED.embedding`,
    [id, formatted],
  );
}

/**
 * queryNearestSuppliers(vector, k)
 *
 * Returns the IDs of the k most similar suppliers using cosine distance.
 * Call this BEFORE model.predict() to narrow the candidate pool.
 *
 * @param {number[]} vector — encoded ORDER vector (length 15 — same space as supplier vectors)
 * @param {number}   k      — how many candidates to retrieve (default 8)
 * @returns {Promise<string[]>} — array of supplier IDs, nearest first
 */
export async function queryNearestSuppliers(vector, k = 8) {
  const formatted = `[${vector.join(",")}]`;
  const result = await pool.query(
    `SELECT id
    FROM supplier_vectors
    ORDER BY embedding <-> $1
    LIMIT $2`,
    [formatted, k],
  );
  return result.rows.map((r) => r.id);
}
