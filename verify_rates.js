
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://icuvaldfjqmyirzmcjst.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljdXZhbGRmanFteWlyem1janN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzA1NDMsImV4cCI6MjA4NTc0NjU0M30.9jYkDkLN1ro3esiQb1nzUUSbEEPMuX5MfSDxz6fkFqE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyRates() {
    console.log("Verifying exchange rates...");
    const { data, error } = await supabase.from('exchange_rates').select('*');
    if (error) {
        console.error("Error fetching rates:", error);
        return;
    }
    console.log("Total rates:", data.length);
    data.forEach(r => {
        console.log(`${r.base_currency} -> ${r.target_currency}: ${r.rate} (${r.is_latest ? 'LATEST' : 'OLD'})`);
    });
}

verifyRates();
