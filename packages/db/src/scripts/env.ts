import { config } from "dotenv";

config({ path: new URL("../../../../.env", import.meta.url).pathname, quiet: true });

export const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
};
