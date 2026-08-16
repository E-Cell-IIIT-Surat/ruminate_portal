import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  AUTH_SECRET: z.string().min(32),
  AUTH_TRUST_HOST: z.enum(["true", "false"]),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SUPER_ADMIN_EMAILS: z.string().default(""),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_PRIVATE_BUCKET: z.string().min(1),
  EMAIL_PROVIDER: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: z.string().min(3),
  RESEND_API_KEY: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  CRON_SECRET: z.string().min(32).optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverSchema>;
const r2Schema = serverSchema.pick({
  R2_ACCOUNT_ID: true,
  R2_ACCESS_KEY_ID: true,
  R2_SECRET_ACCESS_KEY: true,
  R2_PRIVATE_BUCKET: true,
});
const emailSchema = serverSchema.pick({
  EMAIL_PROVIDER: true,
  EMAIL_FROM: true,
  RESEND_API_KEY: true,
  CRON_SECRET: true,
});

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (cached) return cached;
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server configuration: ${missing}`);
  }
  cached = result.data;
  return cached;
}

export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL?.startsWith("postgresql://"));
}

export function r2Env() {
  return r2Schema.parse(process.env);
}

export function emailEnv() {
  const config = emailSchema.parse(process.env);
  if (config.EMAIL_PROVIDER === "resend" && !config.RESEND_API_KEY)
    throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
  return config;
}

export function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== "production") return;
  const config = env();
  const issues: string[] = [];
  if (config.AUTH_SECRET.toLowerCase().includes("replace")) issues.push("AUTH_SECRET");
  if (config.EMAIL_PROVIDER === "resend" && !config.RESEND_API_KEY) issues.push("RESEND_API_KEY");
  if (!config.APP_URL.startsWith("https://")) issues.push("APP_URL must use HTTPS");
  if (issues.length) throw new Error(`Invalid production configuration: ${issues.join(", ")}`);
}

export function superAdminEmails() {
  return new Set(
    (process.env.SUPER_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}
