import type { SupabaseClient } from "@supabase/supabase-js";
import * as Localization from "expo-localization";

export const DEFAULT_CURRENCY_CODE = "EGP";

export type CurrencyInfo = {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
};

export type CurrencyContext = {
  userCurrencyCode: string;
  userCurrency: CurrencyInfo | null;
  currencyByCode: Record<string, CurrencyInfo>;
  rateToUserByCode: Record<string, number>;
};

const currencyInfoCache = new Map<string, CurrencyInfo>();
const rateCache = new Map<string, number>();
const inflightCurrency = new Map<string, Promise<CurrencyInfo | null>>();
const inflightRate = new Map<string, Promise<number | null>>();

export function normalizeCurrencyCode(code?: string | null): string | null {
  if (!code) return null;
  const trimmed = String(code).trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

export function normalizeCountryCode(code?: string | null): string | null {
  if (!code) return null;
  const trimmed = String(code).trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

function inferCountryCodeFromLocation(
  location?: string | null,
): string | null {
  if (!location) return null;
  const parts = String(location)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const last = parts[parts.length - 1];
  if (/^[A-Z]{2,3}$/.test(last)) return last;
  const normalized = last
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return null;

  const code =
    COUNTRY_NAME_TO_CODE[normalized] ||
    COUNTRY_NAME_TO_CODE[normalized.replace(/&/g, "and")] ||
    null;
  return code ? code.toUpperCase() : null;
}

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  "afghanistan": "AF",
  "albania": "AL",
  "algeria": "DZ",
  "andorra": "AD",
  "angola": "AO",
  "antigua and barbuda": "AG",
  "argentina": "AR",
  "armenia": "AM",
  "australia": "AU",
  "austria": "AT",
  "azerbaijan": "AZ",
  "bahamas": "BS",
  "bahrain": "BH",
  "bangladesh": "BD",
  "barbados": "BB",
  "belarus": "BY",
  "belgium": "BE",
  "belize": "BZ",
  "benin": "BJ",
  "bhutan": "BT",
  "bolivia": "BO",
  "bosnia and herzegovina": "BA",
  "botswana": "BW",
  "brazil": "BR",
  "brunei": "BN",
  "bulgaria": "BG",
  "burkina faso": "BF",
  "burundi": "BI",
  "cabo verde": "CV",
  "cape verde": "CV",
  "cambodia": "KH",
  "cameroon": "CM",
  "canada": "CA",
  "central african republic": "CF",
  "chad": "TD",
  "chile": "CL",
  "china": "CN",
  "colombia": "CO",
  "comoros": "KM",
  "congo": "CG",
  "republic of the congo": "CG",
  "democratic republic of the congo": "CD",
  "costa rica": "CR",
  "cote d'ivoire": "CI",
  "ivory coast": "CI",
  "croatia": "HR",
  "cuba": "CU",
  "cyprus": "CY",
  "czechia": "CZ",
  "czech republic": "CZ",
  "denmark": "DK",
  "djibouti": "DJ",
  "dominica": "DM",
  "dominican republic": "DO",
  "ecuador": "EC",
  "egypt": "EG",
  "el salvador": "SV",
  "equatorial guinea": "GQ",
  "eritrea": "ER",
  "estonia": "EE",
  "eswatini": "SZ",
  "swaziland": "SZ",
  "ethiopia": "ET",
  "fiji": "FJ",
  "finland": "FI",
  "france": "FR",
  "gabon": "GA",
  "gambia": "GM",
  "georgia": "GE",
  "germany": "DE",
  "ghana": "GH",
  "greece": "GR",
  "grenada": "GD",
  "guatemala": "GT",
  "guinea": "GN",
  "guinea-bissau": "GW",
  "guyana": "GY",
  "haiti": "HT",
  "honduras": "HN",
  "hungary": "HU",
  "iceland": "IS",
  "india": "IN",
  "indonesia": "ID",
  "iran": "IR",
  "iraq": "IQ",
  "ireland": "IE",
  "israel": "IL",
  "italy": "IT",
  "jamaica": "JM",
  "japan": "JP",
  "jordan": "JO",
  "kazakhstan": "KZ",
  "kenya": "KE",
  "kiribati": "KI",
  "kuwait": "KW",
  "kyrgyzstan": "KG",
  "laos": "LA",
  "latvia": "LV",
  "lebanon": "LB",
  "lesotho": "LS",
  "liberia": "LR",
  "libya": "LY",
  "liechtenstein": "LI",
  "lithuania": "LT",
  "luxembourg": "LU",
  "madagascar": "MG",
  "malawi": "MW",
  "malaysia": "MY",
  "maldives": "MV",
  "mali": "ML",
  "malta": "MT",
  "marshall islands": "MH",
  "mauritania": "MR",
  "mauritius": "MU",
  "mexico": "MX",
  "micronesia": "FM",
  "moldova": "MD",
  "monaco": "MC",
  "mongolia": "MN",
  "montenegro": "ME",
  "morocco": "MA",
  "mozambique": "MZ",
  "myanmar": "MM",
  "burma": "MM",
  "namibia": "NA",
  "nauru": "NR",
  "nepal": "NP",
  "netherlands": "NL",
  "new zealand": "NZ",
  "nicaragua": "NI",
  "niger": "NE",
  "nigeria": "NG",
  "north korea": "KP",
  "north macedonia": "MK",
  "norway": "NO",
  "oman": "OM",
  "pakistan": "PK",
  "palau": "PW",
  "palestine": "PS",
  "panama": "PA",
  "papua new guinea": "PG",
  "paraguay": "PY",
  "peru": "PE",
  "philippines": "PH",
  "poland": "PL",
  "portugal": "PT",
  "qatar": "QA",
  "romania": "RO",
  "russia": "RU",
  "russian federation": "RU",
  "rwanda": "RW",
  "saint kitts and nevis": "KN",
  "saint lucia": "LC",
  "saint vincent and the grenadines": "VC",
  "samoa": "WS",
  "san marino": "SM",
  "sao tome and principe": "ST",
  "saudi arabia": "SA",
  "senegal": "SN",
  "serbia": "RS",
  "seychelles": "SC",
  "sierra leone": "SL",
  "singapore": "SG",
  "slovakia": "SK",
  "slovenia": "SI",
  "solomon islands": "SB",
  "somalia": "SO",
  "south africa": "ZA",
  "south korea": "KR",
  "south sudan": "SS",
  "spain": "ES",
  "sri lanka": "LK",
  "sudan": "SD",
  "suriname": "SR",
  "sweden": "SE",
  "switzerland": "CH",
  "syria": "SY",
  "taiwan": "TW",
  "tajikistan": "TJ",
  "tanzania": "TZ",
  "thailand": "TH",
  "timor-leste": "TL",
  "east timor": "TL",
  "togo": "TG",
  "tonga": "TO",
  "trinidad and tobago": "TT",
  "tunisia": "TN",
  "turkey": "TR",
  "turkmenistan": "TM",
  "tuvalu": "TV",
  "uganda": "UG",
  "ukraine": "UA",
  "united arab emirates": "AE",
  "uae": "AE",
  "united kingdom": "GB",
  "uk": "GB",
  "united states": "US",
  "united states of america": "US",
  "usa": "US",
  "us": "US",
  "uruguay": "UY",
  "uzbekistan": "UZ",
  "vanuatu": "VU",
  "venezuela": "VE",
  "vietnam": "VN",
  "yemen": "YE",
  "zambia": "ZM",
  "zimbabwe": "ZW",
};

export function getCountryCodeFromLocale(): string | null {
  const region =
    (Localization as any).region ||
    (Localization.getLocales?.() || [])[0]?.regionCode ||
    null;
  if (region) return normalizeCountryCode(region);

  const locale = (Localization as any).locale as string | undefined;
  if (!locale) return null;
  const normalized = locale.replace("-", "_");
  const parts = normalized.split("_");
  return normalizeCountryCode(parts[1]);
}

export async function getCurrencyInfo(
  supabase: SupabaseClient,
  code?: string | null,
): Promise<CurrencyInfo | null> {
  const normalized = normalizeCurrencyCode(code);
  if (!normalized) return null;
  const cached = currencyInfoCache.get(normalized);
  if (cached) return cached;
  const inflight = inflightCurrency.get(normalized);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from("currencies")
        .select("code,name,symbol,decimal_places")
        .eq("code", normalized)
        .maybeSingle();
      if (error || !data) return null;

      const info: CurrencyInfo = {
        code: data.code,
        name: data.name,
        symbol: data.symbol,
        decimal_places:
          typeof data.decimal_places === "number" ? data.decimal_places : 2,
      };
      currencyInfoCache.set(normalized, info);
      return info;
    } catch {
      return null;
    } finally {
      inflightCurrency.delete(normalized);
    }
  })();

  inflightCurrency.set(normalized, promise);
  return promise;
}

