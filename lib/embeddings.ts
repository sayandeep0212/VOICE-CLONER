import { GoogleGenerativeAI } from '@google/generative-ai';
import { Memory } from './types';

const apiKey = process.env.GEMINI_API_KEY || '';
let genAI: GoogleGenerativeAI | null = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Calculates cosine similarity between two numeric vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);

  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

/**
 * Generates an embedding vector using Gemini text-embedding-004
 * or falls back to a deterministic semantic projection
 */
export async function getEmbedding(text: string): Promise<number[]> {
  if (genAI && apiKey) {
    try {
      const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
      const result = await model.embedContent(text);
      if (result.embedding && result.embedding.values) {
        return result.embedding.values;
      }
    } catch (error) {
      console.warn("Gemini embedding error, falling back to local semantic vector:", error);
    }
  }

  // Fast deterministic pseudo-embedding (768 dimensions) for offline demo
  return generateDeterministicEmbedding(text, 768);
}

/**
 * Generates deterministic 768-dim vector from text keywords for offline demo RAG
 */
function generateDeterministicEmbedding(text: string, dimensions = 768): number[] {
  const vector = new Array(dimensions).fill(0);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash << 5) - hash + word.charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1.0 / (1 + i * 0.1);

    // Spread to neighboring dimensions for smoother similarity
    const left = (idx - 1 + dimensions) % dimensions;
    const right = (idx + 1) % dimensions;
    vector[left] += 0.5;
    vector[right] += 0.5;
  }

  // Normalize vector
  let norm = 0;
  for (let val of vector) norm += val * val;
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

/**
 * RAG Memory Search: finds top matching memories for a given query
 */
export async function findMatchingMemories(
  query: string,
  memories: Memory[],
  topK: number = 4,
  threshold: number = 0.2
): Promise<string[]> {
  if (!memories || memories.length === 0) return [];

  const queryEmbedding = await getEmbedding(query);

  const scoredMemories = await Promise.all(
    memories.map(async (m) => {
      let emb = m.embedding;
      if (!emb || emb.length === 0) {
        emb = await getEmbedding(m.content);
        m.embedding = emb;
      }
      const similarity = cosineSimilarity(queryEmbedding, emb);
      return { content: m.content, similarity };
    })
  );

  return scoredMemories
    .filter((item) => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .map((item) => item.content);
}
