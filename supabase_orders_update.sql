-- Add the order_notes column to the orders table
ALTER TABLE orders 
ADD COLUMN order_notes text DEFAULT '';
