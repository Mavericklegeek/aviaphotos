const SUPABASE_URL = "TON_URL_SUPABASE";
const SUPABASE_KEY = "TA_CLE_PUBLISHABLE";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);