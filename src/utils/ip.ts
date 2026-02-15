/**
 * Detect user's geo info using their PUBLIC IP address.
 * Uses free third-party APIs that return the caller's real public IP geo data.
 * No headers needed — these services detect IP server-side from the request.
 */

type GeoInfo = {
    country: string | null;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
};

let cachedGeo: GeoInfo | null = null;

export async function getGeoInfoByIP(): Promise<GeoInfo | null> {
    // Return cached result if we already detected
    if (cachedGeo) return cachedGeo;

    // Try multiple free IP geolocation APIs in order of reliability
    const result =
        (await tryIpApi()) ||
        (await tryIpWho()) ||
        (await tryIpApiCo());

    if (result) {
        cachedGeo = result;
    }

    return result;
}

/** https://ip-api.com — Free, no key needed, 45 req/min */
async function tryIpApi(): Promise<GeoInfo | null> {
    try {
        const res = await fetch("http://ip-api.com/json/?fields=status,country,countryCode,city,lat,lon", {
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.status !== "success") return null;
        return {
            country: data.countryCode || null,
            city: data.city || null,
            latitude: data.lat ?? null,
            longitude: data.lon ?? null,
        };
    } catch {
        return null;
    }
}

/** https://ipwho.is — Free, no key needed, unlimited */
async function tryIpWho(): Promise<GeoInfo | null> {
    try {
        const res = await fetch("https://ipwho.is/", {
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.success) return null;
        return {
            country: data.country_code || null,
            city: data.city || null,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
        };
    } catch {
        return null;
    }
}

/** https://ipapi.co — Free tier, 1000 req/day */
async function tryIpApiCo(): Promise<GeoInfo | null> {
    try {
        const res = await fetch("https://ipapi.co/json/", {
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.error) return null;
        return {
            country: data.country_code || null,
            city: data.city || null,
            latitude: data.latitude ?? null,
            longitude: data.longitude ?? null,
        };
    } catch {
        return null;
    }
}
