const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export async function getGeoInfoByIP(): Promise<{ country: string | null; city: string | null; latitude: number | null; longitude: number | null } | null> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn("[ip] Supabase env vars missing in ip.ts");
        return null;
    }

    try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/detect-currency`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return {
            country: data.country || null,
            city: data.city || null,
            latitude: data.latitude || null,
            longitude: data.longitude || null
        };
    } catch (e) {
        return null;
    }
}
