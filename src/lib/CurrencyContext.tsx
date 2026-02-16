import { useAuth } from '@clerk/clerk-expo';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
    autoDetectAndUpdateUserCurrency,
    CurrencyInfo,
    DEFAULT_CURRENCY_CODE,
    detectAndStoreIpCountry,
    getCurrencyInfo,
    getLatestRate,
    normalizeCurrencyCode
} from '../utils/currency';
import { useSupabaseClient } from './supabaseConfig';

interface CurrencyState {
  selectedCurrency: string;
  currencyInfo: CurrencyInfo | null;
  exchangeRates: Record<string, number>;
  isLoading: boolean;
  setCurrency: (code: string) => Promise<void>;
  refreshRates: (baseCurrencies: string[]) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyState | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userId, isSignedIn } = useAuth();
  const supabase = useSupabaseClient();
  const [selectedCurrency, setSelectedCurrency] = useState<string>(DEFAULT_CURRENCY_CODE);
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo | null>(null);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ [DEFAULT_CURRENCY_CODE]: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Initialize currency
  useEffect(() => {
    const initCurrency = async () => {
      setIsLoading(true);
      try {
        let currentCode = DEFAULT_CURRENCY_CODE;

        if (isSignedIn && userId) {
          // 1. Fetch from Supabase
          const { data, error } = await supabase
            .from('users')
            .select('currency_code')
            .eq('id', userId)
            .maybeSingle();

          if (!error && data?.currency_code) {
            currentCode = normalizeCurrencyCode(data.currency_code) || DEFAULT_CURRENCY_CODE;
          } else {
            // 2. First launch detection
            const detected = await autoDetectAndUpdateUserCurrency(supabase, userId);
            if (detected) {
              currentCode = detected;
            }
          }
        } else {
          // For guests, try IP detection once if not already detected
          const ipCountry = await detectAndStoreIpCountry();
          // We don't have a way to map country to currency for guests easily without userId 
          // but we can use detectCurrencyCodeByCountry from utils if we had supabase
          if (ipCountry) {
              // Internal helper or call util
              const { detectCurrencyCodeByCountry } = await import('../utils/currency');
              const detected = await detectCurrencyCodeByCountry(supabase, ipCountry);
              if (detected) currentCode = detected;
          }
        }

        setSelectedCurrency(currentCode);
        
        // Load currency info
        const info = await getCurrencyInfo(supabase, currentCode);
        setCurrencyInfo(info);

      } catch (error) {
        console.error('[CurrencyContext] Error initializing currency:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initCurrency();
  }, [isSignedIn, userId]);

  const setCurrency = useCallback(async (code: string) => {
    const normalized = normalizeCurrencyCode(code);
    if (!normalized) return;

    setSelectedCurrency(normalized);
    
    // Update info
    const info = await getCurrencyInfo(supabase, normalized);
    setCurrencyInfo(info);

    // Update Supabase if signed in
    if (isSignedIn && userId) {
      await supabase
        .from('users')
        .update({ 
          currency_code: normalized,
          currency_auto_detected: false, // User manually changed it
          currency_updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    }

    // Reset rates as base has changed
    setExchangeRates({ [normalized]: 1 });
  }, [isSignedIn, userId, supabase]);

  const refreshRates = useCallback(async (baseCurrencies: string[]) => {
    if (!selectedCurrency) return;

    const newRates = { ...exchangeRates };
    let changed = false;

    for (const base of baseCurrencies) {
      const normalizedBase = normalizeCurrencyCode(base);
      if (!normalizedBase || newRates[normalizedBase] !== undefined) continue;

      const rate = await getLatestRate(supabase, normalizedBase, selectedCurrency);
      if (rate !== null) {
        newRates[normalizedBase] = rate;
        changed = true;
      }
    }

    if (changed) {
      setExchangeRates(newRates);
    }
  }, [selectedCurrency, exchangeRates, supabase]);

  return (
    <CurrencyContext.Provider value={{ 
      selectedCurrency, 
      currencyInfo, 
      exchangeRates, 
      isLoading,
      setCurrency,
      refreshRates
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
