-- 1. Add the new text column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS packaging_option text DEFAULT 'Standard';

-- 2. Migrate existing true values to a legacy string label so old orders don't break
UPDATE public.orders 
SET packaging_option = 'Luxury Box (Legacy)' 
WHERE has_luxury_gift_box = true;

-- 3. Drop the old boolean column
ALTER TABLE public.orders 
DROP COLUMN IF EXISTS has_luxury_gift_box;
