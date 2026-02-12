
require('dotenv').config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase env vars:", supabaseUrl, supabaseAnonKey);
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCurrencies() {
    const { data, error } = await supabase.from('currencies').select('*');
    if (error) {
        console.error("Error fetching currencies:", error);
        return;
    }
    console.log("Currencies count:", data.length);
    console.log("Sample currencies:", data.slice(0, 5));

    const egp = data.find(c => c.code === 'EGP');
    if (egp) {
        console.log("EGP found:", egp);
    } else {
        console.log("EGP NOT found in currencies table!");
    }
}

checkCurrencies();
