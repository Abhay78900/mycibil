import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BureauPricing } from '@/types/bureauPricing';

export function useBureauPricing() {
  const [pricing, setPricing] = useState<BureauPricing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPricing = async () => {
    try {
      const { data, error } = await supabase
        .from('bureau_pricing')
        .select('*')
        .eq('is_active', true)
        .order('bureau_code');
      
      if (error) throw error;
      setPricing(data || []);
    } catch (error) {
      console.error('Error fetching bureau pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricing();
  }, []);

  const getUserPrice = (bureauCode: string): number => {
    const bureau = pricing.find(p => p.bureau_code === bureauCode);
    return bureau?.user_price || 99;
  };

  const getPartnerPrice = (bureauCode: string): number => {
    const bureau = pricing.find(p => p.bureau_code === bureauCode);
    return bureau?.partner_price || 99;
  };

  const calculateUserTotal = (selectedBureaus: string[]): number => {
    return selectedBureaus.reduce((sum, code) => sum + getUserPrice(code), 0);
  };

  const calculatePartnerTotal = (selectedBureaus: string[]): number => {
    return selectedBureaus.reduce((sum, code) => sum + getPartnerPrice(code), 0);
  };

  return {
    pricing,
    loading,
    getUserPrice,
    getPartnerPrice,
    calculateUserTotal,
    calculatePartnerTotal,
    refetch: fetchPricing,
  };
}
