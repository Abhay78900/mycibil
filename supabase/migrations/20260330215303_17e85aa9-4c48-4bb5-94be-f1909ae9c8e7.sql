
-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  created_by uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all notifications" ON public.admin_notifications FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Partners can view active notifications" ON public.admin_notifications FOR SELECT TO authenticated USING (is_active = true);

-- Create notification_reads table
CREATE TABLE public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.admin_notifications(id) ON DELETE CASCADE,
  partner_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id, partner_id)
);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all reads" ON public.notification_reads FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Partners can insert own reads" ON public.notification_reads FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.partners WHERE partners.id = notification_reads.partner_id AND partners.owner_id = auth.uid())
);
CREATE POLICY "Partners can view own reads" ON public.notification_reads FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.partners WHERE partners.id = notification_reads.partner_id AND partners.owner_id = auth.uid())
);
