/**
 * SONY STORE - Order Creation & Tracking Engine
 * Manages customer order records, status progress (Pending -> Confirmed -> Processing -> Shipped -> Delivered -> Cancelled),
 * stock auto-deduction, and localStorage persistence.
 */

function getStoredOrders() {
    try {
        return JSON.parse(localStorage.getItem('sony_store_orders')) || [];
    } catch (e) {
        return [];
    }
}

function saveOrders(orders) {
    localStorage.setItem('sony_store_orders', JSON.stringify(orders));
}

function getCustomerOrders(phone) {
    const orders = getStoredOrders();
    if (!phone) return orders;
    return orders.filter(o => o.customer && o.customer.phone === phone);
}

function getOrderById(orderId) {
    const orders = getStoredOrders();
    return orders.find(o => o.id === orderId) || null;
}

function createOrder(orderData) {
    const orders = getStoredOrders();
    const orderId = 'SNY-ORD-' + (1000 + orders.length + 1);

    const newOrder = {
        id: orderId,
        customer: {
            name: orderData.name,
            phone: orderData.phone,
            email: orderData.email || ''
        },
        address: {
            street: orderData.street,
            city: orderData.city,
            province: orderData.province,
            postal: orderData.postal,
            country: orderData.country || 'Nepal'
        },
        items: orderData.items,
        subtotal: orderData.subtotal,
        shipping: orderData.shipping || 0,
        total: orderData.total,
        paymentMethod: orderData.paymentMethod || 'Cash on Delivery',
        date: new Date().toISOString(),
        status: 'Pending' // Pending | Confirmed | Processing | Shipped | Delivered | Cancelled
    };

    orders.unshift(newOrder);
    saveOrders(orders);

    // Sync Order with Supabase Database
    if (typeof insertSupabaseOrder === 'function') {
        insertSupabaseOrder(newOrder);
    }

    // Deduct Stock in Products Database
    if (typeof updateProductStockAfterOrder === 'function') {
        updateProductStockAfterOrder(orderData.items);
    }

    // Clear Customer Cart
    if (typeof saveCart === 'function') {
        saveCart([]);
    }

    return newOrder;
}
