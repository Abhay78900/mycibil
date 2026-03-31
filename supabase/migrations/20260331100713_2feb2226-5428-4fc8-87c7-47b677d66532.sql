ALTER TABLE public.partners DROP COLUMN single_session;
ALTER TABLE public.partners ADD COLUMN max_sessions integer NOT NULL DEFAULT 1;