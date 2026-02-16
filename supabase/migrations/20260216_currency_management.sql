-- 1. Currencies Table (Reference Data)
CREATE TABLE IF NOT EXISTS public.currencies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    symbol TEXT,
    decimal_places INTEGER DEFAULT 2,
    country_codes TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Exchange Rates Table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    base_currency TEXT NOT NULL REFERENCES public.currencies(code),
    target_currency TEXT NOT NULL REFERENCES public.currencies(code),
    rate NUMERIC(18, 6) NOT NULL,
    rate_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_latest BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure default value for existing table column
ALTER TABLE public.exchange_rates ALTER COLUMN rate_date SET DEFAULT NOW();
UPDATE public.exchange_rates SET rate_date = NOW() WHERE rate_date IS NULL;
ALTER TABLE public.exchange_rates ALTER COLUMN rate_date SET NOT NULL;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_exchange_rates_lookup 
ON public.exchange_rates (base_currency, target_currency) 
WHERE is_latest = TRUE;

-- 3. Update Users Table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS currency_code TEXT REFERENCES public.currencies(code);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS currency_auto_detected BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS currency_updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Update Events Table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS currency_code TEXT REFERENCES public.currencies(code);

-- 5. RLS Policies (Safely recreate)
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Currencies" ON public.currencies;
CREATE POLICY "Public Read Currencies" ON public.currencies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public Read Exchange Rates" ON public.exchange_rates;
CREATE POLICY "Public Read Exchange Rates" ON public.exchange_rates FOR SELECT USING (true);

-- 6. Initial Data
INSERT INTO public.currencies (code, name, symbol, country_codes)
VALUES 
    ('EGP', 'Egyptian Pound', 'E£', ARRAY['EG']),
    ('SAR', 'Saudi Riyal', 'SAR', ARRAY['SA']),
    ('AED', 'UAE Dirham', 'AED', ARRAY['AE']),
    ('USD', 'US Dollar', '$', ARRAY['US']),
    ('EUR', 'Euro', '€', ARRAY['DE', 'FR', 'IT', 'ES'])
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.exchange_rates (base_currency, target_currency, rate, is_latest)
VALUES 
    ('USD', 'EGP', 48.50, true),
    ('SAR', 'EGP', 12.93, true),
    ('AED', 'EGP', 13.20, true)
ON CONFLICT DO NOTHING;