export async function getLatestRate(
  supabase: SupabaseClient,
  from?: string | null,
  to?: string | null,
): Promise<number | null> {
  const base = normalizeCurrencyCode(from);
  const target = normalizeCurrencyCode(to);
  if (!base || !target) return null;
  if (base === target) return 1;

  const key = `${base}->${target}`;
  const cached = rateCache.get(key);
  if (cached) return cached;
  const inflight = inflightRate.get(key);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const { data, error } = await supabase
        .from("exchange_rates")
        .select("rate")
        .eq("base_currency", base)
        .eq("target_currency", target)
        .eq("is_latest", true)
        .order("rate_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.rate) {
        const rate = Number(data.rate);
        if (Number.isFinite(rate) && rate > 0) {
          rateCache.set(key, rate);
          return rate;
        }
      }

      const { data: inverseData, error: inverseError } = await supabase
        .from("exchange_rates")
        .select("rate")
        .eq("base_currency", target)
        .eq("target_currency", base)
        .eq("is_latest", true)
        .order("rate_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!inverseError && inverseData?.rate) {
        const inverseRate = Number(inverseData.rate);
        if (Number.isFinite(inverseRate) && inverseRate > 0) {
          const rate = 1 / inverseRate;
          rateCache.set(key, rate);
          return rate;
        }
      }
    } catch {
      return null;
    } finally {
      inflightRate.delete(key);
    }

    return null;
  })();

  inflightRate.set(key, promise);
  return promise;
}

