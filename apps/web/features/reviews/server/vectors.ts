import {
  getPineconeConfigError,
  getPineconeIndex,
} from "@/features/pinecone/client";
import type { CodeChunk } from "@/features/reviews/utils/chunk-code";

const PINECONE_INDEX_WAIT_MS = 1_500;

export function buildPrNamespace(repoFullName: string, prNumber: number) {
  return `${repoFullName.replaceAll("/", "--")}--pr-${prNumber}`;
}

export async function saveChunksToPinecone(
  namespace: string,
  chunks: CodeChunk[]
) {
  if (chunks.length === 0) {
    return;
  }

  const index = getPineconeIndex();
  const ns = index.namespace(namespace);

  await ns.upsertRecords({
    records: chunks.map((chunk) => ({
      id: chunk.id,
      text: chunk.text,
      filePath: chunk.filePath,
    })),
  });
}

export type RetrievedChunk = {
  id: string;
  text: string;
  filePath: string;
  score?: number;
};

export async function searchPrContext(
  namespace: string,
  query: string,
  topK = 10
): Promise<RetrievedChunk[]> {
  const index = getPineconeIndex();
  const response = await index.namespace(namespace).searchRecords({
    query: {
      topK,
      inputs: { text: query },
    },
    fields: ["text", "filePath"],
  });

  const hits = response.result?.hits ?? [];

  const chunks: RetrievedChunk[] = [];

  for (const hit of hits) {
    const fields = hit.fields as Record<string, unknown>;
    const text = typeof fields.text === "string" ? fields.text : "";
    const filePath =
      typeof fields.filePath === "string" ? fields.filePath : "unknown";

    if (!text) {
      continue;
    }

    chunks.push({
      id: hit._id,
      text,
      filePath,
      score: hit._score,
    });
  }

  return chunks;
}

function pickDiverseChunks(chunks: CodeChunk[], topK: number): CodeChunk[] {
  const byFile = new Map<string, CodeChunk[]>();

  for (const chunk of chunks) {
    const list = byFile.get(chunk.filePath) ?? [];
    list.push(chunk);
    byFile.set(chunk.filePath, list);
  }

  const result: CodeChunk[] = [];
  const files = [...byFile.keys()];
  let fileIndex = 0;

  while (result.length < topK && files.length > 0) {
    const filePath = files[fileIndex % files.length]!;
    const list = byFile.get(filePath)!;
    const chunk = list.shift();

    if (chunk) {
      result.push(chunk);
    }

    if (list.length === 0) {
      byFile.delete(filePath);
      files.splice(files.indexOf(filePath), 1);
      fileIndex = 0;
    } else {
      fileIndex += 1;
    }
  }

  return result;
}

/** Keyword-ranked fallback when Pinecone is unavailable or returns no hits. */
export function pickLocalContextChunks(
  chunks: CodeChunk[],
  query: string,
  topK = 5,
): RetrievedChunk[] {
  if (chunks.length === 0) {
    return [];
  }

  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((term) => term.length > 2);

  const scored = chunks.map((chunk) => {
    const haystack = `${chunk.filePath} ${chunk.text}`.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (haystack.includes(term)) {
        score += 1;
      }
    }

    return { chunk, score };
  });

  scored.sort(
    (left, right) =>
      right.score - left.score ||
      left.chunk.filePath.localeCompare(right.chunk.filePath),
  );

  const selected = scored.every((entry) => entry.score === 0)
    ? pickDiverseChunks(chunks, topK)
    : scored.slice(0, topK).map((entry) => entry.chunk);

  return selected.map((chunk) => ({
    id: chunk.id,
    text: chunk.text,
    filePath: chunk.filePath,
  }));
}

/** Pinecone vector search when configured; otherwise fast in-memory chunk selection. */
export async function resolvePrContextChunks(
  namespace: string,
  chunks: CodeChunk[],
  query: string,
  topK = 5,
): Promise<RetrievedChunk[]> {
  if (getPineconeConfigError()) {
    return pickLocalContextChunks(chunks, query, topK);
  }

  try {
    await saveChunksToPinecone(namespace, chunks);
    await new Promise((resolve) => setTimeout(resolve, PINECONE_INDEX_WAIT_MS));
    const results = await searchPrContext(namespace, query, topK);

    if (results.length > 0) {
      return results;
    }
  } catch (error) {
    console.warn("[review] Pinecone unavailable, using local context:", error);
  }

  return pickLocalContextChunks(chunks, query, topK);
}
