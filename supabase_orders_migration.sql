-- Create customers table
CREATE TABLE customers (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  total_orders integer DEFAULT 0,
  lifetime_value numeric DEFAULT 0,
  special_notes text DEFAULT '',
  created_at timestamptz DEFAULT NOW()
);

-- Search by phone or email easily
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_email ON customers(email);

-- Create orders table
CREATE TABLE orders (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  friendly_id text NOT NULL UNIQUE, -- e.g. NBH-1025
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Pending',
  tracking_id text,
  address jsonb NOT NULL,
  has_luxury_gift_box boolean DEFAULT false,
  total numeric NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

-- Create order items table mapping back to orders
CREATE TABLE order_items (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid, -- optional link to the products table
  product_name text NOT NULL,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  thumbnail text
);

-- Turn on Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Allow completely public inserts for the storefront checkout (No auth required)
CREATE POLICY "Allow public insert to customers" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert to order_items" ON order_items FOR INSERT WITH CHECK (true);

-- The Service Role Key (Backend) bypasses RLS naturally, so it can read/update the tables.
-- The Storefront only needs INSERT permission to place an order.