export async function detectCurrencyCodeByCountry(
  supabase: SupabaseClient,
  countryCode?: string | null,
): Promise<string | null> {
  const normalized = normalizeCountryCode(countryCode);
  if (!normalized) return null;

  try {
    const { data, error } = await supabase
      .from("currencies")
      .select("code,is_active,country_codes")
      .contains("country_codes", [normalized])
      .eq("is_active", true);

    if (error || !data || data.length === 0) return null;

    const preferred =
      data.find((row) => row.code === DEFAULT_CURRENCY_CODE) || data[0];
    return preferred?.code ? String(preferred.code) : null;
  } catch {
    return null;
  }
}

/**
 * Auto-detect and update user currency based on IP country ONLY.
 * The detected IP country is saved in the DB. Currency is only
 * re-detected when the IP country changes from what's stored.
 *
 * @param ipCountryCode - Country code detected from the user's IP address
 */
export async function autoDetectAndUpdateUserCurrency(
  supabase: SupabaseClient,
  userId: string,
  ipCountryCode?: string | null,
): Promise<string | null> {
  if (!userId) return null;

  try {
    const { data: userRow, error } = await supabase
      .from("users")
      .select("currency_code,currency_auto_detected,country_code")
      .eq("id", userId)
      .maybeSingle();

    if (error || !userRow) return null;

    // If user manually set their currency (not auto-detected), respect it.
    if (userRow.currency_auto_detected === false && userRow.currency_code) {
      return normalizeCurrencyCode(userRow.currency_code);
    }

    const savedCountry = normalizeCountryCode(userRow.country_code);
    const newCountry = normalizeCountryCode(ipCountryCode);

    // If we already have a currency AND the IP country hasn't changed, skip detection.
    if (userRow.currency_code && savedCountry && savedCountry === newCountry) {
      console.log(`[currency] Country unchanged (${savedCountry}), skipping re-detection.`);
      return normalizeCurrencyCode(userRow.currency_code);
    }

    // --- Country changed or currency not set yet, re-detect ---

    // 1. Try using the IP country code directly
    if (newCountry) {
      console.log(`[currency] IP country detected: ${newCountry} (saved: ${savedCountry}). Detecting currency...`);
      const detected = await detectCurrencyCodeByCountry(supabase, newCountry);
      if (detected) {
        const updates: Record<string, any> = {
          currency_code: detected,
          country_code: newCountry,
          currency_auto_detected: true,
          currency_updated_at: new Date().toISOString(),
        };
        await supabase.from("users").update(updates).eq("id", userId);
        console.log(`[currency] Updated currency to ${detected} for country ${newCountry}`);
        return detected;
      }
    }

    // 2. Fallback: Try Supabase Edge Function (server-side IP detection)
    console.log("[currency] IP country not available, trying Edge Function...");
    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('detect-currency');

      if (!funcError && funcData?.currency && funcData?.country) {
        const edgeCountry = normalizeCountryCode(funcData.country);
        console.log(`[currency] Edge Function detected: ${funcData.currency} (${edgeCountry})`);

        // Save the Edge Function result
        const updates: Record<string, any> = {
          currency_code: funcData.currency,
          currency_auto_detected: true,
          currency_updated_at: new Date().toISOString(),
        };
        if (edgeCountry) updates.country_code = edgeCountry;
        await supabase.from("users").update(updates).eq("id", userId);

        return funcData.currency;
      }
    } catch (edgeErr) {
      console.warn("[currency] Edge Function invocation exception:", edgeErr);
    }

    // 3. If no IP info at all, keep whatever the user already has
    return normalizeCurrencyCode(userRow.currency_code) || null;
  } catch {
    return null;
  }
}

