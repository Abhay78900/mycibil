-- Insert sandbox_mode setting if it doesn't exist
INSERT INTO system_settings (key, value, description)
VALUES (
  'sandbox_mode',
  '{"enabled": true, "description": "When enabled, uses mock data instead of real bureau API calls"}'::jsonb,
  'Sandbox mode: enabled=true uses mock data for development, false makes real API calls'
)
ON CONFLICT (key) DO NOTHING;