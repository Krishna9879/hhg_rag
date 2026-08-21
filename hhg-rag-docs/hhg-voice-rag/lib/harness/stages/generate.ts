import { generateChat, generateStream } from "../../groq";
import { getEnv } from "../../env";
import { FusedChunk } from "./fuse";
import { withRetry } from "../retry";
import { withTimeout } from "../timeout";
import { HarnessContext, HarnessError, StageResult } from "../types";
import { recordStageTiming } from "../trace";

const GENERATION_FIRST_TOKEN_TIMEOUT_MS = 5000; // Time budget for initial token / response

export interface PromptPayload {
  systemPrompt: string;
  userPrompt: string;
}

export function buildPrompt(query: string, chunks: FusedChunk[]): PromptPayload {
  const contextString = chunks
    .map(
      (chunk, idx) =>
        `[${idx + 1}] (Source: ${chunk.docId}, Strategy: ${chunk.strategy})\n${chunk.text}`
    )
    .join("\n\n");

  const systemPrompt = `You are a high-precision, low-latency multilingual assistant for Indian languages.
Answer the user's question accurately based ONLY on the provided context passages.

RULES:
1. Ground every claim directly in the provided context passages.
2. Cite the context passages you use using inline brackets like [1], [2].
3. Answer in the same language as the user query (Hindi if asked in Hindi, English if asked in English).
4. If the provided context is insufficient or does not contain the answer, explicitly state that the information is not available in the dataset. DO NOT invent or hallucinate facts.
5. Provide ONLY the direct, concise final answer. DO NOT output any <think> tags, chain-of-thought, or internal reasoning blocks.`;

  const userPrompt = `CONTEXT PASSAGES:
${contextString}

<user_query>
${query}
</user_query>

Please provide a concise, grounded answer with citations:`;

  return { systemPrompt, userPrompt };
}

export async function runGenerateStage(
  ctx: HarnessContext,
  query: string,
  chunks: FusedChunk[]
): Promise<StageResult<{ fullAnswer: string; modelUsed: string }>> {
  const start = Date.now();
  const env = getEnv();
  const primaryModel = env.GROQ_MODEL_PRIMARY || "llama-3.3-70b-versatile";
  const fallbackModel = env.GROQ_MODEL_FALLBACK || "llama-3.1-8b-instant";

  const { systemPrompt, userPrompt } = buildPrompt(query, chunks);
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  let attempts = 0;
  let modelUsed = primaryModel;

  try {
    const fullAnswer = await withRetry(
      async (attempt) => {
        attempts = attempt;
        // On attempt 2, downgrade model to 8B for fast recovery
        modelUsed = attempt === 1 ? primaryModel : fallbackModel;

        return await withTimeout(
          async (signal) => {
            return await generateChat(messages, modelUsed, signal);
          },
          GENERATION_FIRST_TOKEN_TIMEOUT_MS,
          `LLM Generation (${modelUsed})`
        );
      },
      {
        attempts: 2,
        backoffMs: [0, 100],
        retryOn: ["UpstreamTimeout", "UpstreamError", 500, 502, 503, 504],
        onRetry: (attempt, err) => {
          console.warn(
            `[Harness] Generation attempt ${attempt} failed with ${
              (err as Error).message
            }. Downgrading to ${fallbackModel}...`
          );
        },
      }
    );

    const latencyMs = Date.now() - start;
    recordStageTiming(ctx, "generation", latencyMs);

    // Strip out <think> tags if model emits reasoning tokens
    const cleanedAnswer = fullAnswer.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    return {
      ok: true,
      data: { fullAnswer: cleanedAnswer, modelUsed },
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    recordStageTiming(ctx, "generation", latencyMs);
    const harnessError =
      error instanceof HarnessError
        ? error
        : new HarnessError("UpstreamError", (error as Error).message, undefined, error);

    return {
      ok: false,
      error: harnessError,
      latencyMs,
      attempts,
    };
  }
}

export async function* runGenerateStreamStage(
  ctx: HarnessContext,
  query: string,
  chunks: FusedChunk[],
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const env = getEnv();
  const primaryModel = env.GROQ_MODEL_PRIMARY || "llama-3.3-70b-versatile";
  const fallbackModel = env.GROQ_MODEL_FALLBACK || "llama-3.1-8b-instant";

  const { systemPrompt, userPrompt } = buildPrompt(query, chunks);
  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  let inThinking = false;
  let buffer = "";

  async function* processTokens(stream: AsyncGenerator<string, void, unknown>): AsyncGenerator<string, void, unknown> {
    for await (const token of stream) {
      buffer += token;
      
      // If we are entering thinking block
      if (!inThinking && buffer.includes("<think>")) {
        inThinking = true;
      }

      // If we are currently inside thinking block
      if (inThinking) {
        if (buffer.includes("</think>")) {
          inThinking = false;
          // Discard everything up to </think>
          const parts = buffer.split("</think>");
          buffer = parts[parts.length - 1];
          if (buffer) {
            yield buffer;
            buffer = "";
          }
        }
        continue;
      }

      // If not in thinking block and no pending <think tag
      if (!buffer.startsWith("<") || buffer.length > 8) {
        yield buffer;
        buffer = "";
      }
    }
    if (buffer && !inThinking && !buffer.includes("<think>")) {
      yield buffer;
    }
  }

  try {
    for await (const cleanToken of processTokens(generateStream(messages, primaryModel, signal))) {
      yield cleanToken;
    }
  } catch (err) {
    console.warn(
      `[Harness] Streaming with ${primaryModel} encountered error: ${(err as Error).message}. Retrying with ${fallbackModel}...`
    );
    // Fallback model attempt
    inThinking = false;
    buffer = "";
    for await (const cleanToken of processTokens(generateStream(messages, fallbackModel, signal))) {
      yield cleanToken;
    }
  }
}
