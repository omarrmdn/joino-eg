
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://icuvaldfjqmyirzmcjst.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljdXZhbGRmanFteWlyem1janN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNzA1NDMsImV4cCI6MjA4NTc0NjU0M30.9jYkDkLN1ro3esiQb1nzUUSbEEPMuX5MfSDxz6fkFqE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const RATES = [
    { base: 'USD', target: 'EGP', rate: 50.5 },
    { base: 'USD', target: 'SAR', rate: 3.75 },
    { base: 'USD', target: 'AED', rate: 3.67 },
    { base: 'USD', target: 'EUR', rate: 0.92 },
    { base: 'USD', target: 'GBP', rate: 0.79 },
    { base: 'USD', target: 'KWD', rate: 0.31 },
];

async function seedRates() {
    console.log("Seeding exchange rates...");
    
    // First clear old rates? Or just insert new ones with is_latest=true
    // We should probably deactivate old ones, but let's just insert new ones which will be 'latest' by date
    
    // Check if currencies exist
    const { data: currencies } = await supabase.from('currencies').select('code');
    const codes = new Set(currencies.map(c => c.code));
    
    const toInsert = [];
    const today = new Date().toISOString().split('T')[0];

    for (const r of RATES) {
        if (codes.has(r.base) && codes.has(r.target)) {
            toInsert.push({
                base_currency: r.base,
                target_currency: r.target,
                rate: r.rate,
                rate_date: today,
                is_latest: true
            });
            // Also insert inverse? No, utils handles it.
        } else {
            console.warn(`Skipping ${r.base}->${r.target} because currency missing.`);
        }
    }

    if (toInsert.length > 0) {
        const { error } = await supabase.from('exchange_rates').insert(toInsert);
        if (error) {
            console.error("Error inserting rates:", error);
        } else {
            console.log(`Inserted ${toInsert.length} rates successfully!`);
        }
    } else {
        console.log("Nothing to insert.");
    }
}

seedRates();
