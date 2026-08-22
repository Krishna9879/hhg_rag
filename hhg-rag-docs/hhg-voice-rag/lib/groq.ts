import Groq from "groq-sdk";
import { getEnv } from "./env";
import { HarnessError } from "./harness/types";

let _groq: Groq | null = null;

function getClient(): Groq {
  if (!_groq) {
    const env = getEnv();
    if (!env.GROQ_API_KEY) {
      throw new HarnessError(
        "ValidationError",
        "GROQ_API_KEY is not configured in env variables."
      );
    }
    _groq = new Groq({
      apiKey: env.GROQ_API_KEY,
    });
  }
  return _groq;
}

/**
 * Sends a chat completion request to Groq and returns the full response text.
 */
export async function generateChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  modelName?: string,
  signal?: AbortSignal
): Promise<string> {
  const client = getClient();
  const env = getEnv();
  const model = modelName || env.GROQ_MODEL_PRIMARY || "llama-3.3-70b-versatile";

  try {
    const response = await client.chat.completions.create({
      messages,
      model,
      stream: false,
      max_tokens: 150,
      temperature: 0,
    }, { signal });

    const content = response.choices[0]?.message?.content;
    if (content === null || content === undefined) {
      throw new HarnessError(
        "ValidationError",
        "Groq response did not contain content in the first choice."
      );
    }

    return content;
  } catch (error) {
    const err = error as Error;
    if (err.name === "AbortError") {
      throw new HarnessError(
        "UpstreamTimeout",
        `Groq request timed out using model '${model}'.`
      );
    }
    throw new HarnessError(
      "UpstreamError",
      `Groq chat generation failed: ${err.message}`,
      undefined,
      err
    );
  }
}

/**
 * Sends a chat completion request to Groq and yields response tokens as they stream in.
 */
export async function* generateStream(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  modelName?: string,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const client = getClient();
  const env = getEnv();
  const model = modelName || env.GROQ_MODEL_PRIMARY || "llama-3.3-70b-versatile";

  let stream;
  try {
    stream = await client.chat.completions.create({
      messages,
      model,
      stream: true,
      max_tokens: 150,
      temperature: 0,
    }, { signal });
  } catch (error) {
    const err = error as Error;
    if (err.name === "AbortError") {
      throw new HarnessError(
        "UpstreamTimeout",
        `Groq stream request timed out using model '${model}'.`
      );
    }
    throw new HarnessError(
      "UpstreamError",
      `Groq stream initialization failed: ${err.message}`,
      undefined,
      err
    );
  }

  try {
    for await (const chunk of stream) {
      // Check if signal has been aborted mid-stream
      if (signal?.aborted) {
        throw new DOMException("The user aborted a request.", "AbortError");
      }
      const token = chunk.choices[0]?.delta?.content || "";
      if (token) {
        yield token;
      }
    }
  } catch (error) {
    const err = error as Error;
    if (err.name === "AbortError" || err.message?.includes("aborted")) {
      throw new HarnessError(
        "UpstreamTimeout",
        `Groq streaming was aborted or timed out.`
      );
    }
    throw new HarnessError(
      "UpstreamError",
      `Error during Groq token streaming: ${err.message}`,
      undefined,
      err
    );
  }
}
