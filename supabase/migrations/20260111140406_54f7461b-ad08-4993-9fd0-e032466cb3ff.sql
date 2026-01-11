-- Allow users to update their own reports (for payment completion)
CREATE POLICY "Users can update own reports"
ON public.credit_reports
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);