export async function buildCurrencyContext(
  supabase: SupabaseClient,
  userCurrencyCode?: string | null,
  eventCurrencyCodes: Array<string | null | undefined> = [],
): Promise<CurrencyContext> {
  const userCode =
    normalizeCurrencyCode(userCurrencyCode) || DEFAULT_CURRENCY_CODE;
  const uniqueCodes = new Set<string>();
  uniqueCodes.add(userCode);
  for (const code of eventCurrencyCodes) {
    const normalized = normalizeCurrencyCode(code);
    if (normalized) uniqueCodes.add(normalized);
  }

  const codes = Array.from(uniqueCodes);
  const missing = codes.filter((code) => !currencyInfoCache.has(code));
  if (missing.length > 0) {
    try {
      const { data } = await supabase
        .from("currencies")
        .select("code,name,symbol,decimal_places")
        .in("code", missing);
      for (const row of data || []) {
        const info: CurrencyInfo = {
          code: row.code,
          name: row.name,
          symbol: row.symbol,
          decimal_places:
            typeof row.decimal_places === "number" ? row.decimal_places : 2,
        };
        currencyInfoCache.set(row.code, info);
      }
    } catch {
      // Ignore currency metadata load errors
    }
  }

  const currencyByCode: Record<string, CurrencyInfo> = {};
  for (const code of codes) {
    currencyByCode[code] =
      currencyInfoCache.get(code) || {
        code,
        name: code,
        symbol: code,
        decimal_places: 2,
      };
  }

  const rateToUserByCode: Record<string, number> = { [userCode]: 1 };
  const baseCodes = codes.filter((code) => code !== userCode);

  if (baseCodes.length > 0) {
    try {
      const { data: directRates } = await supabase
        .from("exchange_rates")
        .select("base_currency,target_currency,rate")
        .eq("target_currency", userCode)
        .eq("is_latest", true)
        .in("base_currency", baseCodes);

      for (const row of directRates || []) {
        const rate = Number(row.rate);
        if (Number.isFinite(rate) && rate > 0) {
          rateToUserByCode[row.base_currency] = rate;
          rateCache.set(`${row.base_currency}->${userCode}`, rate);
        }
      }

      const missingRates = baseCodes.filter(
        (code) => rateToUserByCode[code] === undefined,
      );
      if (missingRates.length > 0) {
        const { data: inverseRates } = await supabase
          .from("exchange_rates")
          .select("base_currency,target_currency,rate")
          .eq("base_currency", userCode)
          .eq("is_latest", true)
          .in("target_currency", missingRates);

        for (const row of inverseRates || []) {
          const inverse = Number(row.rate);
          if (Number.isFinite(inverse) && inverse > 0) {
            const rate = 1 / inverse;
            rateToUserByCode[row.target_currency] = rate;
            rateCache.set(`${row.target_currency}->${userCode}`, rate);
          }
        }
      }
    } catch {
      // Ignore rate load errors
    }
  }

  return {
    userCurrencyCode: userCode,
    userCurrency: currencyByCode[userCode] || null,
    currencyByCode,
    rateToUserByCode,
  };
}

