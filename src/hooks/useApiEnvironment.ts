import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ApiEnvironment = 'uat' | 'production';

interface ApiEnvironmentSettings {
  environment: ApiEnvironment;
  description: string;
}

const DEFAULT_SETTINGS: ApiEnvironmentSettings = {
  environment: 'uat',
  description: 'Select whether API calls go to UAT or Production endpoints'
};

export function useApiEnvironment() {
  const [settings, setSettings] = useState<ApiEnvironmentSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'api_environment')
        .maybeSingle();

      if (error) throw error;

      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        const value = data.value as Record<string, unknown>;
        setSettings({
          environment: (value.environment === 'production' ? 'production' : 'uat') as ApiEnvironment,
          description: typeof value.description === 'string' ? value.description : DEFAULT_SETTINGS.description
        });
      }
    } catch (error) {
      console.error('Error fetching API environment settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<ApiEnvironmentSettings>): Promise<boolean> => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      // Try update first
      const { data: existingData } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'api_environment')
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from('system_settings')
          .update({ 
            value: updatedSettings,
            updated_at: new Date().toISOString()
          })
          .eq('key', 'api_environment');

        if (error) throw error;
      } else {
        // Insert if doesn't exist
        const { error } = await supabase
          .from('system_settings')
          .insert({
            key: 'api_environment',
            value: updatedSettings,
            description: 'API environment setting (UAT or Production)'
          });

        if (error) throw error;
      }

      setSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error('Error updating API environment settings:', error);
      return false;
    }
  };

  const isProduction = settings.environment === 'production';
  const isUat = settings.environment === 'uat';

  return {
    settings,
    loading,
    updateSettings,
    isProduction,
    isUat,
    refetch: fetchSettings
  };
}
