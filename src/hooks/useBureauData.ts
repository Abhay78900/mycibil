import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BureauData {
  score: number | null;
  rawData: any;
  isLoading: boolean;
  isFetched: boolean;
  isUnlocked: boolean;
}

export interface BureauCache {
  cibil: BureauData;
  experian: BureauData;
  equifax: BureauData;
  crif: BureauData;
}

const initialBureauData: BureauData = {
  score: null,
  rawData: null,
  isLoading: false,
  isFetched: false,
  isUnlocked: false,
};

export function useBureauData(reportId: string | null, selectedBureaus: string[] | null) {
  const [bureauCache, setBureauCache] = useState<BureauCache>({
    cibil: { ...initialBureauData },
    experian: { ...initialBureauData },
    equifax: { ...initialBureauData },
    crif: { ...initialBureauData },
  });
  
  const fetchedRef = useRef<Set<string>>(new Set());

  // Check if a bureau was purchased/selected
  const isBureauUnlocked = useCallback((bureau: string): boolean => {
    if (!selectedBureaus || selectedBureaus.length === 0) return false;
    return selectedBureaus.some(b => b.toLowerCase() === bureau.toLowerCase());
  }, [selectedBureaus]);

  // Initialize unlocked status based on selected bureaus
  const initializeUnlockedStatus = useCallback(() => {
    setBureauCache(prev => ({
      cibil: { ...prev.cibil, isUnlocked: isBureauUnlocked('cibil') },
      experian: { ...prev.experian, isUnlocked: isBureauUnlocked('experian') },
      equifax: { ...prev.equifax, isUnlocked: isBureauUnlocked('equifax') },
      crif: { ...prev.crif, isUnlocked: isBureauUnlocked('crif') },
    }));
  }, [isBureauUnlocked]);

  // Lazy fetch bureau data - only called when tab is opened
  const fetchBureauData = useCallback(async (bureau: string) => {
    if (!reportId) return;
    
    const bureauKey = bureau.toLowerCase() as keyof BureauCache;
    
    // Check if already fetched (cached)
    if (fetchedRef.current.has(bureauKey)) {
      return;
    }

    // Check if bureau is unlocked
    if (!isBureauUnlocked(bureauKey)) {
      return;
    }

    // Mark as loading
    setBureauCache(prev => ({
      ...prev,
      [bureauKey]: { ...prev[bureauKey], isLoading: true },
    }));

    try {
      // Fetch only the specific bureau data from the report
      const scoreColumn = `${bureauKey}_score`;
      const rawDataColumn = `raw_${bureauKey}_data`;
      
      const { data, error } = await supabase
        .from('credit_reports')
        .select(`${scoreColumn}, ${rawDataColumn}`)
        .eq('id', reportId)
        .single();

      if (error) throw error;

      const score = data?.[scoreColumn as keyof typeof data] as number | null;
      const rawData = data?.[rawDataColumn as keyof typeof data];

      // Update cache
      setBureauCache(prev => ({
        ...prev,
        [bureauKey]: {
          score,
          rawData,
          isLoading: false,
          isFetched: true,
          isUnlocked: true,
        },
      }));

      // Mark as fetched to prevent re-fetching
      fetchedRef.current.add(bureauKey);
    } catch (error) {
      console.error(`Error fetching ${bureau} data:`, error);
      toast.error(`Failed to load ${bureau.toUpperCase()} data`);
      
      setBureauCache(prev => ({
        ...prev,
        [bureauKey]: { ...prev[bureauKey], isLoading: false, isFetched: true },
      }));
    }
  }, [reportId, isBureauUnlocked]);

  // Pre-load data for a report (initial scores only for display)
  const preloadReportData = useCallback(async () => {
    if (!reportId) return;

    try {
      const { data, error } = await supabase
        .from('credit_reports')
        .select('cibil_score, experian_score, equifax_score, crif_score, raw_cibil_data, raw_experian_data, raw_equifax_data, raw_crif_data')
        .eq('id', reportId)
        .single();

      if (error) throw error;

      const bureaus = ['cibil', 'experian', 'equifax', 'crif'] as const;
      
      setBureauCache(prev => {
        const updated = { ...prev };
        bureaus.forEach(bureau => {
          const scoreKey = `${bureau}_score` as keyof typeof data;
          const rawKey = `raw_${bureau}_data` as keyof typeof data;
          const isUnlocked = isBureauUnlocked(bureau);
          const score = data?.[scoreKey] as number | null;
          
          updated[bureau] = {
            score: isUnlocked ? score : null,
            rawData: isUnlocked ? data?.[rawKey] : null,
            isLoading: false,
            isFetched: isUnlocked && score !== null,
            isUnlocked,
          };
          
          if (isUnlocked && score !== null) {
            fetchedRef.current.add(bureau);
          }
        });
        return updated;
      });
    } catch (error) {
      console.error('Error preloading report data:', error);
    }
  }, [reportId, isBureauUnlocked]);

  // Get score for a bureau
  const getScore = useCallback((bureau: string): number | null => {
    const bureauKey = bureau.toLowerCase() as keyof BureauCache;
    return bureauCache[bureauKey]?.score ?? null;
  }, [bureauCache]);

  // Check if bureau is unlocked
  const isUnlocked = useCallback((bureau: string): boolean => {
    const bureauKey = bureau.toLowerCase() as keyof BureauCache;
    return bureauCache[bureauKey]?.isUnlocked ?? false;
  }, [bureauCache]);

  // Check if bureau data is loading
  const isLoading = useCallback((bureau: string): boolean => {
    const bureauKey = bureau.toLowerCase() as keyof BureauCache;
    return bureauCache[bureauKey]?.isLoading ?? false;
  }, [bureauCache]);

  // Get raw data for a bureau
  const getRawData = useCallback((bureau: string): any => {
    const bureauKey = bureau.toLowerCase() as keyof BureauCache;
    return bureauCache[bureauKey]?.rawData ?? null;
  }, [bureauCache]);

  // Get first unlocked bureau
  const getFirstUnlockedBureau = useCallback((): string | null => {
    const bureaus = ['cibil', 'experian', 'equifax', 'crif'];
    for (const bureau of bureaus) {
      if (isBureauUnlocked(bureau)) {
        return bureau;
      }
    }
    return null;
  }, [isBureauUnlocked]);

  // Reset cache (for when report changes)
  const resetCache = useCallback(() => {
    fetchedRef.current.clear();
    setBureauCache({
      cibil: { ...initialBureauData },
      experian: { ...initialBureauData },
      equifax: { ...initialBureauData },
      crif: { ...initialBureauData },
    });
  }, []);

  return {
    bureauCache,
    fetchBureauData,
    preloadReportData,
    initializeUnlockedStatus,
    getScore,
    isUnlocked,
    isLoading,
    getRawData,
    getFirstUnlockedBureau,
    isBureauUnlocked,
    resetCache,
  };
}