export function parseCurrencyNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed || trimmed === "free" || trimmed === "مجاني") return 0;
  const parsed = parseFloat(trimmed.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatWithSymbol(
  amount: number,
  currency: CurrencyInfo,
  language: string,
) {
  const decimals =
    typeof currency.decimal_places === "number" ? currency.decimal_places : 2;
  const value = amount.toFixed(decimals);
  const symbol = currency.symbol || currency.code;
  const useSpace =
    symbol.length > 1 || /^[A-Z]{2,4}$/.test(symbol) || /^[A-Z]{2,4}$/.test(currency.code);
  if (language === "ar" || language === "ar-EG") {
    return useSpace ? `${value} ${symbol}` : `${value}${symbol}`;
  }
  return useSpace ? `${symbol} ${value}` : `${symbol}${value}`;
}

export function formatEventPrice(
  priceValue: number | string | null | undefined,
  options: {
    eventCurrencyCode?: string | null;
    language?: string;
    currencyContext?: CurrencyContext | null;
  },
) {
  const language = options.language || "en";
  const numeric = parseCurrencyNumber(priceValue);
  if (!Number.isFinite(numeric)) return (language === "ar" || language === "ar-EG") ? "مجاني" : "Free";
  if (numeric === 0) return (language === "ar" || language === "ar-EG") ? "مجاني" : "Free";

  const eventCode =
    normalizeCurrencyCode(options.eventCurrencyCode) || DEFAULT_CURRENCY_CODE;
  const context = options.currencyContext || null;

  if (context) {
    const rate =
      context.rateToUserByCode[eventCode] ??
      (eventCode === context.userCurrencyCode ? 1 : null);
    if (rate !== null && rate !== undefined) {
      const amount = numeric * rate;
      const currency =
        context.currencyByCode[context.userCurrencyCode] ||
        context.userCurrency ||
        {
          code: context.userCurrencyCode,
          name: context.userCurrencyCode,
          symbol: context.userCurrencyCode,
          decimal_places: 2,
        };
      return formatWithSymbol(amount, currency, language);
    }

    const currency =
      context.currencyByCode[eventCode] || {
        code: eventCode,
        name: eventCode,
        symbol: eventCode,
        decimal_places: 2,
      };
    return formatWithSymbol(numeric, currency, language);
  }

  const fallbackCurrency: CurrencyInfo = {
    code: DEFAULT_CURRENCY_CODE,
    name: DEFAULT_CURRENCY_CODE,
    symbol: DEFAULT_CURRENCY_CODE === "EGP" ? (language === "ar" || language === "ar-EG" ? "ج.م" : "EGP") : (language === "ar" || language === "ar-EG" ? "USD" : "$"),
    decimal_places: 2,
  };
  return formatWithSymbol(numeric, fallbackCurrency, language);
}

export function formatCurrencyAmount(
  amount: number | null | undefined,
  options: {
    currencyCode?: string | null;
    language?: string;
    currencyContext?: CurrencyContext | null;
  },
) {
  const language = options.language || "en";
  const numeric = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const code =
    normalizeCurrencyCode(options.currencyCode) || DEFAULT_CURRENCY_CODE;
  const context = options.currencyContext || null;

  if (context) {
    const rate =
      context.rateToUserByCode[code] ??
      (code === context.userCurrencyCode ? 1 : null);
    if (rate !== null && rate !== undefined) {
      const value = numeric * rate;
      const currency =
        context.currencyByCode[context.userCurrencyCode] ||
        context.userCurrency ||
        {
          code: context.userCurrencyCode,
          name: context.userCurrencyCode,
          symbol: context.userCurrencyCode,
          decimal_places: 2,
        };
      return formatWithSymbol(value, currency, language);
    }

    const currency =
      context.currencyByCode[code] || {
        code,
        name: code,
        symbol: code,
        decimal_places: 2,
      };
    return formatWithSymbol(numeric, currency, language);
  }

  const fallbackCurrency: CurrencyInfo = {
    code: DEFAULT_CURRENCY_CODE,
    name: DEFAULT_CURRENCY_CODE,
    symbol: DEFAULT_CURRENCY_CODE === "EGP" ? (language === "ar" || language === "ar-EG" ? "ج.م" : "EGP") : (language === "ar" || language === "ar-EG" ? "USD" : "$"),
    decimal_places: 2,
  };
  return formatWithSymbol(numeric, fallbackCurrency, language);
}
