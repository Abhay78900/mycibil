import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

interface PartnerWalletSettings {
  enabled: boolean;
  report_unit_price: number;
}

export function usePartnerWalletMode() {
  const [settings, setSettings] = useState<PartnerWalletSettings>({
    enabled: false,
    report_unit_price: 99,
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'partner_wallet_mode')
        .single();
      
      if (error) throw error;
      if (data?.value) {
        const value = data.value as unknown as PartnerWalletSettings;
        setSettings(value);
      }
    } catch (error) {
      console.error('Error fetching partner wallet settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: PartnerWalletSettings) => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .update({ value: newSettings as unknown as Json })
        .eq('key', 'partner_wallet_mode');
      
      if (error) throw error;
      setSettings(newSettings);
      return true;
    } catch (error) {
      console.error('Error updating partner wallet settings:', error);
      return false;
    }
  };

  // Report count mode is enabled when settings.enabled is true
  const isReportCountMode = settings.enabled;
  const reportUnitPrice = settings.report_unit_price;

  // Calculate reports from amount (floor value only)
  const calculateReportsFromAmount = (amount: number): number => {
    return Math.floor(amount / reportUnitPrice);
  };

  // Calculate remainder amount after conversion
  const calculateRemainderAmount = (amount: number): number => {
    return amount % reportUnitPrice;
  };

  // Calculate amount from reports
  const calculateAmountFromReports = (reports: number): number => {
    return reports * reportUnitPrice;
  };

  // Get effective report count from wallet balance (for automatic conversion)
  const getEffectiveReportCount = (walletBalance: number, storedReportCount: number): number => {
    if (!isReportCountMode) return storedReportCount;
    // In report count mode, derive reports from wallet balance
    return calculateReportsFromAmount(walletBalance);
  };

  return {
    settings,
    loading,
    isReportCountMode,
    reportUnitPrice,
    updateSettings,
    calculateReportsFromAmount,
    calculateRemainderAmount,
    calculateAmountFromReports,
    getEffectiveReportCount,
    refetch: fetchSettings,
  };
}
