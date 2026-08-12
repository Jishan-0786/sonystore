/**
 * SONY STORE - Main Application Logic
 * Global navigation, cart/wishlist badge updates, mobile menu, search drawer, toast notifications
 */

// Helper to manage localStorage for Cart and Wishlist
function getStoredCart() {
    return JSON.parse(localStorage.getItem('sony_store_cart')) || [];
}

function saveCart(cart) {
    localStorage.setItem('sony_store_cart', JSON.stringify(cart));
    updateBadges();
    if (typeof renderCartDrawer === 'function') renderCartDrawer();
    if (typeof renderCartPage === 'function') renderCartPage();
}

function getStoredWishlist() {
    return JSON.parse(localStorage.getItem('sony_store_wishlist')) || [];
}

function saveWishlist(wishlist) {
    localStorage.setItem('sony_store_wishlist', JSON.stringify(wishlist));
    updateBadges();
    if (typeof renderWishlistPage === 'function') renderWishlistPage();
}

// Update header badges
function updateBadges() {
    const cart = getStoredCart();
    const wishlist = getStoredWishlist();

    const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    document.querySelectorAll('.cart-badge').forEach(badge => {
        badge.textContent = totalCartCount;
        badge.style.display = totalCartCount > 0 ? 'flex' : 'none';
    });

    document.querySelectorAll('.wishlist-badge').forEach(badge => {
        badge.textContent = wishlist.length;
        badge.style.display = wishlist.length > 0 ? 'flex' : 'none';
    });
}

// Toast notification trigger
function showToast(message, icon = '✓') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span style="color: var(--gold-primary); font-size: 1.1rem; font-weight: bold;">${icon}</span> <span>${message}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Toggle Wishlist Item
function toggleWishlist(productId) {
    let wishlist = getStoredWishlist();
    const index = wishlist.indexOf(productId);
    const product = products.find(p => p.id === productId);

    if (index > -1) {
        wishlist.splice(index, 1);
        showToast(`Removed ${product ? product.name : 'item'} from Wishlist`, '♡');
    } else {
        wishlist.push(productId);
        showToast(`Added ${product ? product.name : 'item'} to Wishlist`, '♥');
    }

    saveWishlist(wishlist);
    
    // Update card wishlist icons on active page
    document.querySelectorAll(`.card-wishlist-btn[data-id="${productId}"]`).forEach(btn => {
        btn.classList.toggle('active', wishlist.includes(productId));
    });
}

// Add Item to Cart with Stock Enforcement
function addToCart(productId, quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    let cart = getStoredCart();
    let existingItem = cart.find(item => item.id === productId);
    let currentInCart = existingItem ? existingItem.quantity : 0;

    if (currentInCart + quantity > product.stock) {
        showToast(`Cannot add more than ${product.stock} available units of ${product.name}`, '⚠');
        return false;
    }

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images[0],
            sku: product.sku,
            quantity: quantity,
            stock: product.stock
        });
    }

    saveCart(cart);
    showToast(`Added ${quantity}x ${product.name} to Cart`, '🛒');

    // Automatically open Cart Drawer
    openCartDrawer();
    return true;
}

// Open / Close Cart Drawer
function openCartDrawer() {
    const backdrop = document.getElementById('cartDrawerBackdrop');
    if (backdrop) {
        backdrop.classList.add('open');
    }
}

function closeCartDrawer() {
    const backdrop = document.getElementById('cartDrawerBackdrop');
    if (backdrop) {
        backdrop.classList.remove('open');
    }
}

// Global DOM Content Loaded Setup
document.addEventListener('DOMContentLoaded', () => {
    updateBadges();

    // Mobile Hamburger Navigation
    const mobileBtn = document.getElementById('mobileNavToggle');
    const mainNav = document.getElementById('mainNav');

    if (mobileBtn && mainNav) {
        mobileBtn.addEventListener('click', () => {
            mainNav.classList.toggle('mobile-active');
        });
    }

    // Scroll Navbar Effect
    const header = document.querySelector('.site-header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // Header Cart Icon Trigger
    const headerCartBtn = document.getElementById('headerCartBtn');
    if (headerCartBtn) {
        headerCartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openCartDrawer();
        });
    }

    // Cart Drawer Backdrop Close Click
    const backdrop = document.getElementById('cartDrawerBackdrop');
    const closeBtn = document.getElementById('closeCartDrawer');
    if (backdrop) {
        backdrop.addEventListener('click', (e) => {
            if (e.target === backdrop || e.target === closeBtn) {
                closeCartDrawer();
            }
        });
    }
});
