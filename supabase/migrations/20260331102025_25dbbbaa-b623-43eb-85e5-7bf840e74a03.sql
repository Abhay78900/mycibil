ALTER TABLE public.profiles ADD COLUMN active_session_id text DEFAULT null;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;