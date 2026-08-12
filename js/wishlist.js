/**
 * SONY STORE - Wishlist Page Controller
 * Displays saved wishlist timepieces, supports removal with smooth animation,
 * adding items to cart, and rendering a luxury empty state.
 */

function renderWishlistPage() {
    const grid = document.getElementById('wishlistProductsGrid');
    const countEl = document.getElementById('wishlistProductCount');
    const headerRow = document.getElementById('wishlistHeaderRow');

    if (!grid) return;

    const wishlistIds = getStoredWishlist();
    const wishlistProducts = products.filter(p => wishlistIds.includes(p.id));

    if (countEl) {
        countEl.textContent = `${wishlistProducts.length} Saved Timepiece${wishlistProducts.length === 1 ? '' : 's'}`;
    }

    if (wishlistProducts.length === 0) {
        if (headerRow) headerRow.style.display = 'none';
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 70px 20px; background: var(--bg-card); border-radius: var(--radius-md); border: 1px solid var(--border-gold); max-width: 700px; margin: 0 auto; box-shadow: 0 15px 35px rgba(0,0,0,0.5);">
                <div style="font-size: 3.5rem; color: var(--gold-primary); margin-bottom: 20px; animation: gentleFloat 4s ease-in-out infinite;">♡</div>
                <h2 style="font-family: var(--font-heading); font-size: 2rem; margin-bottom: 12px; color: var(--gold-light); letter-spacing: 2px;">YOUR WISHLIST IS EMPTY</h2>
                <p style="color: var(--text-muted); font-size: 1rem; margin-bottom: 30px; max-width: 480px; margin-left: auto; margin-right: auto; line-height: 1.6;">
                    Save your favorite watches here and come back to them anytime.
                </p>
                <a href="shop.html" class="btn-primary" style="padding: 14px 36px; display: inline-block;">EXPLORE WATCH COLLECTION</a>
            </div>
        `;
        return;
    }

    if (headerRow) headerRow.style.display = 'flex';

    grid.innerHTML = wishlistProducts.map(product => renderWishlistCard(product)).join('');
}

function renderWishlistCard(product) {
    const stockInfo = getStockStatus(product.stock);
    
    let oldPriceHtml = '';
    let discountHtml = '';
    if (product.oldPrice) {
        const discountPercent = Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100);
        oldPriceHtml = `<span class="price-old">$${product.oldPrice.toLocaleString()}</span>`;
        discountHtml = `<span class="discount-tag">SAVE ${discountPercent}%</span>`;
    }

    return `
        <div class="watch-card" data-id="${product.id}" style="transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);">
            <span class="stock-badge ${stockInfo.class}">${stockInfo.text.split('—')[0]}</span>
            <button class="card-wishlist-btn active" data-id="${product.id}" onclick="removeFromWishlistPage(${product.id})" title="Remove from Wishlist">
                ✕
            </button>
            <a href="product.html?id=${product.id}" class="card-image-box">
                <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
            </a>
            <div class="card-content">
                <span class="card-brand">${product.brand}</span>
                <h3 class="card-title">
                    <a href="product.html?id=${product.id}">${product.name}</a>
                </h3>
                <div style="color: var(--gold-primary); font-size: 0.85rem; margin-bottom: 6px; font-weight: 600;">
                    ★ ${product.rating} / 5.0
                </div>
                <p class="card-desc">${product.description}</p>
                <div class="card-pricing">
                    <span class="price-current">$${product.price.toLocaleString()}</span>
                    ${oldPriceHtml}
                    ${discountHtml}
                </div>
                <div class="card-actions">
                    <a href="product.html?id=${product.id}" class="btn-card-details">View Details</a>
                    <button class="btn-card-cart" ${product.stock <= 0 ? 'disabled' : ''} onclick="addToCart(${product.id}, 1)">
                        ${product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                </div>
            </div>
        </div>
    `;
}

function removeFromWishlistPage(productId) {
    const card = document.querySelector(`.watch-card[data-id="${productId}"]`);
    if (card) {
        card.style.opacity = '0';
        card.style.transform = 'scale(0.9) translateY(20px)';
        setTimeout(() => {
            toggleWishlist(productId);
        }, 300);
    } else {
        toggleWishlist(productId);
    }
}

function clearWishlist() {
    saveWishlist([]);
    showToast('Cleared all items from Wishlist', '🗑');
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('wishlistProductsGrid')) {
        renderWishlistPage();
    }
});
