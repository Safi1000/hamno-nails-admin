ALTER TABLE orders ADD COLUMN payment_method text DEFAULT 'COD';
ALTER TABLE orders ADD COLUMN payment_status text DEFAULT 'Pending';
