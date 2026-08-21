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
  const modelName = options?.model || "saarika:v2.5";

  if (!apiKey) {
    throw new HarnessError(
      "ValidationError",
      "SARVAM_API_KEY is not configured in env variables."
    );
  }

  const formData = new FormData();
  // Normalize MIME type to standard audio/webm or audio/wav without codecs parameters
  let mime = audioBlob.type ? audioBlob.type.split(";")[0].trim() : "audio/webm";
  if (!mime || mime === "application/octet-stream") {
    mime = "audio/webm";
  }
  const arrayBuffer = await audioBlob.arrayBuffer();
  const cleanBlob = new Blob([arrayBuffer], { type: mime });
  const filename = mime.includes("wav") ? "audio.wav" : mime.includes("mp4") ? "audio.mp4" : "audio.webm";

  formData.append("file", cleanBlob, filename);
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

    if (data.transcript === undefined || data.transcript === null) {
      throw new HarnessError(
        "ValidationError",
        "Sarvam response did not contain a valid transcript field",
        200,
        data
      );
    }

    return {
      transcript: typeof data.transcript === "string" ? data.transcript.trim() : "",
      confidence: typeof data.confidence === "number" ? data.confidence : 1.0,
      language: data.language_code || "hi-IN",
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
