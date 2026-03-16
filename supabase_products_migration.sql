-- Create products table
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  nail_count SMALLINT NOT NULL CHECK (nail_count = 12 OR nail_count = 24),
  has_prep_kit BOOLEAN NOT NULL DEFAULT true,
  stock_status TEXT NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 1. Create a policy that allows anyone (anon or authenticated) to read the products
CREATE POLICY "Products are viewable by everyone" ON public.products
  FOR SELECT USING (true);

-- 2. Create policies that only allow the service_role (your backend) to insert/update/delete
-- Note: When using the SUPABASE_SERVICE_ROLE_KEY in your Express backend, 
-- it automatically bypasses RLS, but it's good practice to set these explicit policies just in case
-- you ever use standard authenticated users.
CREATE POLICY "Products can be inserted by authenticated admin API" ON public.products
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Products can be updated by authenticated admin API" ON public.products
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "Products can be deleted by authenticated admin API" ON public.products
  FOR DELETE USING (auth.role() = 'service_role');

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
