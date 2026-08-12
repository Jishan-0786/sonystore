/**
 * SONY STORE - Cart System & Drawer Controller
 * Handles slide-out cart drawer DOM updates, cart.html full overview, stock checking, subtotal/shipping calculations,
 * localStorage synchronization, and luxury checkout simulation.
 */

function updateCartItemQuantity(productId, newQty) {
    let cart = getStoredCart();
    let item = cart.find(i => i.id === productId);
    let product = products.find(p => p.id === productId);

    if (!item) return;

    if (newQty <= 0) {
        removeFromCart(productId);
        return;
    }

    if (product && newQty > product.stock) {
        showToast(`Cannot exceed maximum stock limit of ${product.stock} pieces`, '⚠');
        return;
    }

    item.quantity = newQty;
    saveCart(cart);
}

function removeFromCart(productId) {
    let cart = getStoredCart();
    const item = cart.find(i => i.id === productId);
    cart = cart.filter(i => i.id !== productId);
    saveCart(cart);
    showToast(`Removed ${item ? item.name : 'timepiece'} from Cart`, '🗑');
}

function clearCart() {
    saveCart([]);
}

// Render Slide-Out Cart Drawer DOM
function renderCartDrawer() {
    const body = document.getElementById('cartDrawerBody');
    const subtotalEl = document.getElementById('drawerSubtotal');
    const totalEl = document.getElementById('drawerTotal');

    if (!body) return;

    const cart = getStoredCart();

    if (cart.length === 0) {
        body.innerHTML = `
            <div style="text-align: center; margin: auto 0; padding: 40px 20px;">
                <div style="font-size: 3rem; color: var(--gold-dark); margin-bottom: 16px;">🛍</div>
                <h4 style="font-family: var(--font-heading); font-size: 1.2rem; margin-bottom: 8px;">Your Shopping Bag is Empty</h4>
                <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 24px;">Explore our collection of haute horlogerie timepieces.</p>
                <a href="shop.html" onclick="closeCartDrawer()" class="btn-primary" style="padding: 10px 24px; font-size: 0.85rem;">Discover Collection</a>
            </div>
        `;
        if (subtotalEl) subtotalEl.textContent = '$0';
        if (totalEl) totalEl.textContent = '$0';
        return;
    }

    let subtotal = 0;

    body.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        return `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">$${item.price.toLocaleString()} × ${item.quantity}</div>
                    <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 2px;">SKU: ${item.sku}</div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                        <button onclick="updateCartItemQuantity(${item.id}, ${item.quantity - 1})" class="qty-btn" style="width: 26px; height: 26px; font-size: 0.9rem;">-</button>
                        <span style="font-weight: 700; font-size: 0.9rem;">${item.quantity}</span>
                        <button onclick="updateCartItemQuantity(${item.id}, ${item.quantity + 1})" class="qty-btn" style="width: 26px; height: 26px; font-size: 0.9rem;">+</button>
                    </div>
                </div>
                <button onclick="removeFromCart(${item.id})" class="cart-item-remove" title="Remove Item">✕</button>
            </div>
        `;
    }).join('');

    const shipping = subtotal > 5000 || subtotal === 0 ? 0 : 150;
    const grandTotal = subtotal + shipping;

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toLocaleString()}`;
    if (totalEl) totalEl.textContent = `$${grandTotal.toLocaleString()}`;
}

// Render Full cart.html Page DOM
function renderCartPage() {
    const tableBody = document.getElementById('cartTableBody');
    const pageSubtotal = document.getElementById('cartPageSubtotal');
    const pageShipping = document.getElementById('cartPageShipping');
    const pageTotal = document.getElementById('cartPageTotal');

    if (!tableBody) return;

    const cart = getStoredCart();

    if (cart.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 60px 20px;">
                    <h3 style="font-family: var(--font-heading); font-size: 1.5rem; margin-bottom: 12px; color: var(--gold-primary);">Your Cart is Empty</h3>
                    <p style="color: var(--text-muted); margin-bottom: 24px;">Discover luxury timepieces crafted for precision.</p>
                    <a href="shop.html" class="btn-primary">Browse Shop</a>
                </td>
            </tr>
        `;
        if (pageSubtotal) pageSubtotal.textContent = '$0';
        if (pageShipping) pageShipping.textContent = '$0';
        if (pageTotal) pageTotal.textContent = '$0';
        return;
    }

    let subtotal = 0;

    tableBody.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        const product = products.find(p => p.id === item.id);
        const maxStock = product ? product.stock : item.stock;

        return `
            <tr style="border-bottom: 1px solid var(--border-subtle);">
                <td style="padding: 20px 10px; display: flex; align-items: center; gap: 16px;">
                    <img src="${item.image}" alt="${item.name}" style="width: 70px; height: 70px; object-fit: contain; background: var(--bg-card); border-radius: var(--radius-sm); padding: 6px;">
                    <div>
                        <div style="font-weight: 700; font-size: 1rem;">${item.name}</div>
                        <div style="font-size: 0.8rem; color: var(--gold-primary);">SKU: ${item.sku}</div>
                    </div>
                </td>
                <td style="padding: 20px 10px; font-weight: 700;">$${item.price.toLocaleString()}</td>
                <td style="padding: 20px 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button onclick="updateCartItemQuantity(${item.id}, ${item.quantity - 1})" class="qty-btn">-</button>
                        <span class="qty-display">${item.quantity}</span>
                        <button onclick="updateCartItemQuantity(${item.id}, ${item.quantity + 1})" class="qty-btn" ${item.quantity >= maxStock ? 'disabled' : ''}>+</button>
                    </div>
                    <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">Limit: ${maxStock} in stock</div>
                </td>
                <td style="padding: 20px 10px; font-weight: 800; color: var(--gold-light);">$${itemTotal.toLocaleString()}</td>
                <td style="padding: 20px 10px; text-align: center;">
                    <button onclick="removeFromCart(${item.id})" style="background: none; border: none; color: #ef4444; font-size: 1.2rem; cursor: pointer;">✕</button>
                </td>
            </tr>
        `;
    }).join('');

    const shipping = subtotal > 5000 || subtotal === 0 ? 0 : 150;
    const grandTotal = subtotal + shipping;

    if (pageSubtotal) pageSubtotal.textContent = `$${subtotal.toLocaleString()}`;
    if (pageShipping) pageShipping.textContent = shipping === 0 ? 'COMPLIMENTARY' : `$${shipping.toLocaleString()}`;
    if (pageTotal) pageTotal.textContent = `$${grandTotal.toLocaleString()}`;
}

// Checkout simulation handler
function processCheckout(event) {
    if (event) event.preventDefault();
    
    const cart = getStoredCart();
    if (cart.length === 0) {
        showToast('Your cart is empty!', '⚠');
        return;
    }

    // Deduct stock in memory database
    cart.forEach(item => {
        const product = products.find(p => p.id === item.id);
        if (product) {
            product.stock = Math.max(0, product.stock - item.quantity);
        }
    });

    clearCart();

    const checkoutModal = document.getElementById('checkoutModal');
    if (checkoutModal) {
        checkoutModal.style.display = 'flex';
    } else {
        showToast('Order Placed Successfully! SONY STORE VIP Concierge will contact you.', '👑');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    renderCartDrawer();
    renderCartPage();

    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', processCheckout);
    }
});
