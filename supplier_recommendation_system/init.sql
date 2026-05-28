-- Runs automatically on first container start.
-- Enables the pgvector extension and creates the supplier embeddings table.

CREATE EXTENSION IF NOT EXISTS vector;

-- Each row stores one supplier's encoded vector (15 dimensions).
-- See encodeSupplier() in supplierWorker.js for the vector layout.
CREATE TABLE IF NOT EXISTS supplier_vectors (
  id        TEXT PRIMARY KEY,
  embedding vector(10)
);
