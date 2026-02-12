const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function getCountryCodeByIP(): Promise<string | null> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn("[ip] Supabase env vars missing in ip.ts");
        return null;
    }

    try {
        // Call our Edge Function which does robust server-side IP detection
        const response = await fetch(`${SUPABASE_URL}/functions/v1/detect-currency`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
            },
            // We don't need to send a body, the function uses request headers/IP
        });

        if (!response.ok) {
            // It might be 400 if IP can't be geolocated, which is fine to return null
            return null;
        }

        const data = await response.json();
        return data.country || null;
    } catch (e) {
        // Silent fail to fallback to locale
        return null;
    }
}
