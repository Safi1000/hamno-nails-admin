import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Set up multer for memory storage (for passing buffers directly to Supabase)
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Supabase using the service_role key to bypass RLS securely on the backend
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return res.status(500).json({ error: 'Server misconfiguration: missing credentials in .env' });
  }

  if (email === adminEmail && password === adminPassword) {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid email or password' });
  }
});

// Middleware to verify JWT token for protected routes
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1]; // "Bearer <token>"
  if (!token) return res.status(403).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    req.user = decoded;
    next();
  });
};

// --- IMAGE UPLOAD API (Protected) ---
app.post('/api/upload', verifyToken, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  try {
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

    // Upload the file buffer to the "product-images" bucket in Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return res.status(500).json({ error: 'Failed to upload image to storage' });
    }

    // Get the permanently accessible public URL for the newly uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    res.json({ url: publicUrlData.publicUrl });
  } catch (error) {
    console.error("Upload route error:", error);
    res.status(500).json({ error: 'Internal server error during upload' });
  }
});

// --- PRODUCTS API (Protected) ---

// Get all products 
app.get('/api/products', verifyToken, async (req, res) => {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create a product
app.post('/api/products', verifyToken, async (req, res) => {
  const { data, error } = await supabase.from('products').insert([req.body]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update a product
app.put('/api/products/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('products').update(req.body).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete a product
app.delete('/api/products/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).end();
});

// --- SETTINGS API ---
app.get('/api/public/settings/banner', async (req, res) => {
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'banner').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data?.value || null);
});

app.get('/api/settings/banner', verifyToken, async (req, res) => {
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'banner').single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data?.value || null);
});

app.put('/api/settings/banner', verifyToken, async (req, res) => {
  const { error } = await supabase.from('site_settings').upsert({
    key: 'banner',
    value: req.body
  });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// --- CHECKOUT API (Public Storefront) ---
app.post('/api/checkout', async (req, res) => {
  const { name, email, phone, address, items, total, hasLuxuryGiftBox, order_notes, paymentMethod } = req.body;

  try {
    // 1. Find or create customer
    let customerId;
    let customerError;
    
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update lifetime stats later
    } else {
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert([{ name, email, phone, lifetime_value: 0, total_orders: 0 }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      customerId = newCustomer.id;
    }

    // 2. Generate Order ID (NBH-XXXX)
    const { data: lastOrder } = await supabase
      .from('orders')
      .select('friendly_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    let nextNum = 1000;
    if (lastOrder && lastOrder.friendly_id) {
      const match = lastOrder.friendly_id.match(/NBH-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const friendlyId = `NBH-${nextNum}`;

    // 3. Create Order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        friendly_id: friendlyId,
        customer_id: customerId,
        status: 'Pending',
        address,
        has_luxury_gift_box: hasLuxuryGiftBox,
        total,
        order_notes: order_notes || '',
        payment_method: paymentMethod || 'COD',
        payment_status: 'Pending'
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // 4. Create Order Items
    const itemsToInsert = items.map((item) => ({
      order_id: order.id,
      product_name: item.name,
      quantity: item.quantity,
      price: item.price,
      product_id: item.productId, // UUID from storefront
      thumbnail: item.thumbnail
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;

    // 5. Update Customer's Lifetime Value
    if (customerId) {
      const { data: customerData } = await supabase.from('customers').select('total_orders, lifetime_value').eq('id', customerId).single();
      if (customerData) {
        await supabase.from('customers').update({
          total_orders: (customerData.total_orders || 0) + 1,
          lifetime_value: parseFloat(customerData.lifetime_value || 0) + parseFloat(total)
        }).eq('id', customerId);
      }
    }

    res.status(201).json({ success: true, orderId: friendlyId });

  } catch (err) {
    console.error("Checkout database error:", err);
    res.status(500).json({ error: 'Failed to save order to database' });
  }
});

// --- ORDERS AND CUSTOMERS API (Protected) ---

// Get all orders with their items & customer info
app.get('/api/orders', verifyToken, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        customers (*),
        order_items (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order details
app.patch('/api/orders/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tracking_id, address, has_luxury_gift_box, total, order_notes, customer_id, customer_name, customer_email, customer_phone, payment_status } = req.body;
    
    // Build update object based on what was passed
    const updates = {};
    if (status) updates.status = status;
    if (tracking_id !== undefined) updates.tracking_id = tracking_id;
    if (address) updates.address = address;
    if (has_luxury_gift_box !== undefined) updates.has_luxury_gift_box = has_luxury_gift_box;
    if (total !== undefined) updates.total = total;
    if (order_notes !== undefined) updates.order_notes = order_notes;
    if (payment_status !== undefined) updates.payment_status = payment_status;

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // If customer details were provided, update the customer too
    if (customer_id && (customer_name || customer_email || customer_phone)) {
      const customerUpdates = {};
      if (customer_name) customerUpdates.name = customer_name;
      if (customer_email) customerUpdates.email = customer_email;
      if (customer_phone) customerUpdates.phone = customer_phone;
      
      const { error: custError } = await supabase
        .from('customers')
        .update(customerUpdates)
        .eq('id', customer_id);
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an order
app.delete('/api/orders/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all customers with their order history
app.get('/api/customers', verifyToken, async (req, res) => {
  try {
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        *,
        orders (
          friendly_id,
          created_at,
          total
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update customer details
app.patch('/api/customers/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, special_notes, total_orders, lifetime_value } = req.body;
    
    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;
    if (special_notes !== undefined) updates.special_notes = special_notes;
    if (total_orders !== undefined) updates.total_orders = total_orders;
    if (lifetime_value !== undefined) updates.lifetime_value = lifetime_value;
    
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a customer
app.delete('/api/customers/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- PRODUCTION FRONTEND SERVING ---
// When deployed on Render (NODE_ENV=production), serve the built React admin panel
if (process.env.NODE_ENV === 'production') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Serve the static files from the React build
  app.use('/admin', express.static(path.join(__dirname, 'dist')));

  // For any other /admin routes, serve the index.html so React Router handles it
  app.get('/admin/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Admin Authenticator backend running on port ${PORT}`));
