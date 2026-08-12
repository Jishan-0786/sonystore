-- ==========================================================================
-- SONY STORE - COMPLETE SUPABASE DATABASE SCHEMA MIGRATION SCRIPT
-- Project URL: https://qwhtumvoyhoslbbnvwzf.supabase.co
-- 
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/qwhtumvoyhoslbbnvwzf
-- 2. Click "SQL Editor" on the left navigation sidebar.
-- 3. Click "New query" (+ button).
-- 4. Copy and paste this ENTIRE script into the SQL Editor.
-- 5. Click "Run" (or Ctrl + Enter).
-- 
-- This script is completely safe to run multiple times (idempotent).
-- ==========================================================================

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone TEXT,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USER ROLES TABLE (Admin Access Control)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_role UNIQUE(user_id, role)
);

-- HELPER FUNCTION: Check if current user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. PRODUCTS TABLE & STOCK MANAGEMENT
CREATE TABLE IF NOT EXISTS public.products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    brand TEXT DEFAULT 'SONY STORE Luxury',
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    old_price NUMERIC(12, 2) CHECK (old_price >= 0),
    description TEXT,
    category TEXT DEFAULT 'Luxury',
    material TEXT,
    movement TEXT,
    case_size TEXT,
    strap TEXT,
    water_resistance TEXT,
    rating NUMERIC(3, 2) DEFAULT 5.0 CHECK (rating >= 0 AND rating <= 5),
    sku TEXT UNIQUE,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. WISHLIST TABLE
CREATE TABLE IF NOT EXISTS public.wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_wishlist UNIQUE(user_id, product_id)
);

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY, -- Reference format: SNY-ORD-XXXX
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    postal TEXT,
    country TEXT DEFAULT 'Nepal',
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    shipping NUMERIC(12, 2) DEFAULT 0 CHECK (shipping >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    payment_method TEXT DEFAULT 'Cash on Delivery',
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ORDER LINE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================================
-- INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ==========================================================================

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_id ON public.wishlist(user_id);

-- ==========================================================================
-- AUTOMATIC PROFILE CREATION TRIGGER
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, phone, full_name, email)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'full_name',
        NEW.email
    )
    ON CONFLICT (id) DO UPDATE SET
        phone = EXCLUDED.phone,
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==========================================================================
-- ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 1. PROFILES POLICIES
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles 
    FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id);

-- 2. PRODUCTS POLICIES (Public Read, Admin Write)
DROP POLICY IF EXISTS "Public products read access" ON public.products;
CREATE POLICY "Public products read access" ON public.products 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin products insert" ON public.products;
CREATE POLICY "Admin products insert" ON public.products 
    FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin products update" ON public.products;
CREATE POLICY "Admin products update" ON public.products 
    FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admin products delete" ON public.products;
CREATE POLICY "Admin products delete" ON public.products 
    FOR DELETE USING (public.is_admin());

-- 3. WISHLIST POLICIES (Owner Only)
DROP POLICY IF EXISTS "Users can read own wishlist" ON public.wishlist;
CREATE POLICY "Users can read own wishlist" ON public.wishlist 
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert into own wishlist" ON public.wishlist;
CREATE POLICY "Users can insert into own wishlist" ON public.wishlist 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete from own wishlist" ON public.wishlist;
CREATE POLICY "Users can delete from own wishlist" ON public.wishlist 
    FOR DELETE USING (auth.uid() = user_id);

-- 4. ORDERS POLICIES (Owner Read/Insert, Admin Full Access)
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;
CREATE POLICY "Users can read own orders" ON public.orders 
    FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Anyone or authenticated can insert order" ON public.orders;
CREATE POLICY "Anyone or authenticated can insert order" ON public.orders 
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admin update orders status" ON public.orders;
CREATE POLICY "Admin update orders status" ON public.orders 
    FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admin delete orders" ON public.orders;
CREATE POLICY "Admin delete orders" ON public.orders 
    FOR DELETE USING (public.is_admin());

-- 5. ORDER ITEMS POLICIES
DROP POLICY IF EXISTS "Public or user read order items" ON public.order_items;
CREATE POLICY "Public or user read order items" ON public.order_items 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone or authenticated can insert order items" ON public.order_items;
CREATE POLICY "Anyone or authenticated can insert order items" ON public.order_items 
    FOR INSERT WITH CHECK (true);

-- ==========================================================================
-- SAMPLE SEED DATA FOR PRODUCTS
-- ==========================================================================

INSERT INTO public.products (name, brand, price, old_price, description, category, material, movement, case_size, strap, water_resistance, rating, sku, stock)
VALUES 
('ChronoRoyal Gold Edition', 'SONY STORE Luxury', 14500.00, 18000.00, 'Handcrafted 18k gold automatic chronograph timepiece.', 'Luxury', '18k Rose Gold', 'Calibre CH-800 Automatic', '42mm', 'Alligator Leather', '100m / 10 ATM', 4.95, 'SNY-CRG-001', 12),
('AeroSport Tachymeter', 'SONY STORE Racing', 8900.00, 11200.00, 'Titanium racing chronograph with precision tachymeter bezel.', 'Sport', 'Grade 5 Titanium', 'Precision Quartz Chrono', '44mm', 'Rubber Sport Strap', '200m / 20 ATM', 4.85, 'SNY-AST-002', 8),
('Grand Heritage Mechanical', 'SONY STORE Classic', 22000.00, NULL, 'Masterpiece skeleton dial timepiece with 72-hour power reserve.', 'Automatic', '939L Stainless Steel', 'In-House Manual Wind', '40mm', 'Italian Calf Leather', '50m / 5 ATM', 5.00, 'SNY-GHM-003', 4),
('Minimalist Eclipse Onyx', 'SONY STORE Minimal', 4500.00, 5800.00, 'Ultra-thin matte black dial with rose gold hour markers.', 'Minimal', 'PVD Black Steel', 'Swiss Quartz', '38mm', 'Mesh Bracelet', '30m / 3 ATM', 4.75, 'SNY-MEO-004', 15)
ON CONFLICT (sku) DO NOTHING;
