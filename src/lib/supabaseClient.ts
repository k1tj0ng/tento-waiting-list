import { getMockSupabase, MockSupabaseClient } from "./mockSupabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isSimulation =
  !supabaseUrl ||
  supabaseUrl.includes("YOUR_PROJECT_REF") ||
  !supabaseAnonKey ||
  supabaseAnonKey === "your-anon-public-key";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabase(): any {
  if (client) return client;
  if (isSimulation) {
    client = getMockSupabase();
    return client;
  }
  const { createClient } = require("@supabase/supabase-js");
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return client;
}

export function isSimulationMode(): boolean {
  return isSimulation;
}
