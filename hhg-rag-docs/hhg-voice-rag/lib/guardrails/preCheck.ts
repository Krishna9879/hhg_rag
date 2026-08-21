export interface PreCheckResult {
  pass: boolean;
  reason?: "empty" | "unsafe" | "off_topic";
  message?: string;
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /you\s+are\s+now\s+(an?\s+)?unfiltered/i,
  /system\s*prompt/i,
  /jailbreak/i,
  /dan\s+mode/i,
  /bypass\s+safety/i,
  /<script/i,
];

const UNSAFE_KEYWORDS = [
  "bomb",
  "suicide",
  "kill myself",
  "make a weapon",
  "steal credit card",
  "hack into",
];

export function runPreCheckGuardrail(query: string): PreCheckResult {
  const trimmed = query.trim();

  // 1. Empty / garbage transcript filter
  if (trimmed.length < 2) {
    return {
      pass: false,
      reason: "empty",
      message: "कृपया कुछ बोलें या प्रश्न दर्ज करें (Please provide a valid question).",
    };
  }

  // 2. Prompt injection sanitization
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        pass: false,
        reason: "unsafe",
        message: "सुरक्षा कारणों से इस अनुरोध को अस्वीकार कर दिया गया है (Request refused due to safety guardrails).",
      };
    }
  }

  // 3. Unsafe content keywords
  const lower = trimmed.toLowerCase();
  for (const kw of UNSAFE_KEYWORDS) {
    if (lower.includes(kw)) {
      return {
        pass: false,
        reason: "unsafe",
        message: "यह प्रश्न हमारी सुरक्षा नीतियों के विरुद्ध है (This query violates our safety policy).",
      };
    }
  }

  return { pass: true };
}
