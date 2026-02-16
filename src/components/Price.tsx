import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { useCurrency } from '../lib/CurrencyContext';
import { useLanguage } from '../lib/i18n';
import { formatCurrencyAmount, normalizeCurrencyCode } from '../utils/currency';

interface PriceProps {
  amount: number;
  currencyCode?: string | null;
  style?: TextStyle;
}

/**
 * A price component that automatically converts and formats prices 
 * based on the global currency context.
 */
export const Price: React.FC<PriceProps> = ({ amount, currencyCode, style }) => {
  const { selectedCurrency, exchangeRates, refreshRates, currencyInfo } = useCurrency();
  const { language } = useLanguage();

  const baseCode = useMemo(() => normalizeCurrencyCode(currencyCode) || 'EGP', [currencyCode]);

  // Request rates for this price's currency if we don't have it
  useEffect(() => {
    if (baseCode !== selectedCurrency && exchangeRates[baseCode] === undefined) {
      refreshRates([baseCode]);
    }
  }, [baseCode, selectedCurrency, exchangeRates, refreshRates]);

  // If amount is 0, show Free
  if (amount === 0) {
    return (
      <Text style={[styles.free, style]}>
        {language === 'ar' || language === 'ar-EG' ? 'مجاني' : 'Free'}
      </Text>
    );
  }

  // Formatting using currency utils which handle the conversion via currencyContext-like data
  // But we can do it directly here too for clarity or use the utils.
  // The utils expect a CurrencyContext object of a slightly different shape (from src/utils/currency.ts).
  // Let's adapt our context data to the util's expected format.
  
  const formattedPrice = useMemo(() => {
    // If it's the same currency, just format
    if (baseCode === selectedCurrency) {
       return formatCurrencyAmount(amount, {
          currencyCode: selectedCurrency,
          language,
          currencyContext: {
              userCurrencyCode: selectedCurrency,
              userCurrency: currencyInfo,
              currencyByCode: { [selectedCurrency]: currencyInfo! },
              rateToUserByCode: { [selectedCurrency]: 1 }
          }
       });
    }

    // Attempt conversion
    const rate = exchangeRates[baseCode];
    if (rate !== undefined) {
      const convertedAmount = amount * rate;
      return formatCurrencyAmount(convertedAmount, {
        currencyCode: selectedCurrency,
        language,
        currencyContext: {
            userCurrencyCode: selectedCurrency,
            userCurrency: currencyInfo,
            currencyByCode: { [selectedCurrency]: currencyInfo! },
            rateToUserByCode: { [selectedCurrency]: 1 }
        }
      });
    }

    // Fallback to original price while loading rate
    return formatCurrencyAmount(amount, {
      currencyCode: baseCode,
      language
    });
  }, [amount, baseCode, selectedCurrency, exchangeRates, currencyInfo, language]);

  return (
    <Text style={[styles.price, style]}>
      {formattedPrice}
    </Text>
  );
};

const styles = StyleSheet.create({
  price: {
    fontFamily: 'GraphikArabic-Medium',
    fontSize: 16,
    color: '#000',
  },
  free: {
    fontFamily: 'GraphikArabic-Semibold',
    fontSize: 16,
    color: '#10B981', // Emerald green
  }
});
