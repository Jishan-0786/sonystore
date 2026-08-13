/**
 * SONY STORE - Supabase Browser Client & Data Wrappers
 * Project URL: https://qwhtumvohyoslbbnvwzf.supabase.co
 * Uses the Supabase Publishable (Anon) Key with auth configs: detectSessionInUrl, autoRefreshToken, persistSession.
 */

const SUPABASE_URL = window.SUPABASE_URL || 'https://qwhtumvohyoslbbnvwzf.supabase.co';

// Configurable Supabase Publishable (Anon) Key
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3aHR1bXZveWhvc2xiYm52d3pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg1MDY0MDAsImV4cCI6MjA1NDA4MjQwMH0.placeholder-publishable-key';

let supabaseClient = null;

function getSupabaseClient() {
    if (!supabaseClient && typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
        try {
            const url = window.SUPABASE_URL || SUPABASE_URL;
            const key = window.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;
            supabaseClient = supabase.createClient(url, key, {
                auth: {
                    detectSessionInUrl: true,
                    autoRefreshToken: true,
                    persistSession: true
                }
            });
            window.supabaseClient = supabaseClient;
        } catch (e) {
            console.warn('Supabase initialization fallback:', e);
        }
    }
    return supabaseClient || window.supabaseClient || null;
}

function isSupabaseAvailable() {
    return getSupabaseClient() !== null;
}

// 1. Fetch Products from Supabase
async function fetchSupabaseProducts() {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
        const { data, error } = await client.from('products').select('*').order('id', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
            return data.map(p => ({
                id: p.id,
                name: p.name,
                brand: p.brand || 'SONY STORE Luxury',
                price: parseFloat(p.price),
                oldPrice: p.old_price ? parseFloat(p.old_price) : null,
                description: p.description || '',
                category: p.category || 'Luxury',
                material: p.material || 'Stainless Steel',
                movement: p.movement || 'Automatic',
                caseSize: p.case_size || '42mm',
                strap: p.strap || 'Leather',
                waterResistance: p.water_resistance || '50m / 5 ATM',
                rating: parseFloat(p.rating) || 5.0,
                sku: p.sku || `SNY-PRD-${p.id}`,
                stock: parseInt(p.stock) || 0,
                images: p.images && p.images.length > 0 ? p.images : [
                    typeof createWatchSvgDataUri === 'function' 
                        ? createWatchSvgDataUri({ primary: '#d4af37', secondary: '#12141d', accent: '#ffffff' }, 'automatic')
                        : ''
                ]
            }));
        }
    } catch (e) {
        console.warn('Supabase fetch products notice (using local fallback):', e.message || e);
    }
    return null;
}

// 2. Insert Order & Items into Supabase
async function insertSupabaseOrder(orderData) {
    const client = getSupabaseClient();
    if (!client) return null;
    try {
        const currentUser = typeof getLoggedInUser === 'function' ? getLoggedInUser() : null;
        
        const { data: orderHeader, error: orderErr } = await client.from('orders').insert([{
            id: orderData.id,
            user_id: currentUser ? currentUser.id : null,
            customer_name: orderData.customer.name,
            phone: orderData.customer.phone,
            email: orderData.customer.email || null,
            street: orderData.address.street,
            city: orderData.address.city,
            province: orderData.address.province,
            postal: orderData.address.postal || null,
            country: orderData.address.country || 'Nepal',
            subtotal: orderData.subtotal,
            shipping: orderData.shipping || 0,
            total: orderData.total,
            payment_method: orderData.paymentMethod || 'Cash on Delivery',
            status: orderData.status || 'Pending'
        }]).select();

        if (orderErr) throw orderErr;

        if (orderData.items && orderData.items.length > 0) {
            const lineItems = orderData.items.map(item => ({
                order_id: orderData.id,
                product_id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image || ''
            }));

            const { error: itemsErr } = await client.from('order_items').insert(lineItems);
            if (itemsErr) console.warn('Order line items insert notice:', itemsErr);
        }

        return orderHeader;
    } catch (e) {
        console.warn('Supabase order creation notice (saved to local orders):', e.message || e);
        return null;
    }
}

// 3. Update Order Status in Supabase
async function updateSupabaseOrderStatus(orderId, newStatus) {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
        const { error } = await client.from('orders').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', orderId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.warn('Supabase status update notice:', e.message || e);
        return false;
    }
}

// 4. Update Product Stock in Supabase
async function updateSupabaseProductStock(productId, newStock) {
    const client = getSupabaseClient();
    if (!client) return false;
    try {
        const { error } = await client.from('products').update({ stock: newStock, updated_at: new Date().toISOString() }).eq('id', productId);
        if (error) throw error;
        return true;
    } catch (e) {
        console.warn('Supabase stock update notice:', e.message || e);
        return false;
    }
}

// Initialize Supabase Client on Script Load
getSupabaseClient();
