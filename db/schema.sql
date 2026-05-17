-- Knowledge graph + vector store for the Intelligent Context Navigation PoC.
-- Loaded automatically by the postgres container at first startup.

CREATE EXTENSION IF NOT EXISTS vector;

-- One row per addressable entity in a repo (issue, PR, commit, file, symbol,
-- author, comment, doc_chunk). source_key is the natural identifier within
-- its type so re-indexing is idempotent.
CREATE TABLE IF NOT EXISTS nodes (
    id          BIGSERIAL PRIMARY KEY,
    type        TEXT NOT NULL,
    source_key  TEXT NOT NULL,
    props       JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (type, source_key)
);
CREATE INDEX IF NOT EXISTS nodes_type_idx ON nodes (type);
CREATE INDEX IF NOT EXISTS nodes_props_gin ON nodes USING GIN (props);

-- Typed edges between nodes. Use props for edge-level metadata
-- (e.g. {commit_sha, line_start, line_end}).
CREATE TABLE IF NOT EXISTS edges (
    id          BIGSERIAL PRIMARY KEY,
    src         BIGINT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    dst         BIGINT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    props       JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS edges_src_type_idx ON edges (src, type);
CREATE INDEX IF NOT EXISTS edges_dst_type_idx ON edges (dst, type);
CREATE UNIQUE INDEX IF NOT EXISTS edges_unique_idx ON edges (src, dst, type);

-- Embedding chunks. Multiple chunks per node (e.g. a long doc split by section).
-- __EMBED_DIM__ is substituted by `make db-migrate` from the EMBED_DIM env var
-- (default 1536, the native size of text-embedding-3-small). Changing the dim
-- requires `make db-reset` + a re-index — pgvector columns are fixed-dim.
CREATE TABLE IF NOT EXISTS chunks (
    id          BIGSERIAL PRIMARY KEY,
    node_id     BIGINT NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
    text        TEXT NOT NULL,
    embedding   vector(__EMBED_DIM__) NOT NULL,
    meta        JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS chunks_node_idx ON chunks (node_id);
-- HNSW works at any scale (no training/ANALYZE needed) and gives accurate
-- kNN even with a few rows — the right default for a PoC.
CREATE INDEX IF NOT EXISTS chunks_embedding_idx
    ON chunks USING hnsw (embedding vector_cosine_ops);

-- Per-repo metadata so the MCP server can answer "which repo am I serving?"
-- and so multi-repo support is a non-breaking extension later.
CREATE TABLE IF NOT EXISTS repos (
    id              BIGSERIAL PRIMARY KEY,
    owner           TEXT NOT NULL,
    name            TEXT NOT NULL,
    default_branch  TEXT,
    last_indexed_at TIMESTAMPTZ,
    head_sha        TEXT,
    UNIQUE (owner, name)
);
