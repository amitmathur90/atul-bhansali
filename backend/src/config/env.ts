import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4100),
  DATABASE_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  SMS_PROVIDER: z.enum(["console", "twilio", "msg91"]).default("console"),
  STORAGE_PROVIDER: z.enum(["local", "s3", "cloudinary"]).default("local"),
  PUSH_PROVIDER: z.enum(["console", "expo"]).default("console"),

  SEED_ADMIN_USERNAME: z.string().default("admin"),
  SEED_ADMIN_PASSWORD: z.string().default("ChangeMe123!"),

  // Origin used to build absolute URLs for locally-stored uploads (e.g. http://192.168.1.5:4100
  // when testing from a phone on the same network — localhost won't resolve from the device).
  PUBLIC_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";
export const publicUrl = env.PUBLIC_URL ?? `http://localhost:${env.PORT}`;
