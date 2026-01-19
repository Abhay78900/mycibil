import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// PAN validation regex
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export interface FetchBureauParams {
  reportId: string;
  fullName: string;
  panNumber: string;
  mobileNumber: string;
  dateOfBirth?: string;
  gender?: string;
}

export interface BureauApiResult {
  success: boolean;
  score?: number;
  rawData?: any;
  isSandbox?: boolean;
  error?: string;
}

interface BureauLoadingState {
  cibil: boolean;
  experian: boolean;
  equifax: boolean;
  crif: boolean;
}

// Validation helpers
export function validatePan(pan: string): boolean {
  return PAN_REGEX.test(pan.toUpperCase());
}

export function validateMobile(mobile: string): boolean {
  return /^\d{10}$/.test(mobile.replace(/\s+/g, ''));
}

export function validateDob(dob: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dob);
}

export function validateBureauParams(params: FetchBureauParams): { valid: boolean; error?: string } {
  if (!params.reportId) {
    return { valid: false, error: 'Report ID is required' };
  }
  if (!params.fullName || params.fullName.trim().length < 2) {
    return { valid: false, error: 'Full name is required (minimum 2 characters)' };
  }
  if (!params.panNumber) {
    return { valid: false, error: 'PAN number is required' };
  }
  if (!validatePan(params.panNumber)) {
    return { valid: false, error: 'Invalid PAN format. Expected: ABCDE1234F' };
  }
  if (!params.mobileNumber) {
    return { valid: false, error: 'Mobile number is required' };
  }
  if (!validateMobile(params.mobileNumber)) {
    return { valid: false, error: 'Invalid mobile number. Must be 10 digits.' };
  }
  if (params.dateOfBirth && !validateDob(params.dateOfBirth)) {
    return { valid: false, error: 'Invalid date of birth format. Expected: YYYY-MM-DD' };
  }
  if (params.gender && !['Male', 'Female'].includes(params.gender)) {
    return { valid: false, error: 'Gender must be Male or Female' };
  }
  return { valid: true };
}

export function useBureauApi() {
  const [isLoading, setIsLoading] = useState<BureauLoadingState>({
    cibil: false,
    experian: false,
    equifax: false,
    crif: false
  });

  const callBureauFunction = async (
    bureau: 'cibil' | 'experian' | 'equifax' | 'crif',
    functionName: string,
    params: FetchBureauParams
  ): Promise<BureauApiResult> => {
    setIsLoading(prev => ({ ...prev, [bureau]: true }));

    try {
      // Validate params before calling
      const validation = validateBureauParams(params);
      if (!validation.valid) {
        toast.error(`${bureau.toUpperCase()}: ${validation.error}`);
        return { success: false, error: validation.error };
      }

      // Normalize PAN to uppercase
      const normalizedParams = {
        ...params,
        panNumber: params.panNumber.toUpperCase().trim(),
        mobileNumber: params.mobileNumber.replace(/\s+/g, ''),
        fullName: params.fullName.trim()
      };

      console.log(`[${bureau.toUpperCase()}] Calling edge function:`, functionName);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: normalizedParams
      });

      if (error) {
        console.error(`[${bureau.toUpperCase()}] API error:`, error);
        const errorMsg = error.message || 'Unknown error';
        toast.error(`${bureau.toUpperCase()}: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      if (!data?.success) {
        console.error(`[${bureau.toUpperCase()}] API returned error:`, data?.error);
        const errorMsg = data?.error || 'Unknown error';
        toast.error(`${bureau.toUpperCase()}: ${errorMsg}`);
        return { success: false, error: errorMsg };
      }

      console.log(`[${bureau.toUpperCase()}] Report fetched successfully:`, {
        score: data.data?.score,
        isSandbox: data.data?.isSandbox
      });

      return {
        success: true,
        score: data.data?.score,
        rawData: data.data?.rawData,
        isSandbox: data.data?.isSandbox
      };
    } catch (err: any) {
      console.error(`[${bureau.toUpperCase()}] Error:`, err);
      const errorMsg = err.message || 'Failed to fetch report';
      toast.error(`${bureau.toUpperCase()}: ${errorMsg}`);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(prev => ({ ...prev, [bureau]: false }));
    }
  };

  const fetchCibilReport = async (params: FetchBureauParams): Promise<BureauApiResult> => {
    return callBureauFunction('cibil', 'fetch-cibil-report', params);
  };

  const fetchExperianReport = async (params: FetchBureauParams): Promise<BureauApiResult> => {
    return callBureauFunction('experian', 'fetch-experian-report', params);
  };

  const fetchEquifaxReport = async (params: FetchBureauParams): Promise<BureauApiResult> => {
    return callBureauFunction('equifax', 'fetch-equifax-report', params);
  };

  const fetchCrifReport = async (params: FetchBureauParams): Promise<BureauApiResult> => {
    return callBureauFunction('crif', 'fetch-crif-report', params);
  };

  const fetchBureauReport = async (bureau: string, params: FetchBureauParams): Promise<BureauApiResult> => {
    switch (bureau.toLowerCase()) {
      case 'cibil':
        return fetchCibilReport(params);
      case 'experian':
        return fetchExperianReport(params);
      case 'equifax':
        return fetchEquifaxReport(params);
      case 'crif':
        return fetchCrifReport(params);
      default:
        return { success: false, error: `Unknown bureau: ${bureau}` };
    }
  };

  // Fetch multiple bureaus in parallel - only selected ones
  const fetchMultipleBureaus = async (
    selectedBureaus: string[],
    params: FetchBureauParams
  ): Promise<Record<string, BureauApiResult>> => {
    const results: Record<string, BureauApiResult> = {};

    // Only call APIs for selected bureaus
    const promises = selectedBureaus.map(async (bureau) => {
      const result = await fetchBureauReport(bureau, params);
      results[bureau.toLowerCase()] = result;
    });

    await Promise.allSettled(promises);

    return results;
  };

  return {
    fetchCibilReport,
    fetchExperianReport,
    fetchEquifaxReport,
    fetchCrifReport,
    fetchBureauReport,
    fetchMultipleBureaus,
    isLoading,
    validateBureauParams
  };
}
