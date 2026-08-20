import { z } from "zod";

/**
 * Centralized environment variable access with Zod validation.
 * Server-only — never import this in client components.
 */
const envSchema = z.object({
  // STT
  SARVAM_API_KEY: z.string().min(1, "SARVAM_API_KEY is required"),
  SARVAM_API_URL: z.string().url().default("https://api.sarvam.ai"),

  // Embeddings
  EMBEDDING_MODEL: z.string().default("intfloat/multilingual-e5-large"),
  EMBEDDING_API_URL: z.string().min(1, "EMBEDDING_API_URL is required"),
  EMBEDDING_API_KEY: z.string().default(""),

  // Vector DB
  QDRANT_URL: z.string().url().default("http://localhost:6333"),
  QDRANT_API_KEY: z.string().default(""),
  QDRANT_COLLECTION_PREFIX: z.string().default("msmarco"),

  // LLM
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  GROQ_MODEL_PRIMARY: z.string().default("llama-3.3-70b-versatile"),
  GROQ_MODEL_FALLBACK: z.string().default("llama-3.1-8b-instant"),

  // Dataset
  HF_TOKEN: z.string().default(""),
  HF_DATASET: z.string().default("ai4bharat/MSMARCO-XI"),

  // App config
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  RETRIEVAL_LATENCY_BUDGET_MS: z.coerce.number().default(200),
  GROUNDEDNESS_THRESHOLD: z.coerce.number().default(0.72),
  RATE_LIMIT_PER_MIN: z.coerce.number().default(20),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Lazily validated env. Throws on first access if env vars are missing/invalid.
 * For partial checks (like /api/health probing individual services), use `getEnvSafe`.
 */
let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}

/**
 * Safe partial env access — returns what's available without throwing.
 * Useful for health checks where we want to report which services are configured.
 */
export function getEnvSafe(): Partial<Env> & { errors: string[] } {
  const result = envSchema.safeParse(process.env);
  if (result.success) {
    return { ...result.data, errors: [] };
  }
  // Return whatever we can extract + list the errors
  const partial: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key in envSchema.shape) {
      partial[key] = value;
    }
  }
  const errors = result.error.issues.map(
    (i) => `${i.path.join(".")}: ${i.message}`
  );
  return { ...(partial as Partial<Env>), errors };
}

/** Collection names derived from the prefix */
export function getCollectionNames(prefix?: string): {
  fixed: string;
  overlap: string;
  semantic: string;
  structural: string;
} {
  const p = prefix ?? process.env.QDRANT_COLLECTION_PREFIX ?? "msmarco";
  return {
    fixed: `${p}_fixed`,
    overlap: `${p}_overlap`,
    semantic: `${p}_semantic`,
    structural: `${p}_structural`,
  };
}
