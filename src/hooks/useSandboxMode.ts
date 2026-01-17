import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SandboxModeSettings {
  enabled: boolean;
  description: string;
}

const DEFAULT_SETTINGS: SandboxModeSettings = {
  enabled: true,
  description: 'When enabled, uses mock data instead of real bureau API calls'
};

export function useSandboxMode() {
  const [settings, setSettings] = useState<SandboxModeSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'sandbox_mode')
        .maybeSingle();

      if (error) throw error;

      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        const value = data.value as Record<string, unknown>;
        setSettings({
          enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
          description: typeof value.description === 'string' ? value.description : DEFAULT_SETTINGS.description
        });
      }
    } catch (error) {
      console.error('Error fetching sandbox mode settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings: Partial<SandboxModeSettings>): Promise<boolean> => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          value: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('key', 'sandbox_mode');

      if (error) throw error;

      setSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error('Error updating sandbox mode settings:', error);
      return false;
    }
  };

  const isSandboxMode = settings.enabled;

  return {
    settings,
    loading,
    updateSettings,
    isSandboxMode,
    refetch: fetchSettings
  };
}
