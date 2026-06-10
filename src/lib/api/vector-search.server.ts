import { embed } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { getServerConfig } from "../config.server";
import { createAiGateway } from "../ai-gateway.server";

export async function checkIngredientVector(ingredientName: string) {
  const config = getServerConfig();
  const gateway = createAiGateway({
    provider: config.geminiProvider,
    geminiApiKey: config.geminiApiKey,
    vertexProject: config.googleVertexProject,
    vertexLocation: config.googleVertexLocation,
    vertexAuthMode: config.googleVertexAuthMode,
  });

  try {
    // 텍스트 임베딩 생성
    const { embedding } = await embed({
      model: gateway.model.textEmbeddingModel("text-multilingual-embedding-002"),
      value: ingredientName,
    });

    // Supabase pgvector RPC 호출 (유사도 80% 이상, 1건)
    const { data, error } = await supabase.rpc("match_ingredients", {
      query_embedding: embedding,
      match_threshold: 0.8,
      match_count: 1,
    });

    if (error) {
      console.error("Vector search RPC error:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Embedding generation failed:", err);
    return [];
  }
}
