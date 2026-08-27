import { z } from "zod";

function isPostgresUrl(value: string) {
  try {
    const parsed = new URL(value);
    return ["postgresql:", "postgres:"].includes(parsed.protocol) && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

const serverSchema = z.object({
  DATABASE_URL: z.string().refine(isPostgresUrl, "must be a PostgreSQL connection URL"),
  DIRECT_URL: z.string().refine(isPostgresUrl, "must be a PostgreSQL connection URL"),
  AUTH_SECRET: z.string().min(32),
  AUTH_TRUST_HOST: z.enum(["true", "false"]),
  AUTH_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SUPER_ADMIN_EMAILS: z.string().default(""),
  UDHBHAV_ADMIN_EMAILS: z.string().default(""),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_PRIVATE_BUCKET: z.string().min(1),
  EMAIL_PROVIDER: z.enum(["console", "resend", "smtp"]).default("console"),
  EMAIL_FROM: z.string().min(3),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  CRON_SECRET: z.string().min(32).optional(),
  APP_URL: z.string().url(),
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
  SMTP_HOST: true,
  SMTP_PORT: true,
  SMTP_SECURE: true,
  SMTP_USER: true,
  SMTP_PASS: true,
  CRON_SECRET: true,
});

export type EmailConfig = {
  EMAIL_PROVIDER: "console" | "resend" | "smtp";
  EMAIL_FROM: string;
  RESEND_API_KEY?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_SECURE?: boolean;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  CRON_SECRET?: string;
};

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
  const value = process.env.DATABASE_URL?.trim();
  return Boolean(value && isPostgresUrl(value));
}

export function r2Env() {
  return r2Schema.parse(process.env);
}

export function emailEnv(): EmailConfig {
  const config = emailSchema.parse(process.env);
  if (config.EMAIL_PROVIDER === "resend" && !config.RESEND_API_KEY)
    throw new Error("RESEND_API_KEY is required when EMAIL_PROVIDER=resend");
  if (config.EMAIL_PROVIDER !== "smtp")
    return {
      EMAIL_PROVIDER: config.EMAIL_PROVIDER,
      EMAIL_FROM: config.EMAIL_FROM.trim(),
      RESEND_API_KEY: config.RESEND_API_KEY,
      CRON_SECRET: config.CRON_SECRET,
    };

  const missing = (["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS"] as const).filter(
    (key) => !config[key]?.trim(),
  );
  if (missing.length) throw new Error(`SMTP configuration is incomplete: ${missing.join(", ")} is required`);

  const port = Number(config.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("SMTP_PORT must be an integer between 1 and 65535 when EMAIL_PROVIDER=smtp");

  return {
    EMAIL_PROVIDER: config.EMAIL_PROVIDER,
    EMAIL_FROM: config.EMAIL_FROM.trim(),
    RESEND_API_KEY: config.RESEND_API_KEY,
    CRON_SECRET: config.CRON_SECRET,
    SMTP_HOST: config.SMTP_HOST?.trim(),
    SMTP_PORT: port,
    SMTP_SECURE: config.SMTP_SECURE === "true",
    SMTP_USER: config.SMTP_USER?.trim(),
    SMTP_PASS: config.SMTP_PASS,
  } satisfies EmailConfig;
}

export function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== "production") return;
  const config = env();
  const issues: string[] = [];
  if (config.AUTH_SECRET.toLowerCase().includes("replace")) issues.push("AUTH_SECRET");
  if (config.EMAIL_PROVIDER === "resend" && !config.RESEND_API_KEY) issues.push("RESEND_API_KEY");
  if (config.EMAIL_PROVIDER === "smtp") {
    try {
      emailEnv();
    } catch (error) {
      issues.push(error instanceof Error ? error.message : "SMTP configuration");
    }
  }
  const origins = [config.APP_URL, config.AUTH_URL, config.NEXTAUTH_URL].map((value) => new URL(value).origin);
  if (origins.some((origin) => !origin.startsWith("https://")))
    issues.push("APP_URL/AUTH_URL/NEXTAUTH_URL must use HTTPS");
  if (new Set(origins).size !== 1) issues.push("APP_URL, AUTH_URL, and NEXTAUTH_URL must use the same origin");
  if (config.AUTH_TRUST_HOST !== "true") issues.push("AUTH_TRUST_HOST must be true");
  if (issues.length) throw new Error(`Invalid production configuration: ${issues.join(", ")}`);
}

export function superAdminEmails() {
  const emails = new Set(
    (process.env.SUPER_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  // These are the portal's baseline administrators. Keep their global access
  // even if an older deployment has not yet refreshed its .env file.
  emails.add("ruminate.ecell@iiitsurat.ac.in");
  emails.add("nishad.deshpande@iiitsurat.ac.in");
  return emails;
}
