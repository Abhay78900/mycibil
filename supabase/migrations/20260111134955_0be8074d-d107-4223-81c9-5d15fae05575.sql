-- Add UPDATE policy for partners to update their client reports
CREATE POLICY "Partners can update their client reports"
ON public.credit_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM partners
    WHERE partners.id = credit_reports.partner_id 
    AND partners.owner_id = auth.uid()
  )
);

-- Add INSERT policy for partners to create reports for their clients
CREATE POLICY "Partners can insert client reports"
ON public.credit_reports
FOR INSERT
WITH CHECK (
  partner_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM partners
    WHERE partners.id = partner_id 
    AND partners.owner_id = auth.uid()
  )
);