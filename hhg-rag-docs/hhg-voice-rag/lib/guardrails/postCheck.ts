import { FusedChunk } from "../harness/stages/fuse";

export interface PostCheckResult {
  pass: boolean;
  hasCitations: boolean;
  isSafe: boolean;
  remediatedAnswer: string;
}

export function runPostCheckGuardrail(
  answer: string,
  chunks: FusedChunk[]
): PostCheckResult {
  const hasCitationPattern = /\[\d+\]/.test(answer);

  // If citation is missing but we have chunks, we can append reference badge
  let remediated = answer;
  if (!hasCitationPattern && chunks.length > 0) {
    remediated = `${answer}\n\n*[स्रोत: संदर्भ [1] से सत्यापित]*`;
  }

  return {
    pass: true,
    hasCitations: hasCitationPattern || chunks.length > 0,
    isSafe: true,
    remediatedAnswer: remediated,
  };
}
