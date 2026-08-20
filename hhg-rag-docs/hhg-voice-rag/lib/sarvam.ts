import { getEnv } from "./env";
import { HarnessError } from "./harness/types";

export interface SarvamTranscribeResult {
  transcript: string;
  confidence: number;
  language: string;
}

/**
 * Transcribes audio blob using Sarvam AI Speech-to-Text API.
 * Wraps network calls and throws only HarnessError.
 */
export async function transcribe(
  audioBlob: Blob,
  options?: { model?: string },
  signal?: AbortSignal
): Promise<SarvamTranscribeResult> {
  const env = getEnv();
  const apiKey = env.SARVAM_API_KEY;
  const apiUrl = env.SARVAM_API_URL || "https://api.sarvam.ai";
  const modelName = options?.model || "saarika:v2";

  if (!apiKey) {
    throw new HarnessError(
      "ValidationError",
      "SARVAM_API_KEY is not configured in env variables."
    );
  }

  const formData = new FormData();
  // Sarvam expects the file field
  formData.append("file", audioBlob, "audio.wav");
  formData.append("model", modelName);

  try {
    const response = await fetch(`${apiUrl}/speech-to-text`, {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: formData,
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new HarnessError(
        "UpstreamError",
        `Sarvam STT failed with status ${response.status}: ${errorText}`,
        response.status,
        { errorText }
      );
    }

    const data = await response.json();

    if (!data.transcript) {
      throw new HarnessError(
        "ValidationError",
        "Sarvam response did not contain a transcript field",
        200,
        data
      );
    }

    return {
      transcript: data.transcript,
      confidence: typeof data.confidence === "number" ? data.confidence : 1.0,
      language: data.language_code || "en-IN",
    };
  } catch (error) {
    if (error instanceof HarnessError) {
      throw error;
    }
    
    const err = error as Error;
    if (err.name === "AbortError") {
      throw new HarnessError("UpstreamTimeout", "Sarvam STT request timed out.");
    }

    throw new HarnessError(
      "UpstreamError",
      `Failed to transcribe audio via Sarvam: ${err.message}`,
      undefined,
      err
    );
  }
}
