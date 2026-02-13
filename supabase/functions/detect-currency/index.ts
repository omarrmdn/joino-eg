// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        // Client with user's auth context (for RLS operations like updating own profile)
        const supabaseClient = createClient(
            supabaseUrl,
            supabaseAnonKey,
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // Function-level admin client (only if key exists)
        const supabaseAdmin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

        // Get IP address
        // Prioritize Cloudflare/Vercel headers for accuracy
        let ip = req.headers.get('cf-connecting-ip') ??
            req.headers.get('x-real-ip') ??
            req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
            (req.headers.get('cf-ipcountry') ? '0.0.0.0' : null);

        // If testing locally (or IP missing), use Egypt IP default to prevent failure
        if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            ip = '156.216.79.165';
            console.log(`[detect-currency] Local/Invalid IP. Using fallback: ${ip}`);
        }

        console.log(`[detect-currency] Processing IP: ${ip}`);

        // 1. Detect Country
        let countryCode = req.headers.get('cf-ipcountry') || req.headers.get('x-vercel-ip-country');

        if (!countryCode) {
            try {
                const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
                if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    countryCode = geoData.country_code;
                }
            } catch (e) {
                console.warn(`[detect-currency] Geolocation failed:`, e);
            }
        }

        if (!countryCode) {
            // Fallback to Egypt if totally failed
            countryCode = 'EG';
            console.warn("[detect-currency] Could not detect country. Defaulting to EG.");
        }

        // 2. Find Currency (Logic: Default EGP, try to query DB)
        let detectedCurrency = 'EGP';

        try {
            // Use Admin client if available (bypass RLS), otherwise Auth client
            const dbClient = supabaseAdmin || supabaseClient;

            const { data: currencyData } = await dbClient
                .from('currencies')
                .select('code')
                .contains('country_codes', [countryCode])
                .eq('is_active', true)
                .maybeSingle();

            if (currencyData?.code) {
                detectedCurrency = currencyData.code;
            }
        } catch (dbErr) {
            console.error("[detect-currency] DB Query failed:", dbErr);
            // Swallows error, keeps default EGP
        }

        // 3. Update User Profile (Best Effort)
        try {
            const { data: { user } } = await supabaseClient.auth.getUser();
            if (user) {
                const updates = {
                    currency_code: detectedCurrency,
                    country_code: countryCode,
                    currency_auto_detected: true,
                    currency_updated_at: new Date().toISOString(),
                };

                // Use supabaseClient (User Context) to update own profile. 
                // This usually works with standard RLS policies.
                // If it fails, we log but don't fail the request.
                const { error: updateError } = await supabaseClient
                    .from('users')
                    .update(updates)
                    .eq('id', user.id);

                if (updateError) {
                    // Try Admin client as backup if User client failed and Admin key exists
                    if (supabaseAdmin) {
                        await supabaseAdmin.from('users').update(updates).eq('id', user.id);
                    } else {
                        console.error('[detect-currency] Profile update failed:', updateError);
                    }
                }
            }
        } catch (updateErr) {
            console.error("[detect-currency] Profile update exception:", updateErr);
        }

        // 4. Return Success (Always)
        return new Response(
            JSON.stringify({
                currency: detectedCurrency,
                country: countryCode,
                ip_used: ip
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        // Last resort fallback
        return new Response(
            JSON.stringify({
                currency: 'EGP',
                country: 'EG',
                error: error.message
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
