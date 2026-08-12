/**
 * SONY STORE - Product Detail Page Controller
 * Dynamically renders product.html view based on URL query parameter (?id=X).
 * Features thumbnail gallery switching, zoom lens effect, stock count color indicators, and quantity limit locking.
 */

let currentProduct = null;
let selectedQuantity = 1;

function getProductIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));
    return isNaN(id) ? 1 : id;
}

function renderProductDetails() {
    const id = getProductIdFromUrl();
    currentProduct = products.find(p => p.id === id) || products[0];

    // Page Title Update
    document.title = `${currentProduct.name} | SONY STORE Haute Horlogerie`;

    // Left: Gallery
    const mainImg = document.getElementById('productMainImage');
    const thumbContainer = document.getElementById('thumbnailRow');

    if (mainImg && currentProduct.images.length > 0) {
        mainImg.src = currentProduct.images[0];
        mainImg.alt = currentProduct.name;
    }

    if (thumbContainer) {
        thumbContainer.innerHTML = currentProduct.images.map((img, idx) => `
            <div class="thumb-item ${idx === 0 ? 'active' : ''}" onclick="switchMainImage('${img}', this)">
                <img src="${img}" alt="${currentProduct.name} Angle ${idx + 1}">
            </div>
        `).join('');
    }

    // Right: Info Metadata
    const brandEl = document.getElementById('productBrand');
    const titleEl = document.getElementById('productTitle');
    const ratingEl = document.getElementById('productRating');
    const priceEl = document.getElementById('productPrice');
    const oldPriceEl = document.getElementById('productOldPrice');
    const discountEl = document.getElementById('productDiscount');
    const descEl = document.getElementById('productDescription');
    const stockBadge = document.getElementById('productStockBadge');
    const skuEl = document.getElementById('productSku');
    
    // Specs
    const specMaterial = document.getElementById('specMaterial');
    const specMovement = document.getElementById('specMovement');
    const specCase = document.getElementById('specCase');
    const specStrap = document.getElementById('specStrap');
    const specWater = document.getElementById('specWater');

    if (brandEl) brandEl.textContent = currentProduct.brand;
    if (titleEl) titleEl.textContent = currentProduct.name;
    if (ratingEl) ratingEl.innerHTML = `★ ${currentProduct.rating} / 5.0 <span style="color: var(--text-muted); font-size: 0.85rem;">(Verified Horology Certificate)</span>`;
    if (priceEl) priceEl.textContent = `$${currentProduct.price.toLocaleString()}`;
    
    if (oldPriceEl) {
        if (currentProduct.oldPrice) {
            oldPriceEl.textContent = `$${currentProduct.oldPrice.toLocaleString()}`;
            oldPriceEl.style.display = 'inline';
        } else {
            oldPriceEl.style.display = 'none';
        }
    }

    if (discountEl) {
        if (currentProduct.oldPrice) {
            const savingsPercent = Math.round(((currentProduct.oldPrice - currentProduct.price) / currentProduct.oldPrice) * 100);
            discountEl.textContent = `SAVE ${savingsPercent}%`;
            discountEl.style.display = 'inline-block';
        } else {
            discountEl.style.display = 'none';
        }
    }

    if (descEl) descEl.textContent = currentProduct.description;
    if (skuEl) skuEl.textContent = currentProduct.sku;

    // Stock pill rendering
    if (stockBadge) {
        const stockInfo = getStockStatus(currentProduct.stock);
        stockBadge.className = `stock-badge ${stockInfo.class}`;
        stockBadge.textContent = stockInfo.text;
        stockBadge.style.position = 'relative';
        stockBadge.style.top = '0';
        stockBadge.style.left = '0';
        stockBadge.style.display = 'inline-block';
    }

    // Specs rendering
    if (specMaterial) specMaterial.textContent = currentProduct.material;
    if (specMovement) specMovement.textContent = currentProduct.movement;
    if (specCase) specCase.textContent = currentProduct.caseSize;
    if (specStrap) specStrap.textContent = currentProduct.strap;
    if (specWater) specWater.textContent = currentProduct.waterResistance;

    // Wishlist button state
    const wishlistBtn = document.getElementById('detailWishlistBtn');
    if (wishlistBtn) {
        const wishlist = getStoredWishlist();
        wishlistBtn.classList.toggle('active', wishlist.includes(currentProduct.id));
    }

    // Disable Add to Cart / Buy Now if Out of Stock
    const addToCartBtn = document.getElementById('detailAddToCartBtn');
    const buyNowBtn = document.getElementById('detailBuyNowBtn');

    if (currentProduct.stock <= 0) {
        if (addToCartBtn) {
            addToCartBtn.disabled = true;
            addToCartBtn.textContent = 'Out of Stock';
        }
        if (buyNowBtn) {
            buyNowBtn.disabled = true;
            buyNowBtn.style.opacity = '0.5';
        }
    }

    // Render Related Watches
    renderRelatedWatches();
}

function switchMainImage(imgUrl, thumbElement) {
    const mainImg = document.getElementById('productMainImage');
    if (mainImg) {
        mainImg.style.opacity = '0';
        setTimeout(() => {
            mainImg.src = imgUrl;
            mainImg.style.opacity = '1';
        }, 150);
    }

    document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active'));
    if (thumbElement) thumbElement.classList.add('active');
}

function updateQuantity(change) {
    if (!currentProduct) return;
    const newQty = selectedQuantity + change;

    if (newQty < 1) return;
    if (newQty > currentProduct.stock) {
        showToast(`Cannot select more than ${currentProduct.stock} available items`, '⚠');
        return;
    }

    selectedQuantity = newQty;
    const qtyDisplay = document.getElementById('productQtyDisplay');
    if (qtyDisplay) qtyDisplay.textContent = selectedQuantity;
}

function renderRelatedWatches() {
    const container = document.getElementById('relatedWatchesGrid');
    if (!container || !currentProduct) return;

    const related = products
        .filter(p => p.id !== currentProduct.id && p.category === currentProduct.category)
        .slice(0, 4);

    if (related.length === 0) {
        container.innerHTML = products.slice(0, 4).map(renderProductCard).join('');
    } else {
        container.innerHTML = related.map(renderProductCard).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('productDetailSection')) return;

    renderProductDetails();

    // Quantity buttons
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');

    if (qtyMinus) qtyMinus.addEventListener('click', () => updateQuantity(-1));
    if (qtyPlus) qtyPlus.addEventListener('click', () => updateQuantity(1));

    // Action buttons
    const addToCartBtn = document.getElementById('detailAddToCartBtn');
    const buyNowBtn = document.getElementById('detailBuyNowBtn');
    const wishlistBtn = document.getElementById('detailWishlistBtn');

    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            if (currentProduct) {
                addToCart(currentProduct.id, selectedQuantity);
            }
        });
    }

    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', () => {
            if (currentProduct) {
                const success = addToCart(currentProduct.id, selectedQuantity);
                if (success) {
                    window.location.href = 'checkout.html';
                }
            }
        });
    }

    if (wishlistBtn) {
        wishlistBtn.addEventListener('click', () => {
            if (currentProduct) {
                toggleWishlist(currentProduct.id);
            }
        });
    }
});
