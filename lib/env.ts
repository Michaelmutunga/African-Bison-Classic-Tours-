import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).describe("PostgreSQL connection string"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): Partial<AppEnv> {
  return envSchema.partial().parse(process.env);
}
