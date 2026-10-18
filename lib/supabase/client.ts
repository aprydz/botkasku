import { createClient, SupabaseClient } from "@supabase/supabase-js";

let clientInstance: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient {
  if (clientInstance) return clientInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / ANON_KEY - isi .env.local");
  }

  clientInstance = createClient(url, key);
  return clientInstance;
}
