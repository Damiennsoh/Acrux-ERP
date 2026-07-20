'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './auth-context';
import { supabase } from './supabase';

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
}

export const currencies: Record<string, CurrencyConfig> = {
  LRD: { code: 'LRD', symbol: 'L$', name: 'Liberian Dollar' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  GHS: { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi' },
  XOF: { code: 'XOF', symbol: 'CFA', name: 'West African CFA' },
};

interface CurrencyContextType {
  currency: string;
  currencyConfig: CurrencyConfig;
  setCurrency: (currency: string) => void;
  formatCurrency: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState('LRD');

  // Load saved currency from localStorage OR cloud user metadata
  useEffect(() => {
    let savedCurrency = localStorage.getItem('selectedCurrency');
    
    // Cloud preference overrides local if different (useful for new devices)
    const cloudCurrency = (user as any)?.defaultCurrency;
    if (cloudCurrency && currencies[cloudCurrency]) {
      savedCurrency = cloudCurrency;
      localStorage.setItem('selectedCurrency', cloudCurrency);
    }

    if (savedCurrency && currencies[savedCurrency]) {
      setCurrencyState(savedCurrency);
    }
  }, [user]);

  const setCurrency = async (newCurrency: string) => {
    if (currencies[newCurrency]) {
      setCurrencyState(newCurrency);
      localStorage.setItem('selectedCurrency', newCurrency);
      
      // Persist to cloud securely in the background without blocking the UI
      if (user) {
        try {
          // Fire-and-forget background update to keep across devices
          supabase.auth.updateUser({
            data: { defaultCurrency: newCurrency }
          });
        } catch (e) {
          console.warn('Could not sync currency preference to cloud immediately.');
        }
      }
    }
  };

  const formatCurrency = (amount: number): string => {
    const config = currencies[currency];
    if (!config) return `$${amount.toLocaleString()}`;
    
    // Special formatting for different currencies
    switch (currency) {
      case 'LRD':
        return `L$${amount.toLocaleString()}`;
      case 'NGN':
        return `₦${amount.toLocaleString()}`;
      case 'GHS':
        return `₵${amount.toLocaleString()}`;
      case 'XOF':
        return `${amount.toLocaleString()} CFA`;
      case 'EUR':
        return `€${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'GBP':
        return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'CAD':
        return `C$${amount.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'AUD':
        return `A$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      default:
        return `${config.symbol}${amount.toLocaleString()}`;
    }
  };

  const value: CurrencyContextType = {
    currency,
    currencyConfig: currencies[currency],
    setCurrency,
    formatCurrency,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
