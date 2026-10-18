import { createClient } from "@supabase/supabase-js";
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || key;
  return createClient(url, service);
}
