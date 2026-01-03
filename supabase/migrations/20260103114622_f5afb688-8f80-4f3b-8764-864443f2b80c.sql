-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'partner', 'user');

-- Create enum for report status
CREATE TYPE public.report_status AS ENUM ('locked', 'unlocked', 'processing', 'failed');

-- Create enum for transaction status
CREATE TYPE public.transaction_status AS ENUM ('pending', 'success', 'failed', 'refunded');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  pan_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- Create partners table
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  franchise_id TEXT UNIQUE NOT NULL,
  wallet_balance DECIMAL(12,2) DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 10,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create credit_reports table
CREATE TABLE public.credit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  pan_number TEXT NOT NULL,
  date_of_birth DATE,
  cibil_score INTEGER,
  experian_score INTEGER,
  equifax_score INTEGER,
  crif_score INTEGER,
  average_score INTEGER,
  report_status report_status DEFAULT 'locked',
  selected_bureaus TEXT[] DEFAULT ARRAY['cibil', 'experian', 'equifax', 'crif'],
  active_loans JSONB DEFAULT '[]'::jsonb,
  credit_cards JSONB DEFAULT '[]'::jsonb,
  enquiries JSONB DEFAULT '[]'::jsonb,
  risk_flags JSONB DEFAULT '[]'::jsonb,
  is_high_risk BOOLEAN DEFAULT FALSE,
  ai_analysis TEXT,
  improvement_tips JSONB DEFAULT '[]'::jsonb,
  raw_cibil_data JSONB,
  raw_experian_data JSONB,
  raw_equifax_data JSONB,
  raw_crif_data JSONB,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  report_id UUID REFERENCES public.credit_reports(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL,
  status transaction_status DEFAULT 'pending',
  payment_method TEXT,
  payment_reference TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pricing_plans table
CREATE TABLE public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bureaus TEXT[] NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_credit_reports_updated_at BEFORE UPDATE ON public.credit_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_roles (read-only for users, admin can manage)
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for partners
CREATE POLICY "Partners can view own data" ON public.partners FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Partners can update own data" ON public.partners FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Admins can manage all partners" ON public.partners FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for credit_reports
CREATE POLICY "Users can view own reports" ON public.credit_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON public.credit_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Partners can view their client reports" ON public.credit_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.partners WHERE id = partner_id AND owner_id = auth.uid())
);
CREATE POLICY "Admins can manage all reports" ON public.credit_reports FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Partners can view their transactions" ON public.transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.partners WHERE id = partner_id AND owner_id = auth.uid())
);
CREATE POLICY "Admins can manage all transactions" ON public.transactions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for pricing_plans (public read)
CREATE POLICY "Anyone can view active pricing plans" ON public.pricing_plans FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage pricing plans" ON public.pricing_plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default pricing plans
INSERT INTO public.pricing_plans (name, bureaus, price) VALUES
  ('Single Bureau', ARRAY['cibil'], 99),
  ('Two Bureaus', ARRAY['cibil', 'experian'], 179),
  ('Three Bureaus', ARRAY['cibil', 'experian', 'equifax'], 249),
  ('All 4 Bureaus', ARRAY['cibil', 'experian', 'equifax', 'crif'], 299);