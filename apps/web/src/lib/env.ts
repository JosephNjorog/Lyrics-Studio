/**
 * Server-side environment validation.
 * Import this at the top of any server-only module that needs these vars.
 * Throws immediately if a required var is missing so you catch it at startup.
 */

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optionalEnv(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const env = {
  // Database
  DATABASE_URL: requireEnv("DATABASE_URL"),

  // Auth
  NEXTAUTH_SECRET: requireEnv("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: optionalEnv("NEXTAUTH_URL", "http://localhost:3000"),

  // Google OAuth (optional — app works without it)
  GOOGLE_CLIENT_ID: optionalEnv("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: optionalEnv("GOOGLE_CLIENT_SECRET"),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: requireEnv("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: requireEnv("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: requireEnv("CLOUDINARY_API_SECRET"),

  // Redis
  REDIS_URL: optionalEnv("REDIS_URL", "redis://localhost:6379"),

  // External APIs
  OPENAI_API_KEY: optionalEnv("OPENAI_API_KEY"),
  GENIUS_API_TOKEN: optionalEnv("GENIUS_API_TOKEN"),

  // Python alignment service
  ALIGNMENT_SERVICE_URL: optionalEnv("ALIGNMENT_SERVICE_URL", "http://localhost:8000"),
  ALIGNMENT_WEBHOOK_SECRET: requireEnv("ALIGNMENT_WEBHOOK_SECRET"),
} as const;
