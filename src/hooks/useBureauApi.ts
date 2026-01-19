import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FetchBureauParams {
  reportId: string;
  fullName: string;
  panNumber: string;
  dateOfBirth?: string;
  gender?: string;
}

interface BureauApiResult {
  success: boolean;
  score?: number;
  rawData?: any;
  isSandbox?: boolean;
  error?: string;
}

export function useBureauApi() {
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  const fetchCrifReport = async (params: FetchBureauParams): Promise<BureauApiResult> => {
    setIsLoading(prev => ({ ...prev, crif: true }));
    
    try {
      console.log('Calling fetch-crif-report edge function:', params);
      
      const { data, error } = await supabase.functions.invoke('fetch-crif-report', {
        body: params
      });

      if (error) {
        console.error('CRIF API error:', error);
        toast.error(`CRIF API Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        console.error('CRIF API returned error:', data?.error);
        toast.error(`CRIF API Error: ${data?.error || 'Unknown error'}`);
        return { success: false, error: data?.error };
      }

      console.log('CRIF report fetched successfully:', data.data);
      return {
        success: true,
        score: data.data?.score,
        rawData: data.data?.rawData,
        isSandbox: data.data?.isSandbox
      };
    } catch (err: any) {
      console.error('Error fetching CRIF report:', err);
      toast.error(`Failed to fetch CRIF report: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(prev => ({ ...prev, crif: false }));
    }
  };

  // Placeholder for other bureaus - to be implemented
  const fetchCibilReport = async (params: FetchBureauParams): Promise<BureauApiResult> => {
    // TODO: Implement CIBIL API integration
    console.log('CIBIL API not yet implemented');
    return { success: false, error: 'CIBIL API not yet implemented' };
  };

  const fetchExperianReport = async (params: FetchBureauParams): Promise<BureauApiResult> => {
    // TODO: Implement Experian API integration
    console.log('Experian API not yet implemented');
    return { success: false, error: 'Experian API not yet implemented' };
  };

  const fetchEquifaxReport = async (params: FetchBureauParams): Promise<BureauApiResult> => {
    // TODO: Implement Equifax API integration
    console.log('Equifax API not yet implemented');
    return { success: false, error: 'Equifax API not yet implemented' };
  };

  const fetchBureauReport = async (bureau: string, params: FetchBureauParams): Promise<BureauApiResult> => {
    switch (bureau.toLowerCase()) {
      case 'crif':
        return fetchCrifReport(params);
      case 'cibil':
        return fetchCibilReport(params);
      case 'experian':
        return fetchExperianReport(params);
      case 'equifax':
        return fetchEquifaxReport(params);
      default:
        return { success: false, error: `Unknown bureau: ${bureau}` };
    }
  };

  return {
    fetchCrifReport,
    fetchCibilReport,
    fetchExperianReport,
    fetchEquifaxReport,
    fetchBureauReport,
    isLoading
  };
}
