-- Create the site_settings table to store dynamic configurations like the Banner
CREATE TABLE IF NOT EXISTS public.site_settings (
    key VARCHAR(255) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access (Storefront needs to read the banner settings)
CREATE POLICY "Allow public read access to site_settings" ON public.site_settings
    FOR SELECT USING (true);

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to execute the updated_at function
CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert the default Banner configuration
INSERT INTO public.site_settings (key, value)
VALUES (
    'banner', 
    '{"text": "✨ Spring Collection Now Available - Use Code SPRING25 for 25% Off!", "backgroundColor": "#7A0D19", "textColor": "#FFFFFF", "isActive": true}'::jsonb
) ON CONFLICT (key) DO NOTHING;
