-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Table to store banned ingredients and their vector embeddings
CREATE TABLE public.ingredient_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_name TEXT NOT NULL,
    ingredient_alias TEXT,
    is_banned BOOLEAN DEFAULT true,
    embedding vector(768), -- Assumes using a standard 768-dim model like text-embedding-004
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster vector similarity search
CREATE INDEX ON public.ingredient_vectors USING hnsw (embedding vector_cosine_ops);

-- Function to perform similarity search
CREATE OR REPLACE FUNCTION match_ingredients(
    query_embedding vector(768),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id UUID,
    ingredient_name TEXT,
    ingredient_alias TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ingredient_vectors.id,
        ingredient_vectors.ingredient_name,
        ingredient_vectors.ingredient_alias,
        1 - (ingredient_vectors.embedding <=> query_embedding) AS similarity
    FROM ingredient_vectors
    WHERE 1 - (ingredient_vectors.embedding <=> query_embedding) > match_threshold
    ORDER BY ingredient_vectors.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
