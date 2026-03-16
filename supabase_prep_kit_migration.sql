-- Add the has_prep_kit column to the orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS has_prep_kit boolean DEFAULT false;
