import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

let botSupabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (botSupabaseInstance) return botSupabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase env: isi .env.local (NEXT_PUBLIC_SUPABASE_URL + ANON_KEY)");
  }

  botSupabaseInstance = createClient(url, key);
  return botSupabaseInstance;
}
